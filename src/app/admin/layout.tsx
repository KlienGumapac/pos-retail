import { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Point of Sale',
  description: 'Admin panel for Point of Sale system management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        {children}
      </main>
    </div>
  );
}
