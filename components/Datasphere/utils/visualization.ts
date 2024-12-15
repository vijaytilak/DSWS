import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { FlowData, Bubble, Flow } from '../types';
import { calculateRelativeSizePercent, calculatePercentRanks } from './calculations';
import { formatNumber } from '../utils/format';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip, getFlowTooltip, updateTooltipTheme } from './tooltip';
import { prepareBubbleData, calculateBubbleLayout } from './bubble';

// Initialize tooltip with theme based on initial system theme
let isDarkTheme = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
let tooltip = createTooltip(isDarkTheme);

export function updateTooltipWithTheme(isDark: boolean) {
  tooltip = createTooltip(isDark);
}

export function initializeBubbleVisualization(
  data: FlowData,
  width: number,
  height: number,
  noOfBubbles: number,
  centerX: number,
  centerY: number
): { bubbles: Bubble[], maxBubbleRadius: number, minBubbleRadius: number } {
  const baseTextSize = Math.max(
    Math.min(centerX, centerY) * 0.035,
    CONFIG.bubble.minFontSize
  );

  // Calculate the radius of the circle on which bubbles are positioned
  const maxRadius = Math.max(width, height) / 2;
  const minRadius = Math.min(width, height) / 2;
  const positionCircleRadius = Math.min(width, height) / 2;

  // Prepare bubble data
  const bubbleData = prepareBubbleData(data, positionCircleRadius, noOfBubbles);
  
  // Calculate layout positions
  const bubbles = calculateBubbleLayout(bubbleData.bubbles, centerX, centerY, positionCircleRadius, baseTextSize);
  
  return {
    bubbles,
    maxBubbleRadius: bubbleData.maxBubbleRadius,
    minBubbleRadius: bubbleData.minBubbleRadius
  };
}

export function drawBubbles(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bubbles: Bubble[],
  onClick: (bubble: Bubble) => void,
  centerX: number,
  centerY: number
) {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? 'white' : 'black';
  
  // Create tooltip with current theme
  createTooltip(isDark);

  // Add theme change listener
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isDarkTheme = document.documentElement.classList.contains('dark');
        updateTooltipTheme(isDarkTheme);
        
        // Update center bubble stroke and text color
        svg.selectAll("circle")
          .filter(d => (d as Bubble).id === bubbles.length - 1)
          .attr("stroke", isDarkTheme ? "white" : "black");
          
        // Update center bubble outer ring color
        svg.selectAll("circle")
          .filter((d, i, nodes) => {
            const bubble = d3.select(nodes[i]).datum() as Bubble;
            const isOuterRing = d3.select(nodes[i]).attr("r") === bubble.outerRingRadius.toString();
            return bubble.id === bubbles.length - 1 && isOuterRing;
          })
          .attr("stroke", isDarkTheme ? "white" : "black");
          
        svg.selectAll("text.bubble-label")
          .filter(d => (d as Bubble).id === bubbles.length - 1)
          .attr("fill", isDarkTheme ? "white" : "black");
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  const bubbleGroups = svg
    .selectAll<SVGGElement, Bubble>("g.bubble")
    .data(bubbles)
    .join("g")
    .attr("class", "bubble")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  // Add circles
  bubbleGroups
    .append("circle")
    .attr("r", d => d.radius)
    .attr("fill", d => d.id === bubbles.length - 1 ? "transparent" : d.color)
    .attr("stroke", d => d.id === bubbles.length - 1 ? (isDark ? "white" : "black") : "none")
    .attr("stroke-width", d => d.id === bubbles.length - 1 ? 4 : 0)
    .attr("cursor", "pointer")
    .on("click", (event, d) => onClick(d))
    .on("mouseover", (event, d) => {
      if (d.id !== bubbles.length - 1) {
        showTooltip(event, getBubbleTooltip(d));
      }
    })
    .on("mouseout", hideTooltip);

  // Add outer rings
  bubbleGroups
    .append("circle")
    .attr("r", d => d.outerRingRadius)
    .attr("fill", "none")
    .attr("stroke", d => d.id === bubbles.length - 1 ? (isDark ? "white" : "black") : d.color)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5")
    .attr("opacity", 0.6);

  // Add labels separately from bubbles
  svg.selectAll("text.bubble-label")
    .data(bubbles)
    .join("text")
    .attr("pointer-events", "none")
    .attr("class", "bubble-label")
    .attr("x", d => d.textX)
    .attr("y", d => d.textY)
    .attr("text-anchor", d => {
      if (d.id === bubbles.length - 1) return "middle";
      const angle = Math.atan2(d.y - centerY, d.x - centerX);
      if (Math.abs(angle) < Math.PI / 4) return "start";
      if (Math.abs(angle) > 3 * Math.PI / 4) return "end";
      return "middle";
    })
    .attr("dominant-baseline", "middle")
    .attr("fill", d => {
      if (d.id === bubbles.length - 1) return isDark ? "white" : "black";
      return d.color;
    })
    .attr("font-size", d => d.fontSize)
    .attr("font-weight", d => d.id === bubbles.length - 1 ? "normal" : "bold")
    .text(d => d.label);
}

