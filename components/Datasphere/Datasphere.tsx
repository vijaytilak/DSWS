'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import * as d3 from 'd3';
import type { FlowData, Bubble, Flow } from './types';
import { initializeBubbleVisualization, drawBubbles, drawFlows } from './utils/visualization';
import { prepareFlowData } from './utils/flow';
import { useDimensions } from './hooks/useDimensions';
import { useCentreFlow } from '@/app/dashboard/layout';
import { useTableData } from '@/app/contexts/table-data-context';

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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { isMarketView, flowOption } = useCentreFlow();
  const { setTableData, setSelectedItemLabel } = useTableData();
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null);
  const [focusedFlow, setFocusedFlow] = useState<{ from: number, to: number } | null>(null);
  const dimensions = useDimensions(containerRef);

  useEffect(() => {
    if (!svgRef.current || !data || !data.itemIDs || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Clear previous content
    svg.selectAll("*").remove();

    // Initialize visualization with minimum constraints
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const noOfBubbles = Object.keys(data.itemIDs).length;
    
    // Calculate bubble positions and sizes
    const { bubbles: initialBubbles } = initializeBubbleVisualization(
      data,
      dimensions.width,
      dimensions.height,
      noOfBubbles,
      centerX,
      centerY
    );

    // Update config with custom outer ring settings if provided
    if (outerRingConfig) {
      const CONFIG = {
        bubble: {
          outerRing: {
            show: outerRingConfig.show !== undefined ? outerRingConfig.show : true,
            strokeWidth: outerRingConfig.strokeWidth !== undefined ? outerRingConfig.strokeWidth : 1,
            strokeDasharray: outerRingConfig.strokeDasharray !== undefined ? outerRingConfig.strokeDasharray : 'none',
            opacity: outerRingConfig.opacity !== undefined ? outerRingConfig.opacity : 1,
          }
        }
      };
    }

    // Draw bubbles
    const handleBubbleClick = (bubble: Bubble) => {
      if (bubble.id === initialBubbles.length) return; // Ignore center bubble click
      
      // Clear focused flow when clicking a bubble
      setFocusedFlow(null);
      
      const newFocusId = focusBubbleId === bubble.id ? null : bubble.id;
      setFocusBubbleId(newFocusId);

      // Update table data for the clicked bubble
      const bubbleData = data.itemIDs.find(item => item.itemID === bubble.id);
      if (bubbleData && bubbleData.tabledata) {
        setTableData(bubbleData.tabledata);
        setSelectedItemLabel(bubbleData.itemLabel);
      }
    };

    // Handle flow click
    const handleFlowClick = (flow: Flow) => {
      // Set focused flow state
      setFocusedFlow(focusedFlow?.from === flow.from && focusedFlow?.to === flow.to ? null : { from: flow.from, to: flow.to });
      
      // Find the flow data
      if (isMarketView) {
        const marketFlows = data.flows_markets;
        const selectedFlow = marketFlows.find(f => f.itemID === flow.from);
        
        if (selectedFlow?.tabledata) {
          setTableData(selectedFlow.tabledata);
          const sourceBubble = data.itemIDs.find(item => item.itemID === flow.from);
          setSelectedItemLabel(`Market: ${sourceBubble?.itemLabel || 'Unknown'}`);
        }
      } else {
        const brandFlows = data.flows_brands;
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

    drawBubbles(
      svg,
      initialBubbles,
      resolvedTheme === 'dark',
      isMarketView,
      centerX,
      centerY,
      focusBubbleId,
      handleBubbleClick
    );

    const initialFlows = prepareFlowData(
      data, 
      flowType, 
      centreFlow, 
      threshold, 
      focusBubbleId,
      isMarketView,
      flowOption
    );
    drawFlows(svg, initialFlows, initialBubbles, flowType, focusBubbleId, centreFlow, isMarketView, flowOption, handleFlowClick, focusedFlow);
  }, [data, flowType, centreFlow, threshold, focusBubbleId, focusedFlow, dimensions, isMarketView, flowOption, setTableData, setSelectedItemLabel, resolvedTheme, outerRingConfig]);

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