import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/user';

export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }
}
