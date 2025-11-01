"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/apiConfig";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, User, UserPlus, Settings, Eye, EyeOff, ArrowUpDown, Edit, Trash2, AlertCircle, CheckCircle, RefreshCw, Clock, Power, PowerOff } from "lucide-react";
import { UserService } from "@/lib/userService";

export default function UsersPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [sortBy, setSortBy] = useState<"user_type" | "username" | "email">("user_type");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    user_type: "cashier",
    password: "",
    confirmPassword: "",
  });

  // Real user data from API
  const [users, setUsers] = useState<Array<{
    id?: string;
    _id?: string;
    username: string;
    email: string;
    user_type: string;
    isActive: boolean;
    createdAt: string | Date;
  }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    message: string;
    user: string;
    timestamp: string;
    color: string;
  }>>([]);

  // Load users on component mount
  useEffect(() => {
    const loadUsersData = async () => {
      setIsLoadingUsers(true);
      try {
        const result = await UserService.getUsers();
        if (result.success) {
          setUsers(result.users);
          
          // Generate recent activity based on users
          const activity = generateRecentActivity(result.users);
          setRecentActivity(activity);
        } else {
          setError(result.error || 'Failed to load users');
        }
      } catch {
        setError('Failed to load users');
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    loadUsersData();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await UserService.getUsers();
      if (result.success) {
        setUsers(result.users);
        
        // Generate recent activity based on users
        const activity = generateRecentActivity(result.users);
        setRecentActivity(activity);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const generateRecentActivity = (users: Array<{
    id?: string;
    _id?: string;
    username: string;
    email: string;
    user_type: string;
    isActive: boolean;
    createdAt: string | Date;
  }>) => {
    const activities: Array<{
      id: string;
      type: string;
      message: string;
      user: string;
      timestamp: string;
      color: string;
    }> = [];
    
    // Add some mock activities based on real users
    users.forEach((user, index) => {
      const timeAgo = index === 0 ? '2 minutes ago' : 
                     index === 1 ? '15 minutes ago' : 
                     index === 2 ? '1 hour ago' : 
                     `${index + 1} hours ago`;
      
      activities.push({
        id: `activity-${user.id}`,
        type: index % 3 === 0 ? 'user_created' : index % 3 === 1 ? 'user_updated' : 'user_logged_in',
        message: index % 3 === 0 ? 'New user created' : 
                index % 3 === 1 ? 'User profile updated' : 
                'User logged in',
        user: user.username,
        timestamp: timeAgo,
        color: index % 3 === 0 ? 'green' : index % 3 === 1 ? 'blue' : 'yellow'
      });
    });
    
    return activities.slice(0, 3); // Show only 3 most recent
  };

  // Calculate user statistics
  const userStats = {
    total: users.length,
    active: users.filter(user => user.isActive).length,
    admins: users.filter(user => user.user_type === 'admin').length,
    cashiers: users.filter(user => user.user_type === 'cashier').length
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    
    try {
      let result;
      
      if (isEditModalOpen && selectedUser) {
        // Update existing user
        result = await UserService.updateUser({
          id: selectedUser.id || selectedUser._id,
          username: formData.username,
          email: formData.email,
          user_type: formData.user_type,
          password: formData.password || undefined
        });
        
        if (result.success) {
          setSuccess('User updated successfully!');
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }
      } else {
        // Create new user
        result = await UserService.createUser(formData);
        
        if (result.success) {
          setSuccess('User created successfully!');
          // Reset form
          setFormData({
            username: "",
            email: "",
            user_type: "cashier",
            password: "",
            confirmPassword: "",
          });
        }
      }
      
      if (result.success) {
        // Reload users list and refresh activity
        await loadUsers();
      } else {
        setError(result.error || 'Failed to process user');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: "user_type" | "username" | "email") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      password: "",
      confirmPassword: "",
    });
    setIsEditModalOpen(true);
  };

  const handleToggleUserStatus = (user: any) => {
    setSelectedUser(user);
    setActionType(user.isActive ? 'deactivate' : 'activate');
    setIsConfirmModalOpen(true);
  };

  const confirmToggleUserStatus = async () => {
    if (!selectedUser || !actionType) return;
    
    try {
      setIsLoading(true);
      
      // Call API to update user status
      const response = await fetch(apiUrl('api/users'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedUser.id || selectedUser._id,
          username: selectedUser.username,
          email: selectedUser.email,
          user_type: selectedUser.user_type,
          isActive: actionType === 'activate'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`User ${actionType === 'activate' ? 'activated' : 'deactivated'} successfully!`);
        // Reload users list
        await loadUsers();
      } else {
        setError(result.error || 'Failed to update user status');
      }
    } catch (err) {
      setError('Failed to update user status');
    } finally {
      setIsLoading(false);
      setIsConfirmModalOpen(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminHeader 
          title="User Management" 
          subtitle="Manage users, roles, and permissions"
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  User Management
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Manage your team members and their access levels
                </p>
              </div>
              <Button 
                onClick={loadUsers} 
                variant="outline" 
                size="sm"
                disabled={isLoadingUsers}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Users
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {userStats.total}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  All registered users
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Active Users
                </CardTitle>
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {userStats.active}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  Admin Users
                </CardTitle>
                <Settings className="h-5 w-5 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                  {userStats.admins}
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  System administrators
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Cashier Users
                </CardTitle>
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {userStats.cashiers}
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Point of sale operators
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add User Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Add New User</span>
                </CardTitle>
                <CardDescription>
                  Create a new user account with specific role and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500" />
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

                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* User Type Field */}
                  <div className="space-y-2">
                    <Label htmlFor="user_type" className="text-sm font-medium">
                      User Type
                    </Label>
                    <div className="relative">
                      <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <select
                        id="user_type"
                        name="user_type"
                        value={formData.user_type}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                        disabled={isLoading}
                      >
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating User...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <UserPlus className="w-4 h-4" />
                        <span>Create User</span>
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest user activities and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.color === 'green' ? 'bg-green-500' :
                          activity.color === 'blue' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user} • {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <div className="mt-8">
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>All Users</span>
                    </CardTitle>
                    <CardDescription>
                      Manage and view all system users
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadUsers}
                    disabled={isLoadingUsers}
                    className="flex items-center space-x-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          <button
                            onClick={() => handleSort("username")}
                            className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span>Username</span>
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          <button
                            onClick={() => handleSort("email")}
                            className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span>Email</span>
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          <button
                            onClick={() => handleSort("user_type")}
                            className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span>Role</span>
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          Status
                        </th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          Created
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((user, index) => (
                        <tr key={user.id || user._id || `user-${index}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-200">
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {user.username}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                            {user.email}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              user.user_type === 'admin' 
                                ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400'
                                : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20 dark:text-blue-400'
                            }`}>
                              {user.user_type}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              user.isActive 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400'
                                : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/20 dark:to-slate-900/20 dark:text-gray-400'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                onClick={() => handleViewUser(user)}
                                title="View User"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-9 w-9 p-0 transition-colors ${
                                  user.isActive 
                                    ? 'hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400' 
                                    : 'hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
                                }`}
                                onClick={() => handleToggleUserStatus(user)}
                                title={user.isActive ? 'Deactivate User' : 'Activate User'}
                              >
                                {user.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {sortedUsers.map((user, index) => (
                    <div key={user.id || user._id || `user-mobile-${index}`} className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                              {user.username}
                            </span>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 w-9 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={() => handleViewUser(user)}
                            title="View User"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 w-9 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-9 w-9 p-0 transition-colors ${
                              user.isActive 
                                ? 'hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400' 
                                : 'hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
                            }`}
                            onClick={() => handleToggleUserStatus(user)}
                            title={user.isActive ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            user.user_type === 'admin' 
                              ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400'
                              : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20 dark:text-blue-400'
                          }`}>
                            {user.user_type}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            user.isActive 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400'
                              : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/20 dark:to-slate-900/20 dark:text-gray-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                          <span className="font-medium">Created:</span> {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* View User Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>User Details</span>
              </DialogTitle>
              <DialogDescription>
                View detailed information about this user
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedUser.username}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Role:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedUser.user_type === 'admin' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {selectedUser.user_type}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedUser.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Created:</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(selectedUser.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Edit User</span>
              </DialogTitle>
              <DialogDescription>
                Update user information and settings
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user_type" className="text-sm font-medium">
                  User Type
                </Label>
                <select
                  id="edit-user_type"
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isLoading}
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-sm font-medium">
                  New Password (leave blank to keep current)
                </Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full"
                  disabled={isLoading}
                  placeholder="Enter new password or leave blank"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update User'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirmation Modal */}
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span>Confirm Action</span>
              </DialogTitle>
              <DialogDescription>
                {actionType === 'activate' 
                  ? 'Are you sure you want to activate this user?'
                  : 'Are you sure you want to deactivate this user?'
                }
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedUser.username}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {actionType === 'activate' 
                      ? 'This will allow the user to log in and access the system.'
                      : 'This will prevent the user from logging in and accessing the system.'
                    }
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsConfirmModalOpen(false);
                      setSelectedUser(null);
                      setActionType(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmToggleUserStatus}
                    disabled={isLoading}
                    className={actionType === 'activate' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                    }
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      actionType === 'activate' ? 'Activate User' : 'Deactivate User'
                    )}
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
