'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { FlowData, Bubble, Flow } from './types';
import { VisualizationManager } from './core/VisualizationManager';
import { DependencyContainer } from './core/DependencyContainer';
import FlowManager from './services/FlowManager';
import { useDimensions } from './hooks/useDimensions';
import { initializeBubbleVisualization } from './utils/bubble-utils';

interface DataSphereProps {
  data: FlowData;
  flowType: string;
  centreFlow: boolean;
  threshold: number;
  outerRingConfig?: {
    show?: boolean;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
  };
}

export default function DataSphere({ 
  data,
  flowType,
  centreFlow,
  threshold,
  outerRingConfig,
}: DataSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolvedTheme } = useTheme();
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedItemLabel, setSelectedItemLabel] = useState<string>("");
  const [focusedFlow, setFocusedFlow] = useState<{ from: number, to: number } | null>(null);
  const dimensions = useDimensions(containerRef);
  const isMarketView = true; // Default market view
  const flowOption: 'churn' | 'switching' = 'churn'; // Default flow option

  // Handle bubble click
  const handleBubbleClick = (bubble: Bubble) => {
    // Clear focused flow when clicking a bubble
    setFocusedFlow(null);
    
    const newFocusId = focusBubbleId === bubble.id ? null : bubble.id;
    setFocusBubbleId(newFocusId);

    // If toggling off (deselecting), reset the table data
    if (newFocusId === null) {
      setTableData([]);
      setSelectedItemLabel("");
      return;
    }

    // Otherwise, update table data for the clicked bubble
    const bubbleData = data.itemIDs.find(item => item.itemID === bubble.id);
    if (bubbleData && bubbleData.tabledata) {
      setTableData(bubbleData.tabledata);
      setSelectedItemLabel(bubbleData.itemLabel);
    }
  };

  // Handle flow click
  const handleFlowClick = (flow: Flow) => {
    // Check if we're toggling this flow off (clicking the same flow again)
    const isToggleOff = focusedFlow?.from === flow.from && focusedFlow?.to === flow.to;
    
    // Set focused flow state
    setFocusedFlow(isToggleOff ? null : { from: flow.from, to: flow.to });
    
    // If toggling off (deselecting), reset the table data
    if (isToggleOff) {
      setTableData([]);
      setSelectedItemLabel("");
      return;
    }
    
    // Find the flow data
    if (isMarketView) {
      const marketFlows = data.flows_markets;
      if (!marketFlows) return;
      
      const selectedFlow = marketFlows.find(f => f.itemID === flow.from);
      
      if (selectedFlow?.tabledata) {
        setTableData(selectedFlow.tabledata);
        const sourceBubble = data.itemIDs.find(item => item.itemID === flow.from);
        const targetBubble = data.itemIDs.find(item => item.itemID === flow.to);
        setSelectedItemLabel(`Flow: ${sourceBubble?.itemLabel || 'Unknown'} → ${targetBubble?.itemLabel || 'Unknown'}`);
      }
    } else {
      const brandFlows = data.flows_brands;
      if (!brandFlows) return;
      
      const selectedFlow = brandFlows.find(f => 
        (f.from === flow.from && f.to === flow.to) || 
        (f.from === flow.to && f.to === flow.from)
      );

      if (selectedFlow?.tabledata) {
        setTableData(selectedFlow.tabledata);
        const sourceBubble = data.itemIDs.find(item => item.itemID === flow.from);
        const targetBubble = data.itemIDs.find(item => item.itemID === flow.to);
        setSelectedItemLabel(`Flow: ${sourceBubble?.itemLabel || 'Unknown'} → ${targetBubble?.itemLabel || 'Unknown'}`);
      }
    }
  };

  useEffect(() => {
    if (!svgRef.current || !data || !data.itemIDs || !dimensions.width) return;

    // Get the VisualizationManager instance from the DI container
    const container = DependencyContainer.getInstance();
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
    const noOfBubbles = data.itemIDs.length;
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

    // Prepare flows using FlowManager service
    const flowManager = FlowManager.getInstance();
    
    // Process flows using FlowManager service
    flowManager.processFlows(
      data,
      flowType,
      flowOption,
      threshold,
      focusBubbleId,
      centreFlow
    ).then(flows => {
      // When flows are ready, update the visualization
    
      // Update the visualization with the flows and bubbles
      visualizationManager.update(
        updatedBubbles,
        flows,
        flowType,
        focusBubbleId,
        centreFlow,
        isMarketView,
        flowOption,
        focusedFlow
      );
    }).catch(error => {
      console.error('Error processing flows:', error);
    });

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
    resolvedTheme, 
    outerRingConfig
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
