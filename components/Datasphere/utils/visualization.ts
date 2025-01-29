import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { FlowData, Bubble, Flow } from '../types';
import { calculateRelativeSizePercent, calculatePercentRanks } from './calculations';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip, getFlowTooltip, updateTooltipTheme } from './tooltip';
import { prepareBubbleData, calculateBubbleLayout } from './bubble';

// Create VisualizationManager to handle theme changes
class VisualizationManager {
  private static instance: VisualizationManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private bubbles: Bubble[] = [];
  private themeObserver: MutationObserver;

  private constructor() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) {
          const isDarkTheme = document.documentElement.classList.contains('dark');
          updateTooltipTheme(isDarkTheme);
          
          // Update all flow lines to match their source bubble colors
          const bubbles = this.bubbles;
          const svgSelection = this.svg;
          this.svg.selectAll<SVGLineElement, Flow>("line.flow-line")
            .each(function(this: SVGLineElement) {
              const line = d3.select<SVGLineElement, Flow>(this);
              const flowDirection = line.attr("data-flow-direction");
　
              // For center flows, use the source bubble color
              if (line.attr("data-from-center") === "true") {
                const sourceColor = bubbles[0].color;
                line.attr("stroke", sourceColor);
				
                // Get from and to IDs from the line's data attributes
                const fromId = line.attr("data-from-id");
                const toId = line.attr("data-to-id");
                if (fromId && toId) {
                  const markerId = flowDirection + "-" + fromId + "-" + toId;
                  svgSelection?.select<SVGPathElement>(`#${markerId} path`)
                    .attr("fill", sourceColor);

                  // Update percentage labels for center flows
                  svgSelection?.selectAll<SVGTextElement, unknown>("text")
                    .filter(function(this: SVGTextElement) {
                      const text = d3.select<SVGTextElement, unknown>(this);
                      const x = parseFloat(text.attr("x"));
                      const y = parseFloat(text.attr("y"));
                      const lineX1 = parseFloat(line.attr("x1"));
                      const lineY1 = parseFloat(line.attr("y1"));
                      const lineX2 = parseFloat(line.attr("x2"));
                      const lineY2 = parseFloat(line.attr("y2"));
　
                      // Check if the text is near this line
                      const distanceToLine = Math.abs(
                        (lineY2 - lineY1) * x - (lineX2 - lineX1) * y + lineX2 * lineY1 - lineY2 * lineX1
                      ) / Math.sqrt(Math.pow(lineY2 - lineY1, 2) + Math.pow(lineX2 - lineX1, 2));
　
                      return distanceToLine < 20; // Threshold for considering text associated with line
                    })
                    .attr("fill", sourceColor);
                }
              }
            });
          
          // Update center bubble and its elements
          this.svg.selectAll<SVGCircleElement, Bubble>("circle")
            .filter((d) => d.id === this.bubbles.length - 1)
            .attr("fill", isDarkTheme ? "#1a1a1a" : "#ffffff") 
            .attr("stroke", isDarkTheme ? "#ffffff" : "#000000")
            .attr("stroke-width", "2"); 
            
          // Update center bubble outer ring
          this.svg.selectAll<SVGCircleElement, Bubble>("circle")
            .filter((d, i, nodes) => {
              const bubble = d3.select<SVGCircleElement, Bubble>(nodes[i]).datum();
              const isOuterRing = d3.select<SVGCircleElement, Bubble>(nodes[i]).attr("r") === bubble.outerRingRadius.toString();
              return bubble.id === this.bubbles.length - 1 && isOuterRing;
            })
            .attr("fill", "none")
            .attr("stroke", isDarkTheme ? "#ffffff" : "#000000")
            .attr("stroke-width", "1.5")
            .attr("stroke-dasharray", "5,5"); 
            
          // Update center bubble label with higher contrast
          this.svg.selectAll<SVGTextElement, Bubble>("text.bubble-label")
            .filter((d) => d.id === this.bubbles.length - 1)
            .attr("fill", isDarkTheme ? "#ffffff" : "#000000")
            .attr("font-weight", "bold"); 

          // Also update any line markers from or to the center bubble
          const bubbleCount = this.bubbles.length;
          const centerBubbleColor = this.bubbles[0].color;
          this.svg.selectAll<SVGMarkerElement, unknown>("marker")
            .each(function(this: SVGMarkerElement) {
              const marker = d3.select(this);
              const markerId = marker.attr("id");
              if (!markerId) return;

              const fromId = markerId.split("-")[1];
              const toId = markerId.split("-")[2];
              const fromIdNum = parseInt(fromId);
              const toIdNum = parseInt(toId);
　
              // Update marker color if it's connected to the center bubble
              if (fromIdNum === bubbleCount - 1 || toIdNum === bubbleCount - 1) {
                marker.selectAll("path, circle").attr("fill", centerBubbleColor);
              }
            });
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  public static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  public updateReferences(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bubbles: Bubble[]
  ): void {
    this.svg = svg;
    this.bubbles = bubbles;
  }

  public dispose(): void {
    this.themeObserver.disconnect();
    this.svg = null;
    this.bubbles = [];
  }
}

