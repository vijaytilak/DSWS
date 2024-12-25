'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import * as d3 from 'd3';
import { CONFIG } from './constants/config';
import type { FlowData, Bubble, Flow } from './types';
import { initializeBubbleVisualization, drawBubbles, drawFlows } from './utils/visualization';
import { prepareFlowData } from './utils/flow';
import { useDimensions } from './hooks/useDimensions';
import { useCentreFlow } from '@/app/dashboard/layout';

type FlowOption = 'churn' | 'switching' | 'affinity';

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
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
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
    setBubbles(initialBubbles);

    // Draw bubbles
    const handleBubbleClick = (bubble: Bubble) => {
      if (bubble.id === bubbles.length) return; // Ignore center bubble click
      
      const newFocusId = focusBubbleId === bubble.id ? null : bubble.id;
      setFocusBubbleId(newFocusId);
      setBubbles(bubbles.map(b => ({
        ...b,
        focus: b.id === bubble.id ? newFocusId !== null : false
      })));
    };
    drawBubbles(svg, initialBubbles, handleBubbleClick, centerX, centerY);

    const initialFlows = prepareFlowData(
      data, 
      flowType, 
      centreFlow, 
      threshold, 
      focusBubbleId,
      isMarketView,
      flowOption
    );
    setFlows(initialFlows);
    drawFlows(svg, initialFlows, initialBubbles, flowType, focusBubbleId, centreFlow);
  }, [data, flowType, centreFlow, threshold, focusBubbleId, resolvedTheme, dimensions, isMarketView, flowOption]);

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