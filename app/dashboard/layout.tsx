import ProtectedRoute from "@/components/auth/protected-route";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/layout/header/dashboard-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
