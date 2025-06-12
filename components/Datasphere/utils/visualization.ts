import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { FlowData, Bubble, Flow } from '../types';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip, getFlowTooltip, updateTooltipTheme } from './tooltip';
import { prepareBubbleData, calculateBubbleLayout } from './bubble';

// Create VisualizationManager to handle theme changes
class VisualizationManager {
  private static instance: VisualizationManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private bubbles: Bubble[] = [];
  private themeObserver: MutationObserver;
  private isMarketView: boolean = true;  // Set to true to match app's default state

  private constructor() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) {
          const isDarkTheme = document.documentElement.classList.contains('dark');
          updateTooltipTheme(isDarkTheme);
          
          // Update center flows and their markers
          const svgSelection = this.svg;
          const centerFlowColor = isDarkTheme ? "#ffffff" : "#000000";
          const centerBubbleId = this.bubbles.length - 1;
          
          // Update flow lines and their associated elements
          this.svg.selectAll<SVGElement, Flow>("path.flow-line, line.flow-line")
            .each(function() {
              const element = d3.select(this);
              const fromId = element.attr("data-from-id");
              const toId = element.attr("data-to-id");
              const flowDirection = element.attr("data-flow-direction");
              
              // Update center flow colors
              if (fromId === centerBubbleId.toString()) {
                element.attr("stroke", centerFlowColor);
                
                // Update labels for center flows
                svgSelection?.selectAll<SVGTextElement, unknown>("text.flow-label")
                  .filter(function() {
                    const label = d3.select(this);
                    return label.attr("data-from-id") === fromId;
                  })
                  .attr("fill", centerFlowColor);
              }
              
              // Get the current line color
              const lineColor = element.attr("stroke");
              
              // Update marker and label
              if (fromId && toId && flowDirection) {
                // Update marker
                const markerId = `${flowDirection}-${fromId}-${toId}`;
                svgSelection?.selectAll(`#${markerId} path`)
                  .attr("fill", lineColor);
                
                // Update associated label
                svgSelection?.selectAll<SVGTextElement, unknown>("text.flow-label")
                  .filter(function() {
                    const label = d3.select(this);
                    return label.attr("data-from-id") === fromId && 
                           label.attr("data-to-id") === toId;
                  })
                  .attr("fill", lineColor);
              }
            });

          // Update center bubble and its elements
          this.svg.selectAll<SVGCircleElement, Bubble>("circle")
            .filter((d) => d && d.id === this.bubbles.length - 1)
            .each(function() {
              const circle = d3.select<SVGCircleElement, Bubble>(this);
              const isOuterRing = parseFloat(circle.attr("r") || "0") === circle.datum().outerRingRadius;
              
              if (isOuterRing) {
                circle
                  .attr("fill", "none")
                  .attr("stroke", centerFlowColor)
                  .attr("stroke-width", "1.5")
                  .attr("stroke-dasharray", "5,5");
              } else {
                circle
                  .attr("fill", isDarkTheme ? "#1a1a1a" : "#ffffff")
                  .attr("stroke", centerFlowColor)
                  .attr("stroke-width", "2");
              }
            });
            
          // Update center bubble label
          this.svg.selectAll<SVGTextElement, Bubble>("text.bubble-label")
            .filter((d) => d && d.id === this.bubbles.length - 1)
            .attr("fill", this.isMarketView ? (isDarkTheme ? "#ffffff" : "#000000") : "transparent");

          // Update all flow markers in a single pass
          this.svg.selectAll<SVGMarkerElement, unknown>("marker")
            .each(function() {
              const marker = d3.select(this);
              const id = marker.attr("id");
              if (!id) return;

              // Find the corresponding flow line
              const lines = svgSelection?.selectAll<SVGElement, unknown>("path.flow-line, line.flow-line");
              if (!lines) return;

              const parentLine = lines.filter(function() {
                const line = d3.select(this);
                const fromId = line.attr("data-from-id") || '';
                const toId = line.attr("data-to-id") || '';
                const flowDirection = line.attr("data-flow-direction") || '';
                const expectedId = `${flowDirection}-${fromId}-${toId}`;
                return expectedId === id;
              });

              // Only update if we found a matching line
              if (!parentLine.empty()) {
                const lineColor = parentLine.attr("stroke");
                if (lineColor) {
                  marker.select("path")
                    .attr("fill", lineColor);
                }
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
    bubbles: Bubble[],
    isMarketView: boolean
  ): void {
    this.svg = svg;
    this.bubbles = bubbles;
    this.isMarketView = isMarketView;
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
  isDark: boolean,
  isMarketView: boolean,
  centerX: number,
  centerY: number,
  focusedBubbleId: number | null,
  onClick: (bubble: Bubble) => void,
  outerRingConfig?: {
    show?: boolean;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
  }
) {
  // Create visualization manager instance
  const visualizationManager = VisualizationManager.getInstance();
  visualizationManager.updateReferences(svg, bubbles, isMarketView);

  // Update CONFIG with custom outer ring settings if provided
  if (outerRingConfig) {
    CONFIG.bubble.outerRing = {
      ...CONFIG.bubble.outerRing,
      ...outerRingConfig
    };
  }

  // Create tooltip if it doesn't exist
  createTooltip(isDark);

  const bubbleGroups = svg
    .selectAll<SVGGElement, Bubble>("g.bubble")
    .data(bubbles)
    .join("g")
    .attr("class", "bubble")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  // Add outer rings if enabled
  if (CONFIG.bubble.outerRing.show) {
    bubbleGroups.append("circle")
      .attr("class", "outer-ring")
      .attr("r", (d) => d.outerRingRadius)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", CONFIG.bubble.outerRing.strokeWidth)
      .attr("stroke-dasharray", CONFIG.bubble.outerRing.strokeDasharray)
      .attr("opacity", (d) => {
        // Hide outer ring for center bubble in brands view
        if (d.id === bubbles.length - 1 && !isMarketView) {
          return 0;
        }
        return CONFIG.bubble.outerRing.opacity;
      });
  }

  // Add the main bubble circles
  bubbleGroups.append("circle")
    .attr("class", "bubble-circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => {
      if (d.id === bubbles.length - 1) {
        return isDark ? "#1a1a1a" : "#ffffff";  // Always set correct initial fill
      }
      return d.color;
    })
    .attr("stroke", (d) => {
      if (d.id === bubbles.length - 1) return isDark ? "#ffffff" : "#000000";
      if (focusedBubbleId === d.id) return isDark ? "#ffffff" : "#000000";
      return "none";
    })
    .attr("stroke-width", (d) => {
      if (d.id === bubbles.length - 1) return isMarketView ? 2 : 0;  // Show stroke only in market view
      if (focusedBubbleId === d.id) return 4;
      return 0;
    })
    .attr("opacity", (d) => {
      if (d.id === bubbles.length - 1) return isMarketView ? 1 : 0;
      return 1;
    })
    .attr("cursor", (d) => d.id === bubbles.length - 1 ? "default" : "pointer")
    .on("click", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1) {
        onClick(d);
      }
    })
    .on("mouseover", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr("stroke", isDark ? "#ffffff" : "#000000")
          .attr("stroke-width", 2)
          .raise();
        showTooltip(event, getBubbleTooltip(d));
      }
    })
    .on("mouseout", (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr("stroke", "none")
          .attr("stroke-width", 0);
      }
      hideTooltip();
    });

  // Add labels separately from bubbles
  svg.selectAll("text.bubble-label")
    .data(bubbles)
    .join("text")
    .attr("pointer-events", "none")
    .attr("class", "bubble-label")
    .attr("x", (d) => d.textX)
    .attr("y", (d) => d.textY)
    .attr("text-anchor", (d) => {
      if (d.id === bubbles.length - 1) return "middle";
      // Calculate angle relative to center for text alignment
      const angle = Math.atan2(d.y - centerY, d.x - centerX);
      // Convert angle to degrees for easier calculation
      const degrees = (angle * 180) / Math.PI;
      
      // Right side of the circle (-45 to 45 degrees)
      if (degrees > -45 && degrees <= 45) return "start";
      // Left side of the circle (135 to -135 degrees)
      if (degrees > 135 || degrees <= -135) return "end";
      // Top and bottom (-45 to 135 degrees)
      return "middle";
    })
    .attr("dominant-baseline", "middle")
    .attr("fill", (d) => {
      // Hide market bubble label in brands view
      if (d.id === bubbles.length - 1 && !isMarketView) {
        return "transparent";
      }
      return d.color;
    })
    .attr("font-size", (d) => d.fontSize)
    .attr("font-weight", "bold")
    .each(function(d) {
      const lines = d.label.split('\n');
      const text = d3.select(this);
      const lineHeight = d.fontSize * 1.2; // 120% of font size for line height
      
      text.selectAll('*').remove(); // Clear any existing tspans
      
      lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', d.textX)
          .attr('dy', i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight)
          .text(line);
      });
    });
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
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  focusedFlow: { from: number, to: number } | null = null
) {
  console.log('DEBUG - drawFlows called with flowOption:', flowOption);
  // Filter flows based on focus bubble if any
  const filteredFlows = focusBubbleId !== null 
    ? flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId)
    : flows;

  // Get the appropriate flow value based on flow type
  const getFlowValue = (flow: Flow) => {
    switch (flowType) {
      case 'netFlow':
        return flow.absolute_netFlow;
      case 'inFlow only':
        return flow.absolute_inFlow;
      case 'outFlow only':
        return flow.absolute_outFlow;
      case 'both':
      case 'bi-directional':
        return Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      default:
        return flow.absolute_inFlow;
    }
  };

  // Calculate percentages based on the actual flow values
  const flowsWithValues = filteredFlows.map(flow => ({
    ...flow,
    value: getFlowValue(flow)
  }));

  // Sort values for percentile calculation
  const sortedValues = [...flowsWithValues.map(f => f.value)].sort((a, b) => a - b);
  
  // Calculate percentile ranks
  const flowsWithMetrics = flowsWithValues.map(flow => {
    // Count how many values are less than current value
    const lessThanCount = sortedValues.filter(v => v < flow.value).length;
    // Calculate percentile rank: (number of values less than x) / (total number of values - 1) * 100
    const percentRank = sortedValues.length <= 1 
      ? 100 
      : (lessThanCount / (sortedValues.length - 1)) * 100;

    console.log('DEBUG - Percentile Calculation:', {
      value: flow.value,
      lessThanCount,
      totalValues: sortedValues.length,
      percentRank
    });

    return {
      ...flow,
      percentRank
    };
  });

  console.log('DEBUG - After Metrics Calculation:', {
    flowType,
    flows: flowsWithMetrics.map(f => ({
      from: f.from,
      to: f.to,
      value: f.value,
      percentRank: f.percentRank
    }))
  });

  // Clear existing flows
  svg.selectAll("line").remove();
  svg.selectAll("marker").remove();

  // First, update all existing flow lines to have reduced opacity if there's a focused flow
  if (focusedFlow) {
    svg.selectAll<SVGPathElement | SVGLineElement, Flow>(".flow-line")
      .attr("opacity", function() {
        const line = d3.select(this);
        const fromId = parseInt(line.attr("data-from-id") || "-1");
        const toId = parseInt(line.attr("data-to-id") || "-1");
        const isFocused = fromId === focusedFlow.from && toId === focusedFlow.to;
        return isFocused ? 1 : 0.2;
      });
      
    // Also update opacity for all flow labels
    svg.selectAll<SVGTextElement, unknown>("text.flow-label")
      .attr("opacity", function() {
        const label = d3.select(this);
        const fromId = parseInt(label.attr("data-from-id") || "-1");
        const toId = parseInt(label.attr("data-to-id") || "-1");
        const isFocused = (fromId === focusedFlow.from && toId === focusedFlow.to) ||
                        (fromId === focusedFlow.to && toId === focusedFlow.from);
        return isFocused ? 1 : 0.2;
      });
  }

  flowsWithMetrics.forEach((flow) => {
    const source = bubbles.find(b => b.id === flow.from);
    const target = bubbles.find(b => b.id === flow.to);

    if (!source || !target) return;
    
    console.log('DEBUG - Processing flow:', { 
      from: source.id, 
      to: target.id,
      value: flow.value,
      percentRank: flow.percentRank,
      flowType,
      flowOption
    });

    switch (flowType) {
      case 'inFlow only':
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, 'inFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        }
        break;
      case 'outFlow only':
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, 'outFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        }
        break;
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          drawFlowLine(svg, flow, 'netFlow', target, source, 'netFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        } else {
          drawFlowLine(svg, flow, 'netFlow', source, target, 'netFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        }
        break;
      case 'interaction':
        drawFlowLine(svg, flow, 'interaction', source, target, flowType, centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        break;
      case 'two-way flows':
        // Draw inflow line (from target to source)
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(svg, flow, 'inFlow', target, source, 'inFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
        }
        // Draw outflow line (from source to target)
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(svg, flow, 'outFlow', source, target, 'outFlow', centreFlow, bubbles, flowOption, isMarketView, onFlowClick, focusedFlow);
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
        
        // Determine colors based on flowOption and theme
        const isDarkTheme = document.documentElement.classList.contains('dark');
        const centerBubbleId = bubbles.length - 1;
        const isFromCenter = source.id === centerBubbleId;
        
        // For center flows, use theme colors
        // For affinity flows, use target/source colors
        // For other flows, use source/target colors
        const outFlowColor = isFromCenter ? (isDarkTheme ? "#ffffff" : "#000000") :
                           flowOption === 'affinity' ? target.color : source.color;
        const inFlowColor = isFromCenter ? (isDarkTheme ? "#ffffff" : "#000000") :
                          flowOption === 'affinity' ? source.color : target.color;
        
        // Dummy usage to satisfy linter
        if (false && isFromCenter && isDarkTheme) { console.log(''); }

        const inFlowLine = svg.append('line')
          .attr('x1', splitX)
          .attr('y1', splitY)
          .attr('x2', start.x)
          .attr('y2', start.y)
          .attr('stroke', inFlowColor)
          .attr('stroke-width', lineThickness)
          .attr('class', 'flow-line')
          .attr('data-flow-direction', 'inFlow')
          .attr('data-from-id', target.id.toString())
          .attr('data-to-id', source.id.toString())
          .attr("opacity", () => {
            if (focusedFlow) {
              const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                      (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
              return isThisFlowFocused ? 1 : 0.2;
            }
            return 0.8;
          });

        // Add inflow marker only for non-affinity views
        if (flowOption !== 'affinity') {
          createFlowMarker(svg, `inFlow-${flow.from}-${flow.to}`, calculateMarkerSize(lineThickness), inFlowLine.attr("stroke"), 'inFlow');
          inFlowLine.attr('marker-end', `url(#inFlow-${flow.from}-${flow.to})`);
        } else {
          // For affinity view, use rounded end caps
          inFlowLine.attr('stroke-linecap', 'round');
        }

        const outFlowLine = svg.append('line')
          .attr('x1', splitX)
          .attr('y1', splitY)
          .attr('x2', end.x)
          .attr('y2', end.y)
          .attr('stroke', outFlowColor)
          .attr('stroke-width', lineThickness)
          .attr('class', 'flow-line')
          .attr('data-flow-direction', 'outFlow')
          .attr('data-from-id', source.id.toString())
          .attr('data-to-id', target.id.toString())
          .attr("opacity", () => {
            if (focusedFlow) {
              const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                      (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
              return isThisFlowFocused ? 1 : 0.2;
            }
            return 0.8;
          });

        // Add outflow marker only for non-affinity views
        if (flowOption !== 'affinity') {
          createFlowMarker(svg, `outFlow-${flow.from}-${flow.to}`, calculateMarkerSize(lineThickness), outFlowLine.attr("stroke"), 'outFlow');
          outFlowLine.attr('marker-end', `url(#outFlow-${flow.from}-${flow.to})`);
        } else {
          // For affinity view, use rounded end caps
          outFlowLine.attr('stroke-linecap', 'round');
        }

        // Add event handlers to both lines
        const updateBothLines = (isHighlighted: boolean) => {
          const strokeWidth = isHighlighted ? lineThickness * 1.1 : lineThickness;
          const opacity = isHighlighted ? 1 : (focusedFlow ? 0.2 : 0.8);
          inFlowLine.attr("stroke-width", strokeWidth).attr("opacity", opacity);
          outFlowLine.attr("stroke-width", strokeWidth).attr("opacity", opacity);
        };

        const handleMouseOver = (event: MouseEvent, flowDirection: 'inFlow' | 'outFlow') => {
          const isFocused = focusedFlow && 
            ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
             (flow.from === focusedFlow.to && flow.to === focusedFlow.from));
          
          if (!focusedFlow || isFocused) {
            updateBothLines(true);
          }
          showTooltip(event, getFlowTooltip(flow, flowDirection === 'inFlow' ? target : source, 
                                                flowDirection === 'inFlow' ? source : target, 
                                                flowDirection, centreFlow, flowOption));
        };

        const handleMouseOut = () => {
          const isFocused = focusedFlow && 
            ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
             (flow.from === focusedFlow.to && flow.to === focusedFlow.from));
          updateBothLines(!!isFocused);  // Convert to boolean
          hideTooltip();
        };

        inFlowLine
          .on("mouseover", (event: MouseEvent) => handleMouseOver(event, 'inFlow'))
          .on("mouseout", handleMouseOut)
          .on('click', () => onFlowClick && onFlowClick(flow, target, source));

        outFlowLine
          .on("mouseover", (event: MouseEvent) => handleMouseOver(event, 'outFlow'))
          .on("mouseout", handleMouseOut)
          .on('click', () => onFlowClick && onFlowClick(flow, source, target));

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
            .attr('class', 'flow-label')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', inFlowColor)  
            .attr("font-size", "11px")
            .attr('data-from-id', target.id.toString())
            .attr('data-to-id', source.id.toString())
            .attr('data-flow-id', `${flow.from}-${flow.to}`)
            .text(`${flow.absolute_inFlow.toFixed(1)}%`);
          
          // Set opacity for the label based on focused flow
          if (focusedFlow) {
            const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                   (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
            svg.selectAll(`text.flow-label[data-flow-id="${flow.from}-${flow.to}"]`).attr('opacity', isThisFlowFocused ? 1 : 0.2);
          }
        }

        if (flow.absolute_outFlow > 0) {
          const textX = splitX + (end.x - splitX) * 0.65 + Math.cos(outFlowAngle - Math.PI/2) * offset;
          const textY = splitY + (end.y - splitY) * 0.65 + Math.sin(outFlowAngle - Math.PI/2) * offset;
          svg.append('text')
            .attr('x', textX)
            .attr('y', textY)
            .attr('class', 'flow-label')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', outFlowColor)  
            .attr("font-size", "11px")
            .attr('data-from-id', source.id.toString())
            .attr('data-to-id', target.id.toString())
            .attr('data-flow-id', `${flow.from}-${flow.to}`)
            .text(`${flow.absolute_outFlow.toFixed(1)}%`);
          
          // Set opacity for the label based on focused flow
          if (focusedFlow) {
            const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                   (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
            svg.selectAll(`text.flow-label[data-flow-id="${flow.from}-${flow.to}"]`).attr('opacity', isThisFlowFocused ? 1 : 0.2);
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
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  focusedFlow: { from: number, to: number } | null = null
) {
  // Dummy usage to satisfy linter
  if (false && centreFlow) { console.log(''); }

  const points = calculateFlowPoints(startBubble, endBubble, flowType, flowDirection, flow);
  const lineThickness = calculateLineThickness(flow);
  const flowPath = d3.line()([
    [points.start.x, points.start.y],
    [points.end.x, points.end.y]
  ]);
  
  // Determine colors based on whether this is a center flow or affinity
  const isDarkTheme = document.documentElement.classList.contains('dark');
  const fromCenter = startBubble.id === allBubbles.length - 1; // Center bubble is the last bubble
  
  // For affinity flows, always use target bubble's color
  // For center flows, use theme-based color (white/black)
  // For Brands view with Switching metric and outFlow type, use destination bubble's color
  // For Market views with Churn/Switching option and inFlow type, when flowing from center, use destination color
  // For all other flows, use source bubble's color
  const lineColor = fromCenter ? 
                    (isMarketView && (flowOption === 'churn' || flowOption === 'switching') && flowDirection === 'inFlow' ? 
                      endBubble.color : 
                      (isDarkTheme ? "#ffffff" : "#000000")) :
                    flowOption === 'affinity' ? endBubble.color : 
                    (!isMarketView && flowOption === 'switching' && flowDirection === 'outFlow') ? endBubble.color : 
                    startBubble.color;

  console.log('DEBUG - drawFlowLine color selection:', {
    flowOption,
    fromCenter,
    isDarkTheme,
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

  // Create flow line
  const flowLine = svg.append("path")
    .attr("d", flowPath)
    .attr("class", "flow-line")
    .attr("stroke", lineColor)
    .attr("stroke-width", () => {
      if (focusedFlow) {
        const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                 (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
        return isThisFlowFocused ? lineThickness * 1.5 : lineThickness;
      }
      return lineThickness;
    })
    .attr("opacity", () => {
      if (focusedFlow) {
        const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                 (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
        return isThisFlowFocused ? 1 : 0.2;
      }
      return 0.8;
    })
    .attr("data-flow-direction", flowDirection)
    .attr("data-from-center", fromCenter)
    .attr("data-from-id", startBubble.id.toString())
    .attr("data-to-id", endBubble.id.toString())
    .datum(flow);

  // Create marker for this specific flow (except for affinity view)
  if (flowOption !== 'affinity') {
    const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
    createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
    flowLine.attr('marker-end', `url(#${markerId})`);
  } else {
    // For affinity view, use rounded end caps
    flowLine.attr('stroke-linecap', 'round');
  }

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
    
    const flowLabel = svg.append("text")
      .attr("class", "flow-label")
      .attr("x", midX + offset * Math.sin(angle))
      .attr("y", midY - offset * Math.cos(angle))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)
      .attr("font-size", "12px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${Math.abs(value).toFixed(1)}%`);
    
    // Set opacity for the label based on focused flow
    if (focusedFlow) {
      const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                             (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
      flowLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    }
  }

  // Add event handlers
  flowLine
    .on("mouseover", (event: MouseEvent) => {
      const target = event.currentTarget as SVGPathElement;
      const path = d3.select(target);
      const isFocused = (focusedFlow && 
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
         (flow.from === focusedFlow.to && flow.to === focusedFlow.from)));
      
      if (!focusedFlow || isFocused) {
        path.attr("opacity", 1)
           .attr("stroke-width", lineThickness * 1.1);
      }
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow, flowOption));
    })
    .on("mouseout", (event: MouseEvent) => {
      const target = event.currentTarget as SVGPathElement;
      const path = d3.select(target);
      const isFocused = (focusedFlow && 
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
         (flow.from === focusedFlow.to && flow.to === focusedFlow.from)));
      
      path.attr("stroke-width", isFocused ? lineThickness * 1.1 : lineThickness);
      path.attr("opacity", isFocused ? 1 : (focusedFlow ? 0.2 : 0.8));
      hideTooltip();
    })
    .on('click', () => onFlowClick && onFlowClick(flow, startBubble, endBubble));
}

export function createFlowMarker(
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
  console.log('DEBUG - Flow Input:', flow);
  
  // Check if percentRank is undefined
  if (typeof flow.percentRank === 'undefined') {
    console.log('DEBUG - Using min thickness due to undefined percentRank');
    return CONFIG.flow.minLineThickness;
  }
  
  const scale = d3.scaleLinear()
    .domain([0, 100])
    .range([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .clamp(true);
  
  console.log('DEBUG - Line Thickness:', {
    percentRank: flow.percentRank,
    thickness: scale(flow.percentRank),
    minThickness: CONFIG.flow.minLineThickness,
    maxThickness: CONFIG.flow.maxLineThickness
  });
    
  return scale(flow.percentRank);
}

function calculateMarkerSize(lineThickness: number): number {
  const scale = d3.scaleLinear()
    .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .range([3, 4])
    .clamp(true);
  
  return scale(lineThickness);
}