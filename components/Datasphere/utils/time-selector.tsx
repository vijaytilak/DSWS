'use client';

import React, { useState } from 'react';

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
    market: string;
    category: string;
  };
};

type YearSelectionState = {
  year: number;
  selectedMonths: Set<number>;
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthSelector: React.FC<TimelineSelectorProps> = ({ onChange, onClose, initialSelection }) => {
  // Get current date to determine default years
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Initialize with default values or provided initialSelection
  const [firstYearSelection, setFirstYearSelection] = useState<YearSelectionState>(() => {
    if (initialSelection?.firstYear) {
      return {
        year: initialSelection.firstYear.year,
        selectedMonths: new Set(initialSelection.firstYear.selectedMonths)
      };
    }
    return {
      year: currentYear,
      selectedMonths: new Set([0, 1, 2, 3, 4, 5]) // Jan-Jun by default
    };
  });
  
  const [secondYearSelection, setSecondYearSelection] = useState<YearSelectionState>(() => {
    if (initialSelection?.secondYear) {
      return {
        year: initialSelection.secondYear.year,
        selectedMonths: new Set(initialSelection.secondYear.selectedMonths)
      };
    }
    return {
      year: currentYear - 1,
      selectedMonths: new Set([8, 9, 10, 11]) // Sep-Dec by default
    };
  });
  
  // State for the currently selected market and category
  const [selectedMarket, setSelectedMarket] = useState<string>(initialSelection?.market || 'Australia');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialSelection?.category || 'Fast Food Outlets');
  
  // Track selection mode
  const [selectionMode, setSelectionMode] = useState<'first' | 'second' | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  // Handle month clicks to start or complete a selection
  const handleMonthClick = (year: 'first' | 'second', monthIndex: number) => {
    if (selectionMode === year && selectionStart !== null) {
      // Complete selection
      const yearState = year === 'first' ? firstYearSelection : secondYearSelection;
      const setYearState = year === 'first' ? setFirstYearSelection : setSecondYearSelection;
      
      // Calculate the range between selectionStart and current month
      const start = Math.min(selectionStart, monthIndex);
      const end = Math.max(selectionStart, monthIndex);
      
      // Create a new set for selected months
      const newSelection = new Set<number>();
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      
      // Update the state with the new selection
      setYearState({
        ...yearState,
        selectedMonths: newSelection
      });
      
      // Reset selection mode
      setSelectionMode(null);
      setSelectionStart(null);
      setHoverMonth(null);
    } else {
      // Start new selection
      setSelectionMode(year);
      setSelectionStart(monthIndex);
      setHoverMonth(monthIndex);
    }
  };
  
  // Handle mouse hover to preview selection
  const handleMonthHover = (year: 'first' | 'second', monthIndex: number) => {
    if (selectionMode === year && selectionStart !== null) {
      setHoverMonth(monthIndex);
    }
  };
  
  // Clear hover state when mouse leaves
  const handleMouseLeave = () => {
    if (selectionMode && selectionStart !== null) {
      setHoverMonth(selectionStart);
    }
  };
  
  // Apply selection changes and send data to the parent component
  const handleApply = () => {
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
    
    // Create date objects with the years
    const firstStart = getDateFromMonthIndex(firstYearSelection.year, firstMonthsToUse[0]);
    const firstEnd = getDateFromMonthIndex(firstYearSelection.year, firstMonthsToUse[firstMonthsToUse.length - 1]);
    const secondStart = getDateFromMonthIndex(secondYearSelection.year, secondMonthsToUse[0]);
    const secondEnd = getDateFromMonthIndex(secondYearSelection.year, secondMonthsToUse[secondMonthsToUse.length - 1]);
    
    // Call onChange with the updated data
    onChange({
      firstYear: { start: firstStart, end: firstEnd },
      secondYear: { start: secondStart, end: secondEnd },
      market: selectedMarket,
      category: selectedCategory
    });
    
    // Close the selector
    if (onClose) {
      onClose();
    }
  };

  // Function to render a month grid for a specific year
  const renderMonthGrid = (year: 'first' | 'second', yearState: YearSelectionState) => {
    const yearValue = year === 'first' ? firstYearSelection.year : secondYearSelection.year;
    
    const handleYearChange = (newYear: number) => {
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
            const isSelected = yearState.selectedMonths.has(index);
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

  // Function to format selected period for display
  const formatPeriodDisplay = (selection: YearSelectionState) => {
    if (selection.selectedMonths.size === 0) return 'No months selected';
    
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
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default MonthSelector;