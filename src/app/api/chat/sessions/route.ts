import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { User } from '@/lib/models/user';
import { NextResponse } from 'next/server';
import { assistantService } from '@/lib/services/assistant-service';
import { cleanAIResponse } from '@/lib/utils/response-cleaner';
import { deductUserTokens, addUserTokens } from '@/lib/utils/token-utils';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const chatSessions = await ChatSession.find({ userId: session.user.id })
      .select('title updatedAt')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ sessions: chatSessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if request is FormData (file upload) or JSON
    const contentType = req.headers.get('content-type') || '';
    let title: string;
    let firstMessage: string;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await req.formData();
      title = (formData.get('title') as string) || 'New Chat';
      firstMessage = formData.get('message') as string;
      const uploadedFiles = formData.getAll('files') as File[];
      files = uploadedFiles.filter(file => file.size > 0); // Filter out empty files
    } else {
      // Handle JSON
      const body = await req.json();
      title = body.title || 'New Chat';
      firstMessage = body.message;
      files = body.files || [];
    }
    await connectToDatabase();

    // Check user subscription and remaining messages
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check subscription and remainingMessages
    if (!user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return NextResponse.json({ message: 'Subscription not found or invalid' }, { status: 403 });
    }
    if (user.subscription.remainingMessages <= 0) {
      return NextResponse.json({ message: 'Message quota exceeded' }, { status: 403 });
    }

    // Create a new thread for this session
    const threadId = await assistantService.createThread();
    
    // Prepare messages array
    const messages = [];
    if (firstMessage) {
      messages.push({ role: 'user', content: firstMessage });
    }

    // Create a new chat session
    const chatSession = new ChatSession({
      userId: session.user.id,
      threadId,
      title,
      messages,
    });

    // If there is a first message, send it to OpenAI and store the assistant's response
    const assistantResponses: string[] = [];
    if (firstMessage) {
      try {
        // Deduct token before processing the message using utility function
        const tokenResult = await deductUserTokens(session.user.id, 1);
        if (!tokenResult.success) {
          return NextResponse.json({ 
            message: tokenResult.error || 'Failed to deduct tokens' 
          }, { status: 403 });
        }
        
        // Add user message to thread with files
        await assistantService.sendMessage(threadId, firstMessage, files);
        // Get all messages in the thread
        const allMessages = await assistantService.getThreadMessages(threadId);
        console.log('All messages from OpenAI:', JSON.stringify(allMessages, null, 2));
        // Cari index pesan user terakhir
        const lastUserIdx = allMessages.map(m => m.role).lastIndexOf('user');
        const newAssistantMessages = lastUserIdx === -1
          ? allMessages.filter(m => m.role === 'assistant')
          : allMessages.slice(0, lastUserIdx).filter(m => m.role === 'assistant');
        // --- FIX ORDER: Ensure greeting is always first if present ---
        if (newAssistantMessages.length === 2) {
          const isGreeting = (msg: { content: string }) => typeof msg.content === 'string' && msg.content.toLowerCase().includes("hello! i'm atto");
          if (!isGreeting(newAssistantMessages[0]) && isGreeting(newAssistantMessages[1])) {
            // Swap so greeting is first
            [newAssistantMessages[0], newAssistantMessages[1]] = [newAssistantMessages[1], newAssistantMessages[0]];
          }
        }
        // Logging dan simpan semua pesan assistant baru ke chatSession.messages
        for (const msg of newAssistantMessages) {
          console.log('New assistant message:', {
            content: msg.content,
            timestamp: msg.timestamp
          });
          
          // Clean the response before storing
          const cleanedContent = cleanAIResponse(msg.content);
          if (cleanedContent) {
            chatSession.messages.push({
              role: 'assistant',
              content: cleanedContent,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            });
            assistantResponses.push(cleanedContent);
          }
        }
      } catch (error) {
        // Rollback token deduction if there's an error
        console.error('Error processing first message, rolling back token:', error);
        try {
          await addUserTokens(session.user.id, 1);
        } catch (rollbackError) {
          console.error('Failed to rollback token:', rollbackError);
        }
        throw error;
      }
    }

    await chatSession.save();

    const responsePayload = {
      _id: chatSession._id,
      title: chatSession.title,
      threadId: chatSession.threadId,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      messages: assistantResponses.length > 0
        ? assistantResponses.map(content => ({ role: 'assistant', content }))
        : [{ role: 'assistant', content: 'No response from the assistant' }]
    };
    console.log('Final response to frontend:', JSON.stringify(responsePayload, null, 2));
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
