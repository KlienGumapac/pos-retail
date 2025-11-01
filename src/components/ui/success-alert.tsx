"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface SuccessAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  transactionId?: string;
  totalAmount?: number;
  change?: number;
  showTransactionDetails?: boolean;
  buttonText?: string;
}

export function SuccessAlert({
  isOpen,
  onClose,
  title = "Success!",
  message = "Operation completed successfully",
  transactionId,
  totalAmount,
  change,
  showTransactionDetails = false,
  buttonText = "Continue"
}: SuccessAlertProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
                {title}
              </h3>
            </div>
          </div>

          {showTransactionDetails && (transactionId || totalAmount !== undefined || change !== undefined) && (
            <div className="space-y-3">
              {transactionId && (
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Transaction ID:</span>
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    #{transactionId.slice(-8)}
                  </span>
                </div>
              )}
              
              {totalAmount !== undefined && (
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Total Amount:</span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">
                    ₱{totalAmount.toFixed(0)}
                  </span>
                </div>
              )}
              
              {change !== undefined && (
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Change:</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    ₱{change.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8"
            >
              <Check className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
