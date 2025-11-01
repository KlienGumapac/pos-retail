import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CancellationCode from '@/lib/cancellationCode';

// GET - Fetch a specific cancellation code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const { id } = await params;
    
    const code = await CancellationCode.findById(id).lean();
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: code
    });
  } catch (error) {
    console.error('Error fetching cancellation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cancellation code' },
      { status: 500 }
    );
  }
}

// PUT - Update a cancellation code
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    const { code, isActive } = body;
    
    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code is required' },
        { status: 400 }
      );
    }
    
    // Check if code exists
    const existingCode = await CancellationCode.findById(id);
    if (!existingCode) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code not found' },
        { status: 404 }
      );
    }
    
    // Check if new code already exists (excluding current code)
    const duplicateCode = await CancellationCode.findOne({ 
      code: code.toUpperCase().trim(),
      _id: { $ne: id }
    });
    
    if (duplicateCode) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code already exists' },
        { status: 409 }
      );
    }
    
    // Update the code
    const updatedCode = await CancellationCode.findByIdAndUpdate(
      id,
      {
        code: code.toUpperCase().trim(),
        isActive: isActive !== undefined ? isActive : existingCode.isActive
      },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedCode,
      message: 'Cancellation code updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating cancellation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cancellation code' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a cancellation code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const deletedCode = await CancellationCode.findByIdAndDelete(id);
    
    if (!deletedCode) {
      return NextResponse.json(
        { success: false, error: 'Cancellation code not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cancellation code deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting cancellation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cancellation code' },
      { status: 500 }
    );
  }
}
