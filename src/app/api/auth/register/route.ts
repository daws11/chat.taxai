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

    // Create new user
    const user = new User({
      name,
      email,
      password,
      jobTitle,
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
