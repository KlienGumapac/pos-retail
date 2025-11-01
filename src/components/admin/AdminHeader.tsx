"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 py-3 sm:py-0 sm:h-16">
          {/* Title Section */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* User Info and Logout */}
          <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2 min-w-0">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                <span className="hidden sm:inline">Welcome, </span>
                {user?.username || user?.email || 'User'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
