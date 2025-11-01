"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { 
  AlertTriangle, 
  ShoppingCart, 
  ArrowRight,
  X,
  Clock
} from "lucide-react";

export function PendingOrderNotification() {
  const { cart, hasItems, cartTotal, itemCount } = useCart();
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if no items or dismissed
  if (!hasItems || isDismissed) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleGoToPOS = () => {
    router.push('/cashier/stocks');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Pending Order Detected
                </h3>
                <div className="flex items-center space-x-1 px-2 py-1 bg-orange-200 dark:bg-orange-800 rounded-full">
                  <Clock className="w-3 h-3 text-orange-700 dark:text-orange-300" />
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                You have an unfinished order in your POS terminal. Complete the transaction to avoid losing the sale.
              </p>
              
              {/* Order Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 border border-orange-200 dark:border-orange-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Order Summary:
                  </span>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
                <div className="space-y-1">
                  {cart.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="truncate flex-1 mr-2">
                        {index + 1}. {item.name} (x{item.quantity})
                      </span>
                      <span className="font-medium">₱{item.total.toFixed(0)}</span>
                    </div>
                  ))}
                  {cart.length > 3 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                      +{cart.length - 3} more item{cart.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleGoToPOS}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Continue Order</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
