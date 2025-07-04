'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import type { FlowData, Bubble } from './types';
import type { Flow } from './services/FlowFactory';
import { VisualizationManager } from './core/VisualizationManager';
import { DependencyContainer } from './core/DependencyContainer';
import FlowDataService from './services/FlowDataService';
import ViewManager from './services/ViewManager';
import { ConfigurationManager } from './config/ConfigurationManager';
import { useDimensions } from './hooks/useDimensions';
import { initializeBubbleVisualization } from './utils/bubble-utils';
import { useTableData } from '@/app/contexts/table-data-context';

/**
 * Props interface for the DataSphere component
 */
interface DataSphereProps {
  /** Flow data containing items and relationships */
  data: FlowData;
  /** Type of flow visualization ('in', 'out', 'net', 'both') */
  flowType: string;
  /** Whether to show center flow visualization */
  centreFlow: boolean;
  /** Threshold value for filtering flows */
  threshold: number;
  /** View type override - if not provided, uses ViewManager service default */
  isMarketView?: boolean;
  /** Flow option override - if not provided, uses ConfigurationManager default */
  flowOption?: 'churn' | 'switching';
  /** Focused bubble ID from context */
  focusBubbleId?: number | null;
  /** Callback to set focused bubble ID */
  onFocusBubbleChange?: (bubbleId: number | null) => void;
}

/**
 * DataSphere Component
 * 
 * A React component that renders an interactive data visualization using D3.js.
 * Features include bubble visualization with flow connections, tooltips, and
 * interactive controls for data exploration.
 * 
 * @param props - Component properties
 * @returns JSX element containing the data sphere visualization
 */
export default function DataSphere({ 
  data,
  flowType,
  centreFlow,
  threshold,
  isMarketView: propIsMarketView,
  flowOption: propFlowOption,
  focusBubbleId: propFocusBubbleId,
  onFocusBubbleChange,
}: DataSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolvedTheme } = useTheme();
  const [focusedFlow, setFocusedFlow] = useState<{ from: string, to: string } | null>(null);
  const dimensions = useDimensions(containerRef);
  const { setTableData, setSelectedItemLabel } = useTableData();

  // Get services from DI container
  const container = DependencyContainer.getInstance();
  const viewManager = container.resolve<ViewManager>('ViewManager');
  const configManager = container.resolve<ConfigurationManager>('ConfigurationManager');
  
  // Use props or service defaults for view state
  const isMarketView = propIsMarketView ?? viewManager.isMarketView();
  const flowOption = propFlowOption ?? configManager.getFlowOption();
  const focusBubbleId = propFocusBubbleId ?? null;

  // Handle bubble click
  const handleBubbleClick = useCallback((bubble: Bubble) => {
    // Clear focused flow when clicking a bubble
    setFocusedFlow(null);
    
    const newFocusId = focusBubbleId === bubble.id ? null : bubble.id;
    onFocusBubbleChange?.(newFocusId);
    
    // Update table data context with bubble data
    if (newFocusId !== null) {
      const bubbleData = data.bubbles.find(b => b.bubbleID === bubble.id);
      if (bubbleData && bubbleData.tabledata) {
        setTableData(bubbleData.tabledata);
        setSelectedItemLabel(bubbleData.bubbleLabel);
      }
    } else {
      // Clear table data when no bubble is selected
      setTableData([]);
      setSelectedItemLabel('');
    }
  }, [focusBubbleId, onFocusBubbleChange, data.bubbles, setTableData, setSelectedItemLabel]);

  // Handle flow click
  const handleFlowClick = useCallback((flow: Flow) => {
    // Check if we're toggling this flow off (clicking the same flow again)
    const isToggleOff = focusedFlow?.from === flow.from && focusedFlow?.to === flow.to;
    
    // Set focused flow state
    setFocusedFlow(isToggleOff ? null : { from: flow.from, to: flow.to });
  }, [focusedFlow]);

  useEffect(() => {
    if (!svgRef.current || !data || !data.bubbles || !dimensions.width) return;

    // Get the VisualizationManager instance from the DI container
    const visualizationManager = container.resolve<VisualizationManager>('visualizationManager');
    
    // Initialize the visualization manager if needed
    visualizationManager.initialize({
      svgElement: svgRef.current,
      width: dimensions.width,
      height: dimensions.height,
      onBubbleClick: handleBubbleClick,
      onFlowClick: handleFlowClick
    });
    
    // Calculate bubble positions and sizes
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const noOfBubbles = data.bubbles.length;
    const isDarkTheme = resolvedTheme === 'dark';
    
    // Initialize bubble visualization using reference implementation logic
    const { bubbles } = initializeBubbleVisualization(
      data,
      dimensions.width,
      dimensions.height,
      noOfBubbles,
      centerX,
      centerY,
      isMarketView
    );
    
    // Update focus state for bubbles and set center bubble properties
    const updatedBubbles = bubbles.map(bubble => ({
      ...bubble,
      focus: bubble.id === focusBubbleId,
      isCentre: bubble.id === noOfBubbles, // Set center bubble flag
      isSelected: bubble.id === focusBubbleId,
      isMarketView,
      isDarkTheme
    }));

    // Get FlowDataService from DI container
    const flowDataService = container.resolve<FlowDataService>('FlowDataService');
    
    // Initialize the service with raw data
    flowDataService.initialize(data);
    
    // Configure the service
    flowDataService.updateConfig({
      bubbles: updatedBubbles,
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      threshold: threshold || 0,
      focusBubbleId,
    });
    
    // Get flows with current configuration
    const flows = flowDataService.getFilteredFlows({
      view: isMarketView ? 'markets' : 'brands',
      metric: flowOption,
      flowType: flowType as 'in' | 'out' | 'net' | 'both' | 'more' | 'less',
      focusBubbleId,
      threshold: threshold || 0
    });
    
    // Update VisualizationManager's internal state
    visualizationManager.updateData(updatedBubbles, flows);
    
    // Trigger rendering
    visualizationManager.render();

    // Cleanup when component unmounts
    return () => {
      visualizationManager.cleanup();
    };
  }, [
    data, 
    flowType, 
    centreFlow, 
    threshold, 
    focusBubbleId, 
    focusedFlow, 
    dimensions, 
    isMarketView, 
    flowOption, 
    resolvedTheme
  ]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%" 
        className="transition-colors duration-200 w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      ></svg>
    </div>
  );
}
