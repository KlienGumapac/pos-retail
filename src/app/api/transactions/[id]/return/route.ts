import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/transaction';
import { Distribution } from '@/lib/distribution';

export async function POST(
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

    const { id: transactionId } = await params;
    const body = await request.json();
    const { returnedItems } = body; // Array of { itemIndex, quantity, description }

    if (!returnedItems || !Array.isArray(returnedItems) || returnedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items selected for return' },
        { status: 400 }
      );
    }

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Process returns
    let totalReturnAmount = 0;
    const newReturnedItems: any[] = [];

    for (const returnRequest of returnedItems) {
      const { itemIndex, quantity, description } = returnRequest;
      
      if (itemIndex < 0 || itemIndex >= transaction.items.length) {
        return NextResponse.json(
          { success: false, error: `Invalid item index: ${itemIndex}` },
          { status: 400 }
        );
      }

      const originalItem = transaction.items[itemIndex];
      
      // Check if item has already been returned
      const alreadyReturned = transaction.returnedItems?.reduce((sum: number, ret: any) => {
        if (ret.productId.toString() === originalItem.productId.toString() && 
            ret.productSku === originalItem.productSku) {
          return sum + ret.quantity;
        }
        return sum;
      }, 0) || 0;

      const availableToReturn = originalItem.quantity - alreadyReturned;
      
      if (quantity > availableToReturn) {
        return NextResponse.json(
          { success: false, error: `Cannot return ${quantity} of ${originalItem.productName}. Only ${availableToReturn} available to return.` },
          { status: 400 }
        );
      }

      // Calculate return amount (proportionate to original total)
      const returnAmount = (originalItem.total / originalItem.quantity) * quantity;
      totalReturnAmount += returnAmount;

      // Create returned item record
      newReturnedItems.push({
        productId: originalItem.productId,
        productName: originalItem.productName,
        productSku: originalItem.productSku,
        category: originalItem.category,
        quantity: quantity,
        price: originalItem.price,
        discount: originalItem.discount,
        total: originalItem.total,
        returnAmount: returnAmount,
        description: description || 'No reason provided',
        returnedAt: new Date()
      });

      // Increase stock back to distributions
      const distributions = await Distribution.find({
        cashierId: transaction.cashierId,
        status: { $in: ['pending', 'delivered', 'cancelled'] }
      }).sort({ createdAt: -1 });

      // Try to add back stock to existing distribution items first
      let remainingQuantity = quantity;
      
      for (const distribution of distributions) {
        if (remainingQuantity <= 0) break;
        
        if (distribution.items && distribution.items.length > 0) {
          for (let i = 0; i < distribution.items.length; i++) {
            const distItem = distribution.items[i];
            
            if (distItem.productId.toString() === originalItem.productId.toString() || 
                distItem.productId === originalItem.productId.toString()) {
              // Add back the quantity to this distribution item
              const addBackQty = Math.min(remainingQuantity, quantity);
              distItem.quantity += addBackQty;
              distItem.totalValue = distItem.quantity * distItem.price;
              
              // If distribution was cancelled, mark it as pending
              if (distribution.status === 'cancelled') {
                distribution.status = 'pending';
              }
              
              remainingQuantity -= addBackQty;
              distribution.markModified('items');
              
              distribution.totalValue = distribution.items.reduce(
                (sum: number, item: any) => sum + (item.quantity * item.price),
                0
              );
              
              await distribution.save();
              console.log(`Added back ${addBackQty} units of ${originalItem.productName} to distribution ${distribution.id}`);
              
              if (remainingQuantity <= 0) break;
            }
          }
        }
      }

      // If we still have quantity left, add to the most recent distribution or create new item
      if (remainingQuantity > 0) {
        // Find the most recent non-cancelled distribution, or use cancelled one
        let targetDistribution = distributions
          .filter(d => d.status === 'pending' || d.status === 'delivered')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!targetDistribution && distributions.length > 0) {
          // Use the most recent cancelled distribution
          targetDistribution = distributions[0];
        }

        if (targetDistribution) {
          // Add to existing distribution
          const existingItem = targetDistribution.items.find(
            (item: any) => item.productId.toString() === originalItem.productId.toString() ||
                          item.productId === originalItem.productId.toString()
          );

          if (existingItem) {
            existingItem.quantity += remainingQuantity;
            existingItem.totalValue = existingItem.quantity * existingItem.price;
          } else {
            targetDistribution.items.push({
              productId: originalItem.productId.toString(),
              productName: originalItem.productName,
              productSku: originalItem.productSku,
              category: originalItem.category,
              quantity: remainingQuantity,
              price: originalItem.price,
              totalValue: remainingQuantity * originalItem.price
            });
          }

          // If distribution was cancelled, mark it as pending
          if (targetDistribution.status === 'cancelled') {
            targetDistribution.status = 'pending';
          }

          targetDistribution.totalValue = targetDistribution.items.reduce(
            (sum: number, item: any) => sum + (item.quantity * item.price),
            0
          );

          targetDistribution.markModified('items');
          await targetDistribution.save();
          console.log(`Added remaining ${remainingQuantity} units to distribution ${targetDistribution.id}`);
        }
      }
    }

    // Update transaction with returned items
    if (!transaction.returnedItems) {
      transaction.returnedItems = [];
    }
    transaction.returnedItems.push(...newReturnedItems);
    
    // Update transaction totals
    transaction.subtotal = Math.max(0, transaction.subtotal - totalReturnAmount);
    transaction.totalAmount = Math.max(0, transaction.totalAmount - totalReturnAmount);
    
    // If all items are returned, mark as refunded
    const totalReturnedQuantity = transaction.returnedItems.reduce((sum, ret) => sum + ret.quantity, 0);
    const totalOriginalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalReturnedQuantity >= totalOriginalQuantity) {
      transaction.status = 'refunded';
    }

    await transaction.save();

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        cashierId: transaction.cashierId,
        items: transaction.items,
        returnedItems: transaction.returnedItems,
        subtotal: transaction.subtotal,
        overallDiscount: transaction.overallDiscount,
        totalAmount: transaction.totalAmount,
        cashReceived: transaction.cashReceived,
        change: transaction.change,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      },
      returnAmount: totalReturnAmount
    });

  } catch (error) {
    console.error('Return processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process return' },
      { status: 500 }
    );
  }
}

