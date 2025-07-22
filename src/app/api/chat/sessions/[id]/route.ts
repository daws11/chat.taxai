import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Handler GET
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    await connectToDatabase();
    const chatSession = await ChatSession.findOne({
      _id: id,
      userId: session.user.id,
    });
    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: chatSession._id,
      title: chatSession.title,
      messages: chatSession.messages,
      updatedAt: chatSession.updatedAt,
      threadId: chatSession.threadId,
    });
  } catch (error) {
    console.error('Chat session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler DELETE
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    await connectToDatabase();
    const chatSession = await ChatSession.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });
    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Chat session deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chat session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler PATCH
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    const body = await request.json();
    const { title } = body;
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    await connectToDatabase();
    const chatSession = await ChatSession.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.id,
      },
      { title },
      { new: true }
    );
    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: chatSession._id,
      title: chatSession.title,
      updatedAt: chatSession.updatedAt,
    });
  } catch (error) {
    console.error('Chat session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}