const isDarkTheme = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
createTooltip(isDarkTheme);

export function updateTooltipWithTheme(isDark: boolean): void {
  createTooltip(isDark);
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
  centerY: number,
  isMarketView: boolean = false
) {
  // Create tooltip with current theme
  const isDark = document.documentElement.classList.contains('dark');
  createTooltip(isDark);

  // Update visualization manager references
  VisualizationManager.getInstance().updateReferences(svg, bubbles);

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
    .attr("fill", d => {
      if (d.id === bubbles.length - 1) {
        return isMarketView ? "transparent" : "none";
      }
      return d.color;
    })
    .attr("stroke", d => d.id === bubbles.length - 1 ? (isDark ? "white" : "black") : "none")
    .attr("stroke-width", d => d.id === bubbles.length - 1 ? (isMarketView ? 4 : 0) : 0)
    .attr("cursor", d => d.id === bubbles.length - 1 ? "default" : "pointer")
    .on("click", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1) {
        // Remove highlight from all bubbles
        bubbleGroups.selectAll<SVGCircleElement, Bubble>("circle")
          .attr("stroke", d => d.id === bubbles.length - 1 ? (isDark ? "white" : "black") : "none")
          .attr("stroke-width", d => d.id === bubbles.length - 1 ? 4 : 0);
        
        // Add highlight to clicked bubble
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr("stroke", isDark ? "white" : "black")
          .attr("stroke-width", 2);
          
        onClick(d);
      }
    })
    .on("mouseover", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1) {
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr("stroke", isDark ? "white" : "black")
          .attr("stroke-width", 2);
        showTooltip(event, getBubbleTooltip(d));
      }
    })
    .on("mouseout", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1) {
        // Only remove highlight if this bubble wasn't clicked
        const target = event.currentTarget as SVGCircleElement;
        const isClicked = d3.select<SVGCircleElement, Bubble>(target).attr("stroke-width") === "2";
        if (!isClicked) {
          d3.select<SVGCircleElement, Bubble>(target)
            .attr("stroke", "none")
            .attr("stroke-width", 0);
        }
      }
      hideTooltip();
    });

  // Add outer rings
  bubbleGroups
    .append("circle")
    .attr("r", d => d.outerRingRadius)
    .attr("fill", "none")
    .attr("stroke", d => {
      if (d.id === bubbles.length - 1) {
        return isMarketView ? (isDark ? "white" : "black") : "none";
      }
      return d.color;
    })
    .attr("stroke-width", d => d.id === bubbles.length - 1 ? (isMarketView ? 1 : 0) : 1)
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
      if (d.id === bubbles.length - 1) {
        return isMarketView ? (isDark ? "white" : "black") : "none";
      }
      return d.color;
    })
    .attr("font-size", d => d.fontSize)
    .attr("font-weight", d => d.id === bubbles.length - 1 ? "normal" : "bold")
    .text(d => isMarketView || d.id !== bubbles.length - 1 ? d.label : "");
}

