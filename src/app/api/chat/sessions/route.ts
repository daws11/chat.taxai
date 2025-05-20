import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextResponse } from 'next/server';
import { assistantService } from '@/lib/services/assistant-service';

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

    const { title = 'New Chat' } = await req.json();
    await connectToDatabase();

    // Create a new thread for this session
    const threadId = await assistantService.createThread();
    
    // Create a new chat session
    const chatSession = new ChatSession({
      userId: session.user.id,
      threadId,
      title,
      messages: [],
    });

    await chatSession.save();

    return NextResponse.json({
      _id: chatSession._id,
      title: chatSession.title,
      threadId: chatSession.threadId,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
