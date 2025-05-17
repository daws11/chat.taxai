import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextResponse } from 'next/server';

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