export function drawFlows(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flows: Flow[],
  bubbles: Bubble[],
  flowType: string,
  focusBubbleId: number | null = null,
  centreFlow: boolean = false
) {
  // Filter flows based on focus bubble if any
  let filteredFlows = focusBubbleId !== null 
    ? flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId)
    : flows;

  // Calculate percentages and ranks for flows
  const flowsWithMetrics = calculatePercentRanks(calculateRelativeSizePercent(filteredFlows, 
    flowType === 'netFlow' ? 'absolute_netFlow' : 
    flowType === 'inFlow only' ? 'absolute_inFlow' :
    flowType === 'outFlow only' ? 'absolute_outFlow' : 
    'absolute_netFlow'
  ));

  // Clear existing flows
  svg.selectAll("line").remove();
  svg.selectAll("marker").remove();

  flowsWithMetrics.forEach((flow) => {
    const source = bubbles.find(b => b.id === flow.from);
    const target = bubbles.find(b => b.id === flow.to);

    if (!source || !target) return;

    switch (flowType) {
      case 'inFlow only':
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, flowType, centreFlow);
        }
        break;
      case 'outFlow only':
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, flowType, centreFlow);
        }
        break;
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          drawFlowLine(svg, flow, 'netFlow', target, source, flowType, centreFlow);
        } else {
          drawFlowLine(svg, flow, 'netFlow', source, target, flowType, centreFlow);
        }
        break;
      case 'interaction':
        drawFlowLine(svg, flow, 'interaction', source, target, flowType, centreFlow);
        break;
      case 'bidirectional':
        // Draw inflow line (from target to source)
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, flowType, centreFlow);
        }
        // Draw outflow line (from source to target)
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, flowType, centreFlow);
        }
        break;
    }
  });
}

export function drawFlowLine(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flow: Flow,
  flowDirection: string,
  startBubble: Bubble,
  endBubble: Bubble,
  flowType: string,
  centreFlow: boolean = false
) {
  const points = calculateFlowPoints(startBubble, endBubble, flowType, flowDirection, flow, centreFlow);
  const lineThickness = calculateLineThickness(flow);
  const markerSize = calculateMarkerSize(lineThickness);
  const lineColor = startBubble.color;

  // Create marker for this specific flow
  const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
  createFlowMarker(svg, markerId, markerSize, lineColor, flowDirection);

  // Draw the flow line
  const path = svg.append("line")
    .attr("x1", points.start.x)
    .attr("y1", points.start.y)
    .attr("x2", points.end.x)
    .attr("y2", points.end.y)
    .attr("stroke", lineColor)
    .attr("stroke-width", lineThickness)
    .attr("marker-end", `url(#${markerId})`)
    .attr("opacity", 0.8)
    .on("mouseover", (event) => {
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection));
    })
    .on("mouseout", hideTooltip);
}

function createFlowMarker(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  id: string,
  size: number,
  color: string,
  flowDirection: string
) {
  const marker = svg.append("defs")
    .append("marker")
    .attr("id", id)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", size)
    .attr("markerHeight", size)
    .attr("orient", "auto");

  if (flowDirection === 'interaction') {
    marker.append("circle")
      .attr("cx", "5")
      .attr("cy", "0")
      .attr("r", "4")
      .attr("fill", color);
  } else {
    marker.append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", color);
  }
}

function calculateFlowPoints(
  source: Bubble,
  target: Bubble,
  flowType: string,
  flowDirection: string,
  flow: Flow,
  centreFlow: boolean = false
) {
  // Calculate the angle between bubbles
  const angle = Math.atan2(target.y - source.y, target.x - source.x);
  
  // Calculate base points at the outer ring
  const startPoint = {
    x: source.x + source.outerRingRadius * Math.cos(angle),
    y: source.y + source.outerRingRadius * Math.sin(angle)
  };
  
  const endPoint = {
    x: target.x - target.outerRingRadius * Math.cos(angle),
    y: target.y - target.outerRingRadius * Math.sin(angle)
  };

  // Apply offset for bidirectional flows
  if (flowType === 'bidirectional') {
    // Calculate line thickness to determine the offset
    const lineThickness = calculateLineThickness(flow);
    
    // Create a scale for offset based on line thickness
    const offsetScale = d3.scaleLinear()
      .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
      .range([CONFIG.flow.parallelOffset, CONFIG.flow.parallelOffset * 2])
      .clamp(true);
    
    // Calculate offset using the scale
    const offset = offsetScale(lineThickness);
    
    // Calculate perpendicular vector components
    const perpAngle = angle + Math.PI / 2;
    const offsetX = offset * Math.cos(perpAngle);
    const offsetY = offset * Math.sin(perpAngle);
    
    // Use original bubble IDs to determine offset direction consistently
    const originalFromId = flowDirection === 'inFlow' ? target.id : source.id;
    const originalToId = flowDirection === 'inFlow' ? source.id : target.id;
    const direction = originalFromId < originalToId ? 1 : -1;
    
    return {
      start: {
        x: startPoint.x + (offsetX * direction),
        y: startPoint.y + (offsetY * direction)
      },
      end: {
        x: endPoint.x + (offsetX * direction),
        y: endPoint.y + (offsetY * direction)
      }
    };
  }

  // Return points without offset for non-bidirectional flows
  return { start: startPoint, end: endPoint };
}

function calculateLineThickness(flow: Flow): number {
  if (!flow.percentRank) return CONFIG.flow.minLineThickness;
  
  const scale = d3.scalePow()
    .exponent(0.5)
    .domain([0, 100])
    .range([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness * 0.8])
    .clamp(true);
    
  return scale(flow.percentRank);
}

function calculateMarkerSize(lineThickness: number): number {
  // Make marker size proportional to line thickness, but with a smaller ratio
  return lineThickness * 0.5;
}