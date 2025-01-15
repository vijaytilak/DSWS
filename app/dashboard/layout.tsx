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

type FlowOption = 'churn' | 'switching' | 'affinity';

interface CentreFlowContextType {
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  isMarketView: boolean;
  setIsMarketView: (value: boolean) => void;
  flowOption: FlowOption;
  setFlowOption: (value: FlowOption) => void;
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
  const [centreFlow, setCentreFlow] = useState(false); // false for Brands
  const [flowType, setFlowType] = useState("outFlow only"); // "outFlow only" for Out
  const [isMarketView, setIsMarketView] = useState(false); // false for Brands
  const [flowOption, setFlowOption] = useState<FlowOption>("churn"); // "churn" for Churn

  const handleFlowOptionChange = (option: FlowOption) => {
    setFlowOption(option);
  };

  const value = {
    centreFlow,
    setCentreFlow,
    flowType,
    setFlowType,
    isMarketView,
    setIsMarketView,
    flowOption,
    setFlowOption
  };

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
            <CentreFlowContext.Provider value={value}>
              <div className="flex flex-1">
                <AppSidebar 
                  setCentreFlow={setCentreFlow} 
                  setFlowType={setFlowType}
                  flowType={flowType}
                  isMarketView={isMarketView}
                  setIsMarketView={setIsMarketView}
                  onFlowOptionChange={handleFlowOptionChange}
                  flowOption={flowOption}
                />
                <main className="flex-1">
                  <SidebarInset>
                    {children}
                  </SidebarInset>
                </main>
                <AppRightSidebar />
              </div>
            </CentreFlowContext.Provider>
          </SidebarProvider>
        </RightSidebarProvider>
      </div>
    </ProtectedRoute>
  )
}
