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
  const [selectedPeriods, setSelectedPeriods] = useState("Jan-Jun 2025 and Sep-Dec 2024");
  const [isLoading, setIsLoading] = useState(false);
  
  // Store the actual selection data to pass back to the time selector
  const [timeSelection, setTimeSelection] = useState({
    firstYear: {
      year: 2025,
      selectedMonths: [0, 1, 2, 3, 4, 5] // Jan-Jun by default
    },
    secondYear: {
      year: 2024,
      selectedMonths: [8, 9, 10, 11] // Sep-Dec by default
    },
    market: 'Australia',
    category: 'Fast Food Outlets'
  });

  const handleTimeChange = async (selection: {
    firstYear: { start: Date; end: Date };
    secondYear: { start: Date; end: Date };
    market?: string;
    category?: string;
  }) => {
    // Format the selected periods for display
    const formatMonthName = (date: Date) => {
      // Use the same abbreviations as in the time selector
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames[date.getMonth()];
    };
    
    // Get the data for both years
    const firstYearStart = formatMonthName(selection.firstYear.start);
    const firstYearEnd = formatMonthName(selection.firstYear.end);
    const firstYear = selection.firstYear.start.getFullYear();
    
    const secondYearStart = formatMonthName(selection.secondYear.start);
    const secondYearEnd = formatMonthName(selection.secondYear.end);
    const secondYear = selection.secondYear.start.getFullYear();
    
    // Always display the first period first, then the second period
    const formattedPeriods = `${firstYearStart}-${firstYearEnd} ${firstYear} and ${secondYearStart}-${secondYearEnd} ${secondYear}`;
    
    // Update the displayed periods
    setSelectedPeriods(formattedPeriods);
    
    // Store the selection data
    // Calculate the selected months for the first year
    const firstYearMonths = [];
    const firstStartMonth = selection.firstYear.start.getMonth();
    const firstEndMonth = selection.firstYear.end.getMonth();
    for (let i = firstStartMonth; i <= firstEndMonth; i++) {
      firstYearMonths.push(i);
    }
    
    // Calculate the selected months for the second year
    const secondYearMonths = [];
    const secondStartMonth = selection.secondYear.start.getMonth();
    const secondEndMonth = selection.secondYear.end.getMonth();
    for (let i = secondStartMonth; i <= secondEndMonth; i++) {
      secondYearMonths.push(i);
    }
    
    // Update the time selection state with the new year values
    const updatedTimeSelection = {
      firstYear: {
        year: firstYear,
        selectedMonths: firstYearMonths
      },
      secondYear: {
        year: secondYear,
        selectedMonths: secondYearMonths
      },
      market: selection.market || 'Australia',
      category: selection.category || 'Fast Food Outlets'
    };
    
    setTimeSelection(updatedTimeSelection);
    
    // Close the time selector
    setTimeSelectOpen(false);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Fetch new data from the API with the updated selection parameters
      // This is where you would make an API call to fetch the data based on the selected periods
      // For example:
      
      // const queryParams = new URLSearchParams({
      //   firstYearStart: selection.firstYear.start.toISOString(),
      //   firstYearEnd: selection.firstYear.end.toISOString(),
      //   secondYearStart: selection.secondYear.start.toISOString(),
      //   secondYearEnd: selection.secondYear.end.toISOString(),
      //   market: selection.market || 'Australia',
      //   category: selection.category || 'Fast Food Outlets'
      // });
      
      // const response = await fetch(`/api/visualization-data?${queryParams}`);
      // const data = await response.json();
      
      // Then you would update your application state with the new data
      // This could involve setting a state variable that is passed to the DataSphere component
      
      // For now, we'll simulate a delay to represent the API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('API call would be made with these parameters:', {
        firstYear: {
          start: selection.firstYear.start.toISOString(),
          end: selection.firstYear.end.toISOString()
        },
        secondYear: {
          start: selection.secondYear.start.toISOString(),
          end: selection.secondYear.end.toISOString()
        },
        market: selection.market,
        category: selection.category
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      // End loading state
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center justify-between space-x-2 px-4">
        <div className="flex items-center space-x-2">
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
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setTimeSelectOpen(!timeSelectOpen)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 mr-1">⏳</span>
                <span className="text-xs">Loading...</span>
              </>
            ) : (
              <>
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-xs">{selectedPeriods}</span>
              </>
            )}
          </Button>
          {timeSelectOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-[900px] shadow-lg rounded-lg overflow-hidden">
              <div className="bg-background border border-border rounded-lg">
                <MonthSelector 
                  onChange={handleTimeChange} 
                  onClose={() => setTimeSelectOpen(false)}
                  initialSelection={timeSelection}
                />
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <ThemeToggleClient />
            <RightSidebarTrigger />
          </div>
        </div>
      </div>
    </header>
  );
}
