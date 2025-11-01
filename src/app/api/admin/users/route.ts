import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/user';

// Authentication middleware (currently unused)
/*
async function authenticateUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;
    
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return { success: false, error: 'Invalid or expired token' };
    }

    if (user.user_type !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    return { success: true, user };
  } catch (err) {
    return { success: false, error: 'Invalid token' };
  }
}
*/

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

    // Temporarily remove authentication to test
    // const authResult = await authenticateUser(request);
    // if (!authResult.success) {
    //   return NextResponse.json(
    //     { success: false, error: authResult.error },
    //     { status: 401 }
    //   );
    // }

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

  } catch {
    console.error('Get users error');
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

    // Temporarily remove authentication to test
    // const authResult = await authenticateUser(request);
    // if (!authResult.success) {
    //   return NextResponse.json(
    //     { success: false, error: authResult.error },
    //     { status: 401 }
    //   );
    // }

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
