import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, jobTitle } = await req.json();

    if (!name || !email || !password || !jobTitle) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { name }],
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email or username already exists' },
        { status: 400 }
      );
    }

    // Create new user with a default trial subscription (required by the
    // chat quota checks — without it the user cannot send any message)
    const now = new Date();
    const user = new User({
      name,
      email,
      password,
      jobTitle,
      subscription: {
        type: 'trial',
        status: 'active',
        messageLimit: 30,
        remainingMessages: 30,
        callSeconds: 0,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        payment: {
          amount: 0,
          method: 'none',
          lastPaymentDate: now,
          nextPaymentDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    await user.save();

    return NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
