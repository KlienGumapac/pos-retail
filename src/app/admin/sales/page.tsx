"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Receipt,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Loader2,
  RotateCcw
} from "lucide-react";
import { TransactionService, Transaction } from "@/lib/transactionService";
import { UserService } from "@/lib/userService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Chart Components

const SalesByCashierChart = ({ transactions, cashiers }: { transactions: Transaction[], cashiers: { id: string; name: string }[] }) => {
  // Calculate sales by cashier
  const cashierSales = transactions.reduce((acc, transaction) => {
    acc[transaction.cashierId] = (acc[transaction.cashierId] || 0) + transaction.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array format for Recharts
  const chartData = Object.entries(cashierSales).map(([cashierId, sales]) => {
    const cashier = cashiers.find(c => c.id === cashierId);
    return {
      name: cashier?.name || `Cashier ${cashierId.slice(-4)}`,
      sales: Math.round(sales),
      cashierId
    };
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const formatCurrency = (value: number) => `₱${value.toLocaleString()}`;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <PieChart width={400} height={300}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="sales"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </div>
  );
};

export default function SalesPage() {
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [selectedCashier, setSelectedCashier] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"reports" | "transactions">("reports");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [cashiers, setCashiers] = useState<{ id: string; name: string }[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Sales data calculated from transactions
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    topCashier: "N/A",
    salesGrowth: 0,
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    monthlyTrendChart: [] as { month: string; sales: number }[]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, dateRange, selectedCashier, cashiers]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all transactions (admin can see all transactions)
      const transactionsResult = await TransactionService.getTransactions();
      if (transactionsResult.success) {
        setTransactions(transactionsResult.transactions);
        console.log('Loaded transactions:', transactionsResult.transactions);
      }

      // Load cashiers
      const usersResult = await UserService.getUsers();
      if (usersResult.success) {
        const cashierUsers = usersResult.users.filter((user: any) => user.user_type === 'cashier');
        console.log('All users:', usersResult.users);
        console.log('Cashier users:', cashierUsers);
        
        const cashierOptions = [
          { id: "all", name: "All Cashiers" },
          ...cashierUsers.map((user: any) => ({ 
            id: user.id, 
            name: user.name || user.username || user.email || `User ${user.id.slice(-4)}` 
          }))
        ];
        setCashiers(cashierOptions);
        console.log('Cashier options:', cashierOptions);
      }
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by cashier
    if (selectedCashier !== "all") {
      filtered = filtered.filter(t => t.cashierId === selectedCashier);
    }

    // Filter by date range
    if (dateRange.startDate) {
      filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(dateRange.startDate));
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(t => new Date(t.createdAt) <= new Date(dateRange.endDate + 'T23:59:59'));
    }

    setFilteredTransactions(filtered);
    calculateSalesData(filtered);
  };

  const calculateSalesData = (transactions: Transaction[]) => {
    const totalSales = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = transactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate top cashier
    const cashierSales = transactions.reduce((acc, t) => {
      acc[t.cashierId] = (acc[t.cashierId] || 0) + t.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    console.log('Cashier sales:', cashierSales);
    console.log('Available cashiers:', cashiers);

    let topCashier = "N/A";
    if (Object.keys(cashierSales).length > 0) {
      const topCashierId = Object.keys(cashierSales).reduce((a, b) => 
        cashierSales[a] > cashierSales[b] ? a : b
      );
      topCashier = cashiers.find(c => c.id === topCashierId)?.name || `Cashier ${topCashierId.slice(-4)}`;
      console.log('Top cashier ID:', topCashierId, 'Name:', topCashier);
    }

    // Calculate time-based sales
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = transactions
      .filter(t => new Date(t.createdAt) >= today)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const weeklySales = transactions
      .filter(t => new Date(t.createdAt) >= weekAgo)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const monthlySales = transactions
      .filter(t => new Date(t.createdAt) >= monthAgo)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // Calculate monthly trend for last 12 months
    const monthlyTrendChart: { month: string; sales: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthSales = transactions
        .filter(t => {
          const transactionDate = new Date(t.createdAt);
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      monthlyTrendChart.push({
        month: `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
        sales: Math.round(monthSales)
      });
    }

    setSalesData({
      totalSales,
      totalTransactions,
      averageOrderValue,
      topCashier,
      salesGrowth: 0, // TODO: Calculate growth
      todaySales,
      weeklySales,
      monthlySales,
      monthlyTrendChart
    });
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

  const getCashierName = (cashierId: string) => {
    return cashiers.find(c => c.id === cashierId)?.name || "Unknown Cashier";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash':
        return <span className="text-sm font-bold text-green-600 dark:text-green-400">₱</span>;
      case 'Card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminHeader 
          title="Sales Module" 
          subtitle="View sales reports, transactions, and analytics"
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Sales Analytics
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Monitor your sales performance and transaction history
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-0 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === "reports" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("reports")}
                    className="flex items-center space-x-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Reports</span>
                  </Button>
                  <Button
                    variant={viewMode === "transactions" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("transactions")}
                    className="flex items-center space-x-2"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Transactions</span>
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center space-x-2"
                    onClick={loadData}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cashier" className="text-sm font-medium">Cashier</Label>
                  <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select cashier" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashiers.length > 0 ? (
                        cashiers.map((cashier) => (
                          <SelectItem key={cashier.id} value={cashier.id}>
                            {cashier.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-cashiers" disabled>
                          No cashiers found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {cashiers.length === 1 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Only "All Cashiers" option available. Create cashier users to see individual cashiers.
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button 
                    className="w-full flex items-center space-x-2"
                    onClick={applyFilters}
                    disabled={isLoading}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Apply Filters</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {viewMode === "reports" ? (
            <>
              {/* Sales Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                      Total Sales
                    </CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(salesData.totalSales)}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-600 dark:text-green-400">
                        +{salesData.salesGrowth}% this month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Total Transactions
                    </CardTitle>
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {salesData.totalTransactions}
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Orders processed
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Average Order Value
                    </CardTitle>
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(salesData.averageOrderValue)}
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Per transaction
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Top Cashier
                    </CardTitle>
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {salesData.topCashier}
                    </div>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      Highest sales
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <LineChartIcon className="w-5 h-5" />
                      <span>Sales Trend</span>
                    </CardTitle>
                    <CardDescription>
                      Monthly sales performance over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesData.monthlyTrendChart.length > 0 ? (
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={salesData.monthlyTrendChart}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                            <XAxis 
                              dataKey="month" 
                              className="text-xs"
                              stroke="#64748b"
                              tick={{ fill: 'currentColor', fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              className="text-xs"
                              stroke="#64748b"
                              tick={{ fill: 'currentColor', fontSize: 12 }}
                              tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px'
                              }}
                              formatter={(value: any) => `₱${value.toLocaleString()}`}
                              labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="sales" 
                              stroke="#3B82F6" 
                              strokeWidth={2}
                              dot={{ fill: '#3B82F6', r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="text-center">
                          <LineChartIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-500 dark:text-slate-400">No sales data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChartIcon className="w-5 h-5" />
                      <span>Sales by Cashier</span>
                    </CardTitle>
                    <CardDescription>
                      Performance breakdown by cashier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 p-4">
                      {filteredTransactions.length > 0 ? (
                        <SalesByCashierChart transactions={filteredTransactions} cashiers={cashiers} />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div className="text-center">
                            <PieChart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-500 dark:text-slate-400">No sales data available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <Calendar className="w-5 h-5" />
                      <span>Today's Sales</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(salesData.todaySales)}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <Calendar className="w-5 h-5" />
                      <span>This Week</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(salesData.weeklySales)}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Weekly performance
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                      <Calendar className="w-5 h-5" />
                      <span>This Month</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(salesData.monthlySales)}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Monthly performance
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* Transactions Table */}
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>Transaction History</span>
                  </CardTitle>
                  <CardDescription>
                    View all transactions with detailed information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-slate-600 dark:text-slate-400">Loading transactions...</p>
                      </div>
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        No transactions found
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        No transactions match your current filters.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Transaction ID
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Cashier
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Items
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Total Amount
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Cash Received
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Change
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Status
                            </th>
                            <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Date
                            </th>
                            <th className="text-right py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-200">
                              <td className="py-4 px-6">
                                <div className="flex items-center space-x-2">
                                  <Receipt className="w-4 h-4 text-slate-400" />
                                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    #{transaction.id.slice(-8)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                {getCashierName(transaction.cashierId)}
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                {transaction.items.length} items
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(transaction.totalAmount)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {formatCurrency(transaction.cashReceived)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {formatCurrency(transaction.change)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <Badge className={`${getStatusColor(transaction.status)}`}>
                                  {transaction.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                {formatDate(transaction.createdAt)}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  onClick={() => handleViewTransactionDetails(transaction)}
                                >
                                  <Eye className="w-4 h-4" />
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
            </>
          )}
        </main>

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
                          <span className="text-slate-600 dark:text-slate-400">Cashier:</span>
                          <span className="font-medium">{getCashierName(selectedTransaction.cashierId)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Date & Time:</span>
                          <span className="font-medium">{formatTransactionDate(selectedTransaction.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Status:</span>
                          <Badge className={`${getStatusColor(selectedTransaction.status)}`}>
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
                    <ShoppingCart className="w-5 h-5" />
                    <span>Items Purchased</span>
                  </h3>
                  <div className="space-y-3">
                    {selectedTransaction.items.map((item, index) => {
                      // Check if this item (or part of it) has been returned
                      const returnedForThisItem = selectedTransaction.returnedItems?.filter(ret => 
                        ret.productId === item.productId && ret.productSku === item.productSku
                      ) || [];
                      
                      const totalReturnedQty = returnedForThisItem.reduce((sum, ret) => sum + ret.quantity, 0);
                      const isFullyReturned = totalReturnedQty >= item.quantity;
                      const isPartiallyReturned = totalReturnedQty > 0 && totalReturnedQty < item.quantity;
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isFullyReturned 
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                              : isPartiallyReturned
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                              : 'bg-white dark:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                              isFullyReturned 
                                ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-400' 
                                : isPartiallyReturned
                                ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                                : 'bg-slate-200 dark:bg-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</h4>
                                {isFullyReturned && (
                                  <Badge variant="destructive" className="text-xs">Fully Returned</Badge>
                                )}
                                {isPartiallyReturned && (
                                  <Badge className="bg-yellow-600 text-white text-xs">Partially Returned</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productSku}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Category: {item.category}</p>
                              {totalReturnedQty > 0 && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  {totalReturnedQty} of {item.quantity} returned
                                </p>
                              )}
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
                      );
                    })}
                  </div>
                </div>

                {/* Returned Items Display */}
                {selectedTransaction.returnedItems && selectedTransaction.returnedItems.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <RotateCcw className="w-5 h-5" />
                      <span>Returned Items</span>
                    </h3>
                    <div className="space-y-3">
                      {selectedTransaction.returnedItems.map((returnedItem, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">{returnedItem.productName}</h4>
                              <Badge variant="destructive" className="text-xs">Returned</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                              <p><span className="font-medium">SKU:</span> {returnedItem.productSku}</p>
                              <p><span className="font-medium">Category:</span> {returnedItem.category}</p>
                              <p><span className="font-medium">Quantity Returned:</span> {returnedItem.quantity}</p>
                              <p><span className="font-medium">Price per unit:</span> ₱{returnedItem.price.toFixed(0)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 mt-2">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Return Reason:</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{returnedItem.description}</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              Returned: {formatTransactionDate(returnedItem.returnedAt)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              -₱{returnedItem.returnAmount.toFixed(0)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Refunded Amount</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsTransactionModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
