import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/user';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { username, password } = await request.json();

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

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
      message: 'Login successful',
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
