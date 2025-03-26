'use client';

import React, { useState, useRef } from 'react';

type TimelineSelectorProps = {
  onChange: (selection: {
    firstYear: { start: Date; end: Date };
    secondYear: { start: Date; end: Date };
    market?: string;
    category?: string;
  }) => void;
  onClose?: () => void;
  initialSelection?: {
    firstYear: {
      year: number;
      selectedMonths: number[];
    };
    secondYear: {
      year: number;
      selectedMonths: number[];
    };
    market?: string;
    category?: string;
  };
};

type YearSelectionState = {
  year: number;
  selectedMonths: number[];
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthSelector: React.FC<TimelineSelectorProps> = ({ onChange, onClose, initialSelection }) => {
  // Get current date to determine default years
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Refs to track if we're in the middle of updating
  const isUpdatingRef = useRef(false);
  
  // Initialize with default values or values from initialSelection
  const [selectedMarket, setSelectedMarket] = useState(
    initialSelection?.market || 'Australia'
  );
  const [selectedCategory, setSelectedCategory] = useState(
    initialSelection?.category || 'Fast Food Outlets'
  );

  // Initialize month selections from initialSelection or defaults
  const [firstYearSelection, setFirstYearSelection] = useState<YearSelectionState>({
    year: initialSelection?.firstYear.year || currentYear,
    selectedMonths: initialSelection?.firstYear.selectedMonths || [0, 1, 2, 3, 4, 5] // Jan-Jun by default
  });

  const [secondYearSelection, setSecondYearSelection] = useState<YearSelectionState>({
    year: initialSelection?.secondYear.year || currentYear - 1,
    selectedMonths: initialSelection?.secondYear.selectedMonths || [8, 9, 10, 11] // Sep-Dec by default
  });

  // State to track which selection is being modified
  const [selectionMode, setSelectionMode] = useState<'first' | 'second' | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  // Function to handle mouse down on a month
  const handleMonthClick = (year: 'first' | 'second', month: number) => {
    // If we already have a selection start, this is the end of the selection
    if (selectionStart !== null && selectionMode === year) {
      // Calculate the range of months to select
      const startMonth = Math.min(selectionStart, month);
      const endMonth = Math.max(selectionStart, month);
      
      // Create an array of selected months
      const selectedMonths: number[] = [];
      for (let i = startMonth; i <= endMonth; i++) {
        selectedMonths.push(i);
      }
      
      // Update the appropriate year's selection
      if (year === 'first') {
        setFirstYearSelection(prev => ({
          ...prev,
          selectedMonths
        }));
      } else {
        setSecondYearSelection(prev => ({
          ...prev,
          selectedMonths
        }));
      }
      
      // Reset selection state
      setSelectionStart(null);
      setSelectionMode(null);
      setHoverMonth(null);
      
      // Trigger the onChange callback
      triggerOnChange();
    } else {
      // This is the start of a new selection
      setSelectionStart(month);
      setSelectionMode(year);
      setHoverMonth(month);
      
      // Clear existing selection for this year
      if (year === 'first') {
        setFirstYearSelection(prev => ({
          ...prev,
          selectedMonths: [month]
        }));
      } else {
        setSecondYearSelection(prev => ({
          ...prev,
          selectedMonths: [month]
        }));
      }
    }
  };

  // Function to handle mouse over a month during selection
  const handleMonthHover = (year: 'first' | 'second', month: number) => {
    // Only update hover state if we're in selection mode for this year
    if (selectionMode === year && selectionStart !== null) {
      setHoverMonth(month);
      
      // Show preview of selection
      const startMonth = Math.min(selectionStart, month);
      const endMonth = Math.max(selectionStart, month);
      
      // Create an array of selected months for preview
      const selectedMonths: number[] = [];
      for (let i = startMonth; i <= endMonth; i++) {
        selectedMonths.push(i);
      }
      
      // Update the appropriate year's selection preview
      if (year === 'first') {
        setFirstYearSelection(prev => ({
          ...prev,
          selectedMonths
        }));
      } else {
        setSecondYearSelection(prev => ({
          ...prev,
          selectedMonths
        }));
      }
    }
  };

  // Function to handle mouse leave from the grid
  const handleMouseLeave = () => {
    // If we were in the middle of a selection but didn't complete it,
    // reset to the initial selection start
    if (selectionStart !== null && selectionMode !== null) {
      if (selectionMode === 'first') {
        setFirstYearSelection(prev => ({
          ...prev,
          selectedMonths: [selectionStart]
        }));
      } else {
        setSecondYearSelection(prev => ({
          ...prev,
          selectedMonths: [selectionStart]
        }));
      }
    }
  };

  // Function to render a month grid for a specific year
  const renderMonthGrid = (year: 'first' | 'second', yearState: YearSelectionState) => {
    const yearValue = year === 'first' ? firstYearSelection.year : secondYearSelection.year;
    
    const handleYearChange = (newYear: number) => {
      console.log(`Changing ${year} year to ${newYear}`);
      
      // Update the year in the appropriate state
      if (year === 'first') {
        // Create a new object to ensure React detects the state change
        const updatedSelection = {
          ...firstYearSelection,
          year: newYear
        };
        setFirstYearSelection(updatedSelection);
      } else {
        // Create a new object to ensure React detects the state change
        const updatedSelection = {
          ...secondYearSelection,
          year: newYear
        };
        setSecondYearSelection(updatedSelection);
      }
      
      // Force immediate update of the display - use requestAnimationFrame for browser to process state update
      requestAnimationFrame(() => {
        // Directly create and pass the updated data to onChange
        const updatedFirstYear = year === 'first' ? newYear : firstYearSelection.year;
        const updatedSecondYear = year === 'second' ? newYear : secondYearSelection.year;
        
        // Helper function to convert month index to Date object
        const getDateFromMonthIndex = (year: number, monthIndex: number) => {
          return new Date(year, monthIndex, 1);
        };
        
        // Get the current month selections
        const firstMonths = [...firstYearSelection.selectedMonths].sort((a, b) => a - b);
        const secondMonths = [...secondYearSelection.selectedMonths].sort((a, b) => a - b);
        
        // Ensure we have at least one month selected
        const firstMonthsToUse = firstMonths.length > 0 ? firstMonths : [0];
        const secondMonthsToUse = secondMonths.length > 0 ? secondMonths : [0];
        
        // Create date objects with the updated years
        const firstStart = getDateFromMonthIndex(updatedFirstYear, firstMonthsToUse[0]);
        const firstEnd = getDateFromMonthIndex(updatedFirstYear, firstMonthsToUse[firstMonthsToUse.length - 1]);
        const secondStart = getDateFromMonthIndex(updatedSecondYear, secondMonthsToUse[0]);
        const secondEnd = getDateFromMonthIndex(updatedSecondYear, secondMonthsToUse[secondMonthsToUse.length - 1]);
        
        // Call onChange with the updated data
        onChange({
          firstYear: { start: firstStart, end: firstEnd },
          secondYear: { start: secondStart, end: secondEnd },
          market: selectedMarket,
          category: selectedCategory
        });
      });
    };
    
    const isFirstPeriod = year === 'first';
    const title = isFirstPeriod ? 'First Period' : 'Second Period';
    const selectionColor = isFirstPeriod ? 'bg-green-500' : 'bg-blue-500';
    const hoverColor = isFirstPeriod ? 'hover:bg-green-600' : 'hover:bg-blue-600';
    
    // Generate years from current year backwards for 10 years
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);
    
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium text-sm">{title}</h3>
          <select
            className="bg-gray-700 text-white rounded-md p-1.5 text-sm border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={yearValue}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
          >
            {yearOptions.map(year => (
              <option key={year} value={year} className="bg-gray-700">{year}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {monthNames.map((month, index) => {
            const isSelected = yearState.selectedMonths.includes(index);
            const isSelectionStart = selectionMode === year && selectionStart === index;
            const isHovered = selectionMode === year && hoverMonth === index;
            
            return (
              <div
                key={month}
                className={`
                  flex items-center justify-center p-3 px-1 rounded-md cursor-pointer transition-all duration-150
                  ${isSelected ? selectionColor : 'bg-gray-700'} 
                  ${!isSelected ? hoverColor : ''}
                  ${isSelectionStart ? 'ring-2 ring-white' : ''}
                  ${isHovered ? 'ring-1 ring-gray-300' : ''}
                  ${isSelected ? 'shadow-md transform hover:scale-[1.02]' : ''}
                  font-medium text-white text-sm
                `}
                onClick={() => handleMonthClick(year, index)}
                onMouseEnter={() => handleMonthHover(year, index)}
              >
                {month}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Notify parent component when selections change
  const triggerOnChange = () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      // Helper function to convert month index to Date object
      const getDateFromMonthIndex = (year: number, monthIndex: number) => {
        return new Date(year, monthIndex, 1);
      };
      
      // Sort the selected months for both years
      const sortedFirstMonths = [...firstYearSelection.selectedMonths].sort((a, b) => a - b);
      const sortedSecondMonths = [...secondYearSelection.selectedMonths].sort((a, b) => a - b);
      
      // Ensure we have at least one month selected for each year
      const firstMonths = sortedFirstMonths.length > 0 ? sortedFirstMonths : [0]; // Default to January
      const secondMonths = sortedSecondMonths.length > 0 ? sortedSecondMonths : [0]; // Default to January
      
      // Create Date objects for the start and end of each period
      const firstYearStart = getDateFromMonthIndex(firstYearSelection.year, firstMonths[0]);
      const firstYearEnd = getDateFromMonthIndex(firstYearSelection.year, firstMonths[firstMonths.length - 1]);
      const secondYearStart = getDateFromMonthIndex(secondYearSelection.year, secondMonths[0]);
      const secondYearEnd = getDateFromMonthIndex(secondYearSelection.year, secondMonths[secondMonths.length - 1]);
      
      // Call the onChange prop with the dates
      onChange({
        firstYear: { 
          start: firstYearStart, 
          end: firstYearEnd 
        },
        secondYear: { 
          start: secondYearStart, 
          end: secondYearEnd 
        },
        market: selectedMarket,
        category: selectedCategory
      });
    } catch (error) {
      console.error('Error updating time selection:', error);
    } finally {
      // Reset the updating flag immediately
      isUpdatingRef.current = false;
    }
  };

  // Function to format selected period for display
  const formatPeriodDisplay = (selection: YearSelectionState) => {
    if (selection.selectedMonths.length === 0) return 'No months selected';
    
    const sortedMonths = [...selection.selectedMonths].sort((a, b) => a - b);
    const firstMonth = sortedMonths[0];
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    
    // Check if months are consecutive
    const isConsecutive = sortedMonths.length === (lastMonth - firstMonth + 1);
    
    if (!isConsecutive) {
      // For non-consecutive selections, show comma-separated list
      return `${sortedMonths.map(m => monthNames[m]).join(', ')} ${selection.year}`;
    }
    
    // For consecutive selections, show range
    return `${monthNames[firstMonth]}-${monthNames[lastMonth]} ${selection.year}`;
  };

  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <div 
      className="p-6 w-[900px] bg-gray-900 border-2 border-gray-700 rounded-lg shadow-xl"
      onMouseLeave={handleMouseLeave}
    >
      <div className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Market</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={selectedMarket}
            onChange={(e) => handleMarketChange(e.target.value)}
          >
            {['Australia', 'New Zealand', 'United States', 'United Kingdom'].map(option => (
              <option key={option} value={option} className="bg-gray-800">{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Category</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {['Fast Food Outlets', 'Cafes', 'Restaurants', 'Bars'].map(option => (
              <option key={option} value={option} className="bg-gray-800">{option}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        {renderMonthGrid('first', firstYearSelection)}
        {renderMonthGrid('second', secondYearSelection)}
      </div>
      
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2"></span> 
            <span className="text-white font-medium text-sm">{formatPeriodDisplay(firstYearSelection)}</span>
          </div>
          <span className="text-gray-500 text-sm">and</span>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
            <span className="text-white font-medium text-sm">{formatPeriodDisplay(secondYearSelection)}</span>
          </div>
        </div>
        
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm"
          onClick={() => {
            // Call the onClose prop if it exists
            if (onClose) {
              onClose();
            } else {
              // Fallback to clicking the body to close the popup
              document.body.click();
            }
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default MonthSelector;