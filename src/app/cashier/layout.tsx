"use client";

import { CashierSidebar } from "@/components/cashier/CashierSidebar";
import { CartProvider } from "@/contexts/CartContext";

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <CashierSidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {children}
        </div>
      </div>
    </CartProvider>
  );
}
