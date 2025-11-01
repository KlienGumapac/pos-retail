import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/product';

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query
    let query: any = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get products
    const products = await Product.find(query)
      .sort(sortObj)
      .lean();

    // Format products
    const formattedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      cost: product.cost,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      isActive: product.isActive,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const {
      name,
      description,
      sku,
      barcode,
      price,
      cost,
      category,
      stock,
      minStock,
      images
    } = await request.json();

    // Validation
    if (!name || !sku || !price || !cost || !category || stock === undefined) {
      return NextResponse.json(
        { success: false, error: 'Required fields: name, sku, price, cost, category, stock' },
        { status: 400 }
      );
    }

    if (price < 0 || cost < 0 || stock < 0 || minStock < 0) {
      return NextResponse.json(
        { success: false, error: 'Price, cost, stock, and minStock cannot be negative' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'SKU already exists' },
        { status: 400 }
      );
    }

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingBarcode = await Product.findOne({ barcode });
      if (existingBarcode) {
        return NextResponse.json(
          { success: false, error: 'Barcode already exists' },
          { status: 400 }
        );
      }
    }

    // Create new product
    const product = new Product({
      name: name.trim(),
      description: description?.trim() || '',
      sku: sku.toUpperCase().trim(),
      barcode: barcode?.trim() || '',
      price: parseFloat(price),
      cost: parseFloat(cost),
      category: category.trim(),
      stock: parseInt(stock),
      minStock: parseInt(minStock) || 0,
      images: images || []
    });

    await product.save();

    // Return product without sensitive data
    const productResponse = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      cost: product.cost,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      isActive: product.isActive,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product: productResponse
    });

  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle duplicate key errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'SKU or barcode already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
