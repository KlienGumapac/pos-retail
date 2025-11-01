"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  stock: number;
  images?: string[];
}

interface CartContextType {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  hasItems: boolean;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cashier-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCart([]);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cashier-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1, total: (cartItem.quantity + 1) * cartItem.price }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1, total: item.price }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const hasItems = cart.length > 0;
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      setCart,
      addToCart,
      removeFromCart,
      clearCart,
      updateCartQuantity,
      hasItems,
      cartTotal,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
