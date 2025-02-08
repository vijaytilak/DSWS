'use client';

import React, { useState, useEffect, useCallback } from 'react';

type YearRange = {
  fromYear: number;
  toYear: number;
};

type MonthData = {
  id: string;
  year: number;
  month: number;
  label: string;
  fullLabel: string;
};

type DragState = {
  isDragging: boolean;
  startMonth: number | null;
  currentMonth: number | null;
  activeYear: 'first' | 'second' | null;
};

type SelectionRange = {
  start: number;
  end: number;
};

type SelectionRanges = {
  firstYear: SelectionRange;
  secondYear: SelectionRange;
};

interface TimelineSelectorProps {
  onChange?: (selection: {
    firstYear: { start: Date; end: Date };
    secondYear: { start: Date; end: Date };
    market?: string;
    category?: string;
  }) => void;
}

const MonthSelector: React.FC<TimelineSelectorProps> = ({ onChange }) => {
  const monthWidth = 35;
  const totalMonths = 24;
  const containerWidth = monthWidth * totalMonths;

  const currentYear = new Date().getFullYear(); // 2025
  const lastYear = currentYear - 1; // 2024

  // Set default years to last year and current year in correct order
  const [yearRange, setYearRange] = useState<YearRange>({
    toYear: lastYear,    // First year (2024)
    fromYear: currentYear // Second year (2025)
  });

  const [selectedMarket, setSelectedMarket] = useState<string>('Australia');
  const [selectedCategory, setSelectedCategory] = useState<string>('Fast Food Outlets');

  const marketOptions = ['Australia', 'New Zealand', 'United States', 'United Kingdom'];
  const categoryOptions = ['Fast Food Outlets', 'Restaurants', 'Cafes', 'Retail Stores'];

  const generateTimelineData = (fromYear: number, toYear: number): MonthData[] => {
    const months: MonthData[] = [];
    [fromYear, toYear].forEach((year) => {  // Changed order to match display
      for (let i = 0; i < 12; i++) {
        months.push({
          id: `${year}-${i}`,
          year,
          month: i,
          label: new Date(year, i).toLocaleString('default', { month: 'short' }).charAt(0),
          fullLabel: new Date(year, i).toLocaleString('default', { month: 'short' })
        });
      }
    });
    return months;
  };

  const [timelineData, setTimelineData] = useState<MonthData[]>(
    generateTimelineData(yearRange.fromYear, yearRange.toYear)
  );

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startMonth: null,
    currentMonth: null,
    activeYear: null
  });

  // Generate year options (10 years before current year up to current year)
  const yearOptions = Array.from(
    { length: 11 },
    (_, i) => currentYear - 10 + i
  ).filter(year => year <= currentYear);

  useEffect(() => {
    setTimelineData(generateTimelineData(yearRange.fromYear, yearRange.toYear));
  }, [yearRange.fromYear, yearRange.toYear]);

  const getSelectionRanges = useCallback((): SelectionRanges => {
    if ((!dragState.startMonth && dragState.startMonth !== 0) || dragState.currentMonth === null) {
      return {
        firstYear: { start: 0, end: 11 },    // Jan-Dec last year (2024)
        secondYear: { start: 12, end: 23 }   // Jan-Dec current year (2025)
      };
    }

    const isSecondYear = dragState.startMonth >= 12;
    const fixedStart = dragState.startMonth;
    const currentDrag = dragState.currentMonth;

    if (isSecondYear) {
      const constrainedStart = Math.max(12, Math.min(fixedStart, 23));
      const constrainedEnd = Math.max(12, Math.min(currentDrag, 23));

      const start = Math.min(constrainedStart, constrainedEnd);
      const end = Math.max(constrainedStart, constrainedEnd);

      // Calculate mirrored range for first year (0-11)
      const mirroredStart = start - 12;
      const mirroredEnd = end - 12;

      return {
        firstYear: { start: mirroredStart, end: mirroredEnd },
        secondYear: { start, end }
      };
    } else {
      const constrainedStart = Math.max(0, Math.min(fixedStart, 11));
      const constrainedEnd = Math.max(0, Math.min(currentDrag, 11));

      const start = Math.min(constrainedStart, constrainedEnd);
      const end = Math.max(constrainedStart, constrainedEnd);

      // Calculate mirrored range for second year (12-23)
      const mirroredStart = start + 12;
      const mirroredEnd = end + 12;

      return {
        firstYear: { start, end },
        secondYear: { start: mirroredStart, end: mirroredEnd }
      };
    }
  }, [dragState.startMonth, dragState.currentMonth]);

  useEffect(() => {
    const ranges = getSelectionRanges();
    if (onChange && timelineData.length > 0) {
      const firstYearStart = new Date(timelineData[ranges.firstYear.start].year, timelineData[ranges.firstYear.start].month);
      const firstYearEnd = new Date(timelineData[ranges.firstYear.end].year, timelineData[ranges.firstYear.end].month);
      const secondYearStart = new Date(timelineData[ranges.secondYear.start].year, timelineData[ranges.secondYear.start].month);
      const secondYearEnd = new Date(timelineData[ranges.secondYear.end].year, timelineData[ranges.secondYear.end].month);

      onChange({
        firstYear: { start: firstYearStart, end: firstYearEnd },
        secondYear: { start: secondYearStart, end: secondYearEnd },
        market: selectedMarket,
        category: selectedCategory
      });
    }
  }, [timelineData, onChange, getSelectionRanges, selectedMarket, selectedCategory]);

  const handleYearChange = (type: 'from' | 'to', yearStr: string) => {
    const numYear = parseInt(yearStr);
    setYearRange(prev => ({
      ...prev,
      [type === 'from' ? 'fromYear' : 'toYear']: numYear
    }));
  };

  const getMonthFromClientX = (element: HTMLElement, clientX: number): number => {
    const rect = element.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    return Math.min(Math.max(Math.floor(relativeX / monthWidth), 0), 23);
  };


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const monthIndex = getMonthFromClientX(e.currentTarget, e.clientX);
    const isSecondYear = monthIndex >= 12;

    setDragState({
      isDragging: true,
      startMonth: monthIndex,
      currentMonth: monthIndex,
      activeYear: isSecondYear ? 'second' : 'first'
    });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.isDragging) return;

    const monthIndex = getMonthFromClientX(e.currentTarget, e.clientX);
    setDragState(prev => ({
      ...prev,
      currentMonth: monthIndex
    }));
  };

  const handleMouseUp = () => {
    setDragState(prev => ({
      ...prev,
      isDragging: false
    }));
  };

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [dragState.isDragging]);

  const getSelectionStyle = (range: SelectionRange) => ({
    left: `${range.start * monthWidth}px`,
    width: `${(range.end - range.start + 1) * monthWidth}px`,
    transition: dragState.isDragging ? 'none' : 'all 0.15s ease-in-out'
  });

  const formatPeriodLabel = (range: SelectionRange) => {
    const startIndex = Math.max(0, Math.min(range.start, timelineData.length - 1));
    const endIndex = Math.max(0, Math.min(range.end, timelineData.length - 1));

    const startMonth = timelineData[startIndex].fullLabel;
    const endMonth = timelineData[endIndex].fullLabel;
    const year = timelineData[startIndex].year;
    return `${startMonth}-${endMonth} ${year}`;
  };

  const ranges = getSelectionRanges();

  const renderDropdowns = () => {
    return (
      <div className="w-full max-w-xl mx-auto space-y-4">
        <div className="w-full">
          <label className="text-base text-gray-300 mb-2 block">Market</label>
          <div className="relative">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full bg-[#0D1117] text-white text-base py-2.5 px-3 rounded appearance-none border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors cursor-pointer"
            >
              {marketOptions.map((market) => (
                <option key={market} value={market} className="bg-[#0D1117]">
                  {market}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full">
          <label className="text-base text-gray-300 mb-2 block">Category</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0D1117] text-white text-base py-2.5 px-3 rounded appearance-none border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors cursor-pointer"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category} className="bg-[#0D1117]">
                  {category}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0D1117] rounded-lg shadow-lg p-6">
      {renderDropdowns()}
      <div className="mt-6">
        <div className="overflow-x-auto mx-auto">
          <div className="relative mx-auto" style={{ width: `${containerWidth}px` }}>
            {/* Year labels/dropdowns */}
            <div className="flex justify-between items-center mb-2">
              <select 
                value={yearRange.toYear}
                onChange={(e) => handleYearChange('to', e.target.value)}
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded px-2 py-1"
              >
                {yearOptions.map(year => (
                  <option key={`to-${year}`} value={year}>{year}</option>
                ))}
              </select>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected periods: {formatPeriodLabel(ranges.secondYear)} and {formatPeriodLabel(ranges.firstYear)}
              </div>

              <select 
                value={yearRange.fromYear}
                onChange={(e) => handleYearChange('from', e.target.value)}
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded px-2 py-1"
              >
                {yearOptions.map(year => (
                  <option key={`from-${year}`} value={year}>{year}</option>
                )).reverse()}
              </select>
            </div>

            <div className="relative h-16">
              {/* Main background */}
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600" />

              {/* Year divider */}
              <div
                className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600"
                style={{ left: `${12 * monthWidth}px` }}
              />

              {/* Month labels */}
              <div className="absolute top-2 left-0 right-0 flex">
                {timelineData.map((month) => (
                  <div
                    key={month.id}
                    className="flex-shrink-0 text-xs text-center text-gray-500 dark:text-gray-400 font-medium"
                    style={{ width: `${monthWidth}px` }}
                    title={`${month.fullLabel} ${month.year}`}
                  >
                    {month.label}
                  </div>
                ))}
              </div>

              {/* Selection area */}
              <div
                className="absolute top-6 left-0 right-0 h-8 cursor-pointer"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
              >
                {/* Selection rectangles */}
                <div
                  className="absolute h-full bg-blue-100 dark:bg-blue-500/50 rounded shadow-sm"
                  style={getSelectionStyle(ranges.secondYear)}
                />
                <div
                  className="absolute h-full bg-green-100 dark:bg-green-500/50 rounded shadow-sm"
                  style={getSelectionStyle(ranges.firstYear)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthSelector;