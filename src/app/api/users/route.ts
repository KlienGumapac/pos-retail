import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/user';

// GET - Fetch all users
export async function GET() {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    // Get all users
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    // Format users with consistent ID
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { username, email, user_type, password, confirmPassword } = await request.json();

    // Validation
    if (!username || !email || !user_type || !password || !confirmPassword) {
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

    if (!['admin', 'cashier'].includes(user_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user type' },
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
      user_type,
      isActive: true
    });

    await user.save();

    // Return user without password
    const userResponse = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const { id, username, email, user_type, password, isActive } = await request.json();

    // Validation
    if (!id || !username || !email || !user_type) {
      return NextResponse.json(
        { success: false, error: 'ID, username, email, and user_type are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'cashier'].includes(user_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user type' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if username or email already exists (excluding current user)
    const existingUser = await User.findOne({
      _id: { $ne: id },
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    // Update user
    const updateData: any = {
      username,
      email,
      user_type
    };

    // Update isActive if provided
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    // Only update password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }
      updateData.password = password;
    }

    await User.findByIdAndUpdate(id, updateData);

    // Return updated user without password
    const updatedUser = await User.findById(id).select('-password');
    const userResponse = {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      user_type: updatedUser.user_type,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt
    };

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
