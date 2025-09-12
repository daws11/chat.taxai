import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { assistantService } from '@/lib/services/assistant-service';
import { User } from '@/lib/models/user';
import { cleanAIResponse } from '@/lib/utils/response-cleaner';
import { deductUserTokens, addUserTokens } from '@/lib/utils/token-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Specific assistant ID for Tax AI application
const ASSISTANT_ID = 'asst_kwYCj2zNJdudMzllrpTjSzGf';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if request is FormData (file upload) or JSON
    const contentType = req.headers.get('content-type') || '';
    let message: string;
    let sessionId: string;
    let threadId: string;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await req.formData();
      message = formData.get('message') as string;
      sessionId = formData.get('sessionId') as string;
      threadId = formData.get('threadId') as string;
      const uploadedFiles = formData.getAll('files') as File[];
      files = uploadedFiles.filter(file => file.size > 0); // Filter out empty files
    } else {
      // Handle JSON
      const body = await req.json();
      message = body.message;
      sessionId = body.sessionId;
      threadId = body.threadId;
      files = body.files || [];
    }

    if (!message) {
      return NextResponse.json(
        { message: 'Message is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Ambil user dari database
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    // Cek subscription dan remainingMessages
    if (!user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return NextResponse.json({ message: 'Subscription not found or invalid' }, { status: 403 });
    }
    if (user.subscription.remainingMessages <= 0) {
      return NextResponse.json({ message: 'Message quota exceeded' }, { status: 403 });
    }
    
    // Deduct tokens using utility function
    const tokenResult = await deductUserTokens(session.user.id, 1);
    if (!tokenResult.success) {
      return NextResponse.json({ 
        message: tokenResult.error || 'Failed to deduct tokens' 
      }, { status: 403 });
    }

    try {
      // Create or update chat session
      let chatSession;
      // Use the threadId from request or initialize as null
      let currentThreadId = threadId || null;
    
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      if (!chatSession || chatSession.userId.toString() !== session.user.id) {
        return NextResponse.json({ message: 'Session not found' }, { status: 404 });
      }
      
      // If this is a new thread for an existing session
      if (!currentThreadId) {
        currentThreadId = await assistantService.createThread();
        chatSession.threadId = currentThreadId;
        await chatSession.save();
      } else {
        // Use the threadId from the chat session if available
        currentThreadId = chatSession.threadId || currentThreadId;
      }
    } else {
      // Create a new thread for a new session
      currentThreadId = await assistantService.createThread();
      
      chatSession = new ChatSession({
        userId: session.user.id,
        threadId: currentThreadId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
      });
    }

    // Add user message to local storage for UI display
    chatSession.messages.push({
      role: 'user',
      content: message,
      attachments: files ? files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })) : undefined
    });

    // We already have the thread ID from earlier in the code
    // Make sure we're using the thread ID from the chat session
    currentThreadId = chatSession.threadId;
    
    if (!currentThreadId) {
      return NextResponse.json({ message: 'Thread ID not found' }, { status: 500 });
    }
    
    // Handle file uploads if any
    const fileIds: string[] = [];
    if (files && files.length > 0) {
      console.log('Processing file uploads:', files);
      
      // Upload files to OpenAI
      for (const file of files) {
        try {
          // Validate file size (max 20MB per file)
          if (file.size > 20 * 1024 * 1024) {
            console.error(`File ${file.name} is too large. Maximum size is 20MB.`);
            continue;
          }

          // Validate file type - based on OpenAI file search supported types
          const allowedTypes = [
            // Text documents
            'text/plain',
            'text/markdown',
            'text/html',
            // PDF documents
            'application/pdf',
            // Microsoft Office documents
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Code files
            'text/x-c',
            'text/x-c++',
            'text/x-csharp',
            'text/x-java',
            'text/x-python',
            'text/x-ruby',
            'text/x-php',
            'text/javascript',
            'text/typescript',
            'text/x-sh',
            'text/css',
            'application/json',
            'text/x-tex',
            // Additional supported types
            'application/rtf',
            'text/csv' // CSV is supported for code interpreter but not file search
          ];

          if (!allowedTypes.includes(file.type)) {
            console.error(`File type ${file.type} is not supported.`);
            continue;
          }

          // Upload file to OpenAI
          const uploadedFile = await openai.files.create({
            file: file,
            purpose: 'assistants'
          });
          
          fileIds.push(uploadedFile.id);
          console.log(`File uploaded successfully: ${file.name} (ID: ${uploadedFile.id})`);
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Add the message to the thread with file attachments
    if (fileIds.length > 0) {
      // Send message with file attachments using the correct format
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: message,
        attachments: fileIds.map(fileId => ({
          file_id: fileId,
          tools: [{ type: 'file_search' }, { type: 'code_interpreter' }]
        }))
      });
    } else {
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: message
      });
    }
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
      instructions: `You are Atto, an AI Assistant specialized in UAE Corporate Tax and accounting. You have access to code interpreter and file search capabilities to analyze uploaded documents.\n\nWhen users upload documents:\n1. Use code interpreter to analyze the content of uploaded files\n2. Extract relevant tax information, financial data, and compliance requirements\n3. Provide detailed analysis and recommendations based on the document content\n4. Use file search to find specific information within the documents\n5. Create visualizations, calculations, or summaries as needed using code interpreter\n\nFor UAE Corporate Tax inquiries:\n- Analyze financial statements, tax returns, and compliance documents\n- Calculate tax obligations and identify potential issues\n- Provide guidance on tax planning and compliance\n- Explain complex tax concepts with examples from the uploaded documents\n\nIMPORTANT: When analyzing uploaded files:\n- Always examine the document content thoroughly using available tools\n- Provide specific insights based on the actual document data\n- Use code interpreter to perform calculations, create charts, or generate summaries\n- Never mention that you are "checking" or "reviewing" files - just provide the analysis directly\n\nCRITICAL: NO REFERENCES OR CITATIONS:\n- Never include any references, citations, or source indicators in your responses\n- Do not use patterns like 【5:19†source】, [1], [2], or any citation formats\n- Do not mention "according to the document", "as stated in", "based on the file", or similar phrases\n- Provide direct answers without indicating sources or references\n\nTone: Professional, analytical, and user-focused. Focus on providing actionable insights based on the uploaded documents. Core Guidelines:
Strict Scope Enforcement:

"Only address UAE Corporate Tax inquiries. Reject all VAT, Excise Tax, or other tax-related questions with this response:
'I specialize in UAE Corporate Tax only. For other tax types (VAT/Excise), will be release in the production version.'"

Data Confidentiality:

"Never disclose internal file names, data structures, or inventory details. If information isn’t in uploaded files, ask the user for clarification before searching externally."

Handling Generic/Long Queries:

"If a question is too broad or lengthy, narrow it to UAE Corporate Tax. Example:
User: 'Explain all UAE taxes?'
You: 'I focus on UAE Corporate Tax. Could you specify your query (e.g., deadlines, exemptions)?'"

Beta Model Disclosure:

"If asked about your AI model, respond:
'Atto is powered by a tailored blend of accounting/taxation algorithms. Technical details are confidential during this beta trial.'"

Workflow Rules:
✅ Step 1: Check uploaded files for answers. If unavailable, ask:
"Let me verify your query. Could you clarify [specific detail]?"
✅ Step 2: For out-of-scope queries, use the rejection template above.
✅ Step 3: Never speculate—cite only verified Corporate Tax rules.

Example Interaction:
User: "What’s the VAT registration threshold?"
Atto: "I specialize in UAE Corporate Tax. For VAT, it will be available in the production version"

Tone: Professional, concise, and user-focused.`,
      model: "gpt-4.1-mini",
      temperature: 0.84,
      top_p: 0.59,
      tools: [
        { type: "file_search" },
        { type: "code_interpreter" }
      ],
      response_format: { type: "text" }
    });
    
    // Poll for the run completion with timeout and status handling
    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    const start = Date.now();
    const TIMEOUT_MS = 60000; // 60 detik untuk complex queries
    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      runStatus.status !== 'cancelled' &&
      runStatus.status !== 'expired'
    ) {
      console.log(`Polling run status: runId=${run.id}, threadId=${currentThreadId}, status=${runStatus.status}`);
      console.log('Full runStatus:', JSON.stringify(runStatus, null, 2));
      // Tangani requires_action (function calling/file search)
      if (runStatus.status === 'requires_action') {
        console.warn(`Run requires action (tool/function call). runId=${run.id}, threadId=${currentThreadId}, required_action=`, runStatus.required_action);
        if (runStatus.required_action && runStatus.required_action.type === 'submit_tool_outputs') {
          const tool_outputs = [];
          for (const tc of runStatus.required_action.submit_tool_outputs.tool_calls) {
            let output = 'Not implemented in debug mode.';
            let args = {};
            if (tc.function && tc.function.arguments) {
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
                args = tc.function.arguments;
              }
            }
            // Logging detail tool_call
            console.log(`Processing tool_call: tool_call_id=${tc.id}, name=${tc.function?.name}, args=`, args);
            // Jika ingin implementasi nyata, tambahkan logic di sini berdasarkan tc.function.name
            // Contoh: jika file search, log args dan output
            if (tc.function?.name === 'get_tax_information') {
              const clientId = (args && typeof args === 'object' && 'client_id' in args) ? (args as Record<string, unknown>).client_id : 'unknown';
              output = `Dummy tax info for client_id: ${clientId}`;
            }
            // Logging output yang akan dikirim
            console.log(`tool_call_id=${tc.id}, output=`, output);
            tool_outputs.push({
              tool_call_id: tc.id,
              output
            });
          }
          await openai.beta.threads.runs.submitToolOutputs(currentThreadId, run.id, { tool_outputs });
        } else {
          throw new Error('Assistant requires action (tool/function call), but no handler implemented.');
        }
      }
      if (Date.now() - start > TIMEOUT_MS) {
        console.error(`Assistant run timed out. runId=${run.id}, threadId=${currentThreadId}, lastStatus=${runStatus.status}`);
        throw new Error('Assistant run timed out.');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    }
    if (runStatus.status !== 'completed') {
      console.error(`Assistant run did not complete. runId=${run.id}, threadId=${currentThreadId}, finalStatus=${runStatus.status}`);
      throw new Error(`Assistant run did not complete: ${runStatus.status}`);
    }

    // Get the assistant's messages
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    console.log('All messages from OpenAI:', JSON.stringify(messages.data, null, 2));

    // Temukan timestamp pesan user terakhir (yang baru saja dikirim)
    const userMessages = messages.data.filter(msg => msg.role === 'user');
    // Ambil pesan user terakhir berdasarkan timestamp terbesar
    const lastUserMsg = userMessages.length > 0 ? userMessages.reduce((a, b) => (a.created_at > b.created_at ? a : b)) : null;
    const lastUserTimestamp = lastUserMsg ? lastUserMsg.created_at : 0;

    // Ambil semua pesan assistant yang muncul setelah pesan user terakhir
    const newAssistantMessages = messages.data
      .filter(msg => msg.role === 'assistant' && msg.created_at > lastUserTimestamp)
      .sort((a, b) => a.created_at - b.created_at); // urutkan dari yang paling awal ke paling akhir
    console.log('Filtered new assistant messages:', JSON.stringify(newAssistantMessages, null, 2));

    // Logging dan simpan semua pesan assistant baru ke chatSession.messages
    for (const msg of newAssistantMessages) {
      const textContent = msg.content.find(content => content.type === 'text');
      if (textContent && 'text' in textContent) {
        console.log('New assistant message:', {
          content: textContent.text.value,
          created_at: msg.created_at
        });
        chatSession.messages.push({
          role: 'assistant',
          content: textContent.text.value,
          timestamp: new Date(msg.created_at * 1000)
        });
      }
    }

    // Gabungkan semua pesan assistant baru menjadi satu array untuk response
    // Filter out assistant messages that notify about checking files/documents
    const assistantResponses = newAssistantMessages
      .map(msg => {
        const textContent = msg.content.find(content => content.type === 'text');
        return textContent && 'text' in textContent ? textContent.text.value : '';
      })
      .filter(Boolean)
      .map(content => cleanAIResponse(content))
      .filter(Boolean) as string[];
    console.log('assistantResponses to frontend:', assistantResponses);

    // Ambil seluruh riwayat percakapan dari database berdasarkan threadId
    const dbHistory = chatSession.messages || [];
    console.log('DB chat history for threadId', currentThreadId, JSON.stringify(dbHistory, null, 2));
    // (Opsional) Anda bisa gunakan dbHistory untuk analisis, debugging, atau context tambahan jika ingin implementasi advanced

    await chatSession.save();

    // Get the last user message with attachments for display
    const lastUserMessage = chatSession.messages
      .filter((msg: any) => msg.role === 'user')
      .pop();
    
    console.log('Last user message from DB:', JSON.stringify(lastUserMessage, null, 2));
    
    // Also get the second-to-last user message (text message) if it exists
    const allUserMessages = chatSession.messages.filter((msg: any) => msg.role === 'user');
    const secondLastUserMessage = allUserMessages.length > 1 ? allUserMessages[allUserMessages.length - 2] : null;
    
    console.log('Second last user message from DB:', JSON.stringify(secondLastUserMessage, null, 2));

    const responsePayload = {
      sessionId: chatSession._id,
      messages: assistantResponses.length > 0
        ? assistantResponses.map(content => ({ role: 'assistant', content }))
        : [{ role: 'assistant', content: 'No response from the assistant' }],
      // Include user message with attachments for display
      userMessage: lastUserMessage ? {
        role: lastUserMessage.role,
        content: lastUserMessage.content,
        attachments: lastUserMessage.attachments || [],
        timestamp: lastUserMessage.timestamp
      } : null
    };
      console.log('Final response to frontend:', JSON.stringify(responsePayload, null, 2));
      return NextResponse.json(responsePayload);
    } catch (error) {
      // Rollback token deduction if there's an error
      console.error('Error processing message, rolling back token:', error);
      try {
        await addUserTokens(session.user.id, 1);
      } catch (rollbackError) {
        console.error('Failed to rollback token:', rollbackError);
      }
      throw error;
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
