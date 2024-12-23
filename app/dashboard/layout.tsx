'use client';

import * as React from "react";
import { createContext, useContext, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { AppRightSidebar } from "@/components/layout/sidebar/right-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { RightSidebarProvider } from "@/components/ui/right-sidebar"

interface CentreFlowContextType {
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  flowType: string;
  setFlowType: (value: string) => void;
}

const CentreFlowContext = createContext<CentreFlowContextType | undefined>(undefined);

export function useCentreFlow() {
  const context = useContext(CentreFlowContext);
  if (context === undefined) {
    throw new Error('useCentreFlow must be used within a CentreFlowProvider');
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [centreFlow, setCentreFlow] = useState(false);
  const [flowType, setFlowType] = useState("bi-directional");

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
            <CentreFlowContext.Provider value={{ centreFlow, setCentreFlow, flowType, setFlowType }}>
              <div className="flex flex-1">
                <AppSidebar 
                  setCentreFlow={setCentreFlow} 
                  setFlowType={setFlowType}
                  flowType={flowType}
                />
                <SidebarInset className="flex-1">
                  {children}
                </SidebarInset>
                <AppRightSidebar />
              </div>
            </CentreFlowContext.Provider>
          </SidebarProvider>
        </RightSidebarProvider>
      </div>
    </ProtectedRoute>
  );
}
