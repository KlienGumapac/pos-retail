"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/apiConfig";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { CashierHeader } from "@/components/cashier/CashierHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Package, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Receipt,
  Clock,
  Eye,
  RotateCcw,
  Share2,
  Users,
  X
} from "lucide-react";
import JsBarcode from "jsbarcode";
import { DistributionService, Distribution } from "@/lib/distributionService";
import { TransactionService, Transaction } from "@/lib/transactionService";
import { UserService } from "@/lib/userService";
import { useAuth } from "@/hooks/useAuth";
import { OrderSummary } from "@/components/cashier/OrderSummary";
import { useCart } from "@/contexts/CartContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

function CashierStocksPageContent() {
  const { user } = useAuth();
  const { cart, setCart, addToCart, updateCartQuantity, removeFromCart, clearCart } = useCart();
  const searchParams = useSearchParams();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productCache, setProductCache] = useState<Map<string, any>>(new Map());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<"stocks" | "transactions" | "returns" | "distribute">("stocks");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<Array<{ itemIndex: number; quantity: number; description: string }>>([]);
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [returnedProducts, setReturnedProducts] = useState<any[]>([]);
  
  // Distribution state
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedReceiverCashier, setSelectedReceiverCashier] = useState<string>("");
  const [selectedProductForDistribution, setSelectedProductForDistribution] = useState<string>("");
  const [distributionQuantity, setDistributionQuantity] = useState<string>("");
  const [distributionItems, setDistributionItems] = useState<any[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionSuccess, setDistributionSuccess] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadDistributions();
    }
  }, [user]);

  // Handle tab from URL or sidebar navigation
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'distribute') {
      setActiveTab('distribute');
    }
  }, [searchParams]);

  // Memoize filtered products to avoid unnecessary recalculations
  const filteredProducts = useMemo(() => {
    if (availableProducts.length === 0) return [];
    
    return availableProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableProducts, searchTerm, selectedCategory]);

  useEffect(() => {
    if (distributions.length > 0) {
      loadAvailableProducts();
    }
  }, [distributions]);

  useEffect(() => {
    if (activeTab === "transactions" && user?.id) {
      loadTransactions();
    } else if (activeTab === "returns" && user?.id) {
      loadReturnedProducts();
    } else if (activeTab === "distribute" && user?.id) {
      loadCashiers();
      loadDistributions(); // Reload to get latest stock
    }
  }, [activeTab, user]);

  // Barcode scanner functionality
  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimeout: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Debug: Log all key presses to see what's happening
      console.log('Key pressed:', event.key, 'Code:', event.code, 'Buffer:', barcodeBuffer);
      
      // Barcode scanners typically send data very quickly
      // We'll capture all keystrokes and look for patterns
      if (event.key === "Enter") {
        // Barcode scanner usually ends with Enter
        if (barcodeBuffer.length > 0) {
          console.log('Processing barcode:', barcodeBuffer.trim());
          handleBarcodeScanned(barcodeBuffer.trim());
          barcodeBuffer = "";
        }
      } else if (event.key.length === 1) {
        // Regular character input
        barcodeBuffer += event.key;
        console.log('Added to buffer:', event.key, 'New buffer:', barcodeBuffer);
        
        // Clear buffer if no input for 100ms (barcode scanners are fast)
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          console.log('Buffer timeout, clearing:', barcodeBuffer);
          barcodeBuffer = "";
        }, 100);
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      clearTimeout(barcodeTimeout);
    };
  }, [availableProducts, cart]);

  const loadAvailableProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const products = await getAvailableProductsOptimized();
      setAvailableProducts(products);
    } catch (error) {
      console.error('Error loading available products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [distributions, productCache]);

  const loadDistributions = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const result = await DistributionService.getCashierDistributions(user.id);
      
      if (result.success && result.distributions) {
        setDistributions(result.distributions);
      } else {
        setError(result.error || 'Failed to load distributions');
      }
    } catch (err) {
      setError('Failed to load distributions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingTransactions(true);
    
    try {
      const result = await TransactionService.getTransactions(user.id);
      
      if (result.success && result.transactions) {
        setTransactions(result.transactions);
      } else {
        console.error('Failed to load transactions:', result.error);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user?.id]);

  // Optimized function to get available products with caching and batch fetching
  const getAvailableProductsOptimized = useCallback(async () => {
    const products: any[] = [];
    const productIds = new Set<string>();
    
    // Collect all unique product IDs from distributions
    distributions.forEach(dist => {
      if (dist.status === 'pending' || dist.status === 'delivered') {
        dist.items.forEach(item => {
          productIds.add(item.productId);
        });
      }
    });

    // Check cache first and only fetch missing products
    const uncachedProductIds: string[] = [];
    const cachedProducts: any[] = [];
    
    Array.from(productIds).forEach(productId => {
      if (productCache.has(productId)) {
        cachedProducts.push(productCache.get(productId));
      } else {
        uncachedProductIds.push(productId);
      }
    });

    // Batch fetch only uncached products
    let newProductDetails: any[] = [];
    if (uncachedProductIds.length > 0) {
      try {
        // Use batch API call instead of individual calls
        const response = await fetch(apiUrl('api/products/batch'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds: uncachedProductIds }),
        });
        
        if (response.ok) {
          const result = await response.json();
          newProductDetails = result.success ? result.products : [];
          
          // Update cache with new products
          const newCache = new Map(productCache);
          newProductDetails.forEach(product => {
            if (product) {
              newCache.set(product.id, product);
            }
          });
          setProductCache(newCache);
        }
      } catch (error) {
        console.error('Error batch fetching product details:', error);
        // Fallback to individual calls if batch fails
        newProductDetails = await Promise.all(
          uncachedProductIds.map(async (productId) => {
            try {
              const response = await fetch(`/api/products/${productId}`);
              const result = await response.json();
              return result.success ? result.product : null;
            } catch (error) {
              console.error('Error fetching product details:', error);
              return null;
            }
          })
        );
      }
    }

    // Combine cached and new product details
    const allProductDetails = [...cachedProducts, ...newProductDetails];

    // Create products with full details including images
    distributions.forEach(dist => {
      if (dist.status === 'pending' || dist.status === 'delivered') {
        dist.items.forEach(item => {
          const productDetail = allProductDetails.find(p => p && p.id === item.productId);
          const existingProduct = products.find(p => p.id === item.productId);
          
          if (existingProduct) {
            existingProduct.stock += item.quantity;
          } else {
            const productWithImages = {
              id: item.productId,
              name: item.productName,
              sku: item.productSku,
              price: item.price,
              stock: item.quantity,
              category: item.category || "Accessories",
              barcode: productDetail?.barcode || '',
              images: productDetail?.images?.length > 0 ? productDetail.images : [
                // Fallback sample images for testing
                'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Sample+Product',
                'https://picsum.photos/300/300?random=1'
              ],
              distributionId: dist.id,
              distributionStatus: dist.status
            };
            products.push(productWithImages);
          }
        });
      }
    });
    
    return products;
  }, [distributions, productCache]);

  // POS Functions - using context functions
  const handleAddToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        updateCartQuantity(product.id, existingItem.quantity + 1);
      }
    } else {
      addToCart({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
        total: product.price,
        stock: product.stock,
        images: product.images
      });
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const getCartSubtotal = () => {
    return getCartTotal();
  };

  const getTax = () => {
    return getCartSubtotal() * 0.12; // 12% VAT
  };

  const getPayableAmount = () => {
    return getCartSubtotal() + getTax();
  };

  const handleProceed = () => {
    // TODO: Implement payment processing
    console.log('Proceeding with order:', cart);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'delivered':
        return CheckCircle;
      case 'cancelled':
        return AlertTriangle;
      default:
        return Package;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTransactionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleViewTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleOpenReturnModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReturnItems([]);
    setIsTransactionModalOpen(false);
    setIsReturnModalOpen(true);
  };

  const handleAddReturnItem = (itemIndex: number) => {
    if (!selectedTransaction) return;
    const item = selectedTransaction.items[itemIndex];
    
    // Check if item already in return list
    const existingIndex = returnItems.findIndex(ri => ri.itemIndex === itemIndex);
    
    // Calculate available quantity (subtract already returned)
    const alreadyReturned = selectedTransaction.returnedItems?.reduce((sum, ret) => {
      if (ret.productId === item.productId && ret.productSku === item.productSku) {
        return sum + ret.quantity;
      }
      return sum;
    }, 0) || 0;
    
    const availableToReturn = item.quantity - alreadyReturned;
    
    if (existingIndex >= 0) {
      // Increase quantity if available
      const currentReturnQty = returnItems[existingIndex].quantity;
      if (currentReturnQty < availableToReturn) {
        const updated = [...returnItems];
        updated[existingIndex].quantity = Math.min(currentReturnQty + 1, availableToReturn);
        setReturnItems(updated);
      }
    } else if (availableToReturn > 0) {
      // Add new return item
      setReturnItems([...returnItems, { itemIndex, quantity: 1, description: '' }]);
    }
  };

  const handleRemoveReturnItem = (itemIndex: number) => {
    setReturnItems(returnItems.filter(ri => ri.itemIndex !== itemIndex));
  };

  const handleUpdateReturnQuantity = (itemIndex: number, quantity: number) => {
    if (!selectedTransaction) return;
    const item = selectedTransaction.items[itemIndex];
    
    // Calculate available quantity
    const alreadyReturned = selectedTransaction.returnedItems?.reduce((sum, ret) => {
      if (ret.productId === item.productId && ret.productSku === item.productSku) {
        return sum + ret.quantity;
      }
      return sum;
    }, 0) || 0;
    
    const availableToReturn = item.quantity - alreadyReturned;
    
    if (quantity <= 0) {
      handleRemoveReturnItem(itemIndex);
    } else if (quantity <= availableToReturn) {
      const updated = returnItems.map(ri => 
        ri.itemIndex === itemIndex ? { ...ri, quantity } : ri
      );
      setReturnItems(updated);
    }
  };

  const handleUpdateReturnDescription = (itemIndex: number, description: string) => {
    const updated = returnItems.map(ri => 
      ri.itemIndex === itemIndex ? { ...ri, description } : ri
    );
    setReturnItems(updated);
  };

  const handleProcessReturn = async () => {
    if (!selectedTransaction || returnItems.length === 0) return;
    
    // Validate all items have descriptions
    const invalidItems = returnItems.filter(ri => !ri.description.trim());
    if (invalidItems.length > 0) {
      alert('Please provide a description for all returned items');
      return;
    }
    
    try {
      const result = await TransactionService.processReturn(selectedTransaction.id, returnItems);
      
      if (result.success) {
        // Reload transactions
        await loadTransactions();
        await loadReturnedProducts();
        await loadDistributions();
        await loadAvailableProducts();
        
        setIsReturnModalOpen(false);
        setReturnItems([]);
        setSelectedTransaction(null);
        
        alert(`Return processed successfully. Refunded amount: ₱${result.returnAmount.toFixed(0)}`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to process return');
    }
  };

  const loadCashiers = useCallback(async () => {
    try {
      const result = await UserService.getUsers();
      if (result.success) {
        // Filter only cashiers, excluding current user
        const cashierUsers = result.users.filter((u: any) => 
          u.user_type === 'cashier' && u.isActive && u.id !== user?.id && u._id !== user?.id
        );
        setCashiers(cashierUsers);
      }
    } catch (err) {
      console.error('Failed to load cashiers:', err);
    }
  }, [user?.id]);

  const handleAddToDistribution = () => {
    if (!selectedReceiverCashier || !selectedProductForDistribution || !distributionQuantity) {
      setError('Please select a cashier, product, and enter quantity');
      return;
    }

    const product = availableProducts.find(p => p.id === selectedProductForDistribution);
    const quantity = parseInt(distributionQuantity);

    if (!product) {
      setError('Product not found');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    // Check available stock (from distributions)
    const availableStock = product.stock || 0;
    if (quantity > availableStock) {
      setError(`Insufficient stock. Available: ${availableStock} units`);
      return;
    }

    // Check if product already exists in distribution
    const existingItem = distributionItems.find(item => item.productId === selectedProductForDistribution);
    
    if (existingItem) {
      // Update existing item
      const newTotalQuantity = existingItem.quantity + quantity;
      if (newTotalQuantity > availableStock) {
        setError(`Insufficient stock. Available: ${availableStock} units`);
        return;
      }
      setDistributionItems(prev => prev.map(item => 
        item.productId === selectedProductForDistribution 
          ? { 
              ...item, 
              quantity: newTotalQuantity,
              totalValue: newTotalQuantity * item.price
            }
          : item
      ));
    } else {
      // Add new item
      setDistributionItems(prev => [...prev, {
        productId: selectedProductForDistribution,
        productName: product.name,
        productSku: product.sku,
        category: product.category || "Accessories",
        quantity: quantity,
        price: product.price,
        totalValue: product.price * quantity
      }]);
    }

    setDistributionSuccess(`Added ${quantity} units of ${product.name} to distribution`);
    setSelectedProductForDistribution("");
    setDistributionQuantity("");
    setError("");
  };

  const handleRemoveFromDistribution = (productId: string) => {
    setDistributionItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClearDistribution = () => {
    setDistributionItems([]);
    setSelectedProductForDistribution("");
    setDistributionQuantity("");
    setDistributionSuccess("");
  };

  const handleDistributeStocks = async () => {
    if (!user || !selectedReceiverCashier || distributionItems.length === 0) {
      setError('Please select a cashier and add items to distribute');
      return;
    }

    setIsDistributing(true);
    setError("");
    setDistributionSuccess("");

    try {
      const result = await DistributionService.createCashierDistribution({
        senderCashierId: user.id,
        receiverCashierId: selectedReceiverCashier,
        items: distributionItems,
        notes: `Distribution from ${user.username || 'cashier'}`
      });

      if (result.success) {
        setDistributionSuccess(`Successfully distributed ${distributionItems.length} items to cashier!`);
        
        // Clear the distribution form
        setDistributionItems([]);
        setSelectedProductForDistribution("");
        setDistributionQuantity("");
        setSelectedReceiverCashier("");
        
        // Reload distributions to reflect updated stock levels
        await loadDistributions();
      } else {
        setError(result.error || 'Failed to distribute stocks');
      }
    } catch (err) {
      setError('An unexpected error occurred while distributing stocks');
    } finally {
      setIsDistributing(false);
    }
  };

  const loadReturnedProducts = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const result = await TransactionService.getTransactions(user.id);
      
      if (result.success && result.transactions) {
        // Collect all returned items from all transactions
        const allReturnedItems: any[] = [];
        result.transactions.forEach((transaction: Transaction) => {
          if (transaction.returnedItems && transaction.returnedItems.length > 0) {
            transaction.returnedItems.forEach(returnedItem => {
              allReturnedItems.push({
                ...returnedItem,
                transactionId: transaction.id,
                transactionDate: transaction.createdAt
              });
            });
          }
        });
        
        setReturnedProducts(allReturnedItems.sort((a, b) => 
          new Date(b.returnedAt).getTime() - new Date(a.returnedAt).getTime()
        ));
      }
    } catch (err) {
      console.error('Failed to load returned products:', err);
    }
  }, [user?.id]);

  // Handle barcode scanning
  const handleBarcodeScanned = useCallback((barcode: string) => {
    if (!barcode || barcode.length < 3) return; // Minimum barcode length
    
    setIsScanning(true);
    setScannedBarcode(barcode);
    
    // Find product by barcode
    const product = availableProducts.find(p => p.barcode === barcode);
    
    if (product) {
      // Product found, add to cart
      handleAddToCart(product);
      
      // Show success feedback
      setScanResult({ type: 'success', message: `${product.name} added to cart!` });
      
      setTimeout(() => {
        setScannedBarcode("");
        setIsScanning(false);
        setScanResult({ type: null, message: '' });
      }, 2000);
    } else {
      // Product not found
      console.log('Product not found for barcode:', barcode);
      
      // Show error feedback
      setScanResult({ type: 'error', message: 'Product not found in your inventory' });
      
      setTimeout(() => {
        setScannedBarcode("");
        setIsScanning(false);
        setScanResult({ type: null, message: '' });
      }, 3000);
    }
  }, [availableProducts, addToCart]);

  // Generate barcode component
  const BarcodeDisplay = ({ barcode, productName }: { barcode: string; productName: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (canvasRef.current && barcode) {
        try {
          JsBarcode(canvasRef.current, barcode, {
            format: "CODE128",
            width: 1,
            height: 20,
            displayValue: false,
            margin: 0,
            background: "transparent",
            lineColor: "#000000"
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, [barcode]);

    if (!barcode) {
      return (
        <div className="w-full h-5 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">No barcode</span>
        </div>
      );
    }

    return (
      <div className="w-full">
        <canvas 
          ref={canvasRef} 
          className="w-full h-5"
          title={`Barcode for ${productName}`}
        />
        <div className="text-center mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{barcode}</span>
        </div>
      </div>
    );
  };

  // availableProducts is now managed by state

  return (
    <ProtectedRoute requiredRoles={['cashier']}>
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
        <CashierHeader 
          title="POS Terminal" 
          subtitle="Point of Sale System"
        />
        
        <main className="h-full flex flex-col">
          {/* Tabs */}
          <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab("stocks")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "stocks"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>My Stocks</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "transactions"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4" />
                  <span>Transaction Records</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("returns")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "returns"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4" />
                  <span>Returned Products</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("distribute")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "distribute"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4" />
                  <span>Distribute</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {activeTab === "stocks" ? (
              <>
                {/* Left Side - Product Selection */}
                <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0">
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-lg py-2 sm:py-3"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}

            {/* Barcode Scanner Status */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {isScanning ? 'Scanning...' : 'Barcode Scanner Ready'}
                  </span>
                </div>
                {scannedBarcode && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Scanned: {scannedBarcode}
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Point your barcode scanner at any product barcode to add it to the cart
              </p>
              
              {/* Test Input Field for Debugging */}
              <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                  Test Scanner Input (or type manually):
                </label>
                <Input
                  placeholder="Scan a barcode or type here to test..."
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeScanned(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Press Enter after scanning/typing to test
                </p>
              </div>
            </div>

            {/* Scan Result Notification */}
            {scanResult.type && (
              <div className={`mb-4 p-3 rounded-lg border ${
                scanResult.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {scanResult.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    scanResult.type === 'success' 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {scanResult.message}
                  </span>
                </div>
              </div>
            )}

            {/* Category Filter Buttons */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2"
                >
                  All
                </Button>
                <Button
                  variant={selectedCategory === "Pyesa" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("Pyesa")}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2"
                >
                  Pyesa
                </Button>
                <Button
                  variant={selectedCategory === "Units" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("Units")}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2"
                >
                  Units
                </Button>
                <Button
                  variant={selectedCategory === "Batteries" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("Batteries")}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2"
                >
                  Batteries
                </Button>
                <Button
                  variant={selectedCategory === "Accessories" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("Accessories")}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2"
                >
                  Accessories
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading || isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No products available
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  No distributed stocks found. Contact admin for stock distribution.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={`${product.id}-${product.distributionId}`}
                    onClick={() => handleAddToCart(product)}
                    className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border border-slate-200 dark:border-slate-700"
                  >
                    {/* Product Image */}
                    <div className="w-full h-20 sm:h-24 lg:h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-slate-400" />
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-1 hidden sm:block">
                      {product.sku}
                    </p>
                    <div className="mb-1 sm:mb-2">
                      <span className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                        {product.category}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                      <span className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
                        ₱{product.price.toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Stock: {product.stock}
                      </span>
                    </div>
                    
                    {/* Barcode Display */}
                    <div className="pt-1">
                      <BarcodeDisplay barcode={product.barcode || ''} productName={product.name} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

                {/* Right Side - Order Summary */}
                <OrderSummary
                  cart={cart}
                  onUpdateQuantity={updateCartQuantity}
                  onRemoveItem={removeFromCart}
                  onClearCart={clearCart}
                  onProceed={handleProceed}
                  onTransactionComplete={async () => {
                    // Reload both distributions and products after successful transaction
                    await loadDistributions();
                    await loadAvailableProducts();
                  }}
                />
              </>
            ) : activeTab === "transactions" ? (
              /* Transactions Tab */
              <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0">
                <div className="space-y-6">
                  {/* Transaction Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Transactions</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{transactions.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Sales</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              ₱{transactions.reduce((sum, t) => sum + t.totalAmount, 0).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Items Sold</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {transactions.reduce((sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Transaction List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Receipt className="w-5 h-5" />
                        <span>Recent Transactions</span>
                      </CardTitle>
                      <CardDescription>
                        Your transaction history and sales records
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingTransactions ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-slate-600 dark:text-slate-400">Loading transactions...</p>
                          </div>
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Receipt className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            No transactions yet
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400">
                            Your transaction history will appear here once you start making sales.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Transaction ID</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Date & Time</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Items</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Total Amount</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Cash Received</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Change</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((transaction) => (
                                <tr key={transaction.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                        <Receipt className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      </div>
                                      <span className="font-medium text-slate-900 dark:text-slate-100">
                                        #{transaction.id.slice(-8)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                                    {formatTransactionDate(transaction.createdAt)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} qty
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      ₱{transaction.totalAmount.toFixed(0)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                      ₱{transaction.cashReceived.toFixed(0)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                      ₱{transaction.change.toFixed(0)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewTransactionDetails(transaction)}
                                      className="flex items-center space-x-1"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>View Details</span>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : activeTab === "returns" ? (
              /* Returned Products Tab */
              <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <RotateCcw className="w-5 h-5" />
                        <span>Returned Products</span>
                      </CardTitle>
                      <CardDescription>
                        View all products that have been returned with their descriptions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {returnedProducts.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RotateCcw className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            No returned products
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400">
                            Returned products will appear here once customers return items.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {returnedProducts.map((returnedItem, index) => (
                            <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                      {returnedItem.productName}
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                    <p><span className="font-medium">SKU:</span> {returnedItem.productSku}</p>
                                    <p><span className="font-medium">Category:</span> {returnedItem.category}</p>
                                    <p><span className="font-medium">Quantity:</span> {returnedItem.quantity}</p>
                                    <p><span className="font-medium">Price per unit:</span> ₱{returnedItem.price.toFixed(0)}</p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-700 rounded-lg p-3 mb-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Return Reason:</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{returnedItem.description}</p>
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                                    <p>
                                      <span className="font-medium">Transaction:</span> #{returnedItem.transactionId.slice(-8)}
                                    </p>
                                    <p>
                                      <span className="font-medium">Returned:</span> {formatTransactionDate(returnedItem.returnedAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                    -₱{returnedItem.returnAmount.toFixed(0)}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Refunded Amount</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : activeTab === "distribute" ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
                  <div className="max-w-4xl mx-auto space-y-6 pb-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Distribute Stocks
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Distribute products from your stock to other cashiers
                    </p>
                  </div>

                  {/* Error and Success Messages */}
                  {error && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  )}

                  {distributionSuccess && (
                    <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">{distributionSuccess}</span>
                    </div>
                  )}

                  {/* Select Receiver Cashier */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Select Cashier</span>
                      </CardTitle>
                      <CardDescription>
                        Choose a cashier to distribute stocks to
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="receiverCashier">Receiver Cashier</Label>
                          <Select value={selectedReceiverCashier} onValueChange={setSelectedReceiverCashier}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select cashier to distribute to" />
                            </SelectTrigger>
                            <SelectContent>
                              {cashiers.map((cashier) => (
                                <SelectItem key={cashier.id || cashier._id} value={cashier.id || cashier._id}>
                                  {cashier.username || cashier.name} ({cashier.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {cashiers.length === 0 && (
                            <p className="text-sm text-slate-500 mt-1">No other cashiers available</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Select Product and Quantity */}
                  {selectedReceiverCashier && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Package className="w-5 h-5" />
                          <span>Select Products</span>
                        </CardTitle>
                        <CardDescription>
                          Choose products from your stock to distribute
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="product">Product</Label>
                            <Select 
                              value={selectedProductForDistribution} 
                              onValueChange={setSelectedProductForDistribution}
                              disabled={!selectedReceiverCashier || availableProducts.length === 0}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} - Stock: {product.stock} - ₱{product.price.toFixed(0)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {availableProducts.length === 0 && (
                              <p className="text-sm text-slate-500 mt-1">No products in your stock</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              placeholder="Enter quantity"
                              value={distributionQuantity}
                              onChange={(e) => setDistributionQuantity(e.target.value)}
                              className="mt-1"
                              disabled={!selectedProductForDistribution}
                              min="1"
                            />
                            {selectedProductForDistribution && (
                              <p className="text-xs text-slate-500 mt-1">
                                Available: {availableProducts.find(p => p.id === selectedProductForDistribution)?.stock || 0} units
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button 
                            onClick={handleAddToDistribution}
                            disabled={!selectedProductForDistribution || !distributionQuantity || !selectedReceiverCashier}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Distribution
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Distribution Items List */}
                  {distributionItems.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <ShoppingCart className="w-5 h-5" />
                          <span>Distribution Items</span>
                        </CardTitle>
                        <CardDescription>
                          Review items to be distributed
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {distributionItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productSku}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                  Quantity: {item.quantity} × ₱{item.price.toFixed(0)} = ₱{item.totalValue.toFixed(0)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveFromDistribution(item.productId)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Total items: {distributionItems.length} | 
                            Total value: ₱{distributionItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(0)}
                          </div>
                          <div className="flex space-x-3">
                            <Button 
                              variant="outline"
                              onClick={handleClearDistribution}
                              disabled={distributionItems.length === 0}
                            >
                              Clear All
                            </Button>
                            <Button 
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                              disabled={distributionItems.length === 0 || !selectedReceiverCashier || isDistributing}
                              onClick={handleDistributeStocks}
                            >
                              {isDistributing ? (
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Distributing...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Share2 className="w-4 h-4" />
                                  <span>Distribute Stocks</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        {/* Return Items Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <RotateCcw className="w-6 h-6 text-red-600" />
                <span>Return Items</span>
              </DialogTitle>
              <DialogDescription>
                Select items to return and provide a reason for each return
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-6">
                {/* Transaction Info */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Transaction ID: <span className="font-medium">#{selectedTransaction.id.slice(-8)}</span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Date: <span className="font-medium">{formatTransactionDate(selectedTransaction.createdAt)}</span>
                  </p>
                </div>

                {/* Items to Return */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Select Items to Return</h3>
                  {selectedTransaction.items.map((item, itemIndex) => {
                    // Calculate available quantity (subtract already returned)
                    const alreadyReturned = selectedTransaction.returnedItems?.reduce((sum, ret) => {
                      if (ret.productId === item.productId && ret.productSku === item.productSku) {
                        return sum + ret.quantity;
                      }
                      return sum;
                    }, 0) || 0;
                    
                    const availableToReturn = item.quantity - alreadyReturned;
                    const returnItem = returnItems.find(ri => ri.itemIndex === itemIndex);
                    const returnQuantity = returnItem?.quantity || 0;

                    if (availableToReturn <= 0) {
                      return null; // Skip items that are fully returned
                    }

                    return (
                      <div key={itemIndex} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productSku}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Available to return: {availableToReturn} / {item.quantity} purchased
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Price: ₱{item.price.toFixed(0)} each
                            </p>
                          </div>
                          <div className="ml-4">
                            {returnQuantity > 0 ? (
                              <Badge variant="destructive">Returning: {returnQuantity}</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddReturnItem(itemIndex)}
                              >
                                Add to Return
                              </Button>
                            )}
                          </div>
                        </div>

                        {returnQuantity > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Quantity:
                              </label>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateReturnQuantity(itemIndex, returnQuantity - 1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={availableToReturn}
                                  value={returnQuantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 0;
                                    handleUpdateReturnQuantity(itemIndex, qty);
                                  }}
                                  className="w-20 text-center"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateReturnQuantity(itemIndex, returnQuantity + 1)}
                                  disabled={returnQuantity >= availableToReturn}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveReturnItem(itemIndex)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                Return Reason (Required):
                              </label>
                              <textarea
                                rows={3}
                                value={returnItem?.description || ''}
                                onChange={(e) => handleUpdateReturnDescription(itemIndex, e.target.value)}
                                placeholder="Enter reason for return (e.g., Defective item, Wrong size, Customer request...)"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Refund amount: ₱{((item.total / item.quantity) * returnQuantity).toFixed(0)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {returnItems.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <RotateCcw className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Select items above to process returns
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsReturnModalOpen(false);
                      setReturnItems([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleProcessReturn}
                    disabled={returnItems.length === 0}
                  >
                    Process Return
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Transaction Details Modal */}
        <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <Receipt className="w-6 h-6 text-green-600" />
                <span>Transaction Details</span>
              </DialogTitle>
              <DialogDescription>
                Complete transaction information and item breakdown
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-6">
                {/* Transaction Header */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Transaction Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Transaction ID:</span>
                          <span className="font-medium">#{selectedTransaction.id.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Date & Time:</span>
                          <span className="font-medium">{formatTransactionDate(selectedTransaction.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Status:</span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {selectedTransaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Payment Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                          <span className="font-medium">₱{selectedTransaction.subtotal.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Overall Discount:</span>
                          <span className="font-medium text-red-600">-₱{selectedTransaction.overallDiscount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2">
                          <span className="font-semibold">Total Amount:</span>
                          <span className="font-bold text-lg text-green-600">₱{selectedTransaction.totalAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Cash Received:</span>
                          <span className="font-medium">₱{selectedTransaction.cashReceived.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Change:</span>
                          <span className="font-medium text-blue-600">₱{selectedTransaction.change.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span>Items Purchased</span>
                  </h3>
                  <div className="space-y-3">
                    {selectedTransaction.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productSku}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Category: {item.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm">
                              <p className="text-slate-600 dark:text-slate-400">Quantity: {item.quantity}</p>
                              <p className="text-slate-600 dark:text-slate-400">Price: ₱{item.price.toFixed(0)} each</p>
                              {item.discount > 0 && (
                                <p className="text-green-600 dark:text-green-400">
                                  Discount: {item.discount}%
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                ₱{item.total.toFixed(0)}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-sm text-slate-500 line-through">
                                  ₱{(item.price * item.quantity).toFixed(0)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Returned Items Display */}
                {selectedTransaction.returnedItems && selectedTransaction.returnedItems.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <RotateCcw className="w-5 h-5" />
                      <span>Returned Items</span>
                    </h3>
                    <div className="space-y-3">
                      {selectedTransaction.returnedItems.map((returnedItem, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">{returnedItem.productName}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {returnedItem.productSku}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Quantity: {returnedItem.quantity}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{returnedItem.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Returned: {formatTransactionDate(returnedItem.returnedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              -₱{returnedItem.returnAmount.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between space-x-3 pt-4 border-t">
                  {selectedTransaction.status === 'completed' && (
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenReturnModal(selectedTransaction)}
                      className="flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Return Items</span>
                    </Button>
                  )}
                  <div className="flex space-x-3 ml-auto">
                    <Button
                      variant="outline"
                      onClick={() => setIsTransactionModalOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

export default function CashierStocksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <CashierStocksPageContent />
    </Suspense>
  );
}
