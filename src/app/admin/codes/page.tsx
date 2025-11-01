"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/apiConfig";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Shield
} from "lucide-react";

interface CancellationCode {
  _id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<CancellationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<CancellationCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form data for new code
  const [formData, setFormData] = useState({
    code: "",
    isActive: true
  });

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    code: "",
    isActive: true
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('api/cancellation-codes'));
      const result = await response.json();
      
      if (result.success) {
        setCodes(result.data);
      } else {
        setError(result.error || 'Failed to load cancellation codes');
      }
    } catch (err) {
      setError('Failed to load cancellation codes');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch(apiUrl('api/cancellation-codes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code,
          isActive: formData.isActive,
          createdBy: 'admin' // This should come from auth context in real app
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCodes(prev => [result.data, ...prev]);
        setSuccess('Cancellation code created successfully!');
        
        // Reset form
        setFormData({
          code: "",
          isActive: true
        });
        setIsModalOpen(false);
      } else {
        setError(result.error || 'Failed to create cancellation code');
      }
    } catch (err) {
      setError('Failed to create cancellation code');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      if (!selectedCode) return;
      
      const response = await fetch(`/api/cancellation-codes/${selectedCode._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editFormData.code,
          isActive: editFormData.isActive
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCodes(prev => prev.map(code => 
          code._id === selectedCode._id ? result.data : code
        ));
        
        setSuccess('Cancellation code updated successfully!');
        setIsEditModalOpen(false);
        setSelectedCode(null);
      } else {
        setError(result.error || 'Failed to update cancellation code');
      }
    } catch (err) {
      setError('Failed to update cancellation code');
    }
  };

  const handleEditCode = (code: CancellationCode) => {
    setSelectedCode(code);
    setEditFormData({
      code: code.code,
      isActive: code.isActive
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteCode = async (code: CancellationCode) => {
    if (!confirm(`Are you sure you want to delete the code "${code.code}"?`)) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cancellation-codes/${code._id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCodes(prev => prev.filter(c => c._id !== code._id));
        setSuccess('Cancellation code deleted successfully!');
      } else {
        setError(result.error || 'Failed to delete cancellation code');
      }
    } catch (err) {
      setError('Failed to delete cancellation code');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCodeStatus = async (code: CancellationCode) => {
    try {
      const response = await fetch(`/api/cancellation-codes/${code._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.code,
          isActive: !code.isActive
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCodes(prev => prev.map(c => 
          c._id === code._id ? result.data : c
        ));
        
        setSuccess(`Code ${result.data.isActive ? 'activated' : 'deactivated'} successfully!`);
      } else {
        setError(result.error || 'Failed to update code status');
      }
    } catch (err) {
      setError('Failed to update code status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Code copied to clipboard!');
  };

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCodes = filteredCodes.filter(code => code.isActive);
  const inactiveCodes = filteredCodes.filter(code => !code.isActive);

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminHeader 
          title="Cancellation Codes" 
          subtitle="Manage transaction cancellation codes for cashiers"
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Cancellation Codes
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Create and manage codes that cashiers need to cancel transactions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={loadCodes} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                      <Plus className="w-4 h-4" />
                      <span>Create Code</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <Key className="w-5 h-5" />
                        <span>Create Cancellation Code</span>
                      </DialogTitle>
                      <DialogDescription>
                        Create a new code that cashiers can use to cancel transactions
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="code">Cancellation Code *</Label>
                        <div className="flex space-x-2">
                          <Input 
                            id="code" 
                            name="code"
                            placeholder="e.g., MANAGER123" 
                            value={formData.code}
                            onChange={handleInputChange}
                            required 
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateRandomCode}
                            className="px-3"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Generate a random 8-character code or enter your own
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Create Code
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Total Codes
                </CardTitle>
                <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {codes.length}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Cancellation codes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Active Codes
                </CardTitle>
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {activeCodes.length}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Inactive Codes
                </CardTitle>
                <EyeOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {inactiveCodes.length}
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Disabled codes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Codes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-600 dark:text-slate-400">Loading cancellation codes...</p>
              </div>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No cancellation codes found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Create your first cancellation code to get started"}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Code
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCodes.map((code) => (
                <Card key={code._id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 border-0 shadow-lg hover:scale-105 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge 
                            variant={code.isActive ? "default" : "secondary"}
                            className={code.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
                          >
                            {code.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Copy Code"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCode(code)}
                          className="h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400"
                          title="Edit Code"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCode(code)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete Code"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Code Display */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Cancellation Code</div>
                      <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                        {code.code}
                      </div>
                    </div>


                    {/* Status Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={code.isActive}
                          onCheckedChange={() => toggleCodeStatus(code)}
                        />
                        <Label className="text-sm">
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Created {new Date(code.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Edit className="w-5 h-5" />
                  <span>Edit Cancellation Code</span>
                </DialogTitle>
                <DialogDescription>
                  Update the cancellation code details
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="edit-code">Cancellation Code *</Label>
                  <Input 
                    id="edit-code" 
                    name="code"
                    placeholder="e.g., MANAGER123" 
                    value={editFormData.code}
                    onChange={handleEditInputChange}
                    required 
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={editFormData.isActive}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Code
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  );
}
