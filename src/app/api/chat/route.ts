import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextRequest, NextResponse } from 'next/server';
import { generateReply } from '@/lib/services/chat-service';
import { ingestFiles, retrieveContext } from '@/lib/rag/pipeline';
import { User } from '@/lib/models/user';
import { cleanAIResponse } from '@/lib/utils/response-cleaner';
import { deductUserTokens, addUserTokens } from '@/lib/utils/token-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if request is FormData (file upload) or JSON
    // (`threadId` from the legacy OpenAI Assistants flow is still sent by old
    // clients but is no longer used — sessions live entirely in MongoDB.)
    const contentType = req.headers.get('content-type') || '';
    let message: string;
    let sessionId: string;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await req.formData();
      message = formData.get('message') as string;
      sessionId = formData.get('sessionId') as string;
      const uploadedFiles = formData.getAll('files') as File[];
      files = uploadedFiles.filter(file => file.size > 0); // Filter out empty files
    } else {
      // Handle JSON
      const body = await req.json();
      message = body.message;
      sessionId = body.sessionId;
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

    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      if (!chatSession || chatSession.userId.toString() !== session.user.id) {
        return NextResponse.json({ message: 'Session not found' }, { status: 404 });
      }
    } else {
      chatSession = new ChatSession({
        userId: session.user.id,
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

    // Ingest uploaded files into the per-session vector collection
    if (files && files.length > 0) {
      const ingest = await ingestFiles(String(chatSession._id), session.user.id, files);
      if (ingest.skipped.length > 0) {
        console.log('RAG ingest skipped files:', ingest.skipped);
      }
    }

    // Retrieve relevant context (session attachments + global KB), then answer
    const context = await retrieveContext(message, String(chatSession._id));
    const history = chatSession.messages.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    const reply = await generateReply(history, context);
    const cleanedContent = cleanAIResponse(reply);

    if (cleanedContent) {
      chatSession.messages.push({
        role: 'assistant',
        content: cleanedContent,
        timestamp: new Date()
      });
    }

    await chatSession.save();

    // Get the last user message with attachments for display
    const lastUserMessage = chatSession.messages
      .filter((msg: { role: string }) => msg.role === 'user')
      .pop();

    const responsePayload = {
      sessionId: chatSession._id,
      messages: cleanedContent
        ? [{ role: 'assistant', content: cleanedContent }]
        : [{ role: 'assistant', content: 'No response from the assistant' }],
      // Include user message with attachments for display
      userMessage: lastUserMessage ? {
        role: lastUserMessage.role,
        content: lastUserMessage.content,
        attachments: lastUserMessage.attachments || [],
        timestamp: lastUserMessage.timestamp
      } : null
    };
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
