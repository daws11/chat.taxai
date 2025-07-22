import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { assistantService } from '@/lib/services/assistant-service';
import { User } from '@/lib/models/user';

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

    const { message, sessionId, threadId } = await req.json();

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
    // Kurangi remainingMessages
    user.subscription.remainingMessages -= 1;
    await user.save();

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
    });

    // We already have the thread ID from earlier in the code
    // Make sure we're using the thread ID from the chat session
    currentThreadId = chatSession.threadId;
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message
    });
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
      instructions: `You are Atto, an AI  Assistant specialized in UAE Corporate Tax and accounting. Begin every interaction with:\n'Hello! I’m Atto, your AI Assistant. How can I help you with UAE Corporate Tax today?'\n\nStrict Scope Enforcement:\nOnly address UAE Corporate Tax inquiries. Reject all VAT, Excise Tax, or other tax-related questions with this response:\n'I specialize in UAE Corporate Tax only. For other tax types (VAT/Excise), will be release in the production version.'\n\nData Confidentiality:\nNever disclose internal file names, data structures, or inventory details. If information isn’t in uploaded files, ask the user for clarification before searching externally.\n\nHandling Generic/Long Queries:\nIf a question is too broad or lengthy, narrow it to UAE Corporate Tax. Example:\nUser: 'Explain all UAE taxes?'\nYou: 'I focus on UAE Corporate Tax. Could you specify your query (e.g., deadlines, exemptions)?'\n\nBeta Model Disclosure:\nIf asked about your AI model, respond:\n'Atto is powered by a tailored blend of accounting/taxation algorithms. Technical details are confidential during this beta trial.'\n\nWorkflow Rules:\nStep 1: Check uploaded files for answers. If unavailable, ask:\n"Let me verify your query. Could you clarify [specific detail]?"\nStep 2: For out-of-scope queries, use the rejection template above.\nStep 3: Never speculate—cite only verified Corporate Tax rules.\n\nTone: Professional, concise, and user-focused.`,
      model: "gpt-4o-mini",
      temperature: 0.84,
      top_p: 0.59,
      tools: [
        { type: "file_search" },
        { type: "code_interpreter" },
        {
          type: "function",
          function: {
            name: "get_tax_information",
            description: "Answer Client inquiry and get tax information based on the attached document provided in Arabic and English.",
            parameters: {
              type: "object",
              required: ["client_id", "document", "strict"],
              properties: {
                client_id: {
                  type: "string",
                  description: "Unique identifier for the client"
                },
                document: {
                  type: "object",
                  properties: {
                    arabic: {
                      type: "string",
                      description: "Tax information document in Arabic"
                    },
                    english: {
                      type: "string",
                      description: "Tax information document in English"
                    }
                  },
                  additionalProperties: false,
                  required: ["arabic", "english"]
                },
                strict: {
                  type: "boolean",
                  description: "Flag to enforce strict inquiry protocols"
                }
              },
              additionalProperties: false
            }
          }
        }
      ],
      response_format: { type: "text" }
    });
    
    // Poll for the run completion with timeout and status handling
    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    const start = Date.now();
    const TIMEOUT_MS = 30000; // 30 detik
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
              } catch (e) {
                args = tc.function.arguments;
              }
            }
            // Logging detail tool_call
            console.log(`Processing tool_call: tool_call_id=${tc.id}, name=${tc.function?.name}, args=`, args);
            // Jika ingin implementasi nyata, tambahkan logic di sini berdasarkan tc.function.name
            // Contoh: jika file search, log args dan output
            if (tc.function?.name === 'get_tax_information') {
              const clientId = (args && typeof args === 'object' && 'client_id' in args) ? (args as any).client_id : 'unknown';
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

    // Temukan timestamp pesan user terakhir (yang baru saja dikirim)
    const userMessages = messages.data.filter(msg => msg.role === 'user');
    // Ambil pesan user terakhir berdasarkan timestamp terbesar
    const lastUserMsg = userMessages.length > 0 ? userMessages.reduce((a, b) => (a.created_at > b.created_at ? a : b)) : null;
    const lastUserTimestamp = lastUserMsg ? lastUserMsg.created_at : 0;

    // Ambil semua pesan assistant yang muncul setelah pesan user terakhir
    const newAssistantMessages = messages.data
      .filter(msg => msg.role === 'assistant' && msg.created_at > lastUserTimestamp)
      .sort((a, b) => a.created_at - b.created_at); // urutkan dari yang paling awal ke paling akhir

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
    const assistantResponses = newAssistantMessages.map(msg => {
      const textContent = msg.content.find(content => content.type === 'text');
      return textContent && 'text' in textContent ? textContent.text.value : '';
    }).filter(Boolean);

    // Ambil seluruh riwayat percakapan dari database berdasarkan threadId
    const dbHistory = chatSession.messages || [];
    console.log('DB chat history for threadId', currentThreadId, JSON.stringify(dbHistory, null, 2));
    // (Opsional) Anda bisa gunakan dbHistory untuk analisis, debugging, atau context tambahan jika ingin implementasi advanced

    await chatSession.save();

    return NextResponse.json({
      sessionId: chatSession._id,
      messages: assistantResponses.length > 0
        ? assistantResponses.map(content => ({ role: 'assistant', content }))
        : [{ role: 'assistant', content: 'No response from the assistant' }]
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
