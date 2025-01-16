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
}

export default function DataSphere({ 
  data,
  flowType,
  centreFlow,
  threshold
}: DataSphereProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { isMarketView, flowOption } = useCentreFlow();
  const { setTableData, setSelectedItemLabel } = useTableData();
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null);
  const dimensions = useDimensions(containerRef);

  useEffect(() => {
    if (!svgRef.current || !data || !data.itemIDs || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.style("background", resolvedTheme === 'dark' ? "black" : "white")
      .attr("width", "100%")
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

    // Draw bubbles
    const handleBubbleClick = (bubble: Bubble) => {
      if (bubble.id === initialBubbles.length) return; // Ignore center bubble click
      
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

    drawBubbles(svg, initialBubbles, handleBubbleClick, centerX, centerY, isMarketView);

    const initialFlows = prepareFlowData(
      data, 
      flowType, 
      centreFlow, 
      threshold, 
      focusBubbleId,
      isMarketView,
      flowOption
    );
    drawFlows(svg, initialFlows, initialBubbles, flowType, focusBubbleId, centreFlow, isMarketView, flowOption, handleFlowClick);
  }, [data, flowType, centreFlow, threshold, focusBubbleId, resolvedTheme, dimensions, isMarketView, flowOption, setTableData, setSelectedItemLabel]);

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