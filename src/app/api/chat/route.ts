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
      assistant_id: ASSISTANT_ID
    });
    
    // Poll for the run completion
    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    
    // Simple polling mechanism - in production should use a more sophisticated approach
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
      }
    }
    
    // Get the assistant's messages
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    
    // Find the latest assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    const latestMessage = assistantMessages[0];
    
    // Extract text from the content (handling potential array structure)
    let assistantResponse = '';
    if (latestMessage && latestMessage.content && latestMessage.content.length > 0) {
      const textContent = latestMessage.content.find(content => content.type === 'text');
      if (textContent && 'text' in textContent) {
        assistantResponse = textContent.text.value;
      }
    }
    
    // Add assistant response to chat session for UI display
    if (assistantResponse) {
      chatSession.messages.push({
        role: 'assistant',
        content: assistantResponse,
      });
    }

    await chatSession.save();

    return NextResponse.json({
      sessionId: chatSession._id,
      message: {
        role: 'assistant',
        content: assistantResponse || 'No response from the assistant'
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
