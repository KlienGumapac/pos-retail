"use client";

import { useState, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  X,
  CreditCard,
  FileText,
  Users,
  ShoppingCart,
  RefreshCw,
  LayoutGrid,
  List,
  BarChart3
} from "lucide-react";
import JsBarcode from "jsbarcode";
import { ProductService } from "@/lib/productService";
import { UserService } from "@/lib/userService";
import { DistributionService } from "@/lib/distributionService";
import { useAuth } from "@/hooks/useAuth";

type ViewMode = "management" | "distribute";

export default function StocksPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "category" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("management" as ViewMode);
  const [viewPreference, setViewPreference] = useState<"cards" | "table">("cards");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment: '',
    reason: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    category: "",
    stock: "",
    minStock: "",
    images: [] as string[]
  });
  
  // Form data for new product
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    category: "",
    stock: "",
    minStock: "",
    images: [] as string[]
  });

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Cashier selection state
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<string>("");
  const [isLoadingCashiers, setIsLoadingCashiers] = useState(false);

  // Stock distribution state
  const [selectedProductForDistribution, setSelectedProductForDistribution] = useState<string>("");
  const [distributionQuantity, setDistributionQuantity] = useState<string>("");
  const [distributionItems, setDistributionItems] = useState<any[]>([]);

  // Real product data from API
  const [products, setProducts] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    price: number;
    cost: number;
    category: string;
    stock: number;
    minStock: number;
    isActive: boolean;
    images?: string[];
    createdAt: string | Date;
    updatedAt: string | Date;
  }>>([]);

  // Load products and cashiers on component mount
  useEffect(() => {
    loadProducts();
    loadCashiers();
  }, []);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const result = await ProductService.getProducts({
        search: searchTerm,
        category: filterCategory,
        sortBy,
        sortOrder
      });
      
      if (result.success) {
        setProducts(result.products);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadCashiers = async () => {
    setIsLoadingCashiers(true);
    try {
      const result = await UserService.getUsers();
      
      if (result.success) {
        // Filter only cashiers
        const cashierUsers = result.users.filter((user: any) => user.user_type === 'cashier' && user.isActive);
        setCashiers(cashierUsers);
      } else {
        setError(result.error || 'Failed to load cashiers');
      }
    } catch (err) {
      setError('Failed to load cashiers');
    } finally {
      setIsLoadingCashiers(false);
    }
  };

  const handleAddToDistribution = () => {
    if (!selectedProductForDistribution || !distributionQuantity || !selectedCashier) {
      setError('Please select a cashier, product, and enter quantity');
      return;
    }

    const product = products.find(p => p.id === selectedProductForDistribution);
    const quantity = parseInt(distributionQuantity);

    if (!product) {
      setError('Product not found');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (quantity > product.stock) {
      setError(`Insufficient stock. Available: ${product.stock} units`);
      return;
    }

    // Check if product already exists in distribution
    const existingItem = distributionItems.find(item => item.productId === selectedProductForDistribution);
    
    if (existingItem) {
      // Update existing item
      setDistributionItems(prev => prev.map(item => 
        item.productId === selectedProductForDistribution 
          ? { 
              ...item, 
              quantity: item.quantity + quantity,
              totalValue: (item.quantity + quantity) * item.price
            }
          : item
      ));
    } else {
      // Add new item
      console.log('Adding product to distribution:', {
        name: product.name,
        category: product.category,
        sku: product.sku,
        fullProduct: product
      });
      
      setDistributionItems(prev => [...prev, {
        productId: selectedProductForDistribution,
        productName: product.name,
        productSku: product.sku,
        category: product.category || "Accessories", // Fallback to Accessories if category is missing
        quantity: quantity,
        price: product.price,
        totalValue: product.price * quantity
      }]);
    }

    setSuccess(`Added ${quantity} units of ${product.name} to distribution`);
    setSelectedProductForDistribution("");
    setDistributionQuantity("");
  };

  const handleRemoveFromDistribution = (productId: string) => {
    setDistributionItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClearDistribution = () => {
    setDistributionItems([]);
    setSelectedProductForDistribution("");
    setDistributionQuantity("");
  };

  const handleDistributeStocks = async () => {
    if (!user || !selectedCashier || distributionItems.length === 0) {
      setError('Please select a cashier and add items to distribute');
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('Sending distribution with items:', distributionItems);
      
      const result = await DistributionService.createDistribution({
        adminId: user.id,
        cashierId: selectedCashier,
        items: distributionItems,
        notes: `Stock distribution to ${cashiers.find(c => (c.id || c._id) === selectedCashier)?.username || 'cashier'}`
      });

      if (result.success) {
        setSuccess(`Successfully distributed ${distributionItems.length} items worth ₱${distributionItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(0)} to cashier!`);
        
        // Clear the distribution form
        setDistributionItems([]);
        setSelectedProductForDistribution("");
        setDistributionQuantity("");
        setSelectedCashier("");
        
        // Reload products to reflect updated stock levels
        await loadProducts();
      } else {
        setError(result.error || 'Failed to distribute stocks');
      }
    } catch (err) {
      setError('An unexpected error occurred while distributing stocks');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload products when filters change
  useEffect(() => {
    loadProducts();
  }, [searchTerm, filterCategory, sortBy, sortOrder]);

  const categories = ["all", "Pyesa", "Units", "Batteries", "Accessories"];

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Image upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsUploadingImage(true);
    try {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Convert to base64 for now (in production, upload to cloud storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, result]
        }));
        setSuccess('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Product action handlers
  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDeleteProduct = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    setIsLoading(true);
    try {
      const result = await ProductService.deleteProduct(selectedProduct.id);
      
      if (result.success) {
        setSuccess('Product deleted successfully!');
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
        // Reload products
        await loadProducts();
      } else {
        setError(result.error || 'Failed to delete product');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockAdjustment = (product: any) => {
    setSelectedProduct(product);
    setStockAdjustment({ adjustment: '', reason: '' });
    setIsStockModalOpen(true);
  };

  const handleStockInputChange = (field: string, value: string) => {
    setStockAdjustment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const confirmStockAdjustment = async () => {
    if (!selectedProduct || !stockAdjustment.adjustment) return;
    
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const adjustment = parseInt(stockAdjustment.adjustment);
      if (isNaN(adjustment)) {
        setError('Please enter a valid number');
        return;
      }

      const result = await ProductService.adjustStock(
        selectedProduct.id, 
        adjustment, 
        stockAdjustment.reason
      );
      
      if (result.success) {
        setSuccess(`Stock ${adjustment >= 0 ? 'added' : 'reduced'} successfully! New stock: ${result.product.stock}`);
        setIsStockModalOpen(false);
        setSelectedProduct(null);
        setStockAdjustment({ adjustment: '', reason: '' });
        // Reload products
        await loadProducts();
      } else {
        setError(result.error || 'Failed to adjust stock');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      barcode: product.barcode || "",
      price: product.price.toString(),
      cost: product.cost.toString(),
      category: product.category,
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      images: product.images || []
    });
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditImageUpload = async (files: FileList) => {
    setIsUploadingImage(true);
    try {
      const file = files[0];
      
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditFormData(prev => ({
          ...prev,
          images: [...prev.images, result]
        }));
        setSuccess('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeEditImage = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    
    try {
      const result = await ProductService.updateProduct(selectedProduct.id, {
        name: editFormData.name,
        description: editFormData.description,
        sku: editFormData.sku,
        barcode: editFormData.barcode,
        price: parseFloat(editFormData.price),
        cost: parseFloat(editFormData.cost),
        category: editFormData.category,
        stock: parseInt(editFormData.stock),
        minStock: parseInt(editFormData.minStock),
        images: editFormData.images
      });
      
      if (result.success) {
        setSuccess('Product updated successfully!');
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        setEditFormData({
          name: "",
          description: "",
          sku: "",
          barcode: "",
          price: "",
          cost: "",
          category: "",
          stock: "",
          minStock: "",
          images: []
        });
        // Reload products
        await loadProducts();
      } else {
        setError(result.error || 'Failed to update product');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Print barcode function
  const handlePrintBarcode = (product: any) => {
    setSelectedProductForPrint(product);
    setIsPrintModalOpen(true);
  };

  const printBarcode = () => {
    if (!selectedProductForPrint) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcode - ${selectedProductForPrint.name}</title>
        <style>
          @page {
            size: 4in 2in;
            margin: 0.2in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .barcode-container {
            text-align: center;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 5px;
            background: white;
          }
          .product-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            word-wrap: break-word;
            max-width: 3.5in;
          }
          .product-sku {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          .product-price {
            font-size: 14px;
            font-weight: bold;
            color: #2d5a27;
            margin-bottom: 10px;
          }
          .barcode {
            margin: 10px 0;
          }
          .barcode-number {
            font-size: 8px;
            font-family: monospace;
            margin-top: 5px;
          }
          .category {
            font-size: 10px;
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="product-name">${selectedProductForPrint.name}</div>
          <div class="product-sku">SKU: ${selectedProductForPrint.sku}</div>
          <div class="product-price">₱${selectedProductForPrint.price.toFixed(0)}</div>
          <div class="barcode">
            <canvas id="barcode-canvas" width="300" height="60"></canvas>
          </div>
          <div class="barcode-number">${selectedProductForPrint.barcode || 'No barcode'}</div>
          <div class="category">${selectedProductForPrint.category}</div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          if (document.getElementById('barcode-canvas') && '${selectedProductForPrint.barcode}') {
            try {
              JsBarcode('#barcode-canvas', '${selectedProductForPrint.barcode}', {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: false,
                margin: 0,
                background: "transparent",
                lineColor: "#000000"
              });
            } catch (e) {
              console.error('Barcode generation failed:', e);
            }
          }
          
          // Auto print after a short delay
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    
    try {
      const result = await ProductService.createProduct({
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        barcode: formData.barcode,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        category: formData.category,
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock) || 0,
        images: formData.images
      });
      
      if (result.success) {
        setSuccess('Product created successfully!');
        // Reset form
        setFormData({
          name: "",
          description: "",
          sku: "",
          barcode: "",
          price: "",
          cost: "",
          category: "",
          stock: "",
          minStock: "",
          images: []
        });
        setIsModalOpen(false);
        // Reload products
        await loadProducts();
      } else {
        setError(result.error || 'Failed to create product');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Use products directly since filtering is done on the server
  const filteredProducts = products;

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { status: "out", color: "text-red-600", bgColor: "bg-red-50", icon: AlertTriangle };
    if (stock <= minStock) return { status: "low", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: Clock };
    return { status: "good", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate barcode component
  const BarcodeDisplay = ({ barcode, productName }: { barcode: string; productName: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (canvasRef.current && barcode) {
        try {
          JsBarcode(canvasRef.current, barcode, {
            format: "CODE128",
            width: 1,
            height: 30,
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
        <div className="w-full h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">No barcode</span>
        </div>
      );
    }

    return (
      <div className="w-full">
        <canvas 
          ref={canvasRef} 
          className="w-full h-8"
          title={`Barcode for ${productName}`}
        />
        <div className="text-center mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{barcode}</span>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminHeader 
          title="Stock Management" 
          subtitle="Manage your inventory and track stock levels"
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Stock Management
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Manage your inventory and track stock levels
            </p>
          </div>

           {viewMode === "management" ? (
             <>
               {/* Action Bar */}
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-0 p-4 sm:p-6 mb-6 sm:mb-8">
                 {/* View Mode Toggle */}
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                   <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto">
                     <Button
                       variant={viewMode === "management" ? "default" : "ghost"}
                       size="sm"
                       onClick={() => setViewMode("management")}
                       className="flex items-center space-x-1 sm:space-x-2 flex-1 sm:flex-none text-xs sm:text-sm"
                     >
                       <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                       <span className="hidden xs:inline">Stock Management</span>
                       <span className="xs:hidden">Stock</span>
                     </Button>
                     <Button
                       variant={(viewMode as ViewMode) === "distribute" ? "default" : "ghost"}
                       size="sm"
                       onClick={() => setViewMode("distribute")}
                       className="flex items-center space-x-1 sm:space-x-2 flex-1 sm:flex-none text-xs sm:text-sm"
                     >
                       <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                       <span className="hidden xs:inline">Distribute Stocks</span>
                       <span className="xs:hidden">Distribute</span>
                     </Button>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2">
                     {/* View Toggle */}
                     <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto">
                       <Button
                         variant={viewPreference === "cards" ? "default" : "ghost"}
                         size="sm"
                         onClick={() => setViewPreference("cards")}
                         className="flex items-center space-x-1 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-none"
                       >
                         <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="hidden xs:inline">Cards</span>
                       </Button>
                       <Button
                         variant={viewPreference === "table" ? "default" : "ghost"}
                         size="sm"
                         onClick={() => setViewPreference("table")}
                         className="flex items-center space-x-1 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-none"
                       >
                         <List className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="hidden xs:inline">Table</span>
                       </Button>
                     </div>
                     
                     <Button variant="outline" size="sm" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm w-full sm:w-auto">
                       <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                       <span>Refresh</span>
                     </Button>
                   </div>
                 </div>
            <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.slice(1).map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="date">Date Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 w-full sm:w-auto"
              >
                {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                <span className="ml-2 sm:hidden">{sortOrder === "asc" ? "Asc" : "Desc"}</span>
              </Button>
            </div>
            </div>
          </div>

          {/* Add Product Button */}
          <div className="mb-6">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span>Add New Product</span>
                  </DialogTitle>
                  <DialogDescription>
                    Enter the product details to add it to your inventory
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
                    </div>
                  )}

                  {/* Product Images */}
                  <div className="space-y-2">
                    <Label>Product Images</Label>
                    
                    {/* Upload Area */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="image-upload"
                        disabled={isUploadingImage}
                      />
                      <label 
                        htmlFor="image-upload" 
                        className="cursor-pointer block"
                      >
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                            <p className="text-sm text-slate-500">Uploading...</p>
                          </div>
                        ) : (
                          <div>
                            <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                            <p className="text-xs text-slate-400">PNG, JPG up to 10MB each</p>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Image Preview */}
                    {formData.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={image} 
                              alt={`Product ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input 
                        id="name" 
                        name="name"
                        placeholder="Enter product name" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input 
                        id="sku" 
                        name="sku"
                        placeholder="Enter SKU" 
                        value={formData.sku}
                        onChange={handleInputChange}
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description"
                      placeholder="Enter product description" 
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input 
                        id="barcode" 
                        name="barcode"
                        placeholder="Enter barcode" 
                        value={formData.barcode}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select name="category" value={formData.category} onValueChange={(value: string) => setFormData(prev => ({ ...prev, category: value }))} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pyesa">Pyesa</SelectItem>
                          <SelectItem value="Units">Units</SelectItem>
                          <SelectItem value="Batteries">Batteries</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Selling Price (₱) *</Label>
                      <Input 
                        id="price" 
                        name="price"
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={formData.price}
                        onChange={handleInputChange}
                        required 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost">Cost Price (₱) *</Label>
                      <Input 
                        id="cost" 
                        name="cost"
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={formData.cost}
                        onChange={handleInputChange}
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Initial Stock *</Label>
                      <Input 
                        id="stock" 
                        name="stock"
                        type="number" 
                        placeholder="0" 
                        value={formData.stock}
                        onChange={handleInputChange}
                        required 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Minimum Stock Level</Label>
                      <Input 
                        id="minStock" 
                        name="minStock"
                        type="number" 
                        placeholder="0" 
                        value={formData.minStock}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsModalOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Plus className="w-4 h-4" />
                          <span>Add Product</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products Display */}
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
              </div>
            </div>
          ) : viewPreference === "cards" ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.minStock);
              const StatusIcon = stockStatus.icon;
              
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 border-0 shadow-lg hover:scale-105 group">
                  <div className="relative">
                    {/* Product Image */}
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                      )}
                    </div>
                    
                    {/* Stock Status Badge */}
                    <div className={`absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold shadow-lg ${stockStatus.bgColor} ${stockStatus.color}`}>
                      <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />
                      <span className="hidden xs:inline">{stockStatus.status === 'out' ? 'Out' : stockStatus.status === 'low' ? 'Low' : 'Good'}</span>
                    </div>
                  </div>

                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      {/* Product Name */}
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      
                      {/* SKU */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">SKU: {product.sku}</p>

                      {/* Stock & Price */}
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Stock:</span>
                          <span className={`text-xs sm:text-sm font-bold ${stockStatus.color}`}>
                            {product.stock}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Price:</span>
                          <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                            ₱{product.price.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Barcode Display */}
                      <div className="pt-1">
                        <BarcodeDisplay barcode={product.barcode || ''} productName={product.name} />
                      </div>

                      {/* Stock Status Text */}
                      <div className="flex justify-center pt-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-sm ${
                          stockStatus.status === 'out' 
                            ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400'
                            : stockStatus.status === 'low'
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 dark:from-yellow-900/20 dark:to-amber-900/20 dark:text-yellow-400'
                            : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400'
                        }`}>
                          <span className="hidden sm:inline">
                            {stockStatus.status === 'out' 
                              ? 'Out of Stock' 
                              : stockStatus.status === 'low'
                              ? 'Low Stock'
                              : 'Good Stock'
                            }
                          </span>
                          <span className="sm:hidden">
                            {stockStatus.status === 'out' 
                              ? 'Out' 
                              : stockStatus.status === 'low'
                              ? 'Low'
                              : 'Good'
                            }
                          </span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-5 gap-0.5 pt-1 sm:pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 sm:h-8 px-0.5 sm:px-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => handleViewProduct(product)}
                          title="View Details"
                        >
                          <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 sm:h-8 px-0.5 sm:px-1 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          onClick={() => handleStockAdjustment(product)}
                          title="Adjust Stock"
                        >
                          <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 sm:h-8 px-0.5 sm:px-1 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          onClick={() => handleEditProduct(product)}
                          title="Edit Product"
                        >
                          <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 sm:h-8 px-0.5 sm:px-1 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                          onClick={() => handlePrintBarcode(product)}
                          title="Print Barcode"
                        >
                          <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 sm:h-8 px-0.5 sm:px-1 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          onClick={() => handleDeleteProduct(product)}
                          title="Delete Product"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
              
              {/* Empty State */}
              {filteredProducts.length === 0 && (
                <div className="col-span-full flex items-center justify-center py-16">
                  <div className="text-center bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border-0 max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      No products found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {searchTerm || filterCategory !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "Get started by adding your first product"
                      }
                    </p>
                    {!searchTerm && filterCategory === "all" && (
                      <Button 
                        size="sm" 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Product
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-0 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Barcode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock, product.minStock);
                      const StatusIcon = stockStatus.icon;
                      
                      return (
                        <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                {product.images && product.images.length > 0 ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {product.name}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {product.description || 'No description'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900 dark:text-slate-100 font-mono">
                              {product.sku}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {product.stock}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              ₱{product.price.toFixed(0)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="w-24">
                              <BarcodeDisplay barcode={product.barcode || ''} productName={product.name} />
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${stockStatus.bgColor} ${stockStatus.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className="capitalize">{stockStatus.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-0.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProduct(product)}
                                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStockAdjustment(product)}
                                className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                                title="Adjust Stock"
                              >
                                <Package className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                className="h-7 w-7 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400"
                                title="Edit Product"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintBarcode(product)}
                                className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 dark:text-orange-400 dark:hover:text-orange-300"
                                title="Print Barcode"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteProduct(product)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Table */}
              <div className="lg:hidden">
                <div className="space-y-3 p-4">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock, product.minStock);
                    const StatusIcon = stockStatus.icon;
                    
                    return (
                      <div key={product.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                        {/* Product Header */}
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {product.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {product.description || 'No description'}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                SKU: {product.sku}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                                {product.category}
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span className="capitalize">{stockStatus.status}</span>
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stock</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {product.stock} units
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Price</div>
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ₱{product.price.toFixed(0)}
                            </div>
                          </div>
                        </div>

                        {/* Barcode Display */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Barcode</div>
                          <BarcodeDisplay barcode={product.barcode || ''} productName={product.name} />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                          <div className="grid grid-cols-5 gap-1 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStockAdjustment(product)}
                              className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                              title="Adjust Stock"
                            >
                              <Package className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="h-7 w-7 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400"
                              title="Edit Product"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintBarcode(product)}
                              className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 dark:text-orange-400 dark:hover:text-orange-300"
                              title="Print Barcode"
                            >
                              <FileText className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Empty State for Table */}
              {filteredProducts.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      No products found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {searchTerm || filterCategory !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "Get started by adding your first product"
                      }
                    </p>
                    {!searchTerm && filterCategory === "all" && (
                      <Button 
                        size="sm" 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Product
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Product Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="flex items-center space-x-3 text-xl sm:text-2xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <span>Product Details</span>
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Complete information and specifications for this product
                </DialogDescription>
              </DialogHeader>
              
              {selectedProduct && (
                <div className="space-y-6 sm:space-y-8 py-4 sm:py-6">
                  {/* Product Header with Image and Basic Info */}
                  <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                    {/* Product Image */}
                    <div className="flex-shrink-0 mx-auto lg:mx-0">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                        {selectedProduct.images && selectedProduct.images.length > 0 ? (
                          <img 
                            src={selectedProduct.images[0]} 
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs sm:text-sm text-slate-500">No Image</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Basic Product Information */}
                    <div className="flex-1 space-y-4 sm:space-y-6">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 break-words">
                          {selectedProduct.name}
                        </h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <span className="text-base sm:text-lg text-slate-600 dark:text-slate-400">SKU: {selectedProduct.sku}</span>
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium w-fit">
                            {selectedProduct.category}
                          </span>
                        </div>
                      </div>

                      {/* Stock Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
                        {(() => {
                          const stockStatus = getStockStatus(selectedProduct.stock, selectedProduct.minStock);
                          const StatusIcon = stockStatus.icon;
                          return (
                            <div className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium w-fit ${stockStatus.bgColor} ${stockStatus.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="capitalize">{stockStatus.status} Stock</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">Selling Price</div>
                          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            ₱{selectedProduct.price.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">Current Stock</div>
                          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {selectedProduct.stock} units
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Product Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                          <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Product Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Product Name</Label>
                          <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1 break-words">
                            {selectedProduct.name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">SKU</Label>
                          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-1 font-mono break-all">
                            {selectedProduct.sku}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Category</Label>
                          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-1">
                            {selectedProduct.category}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Barcode</Label>
                          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-1 font-mono break-all">
                            {selectedProduct.barcode || 'Not specified'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pricing & Stock */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Pricing & Stock</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Selling Price</Label>
                            <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                              ₱{selectedProduct.price.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Cost Price</Label>
                            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                              ₱{selectedProduct.cost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Current Stock</Label>
                            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                              {selectedProduct.stock} units
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Min. Stock</Label>
                            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                              {selectedProduct.minStock} units
                            </p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Profit Margin</Label>
                          <p className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            {((selectedProduct.price - selectedProduct.cost) / selectedProduct.cost * 100).toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Description</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                          {selectedProduct.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Additional Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Created</Label>
                          <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-1 break-words">
                            {new Date(selectedProduct.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Last Updated</Label>
                          <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-1 break-words">
                            {new Date(selectedProduct.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Status</Label>
                          <p className="mt-1">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                              selectedProduct.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {selectedProduct.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Product Modal */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span>Delete Product</span>
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this product? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              {selectedProduct && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>Product:</strong> {selectedProduct.name}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>SKU:</strong> {selectedProduct.sku}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={confirmDeleteProduct}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Product</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Stock Adjustment Modal */}
          <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <span>Adjust Stock</span>
                </DialogTitle>
                <DialogDescription>
                  Add or reduce stock for this product
                </DialogDescription>
              </DialogHeader>
              
              {selectedProduct && (
                <div className="space-y-4">
                  {/* Product Info */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>Product:</strong> {selectedProduct.name}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>Current Stock:</strong> {selectedProduct.stock} units
                    </p>
                  </div>

                  {/* Stock Adjustment Form */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="adjustment">Stock Adjustment</Label>
                      <Input
                        id="adjustment"
                        type="number"
                        placeholder="Enter positive number to add, negative to reduce"
                        value={stockAdjustment.adjustment}
                        onChange={(e) => handleStockInputChange('adjustment', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use positive numbers to add stock, negative numbers to reduce stock
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Enter reason for stock adjustment..."
                        value={stockAdjustment.reason}
                        onChange={(e) => handleStockInputChange('reason', e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    {/* Preview New Stock */}
                    {stockAdjustment.adjustment && !isNaN(parseInt(stockAdjustment.adjustment)) && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          <strong>New Stock:</strong> {selectedProduct.stock + parseInt(stockAdjustment.adjustment)} units
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsStockModalOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={confirmStockAdjustment}
                      disabled={isLoading || !stockAdjustment.adjustment}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Adjusting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>Adjust Stock</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Product Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Edit className="w-5 h-5" />
                  <span>Edit Product</span>
                </DialogTitle>
                <DialogDescription>
                  Update the product information
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditSubmit} className="space-y-6">
                {/* Error and Success Messages */}
                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
                  </div>
                )}

                {/* Product Images Upload */}
                <div className="space-y-2">
                  <Label>Product Images</Label>
                  
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handleEditImageUpload(e.target.files)}
                      className="hidden"
                      id="edit-image-upload"
                      disabled={isUploadingImage}
                    />
                    <label 
                      htmlFor="edit-image-upload" 
                      className="cursor-pointer block"
                    >
                      {isUploadingImage ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                          <p className="text-sm text-slate-500">Uploading...</p>
                        </div>
                      ) : (
                        <div>
                          <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-400">PNG, JPG up to 10MB each</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Image Preview */}
                  {editFormData.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {editFormData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={image} 
                            alt={`Product ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Product Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => handleEditInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-sku">SKU *</Label>
                    <Input
                      id="edit-sku"
                      value={editFormData.sku}
                      onChange={(e) => handleEditInputChange('sku', e.target.value)}
                      placeholder="Enter SKU"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-barcode">Barcode</Label>
                    <Input
                      id="edit-barcode"
                      value={editFormData.barcode}
                      onChange={(e) => handleEditInputChange('barcode', e.target.value)}
                      placeholder="Enter barcode"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select value={editFormData.category} onValueChange={(value: string) => handleEditInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pyesa">Pyesa</SelectItem>
                        <SelectItem value="Units">Units</SelectItem>
                        <SelectItem value="Batteries">Batteries</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => handleEditInputChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">Selling Price (₱) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={editFormData.price}
                      onChange={(e) => handleEditInputChange('price', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-cost">Cost Price (₱) *</Label>
                    <Input
                      id="edit-cost"
                      type="number"
                      step="0.01"
                      value={editFormData.cost}
                      onChange={(e) => handleEditInputChange('cost', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-stock">Current Stock *</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={editFormData.stock}
                      onChange={(e) => handleEditInputChange('stock', e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-minStock">Minimum Stock</Label>
                    <Input
                      id="edit-minStock"
                      type="number"
                      value={editFormData.minStock}
                      onChange={(e) => handleEditInputChange('minStock', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Edit className="w-4 h-4" />
                        <span>Update Product</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
            </>
          ) : (
             <>
               {/* Distribute Stocks Section */}
               <div className="space-y-6">
                 {/* View Mode Toggle */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-0 p-4 sm:p-6">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                     <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto">
                       <Button
                         variant={(viewMode as ViewMode) === "management" ? "default" : "ghost"}
                         size="sm"
                         onClick={() => setViewMode("management")}
                         className="flex items-center space-x-1 sm:space-x-2 flex-1 sm:flex-none text-xs sm:text-sm"
                       >
                         <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="hidden xs:inline">Stock Management</span>
                         <span className="xs:hidden">Stock</span>
                       </Button>
                       <Button
                         variant={(viewMode as ViewMode) === "distribute" ? "default" : "ghost"}
                         size="sm"
                         onClick={() => setViewMode("distribute")}
                         className="flex items-center space-x-1 sm:space-x-2 flex-1 sm:flex-none text-xs sm:text-sm"
                       >
                         <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="hidden xs:inline">Distribute Stocks</span>
                         <span className="xs:hidden">Distribute</span>
                       </Button>
                     </div>
                     
                     <div className="flex items-center justify-end">
                       <Button variant="outline" size="sm" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm w-full sm:w-auto">
                         <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span>Refresh</span>
                       </Button>
                     </div>
                   </div>
                 </div>
                {/* Cashier Selection */}
                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cashier" className="text-sm font-medium">Cashier</Label>
                        <Select value={selectedCashier} onValueChange={setSelectedCashier} disabled={isLoadingCashiers}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={isLoadingCashiers ? "Loading cashiers..." : "Select cashier"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cashiers.map((cashier) => (
                              <SelectItem key={cashier.id || cashier._id} value={cashier.id || cashier._id}>
                                {cashier.username} ({cashier.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {cashiers.length === 0 && !isLoadingCashiers && (
                          <p className="text-sm text-slate-500 mt-1">No active cashiers found</p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button 
                          className="w-full" 
                          disabled={!selectedCashier || isLoadingCashiers}
                          onClick={() => {
                            if (selectedCashier) {
                              setSuccess(`Cashier selected successfully!`);
                            }
                          }}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {selectedCashier ? 'Cashier Selected' : 'Select Cashier'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Distribution */}
                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Distribute Stocks</span>
                    </CardTitle>
                    <CardDescription>
                      Add stocks to distribute to the selected cashier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Error and Success Messages */}
                    {error && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                      </div>
                    )}

                    {success && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Product Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product" className="text-sm font-medium">Product</Label>
                          <Select value={selectedProductForDistribution} onValueChange={setSelectedProductForDistribution} disabled={!selectedCashier}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={!selectedCashier ? "Select cashier first" : "Select product"} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - Stock: {product.stock} - ₱{product.price.toFixed(0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {products.length === 0 && (
                            <p className="text-sm text-slate-500 mt-1">No products available</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
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
                              Available: {products.find(p => p.id === selectedProductForDistribution)?.stock || 0} units
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Add Stock Button */}
                      <div className="flex justify-end">
                        <Button 
                          className="flex items-center space-x-2"
                          onClick={handleAddToDistribution}
                          disabled={!selectedProductForDistribution || !distributionQuantity || !selectedCashier}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Distribution</span>
                        </Button>
                      </div>

                      {/* Selected Stocks Table */}
                      <div className="border rounded-lg">
                        <div className="bg-slate-50 dark:bg-slate-700 px-4 py-3 border-b">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Selected Stocks</h3>
                        </div>
                        <div className="p-4">
                          {distributionItems.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                              <Package className="w-8 h-8 mx-auto mb-2" />
                              <p>No stocks selected yet</p>
                              <p className="text-sm">Add products to distribute to the cashier</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {distributionItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productSku}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                      Category: <span className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full ml-1">
                                        {item.category}
                                      </span>
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
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
                          )}
                        </div>
                      </div>

                      {/* Distribution Actions */}
                      <div className="flex justify-between items-center pt-4 border-t">
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
                            disabled={distributionItems.length === 0 || !selectedCashier || isLoading}
                            onClick={handleDistributeStocks}
                          >
                            {isLoading ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Distributing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <ShoppingCart className="w-4 h-4" />
                                <span>Distribute Stocks</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Distribution History */}
                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Recent Distributions</span>
                    </CardTitle>
                    <CardDescription>
                      View recent stock distributions to cashiers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedCashier ? (
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {cashiers.find(c => (c.id || c._id) === selectedCashier)?.username || 'Selected Cashier'}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {cashiers.find(c => (c.id || c._id) === selectedCashier)?.email || ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Currently Selected</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Ready for distribution</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2" />
                          <p>No cashier selected</p>
                          <p className="text-sm">Select a cashier above to start distributing stocks</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">Sample Distribution</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">2 items distributed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600 dark:text-slate-400">1 day ago</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">MacBook Pro, Phone Case</p>
                        </div>
                      </div>

                      <div className="text-center py-4">
                        <Button variant="outline" size="sm">
                          View All Distributions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
          {/* Print Barcode Modal */}
          <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Print Barcode</span>
                </DialogTitle>
                <DialogDescription>
                  Print a barcode label for this product
                </DialogDescription>
              </DialogHeader>
              
              {selectedProductForPrint && (
                <div className="space-y-4">
                  {/* Product Info */}
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      <strong>Product:</strong> {selectedProductForPrint.name}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      <strong>SKU:</strong> {selectedProductForPrint.sku}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      <strong>Barcode:</strong> {selectedProductForPrint.barcode || 'No barcode set'}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      <strong>Price:</strong> ₱{selectedProductForPrint.price.toFixed(0)}
                    </p>
                  </div>

                  {!selectedProductForPrint.barcode && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">
                          This product doesn't have a barcode. Please add a barcode first.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPrintModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={printBarcode}
                      disabled={!selectedProductForPrint.barcode}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print Barcode
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
    </ProtectedRoute>
  );
}

