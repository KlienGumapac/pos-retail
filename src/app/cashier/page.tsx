"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { CashierHeader } from "@/components/cashier/CashierHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Users,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Receipt,
  CreditCard,
  BarChart3,
  FileText,
  Loader2
} from "lucide-react";
import { TransactionService, Transaction } from "@/lib/transactionService";
import { DistributionService, Distribution } from "@/lib/distributionService";
import { useAuth } from "@/hooks/useAuth";
import { PendingOrderNotification } from "@/components/cashier/PendingOrderNotification";

export default function CashierDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Redirect cashiers to stocks page instead of dashboard
  useEffect(() => {
    router.push("/cashier/stocks");
  }, [router]);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    averageOrderValue: 0,
    lowStockItems: 0,
    cashierName: user?.username || "Cashier",
    salesGrowth: 0,
    recentTransactions: [] as Transaction[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Load transactions and distributions in parallel
      const [transactionsResult, distributionsResult] = await Promise.all([
        TransactionService.getTransactions(user.id),
        DistributionService.getCashierDistributions(user.id)
      ]);

      let allTransactions: Transaction[] = [];
      let allDistributions: Distribution[] = [];

      if (transactionsResult.success && transactionsResult.transactions) {
        allTransactions = transactionsResult.transactions;
        setTransactions(allTransactions);
      }

      if (distributionsResult.success && distributionsResult.distributions) {
        allDistributions = distributionsResult.distributions;
        setDistributions(allDistributions);
      }

      // Calculate dashboard stats
      const dashboardStats = calculateDashboardStats(allTransactions, allDistributions);
      setStats(dashboardStats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDashboardStats = (transactions: Transaction[], distributions: Distribution[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter today's transactions
    const todayTransactions = transactions.filter(t => 
      new Date(t.createdAt) >= today
    );

    // Calculate today's sales
    const todaySales = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    
    // Calculate average order value
    const averageOrderValue = todayTransactions.length > 0 
      ? todaySales / todayTransactions.length 
      : 0;

    // Calculate sales growth (compare with yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= yesterday && transactionDate < today;
    });
    const yesterdaySales = yesterdayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const salesGrowth = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : 0;

    // Calculate low stock items (items with quantity <= 5)
    const lowStockItems = distributions.reduce((count, dist) => {
      if (dist.status === 'delivered') {
        return count + dist.items.filter(item => item.quantity <= 5).length;
      }
      return count;
    }, 0);

    // Get recent transactions (last 5)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      todaySales,
      todayTransactions: todayTransactions.length,
      averageOrderValue,
      lowStockItems,
      cashierName: user?.username || "Cashier",
      salesGrowth: Math.round(salesGrowth * 10) / 10, // Round to 1 decimal
      recentTransactions
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  const formatTransactionTime = (dateString: string) => {
    const now = new Date();
    const transactionDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-sale':
        router.push('/cashier/stocks');
        break;
      case 'check-stock':
        router.push('/cashier/stocks');
        break;
      case 'view-records':
        router.push('/cashier/stocks?tab=transactions');
        break;
      default:
        break;
    }
  };

  return (
    <ProtectedRoute requiredRoles={['cashier']}>
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
        <CashierHeader 
          title="Cashier Dashboard" 
          subtitle="Your sales performance overview"
        />
        
        <main className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto scrollbar-hide">
          {/* Pending Order Notification */}
          <PendingOrderNotification />
          
          {/* Welcome Section */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-2">
                  Welcome back, {stats.cashierName}!
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400">
                  Monitor your sales performance and manage transactions
                </p>
              </div>
              <Button 
                onClick={loadDashboardData} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="flex items-center space-x-2 w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Today's Sales */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Today's Sales
                </CardTitle>
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(stats.todaySales)}
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                    +{stats.salesGrowth}% from yesterday
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Today's Transactions */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Transactions
                </CardTitle>
                <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.todayTransactions}
                </div>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Orders processed today
                </p>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Average Order
                </CardTitle>
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(stats.averageOrderValue)}
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Per transaction
                </p>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Low Stock Alert
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {stats.lowStockItems}
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Items need restocking
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Quick Actions */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start h-12" 
                  variant="outline"
                  onClick={() => handleQuickAction('new-sale')}
                >
                  <Receipt className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">New Sale</div>
                    <div className="text-xs text-slate-500">Start a new transaction</div>
                  </div>
                </Button>
                <Button 
                  className="w-full justify-start h-12" 
                  variant="outline"
                  onClick={() => handleQuickAction('check-stock')}
                >
                  <Package className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Check Stock</div>
                    <div className="text-xs text-slate-500">View inventory levels</div>
                  </div>
                </Button>
                <Button 
                  className="w-full justify-start h-12" 
                  variant="outline"
                  onClick={() => handleQuickAction('view-records')}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">View Records</div>
                    <div className="text-xs text-slate-500">Transaction history</div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Transactions</span>
                </CardTitle>
                <CardDescription>
                  Latest sales and activities
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
                ) : stats.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      No transactions yet
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Your recent transactions will appear here once you start making sales.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-500' : 
                            transaction.status === 'refunded' ? 'bg-red-500' : 'bg-gray-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              Transaction #{transaction.id.slice(-8)}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {formatTransactionTime(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(transaction.totalAmount)}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Performance</span>
                </CardTitle>
                <CardDescription>
                  Your sales statistics and metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Today's Growth</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.salesGrowth >= 0 ? '+' : ''}{stats.salesGrowth}%
                      </p>
                    </div>
                    {stats.salesGrowth >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Items Sold</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {transactions.reduce((sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
                      </p>
                    </div>
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Transactions</p>
                      <p className="text-2xl font-bold text-purple-600">{transactions.length}</p>
                    </div>
                    <Receipt className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>
                  Current system health and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">POS System</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">Stock Status</p>
                        <p className="text-sm text-green-600">
                          {distributions.filter(d => d.status === 'delivered').length} distributions
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">Last Activity</p>
                        <p className="text-sm text-blue-600">
                          {transactions.length > 0 ? formatTransactionTime(transactions[0].createdAt) : 'No activity'}
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
