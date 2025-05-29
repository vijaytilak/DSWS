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
import { TableDataProvider } from "@/app/contexts/table-data-context";

type FlowOption = 'churn' | 'switching' | 'affinity' | 'spending';

interface CentreFlowContextType {
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  isMarketView: boolean;
  setIsMarketView: (value: boolean) => void;
  flowOption: FlowOption;
  setFlowOption: (value: FlowOption) => void;
  focusBubbleId: number | null;
  setFocusBubbleId: (value: number | null) => void;
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
  const [centreFlow, setCentreFlow] = useState(false); // false for Brands
  const [initialFlowType, setInitialFlowType] = useState("outFlow only"); // "outFlow only" for Out
  const [isMarketView, setIsMarketView] = useState(true); // true for Markets as default
  const [flowOption, setFlowOption] = useState<FlowOption>("churn"); // "churn" for Churn
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null); // null for no bubble selected

  // Wrapped setFlowType to enforce constraints
  const [flowType, _setFlowType] = useState(initialFlowType);

  const setFlowTypeAndConstraints = (newFlowType: string) => {
    if (flowOption === 'spending') {
      if (newFlowType.toLowerCase() === 'lower' || newFlowType.toLowerCase() === 'higher') {
        _setFlowType(newFlowType);
      } else {
        // Optionally, console.warn or handle disallowed type for spending
        console.warn(`Attempted to set invalid flowType "${newFlowType}" for spending category. Allowed: "Lower", "Higher".`);
      }
    } else {
      _setFlowType(newFlowType);
    }
  };
  
  const handleFlowOptionChange = (option: FlowOption) => {
    setFlowOption(option);
    if (option === 'spending') {
      // Default flowType to 'Lower' when switching to 'spending'
      _setFlowType('Lower'); 
    } else if (option === 'churn' || option === 'switching' || option === 'affinity') {
      // Reset to a default for other categories if needed, or maintain current
      // For now, let's reset to a common default like "outFlow only" or the initialFlowType
       _setFlowType(initialFlowType); // Or specific default like "outFlow only"
    }
  };

  const value = {
    centreFlow,
    setCentreFlow,
    flowType,
    setFlowType: setFlowTypeAndConstraints, // Use the wrapped setter
    isMarketView,
    setIsMarketView,
    flowOption,
    setFlowOption: handleFlowOptionChange, // Use the wrapped setter for flowOption
    focusBubbleId,
    setFocusBubbleId
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
              <TableDataProvider>
                <div className="flex flex-1">
                  <AppSidebar 
                    setCentreFlow={setCentreFlow} 
                    setFlowType={setFlowType}
                    flowType={flowType}
                    setIsMarketView={setIsMarketView}
                    onFlowOptionChange={value.setFlowOption} // Use context's setFlowOption
                    flowOption={flowOption}
                    focusBubbleId={focusBubbleId}
                    isMarketView={isMarketView}
                  />
                  <main className="flex-1">
                    <SidebarInset>
                      {children}
                    </SidebarInset>
                  </main>
                  <AppRightSidebar />
                </div>
              </TableDataProvider>
            </CentreFlowContext.Provider>
          </SidebarProvider>
        </RightSidebarProvider>
      </div>
    </ProtectedRoute>
  )
}
