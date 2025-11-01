import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/transaction';
import Product from '@/lib/product';
import { Distribution } from '@/lib/distribution';

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
    const { cashierId, items, subtotal, overallDiscount, totalAmount, cashReceived, change } = body;

    console.log('Received transaction request:', {
      cashierId,
      itemsCount: items?.length,
      subtotal,
      overallDiscount,
      totalAmount,
      cashReceived,
      change
    });

    if (!cashierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (subtotal === undefined || totalAmount === undefined || cashReceived === undefined || change === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing payment calculation fields' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.productName || !item.productSku || !item.category ||
          !item.quantity || !item.price || item.discount === undefined || !item.total) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data - missing required fields' },
          { status: 400 }
        );
      }
    }

    // Create transaction
    const transaction = new Transaction({
      cashierId,
      items,
      subtotal,
      overallDiscount: overallDiscount || 0,
      totalAmount,
      cashReceived,
      change,
      status: 'completed'
    });

    await transaction.save();

    console.log('Transaction saved successfully:', {
      id: transaction.id,
      cashierId: transaction.cashierId,
      itemsCount: transaction.items.length,
      totalAmount: transaction.totalAmount
    });

    // Decrease stock from distributions
    // Find all distributions for this cashier that have these products
    const distributions = await Distribution.find({
      cashierId: cashierId,
      status: { $in: ['pending', 'delivered'] }
    });

    // Create a map to track remaining quantities needed to decrease
    const quantitiesToDecrease = new Map<string, number>();
    items.forEach(item => {
      const current = quantitiesToDecrease.get(item.productId) || 0;
      quantitiesToDecrease.set(item.productId, current + item.quantity);
    });

    // Decrease stock from distributions
    for (const distribution of distributions) {
      if (distribution.items && distribution.items.length > 0) {
        let distributionModified = false;
        
        // Process each item in the distribution
        for (let i = 0; i < distribution.items.length; i++) {
          const distItem = distribution.items[i];
          const remainingQty = quantitiesToDecrease.get(distItem.productId);
          
          if (remainingQty && remainingQty > 0 && distItem.quantity > 0) {
            const decreaseAmount = Math.min(remainingQty, distItem.quantity);
            distItem.quantity -= decreaseAmount;
            // Update totalValue for the item
            distItem.totalValue = distItem.quantity * distItem.price;
            quantitiesToDecrease.set(distItem.productId, remainingQty - decreaseAmount);
            distributionModified = true;
            
            console.log(`Decreased ${decreaseAmount} units of ${distItem.productName} from distribution ${distribution.id}`);
          }
        }
        
        // Remove items with quantity 0
        distribution.items = distribution.items.filter((item: any) => item.quantity > 0);
        
        // Update total value if distribution was modified
        if (distributionModified) {
          // Mark items array as modified for Mongoose
          distribution.markModified('items');
          
          distribution.totalValue = distribution.items.reduce(
            (sum: number, item: any) => sum + (item.quantity * item.price), 
            0
          );
          
          // If distribution has no items left, mark as cancelled
          if (distribution.items.length === 0) {
            distribution.status = 'cancelled';
          }
          
          await distribution.save();
          console.log(`Updated distribution ${distribution.id}`);
        }
      }
    }

    // Check if there are any remaining quantities that couldn't be satisfied
    for (const [productId, remainingQty] of quantitiesToDecrease.entries()) {
      if (remainingQty > 0) {
        console.warn(`Warning: Could not decrease ${remainingQty} units of product ${productId} - insufficient stock in distributions`);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        cashierId: transaction.cashierId,
        items: transaction.items,
        subtotal: transaction.subtotal,
        overallDiscount: transaction.overallDiscount,
        totalAmount: transaction.totalAmount,
        cashReceived: transaction.cashReceived,
        change: transaction.change,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error('Transaction creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
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
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = {};
    if (cashierId) query.cashierId = cashierId;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedTransactions = transactions.map((transaction: any) => ({
      id: transaction._id.toString(),
      cashierId: transaction.cashierId,
      items: transaction.items,
      returnedItems: transaction.returnedItems || [],
      subtotal: transaction.subtotal,
      overallDiscount: transaction.overallDiscount,
      totalAmount: transaction.totalAmount,
      cashReceived: transaction.cashReceived,
      change: transaction.change,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error('Transaction fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
