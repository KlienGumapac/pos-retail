import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CancellationCode from '@/lib/cancellationCode';

// POST - Validate a cancellation code
export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    const { code } = body;
    
    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code is required' },
        { status: 400 }
      );
    }
    
    // Find the cancellation code
    const cancellationCode = await CancellationCode.findOne({ 
      code: code.toUpperCase().trim(),
      isActive: true
    });
    
    if (!cancellationCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive cancellation code' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cancellation code is valid',
      data: {
        code: cancellationCode.code,
        isValid: true
      }
    });
    
  } catch (error) {
    console.error('Error validating cancellation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate cancellation code' },
      { status: 500 }
    );
  }
}
