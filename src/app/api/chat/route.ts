import { OpenAI } from 'openai';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { message: 'Message is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

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

    // Add user message
    chatSession.messages.push({
      role: 'user',
      content: message,
    });

    // Get AI response
    type Message = {
      role: 'user' | 'assistant' | 'system';
      content: string;
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatSession.messages.map(({ role, content }: Message) => ({
        role,
        content,
      })),
    });

    const aiMessage = completion.choices[0]?.message;
    if (aiMessage) {
      chatSession.messages.push({
        role: aiMessage.role,
        content: aiMessage.content || '',
      });
    }

    await chatSession.save();

    return NextResponse.json({
      sessionId: chatSession._id,
      message: aiMessage,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
