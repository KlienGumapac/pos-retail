import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Distribution } from '@/lib/distribution';
import Product from '@/lib/product';

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
    const { adminId, cashierId, items, notes } = body;
    
    console.log('Received distribution request:', {
      adminId,
      cashierId,
      itemsCount: items?.length,
      items: items?.map((item: any) => ({
        name: item.productName,
        category: item.category,
        sku: item.productSku,
        quantity: item.quantity,
        price: item.price,
        totalValue: item.totalValue
      }))
    });
    
    // Log the raw items to see what's actually being sent
    console.log('Raw items array:', JSON.stringify(items, null, 2));

    // Validate required fields
    if (!adminId || !cashierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.productName || !item.productSku || !item.category ||
          !item.quantity || !item.price || !item.totalValue) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data - missing required fields' },
          { status: 400 }
        );
      }
    }

    // Check if products have sufficient stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productName} not found` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${item.productName}. Available: ${product.stock}, Requested: ${item.quantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    // Create distribution
    console.log('Creating distribution with items:', JSON.stringify(items, null, 2));
    
    // Ensure each item has all required fields including category
    const validatedItems = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      category: item.category || "Accessories", // Ensure category is present
      quantity: item.quantity,
      price: item.price,
      totalValue: item.totalValue
    }));
    
    console.log('Validated items before saving:', JSON.stringify(validatedItems, null, 2));
    
    // Log the schema to verify it includes category
    console.log('Distribution schema paths:', Object.keys(Distribution.schema.paths));
    const itemsSchema = Distribution.schema.paths.items?.schema;
    if (itemsSchema) {
      console.log('DistributionItem schema paths:', Object.keys(itemsSchema.paths));
    }
    
    const distribution = new Distribution({
      adminId,
      cashierId,
      items: validatedItems,
      totalValue,
      notes,
      status: 'pending'
    });
    
    console.log('Distribution object before save:', JSON.stringify(distribution.toObject(), null, 2));

    await distribution.save();
    
    // Fetch the saved distribution to verify what was actually saved
    const savedDistribution = await Distribution.findById(distribution._id);
    
    console.log('Distribution saved successfully:', {
      id: distribution.id,
      itemsCount: distribution.items.length,
      items: distribution.items.map((item: any) => ({
        name: item.productName,
        category: item.category,
        sku: item.productSku
      }))
    });
    
    console.log('Verification - fetched from DB:', {
      id: savedDistribution?.id,
      itemsCount: savedDistribution?.items.length,
      items: savedDistribution?.items.map((item: any) => ({
        name: item.productName,
        category: item.category,
        sku: item.productSku
      }))
    });

    // Update product stocks (reduce from main inventory)
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    return NextResponse.json({
      success: true,
      distribution: {
        id: distribution.id,
        adminId: distribution.adminId,
        cashierId: distribution.cashierId,
        items: distribution.items,
        totalValue: distribution.totalValue,
        status: distribution.status,
        notes: distribution.notes,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt
      }
    });

  } catch (error) {
    console.error('Distribution creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create distribution' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const cashierId = searchParams.get('cashierId');
    const status = searchParams.get('status');

    let query: any = {};
    if (cashierId) query.cashierId = cashierId;
    if (status) query.status = status;

    const distributions = await Distribution.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const formattedDistributions = distributions.map((dist: any) => ({
      id: dist._id.toString(),
      adminId: dist.adminId,
      cashierId: dist.cashierId,
      items: dist.items,
      totalValue: dist.totalValue,
      status: dist.status,
      notes: dist.notes,
      createdAt: dist.createdAt,
      updatedAt: dist.updatedAt
    }));

    return NextResponse.json({
      success: true,
      distributions: formattedDistributions
    });

  } catch (error) {
    console.error('Distribution fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 }
    );
  }
}
