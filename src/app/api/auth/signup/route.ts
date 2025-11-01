import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/user';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, email, password, confirmPassword } = await request.json();

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      user_type: 'admin', // Always set to admin as requested
      isActive: true
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        user_type: user.user_type 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        isActive: user.isActive
      },
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
