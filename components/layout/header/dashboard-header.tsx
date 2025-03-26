'use client';

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RightSidebarTrigger } from "@/components/ui/right-sidebar"
import { Button } from "@/components/ui/button"
import { CalendarDays } from "lucide-react"
import dynamic from 'next/dynamic'
import { Controls } from "@/components/Datasphere/components/Controls"
import { useState } from "react"
import MonthSelector from "@/components/Datasphere/utils/time-selector"

const ThemeToggleClient = dynamic(
  () => import('@/components/layout/header/theme-toggle').then(mod => ({ default: mod.ThemeToggle })),
  { ssr: false }
)

interface DashboardHeaderProps {
  threshold: number;
  setThreshold: (value: number) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
}

export function DashboardHeader({
  threshold,
  setThreshold,
  flowType,
  setFlowType,
  centreFlow,
  setCentreFlow
}: DashboardHeaderProps) {
  const [timeSelectOpen, setTimeSelectOpen] = useState(false);
  const [selectedPeriods, setSelectedPeriods] = useState("Jan-Dec 2024 and Jan-Dec 2025");

  const handleTimeChange = (selection: {
    firstYear: { start: Date; end: Date };
    secondYear: { start: Date; end: Date };
    market?: string;
    category?: string;
  }) => {
    // Format the selected periods for display
    const formatDate = (date: Date) => {
      return date.toLocaleString('default', { month: 'short' });
    };
    
    const firstYearStart = formatDate(selection.firstYear.start);
    const firstYearEnd = formatDate(selection.firstYear.end);
    const firstYear = selection.firstYear.start.getFullYear();
    
    const secondYearStart = formatDate(selection.secondYear.start);
    const secondYearEnd = formatDate(selection.secondYear.end);
    const secondYear = selection.secondYear.start.getFullYear();
    
    setSelectedPeriods(`${firstYearStart}-${firstYearEnd} ${firstYear} and ${secondYearStart}-${secondYearEnd} ${secondYear}`);
  };

  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Controls
          threshold={threshold}
          setThreshold={setThreshold}
          flowType={flowType}
          setFlowType={setFlowType}
          centreFlow={centreFlow}
          setCentreFlow={setCentreFlow}
          className="flex-1"
        />
        
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs flex items-center gap-1.5"
            onClick={() => setTimeSelectOpen(!timeSelectOpen)}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{selectedPeriods}</span>
          </Button>
          
          {timeSelectOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-[880px] shadow-lg rounded-lg overflow-hidden">
              <div className="bg-background border border-border rounded-lg">
                <MonthSelector onChange={handleTimeChange} />
                <div className="p-2 bg-background border-t border-border flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => setTimeSelectOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <ThemeToggleClient />
        <RightSidebarTrigger />
      </div>
    </header>
  );
}
