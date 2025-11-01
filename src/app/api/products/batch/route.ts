import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/product";

export async function POST(request: NextRequest) {
  try {
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Product IDs array is required' 
      }, { status: 400 });
    }

    // Validate that all IDs are strings
    if (!productIds.every(id => typeof id === 'string')) {
      return NextResponse.json({ 
        success: false, 
        error: 'All product IDs must be strings' 
      }, { status: 400 });
    }

    // Fetch all products in a single query
    const products = await Product.find({ 
      _id: { $in: productIds } 
    }).select('_id name sku price category images description barcode');

    // Convert to the expected format
    const formattedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      name: product.name,
      sku: product.sku,
      price: product.price,
      category: product.category,
      images: product.images || [],
      description: product.description,
      barcode: product.barcode
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      count: formattedProducts.length
    });

  } catch (error) {
    console.error('Error fetching products batch:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch products' 
    }, { status: 500 });
  }
}
