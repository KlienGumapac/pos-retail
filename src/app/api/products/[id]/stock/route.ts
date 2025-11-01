import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/product';

// POST - Adjust stock for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const { adjustment, reason } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Adjustment must be a number' },
        { status: 400 }
      );
    }

    // Find the product
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate new stock
    const newStock = product.stock + adjustment;

    // Prevent negative stock
    if (newStock < 0) {
      return NextResponse.json(
        { success: false, error: 'Stock cannot be negative' },
        { status: 400 }
      );
    }

    // Update the product stock
    product.stock = newStock;
    await product.save();

    // Return updated product
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
      message: `Stock ${adjustment >= 0 ? 'added' : 'reduced'} successfully`,
      product: formattedProduct,
      adjustment,
      newStock,
      reason: reason || 'Manual adjustment'
    });

  } catch (error) {
    console.error('Adjust stock error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
