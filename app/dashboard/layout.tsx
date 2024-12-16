import ProtectedRoute from "@/components/auth/protected-route";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { AppRightSidebar } from "@/components/layout/sidebar/right-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { RightSidebarProvider } from "@/components/ui/right-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="relative flex min-h-screen flex-col">
        <RightSidebarProvider
          style={{
            "--sidebar-width": "24rem",
            "--sidebar-width-mobile": "24rem",
          } as React.CSSProperties}
        >
          <SidebarProvider>
            <div className="flex flex-1">
              <AppSidebar />
              <SidebarInset className="flex-1">
                {children}
              </SidebarInset>
              <AppRightSidebar />
            </div>
          </SidebarProvider>
        </RightSidebarProvider>
      </div>
    </ProtectedRoute>
  );
}
