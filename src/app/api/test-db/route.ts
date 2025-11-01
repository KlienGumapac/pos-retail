import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CancellationCode from '@/lib/cancellationCode';

export async function GET(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    // Test database connection by counting codes
    const count = await CancellationCode.countDocuments();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      count: count
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
