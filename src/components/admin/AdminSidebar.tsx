"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  Menu
} from "lucide-react";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview and analytics"
  },
  {
    title: "User Module",
    href: "/admin/users",
    icon: Users,
    description: "Manage users and roles"
  },
  {
    title: "Stocks Module",
    href: "/admin/stocks",
    icon: Package,
    description: "Inventory management"
  },
  {
    title: "Sales Module",
    href: "/admin/sales",
    icon: ShoppingCart,
    description: "Sales and transactions"
  },
  {
    title: "Codes",
    href: "/admin/codes",
    icon: CreditCard,
    description: "Code management"
  }
];

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when pathname changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [pathname, isMobile]);
  
  // Normalize pathname to handle trailing slashes
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 bg-slate-900/90 backdrop-blur-sm text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      <div className={cn(
        "flex flex-col h-screen bg-slate-900 dark:bg-slate-950 border-r border-slate-800 transition-all duration-300",
        isMobile 
          ? `fixed top-0 left-0 z-50 w-64 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : isCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center space-x-2">
              <Store className="w-8 h-8 text-primary" />
              <span className="text-lg font-bold text-white">POS Admin</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          // More precise active state detection
          let isActive = false;
          if (item.href === '/admin') {
            // Dashboard is only active if we're exactly on /admin
            isActive = normalizedPathname === '/admin';
          } else {
            // Other pages are active if exact match or sub-route
            isActive = normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/');
          }
          
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white hover:shadow-md"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full animate-pulse" />
              )}
              
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-white"
              )} />
              {(!isCollapsed || isMobile) && (
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-primary-foreground" : "text-slate-300"
                  )}>
                    {item.title}
                  </span>
                  {item.description && (
                    <p className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-slate-400"
                    )}>
                      {item.description}
                    </p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

        {/* Footer */}
        {(!isCollapsed || isMobile) && (
          <div className="p-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 text-center">
              Point of Sale System
            </div>
          </div>
        )}
      </div>
    </>
  );
}