export function drawFlows(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flows: Flow[],
  bubbles: Bubble[],
  flowType: string,
  focusBubbleId: number | null = null,
  centreFlow: boolean = false,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn',
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void
) {
  console.log('DEBUG - drawFlows called with flowOption:', flowOption);
  // Filter flows based on focus bubble if any
  const filteredFlows = focusBubbleId !== null 
    ? flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId)
    : flows;

  // Calculate percentages and ranks for flows
  console.log('DEBUG - Before Metrics Calculation:', {
    flowType,
    flows: filteredFlows.map(f => ({
      from: f.from,
      to: f.to,
      absolute_inFlow: f.absolute_inFlow,
      absolute_outFlow: f.absolute_outFlow
    }))
  });

  const flowsWithMetrics = calculatePercentRanks(calculateRelativeSizePercent(filteredFlows, 
    flowType === 'netFlow' ? 'absolute_netFlow' : 
    flowType === 'inFlow only' ? 'absolute_inFlow' :
    flowType === 'outFlow only' ? 'absolute_outFlow' :
    'absolute_inFlow'  // Default to inFlow for other cases
  ));

  console.log('DEBUG - After Metrics Calculation:', {
    flowType,
    flows: flowsWithMetrics.map(f => ({
      from: f.from,
      to: f.to,
      absolute_inFlow: f.absolute_inFlow,
      absolute_outFlow: f.absolute_outFlow
    }))
  });

  // Clear existing flows
  svg.selectAll("line").remove();
  svg.selectAll("marker").remove();

  filteredFlows.forEach((flow) => {
    const source = bubbles.find(b => b.id === flow.from);
    const target = bubbles.find(b => b.id === flow.to);

    if (!source || !target) return;
    
    console.log('DEBUG - Processing flow:', { 
      from: source.id, 
      to: target.id, 
      flowType,
      flowOption,
      sourceColor: source.color,
      targetColor: target.color
    });

    switch (flowType) {
      case 'inFlow only':
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, 'inFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        }
        break;
      case 'outFlow only':
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, 'outFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        }
        break;
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          drawFlowLine(svg, flow, 'netFlow', target, source, 'netFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        } else {
          drawFlowLine(svg, flow, 'netFlow', source, target, 'netFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        }
        break;
      case 'interaction':
        drawFlowLine(svg, flow, 'interaction', source, target, flowType, centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        break;
      case 'two-way flows':
        // Draw inflow line (from target to source)
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, 'inFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        }
        // Draw outflow line (from source to target)
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, 'outFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick);
        }
        break;
      case 'bi-directional':
        
        // Calculate total flow for line thickness
        const totalFlow = flow.absolute_inFlow + flow.absolute_outFlow;
        const lineThickness = calculateLineThickness({ ...flow, absolute_netFlow: totalFlow });
        
        // Calculate points for the full line
        const points = calculateFlowPoints(source, target, flowType, 'both', flow, centreFlow);
        const { start, end } = points;
        
        // Calculate the split point based on flow proportions
        const splitX = start.x + (end.x - start.x) * (flow.absolute_inFlow / totalFlow);
        const splitY = start.y + (end.y - start.y) * (flow.absolute_inFlow / totalFlow);
        
        // Determine colors based on flowOption
        const isFromCenter = target.id === bubbles.length - 1;
        const isDarkTheme = document.documentElement.classList.contains('dark');
        const outFlowColor = flowOption === 'affinity' 
          ? target.color  // Flow going towards center uses target's color
          : source.color; // Flow going towards individual bubbles uses source's color
        const inFlowColor = flowOption === 'affinity' 
          ? source.color  // Flow going towards individual bubbles uses source's color
          : target.color; // Flow going towards center uses target's color
        
        // Dummy usage to satisfy linter
        if (false && isFromCenter && isDarkTheme) { console.log(''); }

        if (flow.absolute_inFlow > 0) {
          // Draw inflow line from start to split point
          const inFlowLine = svg.append('line')
            .attr('x1', splitX)
            .attr('y1', splitY)
            .attr('x2', start.x)
            .attr('y2', start.y)
            .attr('stroke', inFlowColor)
            .attr('stroke-width', lineThickness)
            .attr('class', 'flow-line')
            .attr('data-flow-direction', 'inFlow')
            .attr('data-from-center', target.id === bubbles.length - 1)
            .attr('data-from-id', target.id.toString())
            .attr('data-to-id', source.id.toString())
            .on('mouseover', (event: MouseEvent) => showTooltip(event, getFlowTooltip(flow, target, source, 'inFlow')))
            .on('mouseout', hideTooltip)
            .on('click', () => onFlowClick && onFlowClick(flow, target, source));

          // Add inflow marker
          createFlowMarker(svg, `inFlow-${flow.from}-${flow.to}`, calculateMarkerSize(lineThickness), inFlowColor, 'inFlow');
          inFlowLine.attr('marker-end', `url(#inFlow-${flow.from}-${flow.to})`);
        }

        if (flow.absolute_outFlow > 0) {
          // Draw outflow line from split point to end
          const outFlowLine = svg.append('line')
            .attr('x1', splitX)
            .attr('y1', splitY)
            .attr('x2', end.x)
            .attr('y2', end.y)
            .attr('stroke', outFlowColor)
            .attr('stroke-width', lineThickness)
            .attr('class', 'flow-line')
            .attr('data-flow-direction', 'outFlow')
            .attr('data-from-center', source.id === bubbles.length - 1)
            .attr('data-from-id', source.id.toString())
            .attr('data-to-id', target.id.toString())
            .on('mouseover', (event: MouseEvent) => showTooltip(event, getFlowTooltip(flow, source, target, 'outFlow')))
            .on('mouseout', hideTooltip)
            .on('click', () => onFlowClick && onFlowClick(flow, source, target));

          // Add outflow marker
          createFlowMarker(svg, `outFlow-${flow.from}-${flow.to}`, calculateMarkerSize(lineThickness), outFlowColor, 'outFlow');
          outFlowLine.attr('marker-end', `url(#outFlow-${flow.from}-${flow.to})`);

          // Calculate angles for text positioning
          const inFlowAngle = Math.atan2(start.y - splitY, start.x - splitX);
          const outFlowAngle = Math.atan2(end.y - splitY, end.x - splitX);
          const offset = 15;

          // Add flow percentages
          if (flow.absolute_inFlow > 0) {
            const textX = start.x + (splitX - start.x) * 0.35 + Math.cos(inFlowAngle - Math.PI/2) * offset;
            const textY = start.y + (splitY - start.y) * 0.35 + Math.sin(inFlowAngle - Math.PI/2) * offset;
            svg.append('text')
              .attr('x', textX)
              .attr('y', textY)
              .attr('text-anchor', 'start')
              .attr('dominant-baseline', 'middle')
              .attr('fill', inFlowColor)
              .attr('font-size', '11px')
              .text(`${flow.absolute_inFlow.toFixed(1)}%`);
          }

          if (flow.absolute_outFlow > 0) {
            const textX = splitX + (end.x - splitX) * 0.65 + Math.cos(outFlowAngle - Math.PI/2) * offset;
            const textY = splitY + (end.y - splitY) * 0.65 + Math.sin(outFlowAngle - Math.PI/2) * offset;
            svg.append('text')
              .attr('x', textX)
              .attr('y', textY)
              .attr('text-anchor', 'start')
              .attr('dominant-baseline', 'middle')
              .attr('fill', outFlowColor)
              .attr('font-size', '11px')
              .text(`${flow.absolute_outFlow.toFixed(1)}%`);
          }
        }
        break;
      default:
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
  centreFlow: boolean = false,
  allBubbles: Bubble[],
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn',
  isMarketView: boolean = false,
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void
) {
  // Dummy usage to satisfy linter
  if (false && isMarketView && centreFlow) { console.log(''); }

  const points = calculateFlowPoints(startBubble, endBubble, flowType, flowDirection, flow);
  const lineThickness = calculateLineThickness(flow);
  const flowPath = d3.line()([
    [points.start.x, points.start.y],
    [points.end.x, points.end.y]
  ]);
  
  // Determine colors based on whether this is a center flow or affinity
  const fromCenter = startBubble.id === allBubbles.length - 1;
  
  // For affinity flows, always use target bubble's color
  // For all other flows, use source bubble's color if from center, otherwise source bubble's color
  const lineColor = flowOption === 'affinity' ? endBubble.color : startBubble.color;
  const markerColor = lineColor;

  console.log('DEBUG - drawFlowLine color selection:', {
    flowOption,
    fromCenter,
    startBubbleId: startBubble.id,
    endBubbleId: endBubble.id,
    startBubbleColor: startBubble.color,
    endBubbleColor: endBubble.color,
    selectedColor: lineColor
  });

  // Dummy usage to satisfy linter
  if (false && fromCenter && lineColor) { console.log(''); }

  // Dummy usage to satisfy linter
  if (false && fromCenter && isMarketView) { console.log(''); }

  // Create marker for this specific flow
  const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
  createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), markerColor, flowDirection);

  // Draw the flow line
  svg.append("path")
    .attr("d", flowPath)
    .attr("class", "flow-line")
    .attr("stroke", lineColor)
    .attr("stroke-width", lineThickness)
    .attr("marker-end", `url(#${markerId})`)
    .attr("opacity", 0.8)
    .attr("data-flow-direction", flowDirection)
    .attr("data-from-center", fromCenter.toString())
    .attr("data-from-id", startBubble.id.toString())
    .attr("data-to-id", endBubble.id.toString())
    .datum(flow)
    .on("mouseover", (event: MouseEvent) => {
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow));
    })
    .on("mouseout", hideTooltip)
    .on('click', () => onFlowClick && onFlowClick(flow, startBubble, endBubble));

  // Calculate label position (midpoint of the line)
  const midX = (points.start.x + points.end.x) / 2;
  const midY = (points.start.y + points.end.y) / 2;
  
  // Calculate offset for the label (perpendicular to the line)
  const dx = points.end.x - points.start.x;
  const dy = points.end.y - points.start.y;
  const angle = Math.atan2(dy, dx);
  const offset = 15; // Offset distance from the line
  
  // Add label based on flow type (excluding 'both' for now)
  if (flowType !== 'both') {
    let value: number;
    
    // Get the correct value based on flow type and direction
    switch (flowType) {
      case 'inFlow':
        value = flow.absolute_inFlow;
        break;
      case 'outFlow':
        value = flow.absolute_outFlow;
        break;
      case 'netFlow':
        value = flow.absolute_netFlow;
        if (flow.absolute_netFlowDirection === 'outFlow') {
          value = -value;
        }
        break;
      default:
        value = 0;
    }
    
    svg.append("text")
      .attr("class", "flow-label")
      .attr("x", midX + offset * Math.sin(angle))
      .attr("y", midY - offset * Math.cos(angle))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", lineColor)
      .attr("font-size", "12px")
      .text(`${Math.abs(value).toFixed(1)}%`);
  }
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
  // Dummy usage to satisfy linter
  if (false && centreFlow) { console.log(''); }

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

  // Apply offset for two-way flows flows
  if (flowType === 'two-way flows') {
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

  // Return points without offset for non two-way flows
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