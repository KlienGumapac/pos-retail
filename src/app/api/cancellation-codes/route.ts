import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CancellationCode from '@/lib/cancellationCode';

// GET - Fetch all cancellation codes
export async function GET(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const codes = await CancellationCode.find()
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: codes
    });
  } catch (error) {
    console.error('Error fetching cancellation codes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cancellation codes' },
      { status: 500 }
    );
  }
}

// POST - Create a new cancellation code
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
    const { code, isActive = true, createdBy } = body;
    
    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code is required' },
        { status: 400 }
      );
    }
    
    if (!createdBy) {
      return NextResponse.json(
        { success: false, error: 'Created by field is required' },
        { status: 400 }
      );
    }
    
    // Check if code already exists
    const existingCode = await CancellationCode.findOne({ 
      code: code.toUpperCase().trim() 
    });
    
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code already exists' },
        { status: 409 }
      );
    }
    
    // Create new cancellation code
    const newCode = new CancellationCode({
      code: code.toUpperCase().trim(),
      isActive,
      createdBy
    });
    
    await newCode.save();
    
    return NextResponse.json({
      success: true,
      data: newCode,
      message: 'Cancellation code created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating cancellation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create cancellation code' },
      { status: 500 }
    );
  }
}
