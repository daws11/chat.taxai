import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextRequest, NextResponse } from 'next/server';
import { assistantService } from '@/lib/services/assistant-service';

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

    // Create or update chat session
    let chatSession;
    let thread_id = threadId;
    
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      if (!chatSession || chatSession.userId.toString() !== session.user.id) {
        return NextResponse.json({ message: 'Session not found' }, { status: 404 });
      }
      
      // If this is a new thread for an existing session
      if (!thread_id) {
        thread_id = await assistantService.createThread();
        chatSession.threadId = thread_id;
        await chatSession.save();
      }
    } else {
      // Create a new thread for a new session
      thread_id = await assistantService.createThread();
      
      chatSession = new ChatSession({
        userId: session.user.id,
        threadId: thread_id,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
      });
    }

    // Get AI response using the assistant service
    const assistantResponse = await assistantService.sendMessage(thread_id, message);

    // Add messages to our database
    chatSession.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantResponse }
    );
    
    await chatSession.save();

    return NextResponse.json({
      sessionId: chatSession._id,
      message: {
        role: 'assistant',
        content: assistantResponse
      },
      threadId: thread_id
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
