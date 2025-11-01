import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/product';

// DELETE - Delete a product
export async function DELETE(
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Find and delete the product
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get a single product
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const formattedProduct = {
      id: (product as any)._id.toString(),
      name: (product as any).name,
      description: (product as any).description,
      sku: (product as any).sku,
      barcode: (product as any).barcode,
      price: (product as any).price,
      cost: (product as any).cost,
      category: (product as any).category,
      stock: (product as any).stock,
      minStock: (product as any).minStock,
      isActive: (product as any).isActive,
      images: (product as any).images,
      createdAt: (product as any).createdAt,
      updatedAt: (product as any).updatedAt
    };

    return NextResponse.json({
      success: true,
      product: formattedProduct
    });

  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const updateData = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    const { _id, createdAt, ...allowedUpdates } = updateData;

    const product = await Product.findByIdAndUpdate(
      id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const formattedProduct = {
      id: (product as any)._id.toString(),
      name: (product as any).name,
      description: (product as any).description,
      sku: (product as any).sku,
      barcode: (product as any).barcode,
      price: (product as any).price,
      cost: (product as any).cost,
      category: (product as any).category,
      stock: (product as any).stock,
      minStock: (product as any).minStock,
      isActive: (product as any).isActive,
      images: (product as any).images,
      createdAt: (product as any).createdAt,
      updatedAt: (product as any).updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: formattedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
