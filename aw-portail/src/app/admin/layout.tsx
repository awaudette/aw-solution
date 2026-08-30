import AdminSidebar from "@/components/layout/AdminSidebar";
import { AdminAccessProvider } from "@/components/admin/AdminAccessProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="ml-14 min-h-screen">
          <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </AdminAccessProvider>
  );
}
