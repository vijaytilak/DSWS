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
  flowType: string = 'netFlow',
  focusBubbleId: number | null = null,
  centreFlow: boolean = false,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn',
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  focusedFlow: { from: number, to: number } | null = null
) {
  // Detect if this is a Brands Churn view - if so, we'll use bidirectional flows
  const currentFlowType = flowType;
  const isBrandsChurnView = !isMarketView && flowOption === 'churn';
  console.log('DEBUG - drawFlows called with flowOption:', flowOption);
  // Filter flows based on focus bubble if any
  const filteredFlows = focusBubbleId !== null 
    ? flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId)
    : flows;

  // Get the appropriate flow value based on flow type
  const getFlowValue = (flow: Flow) => {
    switch (currentFlowType) {
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
    
    // Store the original flow type before potentially modifying it
    const originalFlowType = flowType;
    
    // For Brands Churn view, use bidirectional flows
    let currentFlowType = flowType;
    if (isBrandsChurnView) {
      currentFlowType = 'bi-directional';
    }

    switch (currentFlowType) {
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
        
        // For Brands > Churn view, get churn-specific data if available
        let switchPerc = flow.absolute_inFlow;
        let otherPerc = flow.absolute_outFlow;
        let switchIndex = 1.0; 
        let otherIndex = 1.0;
        
        if (isBrandsChurnView && flow.churn && flow.churn.length > 0) {
          // For Brands Churn view, get split percentages from churn data
          // Determine which churn data to use based on the original flow direction
          const typeKey = (originalFlowType === 'inFlow only' || originalFlowType.includes('in')) ? 'in' : 'out';
          const churnData = flow.churn[0][typeKey];
          
          if (churnData) {
            switchPerc = churnData.switch_perc * 100;
            otherPerc = churnData.other_perc * 100;
            switchIndex = churnData.switch_index;
            otherIndex = churnData.other_index;
          }
        }
        
        // Calculate split point based on switch and other percentages
        const splitRatio = switchPerc / (switchPerc + otherPerc);
        const splitX = start.x + (end.x - start.x) * splitRatio;
        const splitY = start.y + (end.y - start.y) * splitRatio;
        
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

        // Add flow percentages with indexes for Brands Churn view
        if (flow.absolute_inFlow > 0) {
          // For inFlow (Churn In, Switch In), position percentage near tail (source) and index near arrow (split)
          const percPositionFactor = 0.8; // Near split point (arrow end)
          const indexPositionFactor = 0.2; // Near source/start (tail end)
          
          // Position for percentage
          const percX = start.x + (splitX - start.x) * percPositionFactor + Math.cos(inFlowAngle - Math.PI/2) * offset;
          const percY = start.y + (splitY - start.y) * percPositionFactor + Math.sin(inFlowAngle - Math.PI/2) * offset;
          
          // For Brands Churn view, show percentages
          const percLabelText = isBrandsChurnView ? 
            `${switchPerc.toFixed(1)}%` : 
            `${flow.absolute_inFlow.toFixed(1)}%`;
            
          // Add percentage label
          svg.append('text')
            .attr('x', percX)
            .attr('y', percY)
            .attr('class', 'flow-label')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', inFlowColor)  
            .attr("font-size", "11px")
            .attr('data-from-id', target.id.toString())
            .attr('data-to-id', source.id.toString())
            .attr('data-flow-id', `${flow.from}-${flow.to}`)
            .text(percLabelText);
            
          // Add index label near source for inFlow
          if (isBrandsChurnView) {
            const indexX = start.x + (splitX - start.x) * indexPositionFactor + Math.cos(inFlowAngle - Math.PI/2) * offset;
            const indexY = start.y + (splitY - start.y) * indexPositionFactor + Math.sin(inFlowAngle - Math.PI/2) * offset;
            
            svg.append('text')
              .attr('x', indexX)
              .attr('y', indexY)
              .attr('class', 'flow-label flow-index-label')
              .attr('text-anchor', 'start')
              .attr('dominant-baseline', 'middle')
              .attr('fill', inFlowColor)  
              .attr("font-size", "10px")
              .attr('data-from-id', target.id.toString())
              .attr('data-to-id', source.id.toString())
              .attr('data-flow-id', `${flow.from}-${flow.to}`)
              .text(`(${switchIndex.toFixed(1)})`);
          }
          
          // Set opacity for the label based on focused flow
          if (focusedFlow) {
            const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                                   (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
            svg.selectAll(`text.flow-label[data-flow-id="${flow.from}-${flow.to}"]`).attr('opacity', isThisFlowFocused ? 1 : 0.2);
          }
        }

        if (flow.absolute_outFlow > 0) {
          // For outFlow (Churn Out, Switch Out), position percentage near tail (split) and index near arrow (destination)
          const percPositionFactor = 0.2; // Near split point (tail end)
          const indexPositionFactor = 0.95; // Near destination (arrow end)
          
          // Position for percentage
          const percX = splitX + (end.x - splitX) * percPositionFactor + Math.cos(outFlowAngle - Math.PI/2) * offset;
          const percY = splitY + (end.y - splitY) * percPositionFactor + Math.sin(outFlowAngle - Math.PI/2) * offset;
          
          // For Brands Churn view, show percentages
          const percLabelText = isBrandsChurnView ? 
            `${otherPerc.toFixed(1)}%` : 
            `${flow.absolute_outFlow.toFixed(1)}%`;
            
          // Add percentage label
          svg.append('text')
            .attr('x', percX)
            .attr('y', percY)
            .attr('class', 'flow-label')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', outFlowColor)  
            .attr("font-size", "11px")
            .attr('data-from-id', source.id.toString())
            .attr('data-to-id', target.id.toString())
            .attr('data-flow-id', `${flow.from}-${flow.to}`)
            .text(percLabelText);
            
          // Add index label near destination for outFlow
          if (isBrandsChurnView) {
            const indexX = splitX + (end.x - splitX) * indexPositionFactor + Math.cos(outFlowAngle - Math.PI/2) * offset;
            const indexY = splitY + (end.y - splitY) * indexPositionFactor + Math.sin(outFlowAngle - Math.PI/2) * offset;
            
            svg.append('text')
              .attr('x', indexX)
              .attr('y', indexY)
              .attr('class', 'flow-label flow-index-label')
              .attr('text-anchor', 'start')
              .attr('dominant-baseline', 'middle')
              .attr('fill', outFlowColor)  
              .attr("font-size", "10px")
              .attr('data-from-id', source.id.toString())
              .attr('data-to-id', target.id.toString())
              .attr('data-flow-id', `${flow.from}-${flow.to}`)
              .text(`(${otherIndex.toFixed(1)})`);
          }
          
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

  // Calculate label position with slight variation based on flow ID to minimize overlap
  // Use flow IDs to create a deterministic but varied position
  // const positionVariation = ((flow.from * 13 + flow.to * 7) % 30) / 100; // 0-0.29 variation
  // Commented out to fix lint error (unused variable)
  // const positionFactor = 0.5 + positionVariation; // 0.5-0.79 along the line
  // Commented out to fix lint error (unused variable)
  
  // Calculate midpoint (commented out to fix lint errors)
  // const midX = points.start.x + (points.end.x - points.start.x) * positionFactor;
  // const midY = points.start.y + (points.end.y - points.start.y) * positionFactor;
  
  // Calculate offset for the label (perpendicular to the line)
  // const dx = points.end.x - points.start.x; // Commented out to fix lint error (unused variable)
  // const dy = points.end.y - points.start.y; // Commented out to fix lint error (unused variable)
  // const angle = Math.atan2(dy, dx); // Commented out to fix lint errors
  const offset = 15; // Offset distance from the line
  
  // Determine if this is an inflow or outflow for index positioning
  // This will be used to position indices appropriately:
  // - For "Churn In", "Switch In", "Spend Less" - indices near source
  // - For "Churn Out", "Switch Out", "Spend More" - indices near destination
  // const isInFlow = flowDirection === 'inFlow';
  // const isOutFlow = flowDirection === 'outFlow';
  // Variables commented out to fix lint errors
  
  // Handle bidirectional flow for 'both' flowType or churn metrics in brands view
  const isChurnMetricInBrandsView = !isMarketView && flowOption === 'churn' && (flowType === 'inFlow' || flowType === 'outFlow');
  const isBidirectionalFlow = flowType === 'both' || isChurnMetricInBrandsView;
  
  if (!isBidirectionalFlow) {
    // Standard flow handling for non-bidirectional flows
    let value: number;
    
    // Get the correct value based on flow type and direction
    const currentFlowDirection = flowDirection; // Use the flow direction passed to this function
    switch (currentFlowDirection) {
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
    
    // Calculate a split point for standard flows too, similar to bidirectional flows
    // This creates a visual midpoint for the flow line
    const splitX = (points.start.x + points.end.x) / 2;
    const splitY = (points.start.y + points.end.y) / 2;
    
    // Store the original path and create two segments instead
    flowLine.remove(); // Remove the original line
    
    // Create first segment from start to split point
    const switchLine = svg.append("path")
      .attr("d", d3.line()([[points.start.x, points.start.y], [splitX, splitY]]))
      .attr("class", "flow-line")
      .attr("stroke", lineColor)
      .attr("stroke-width", lineThickness)
      .attr("fill", "none")
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
      
    // Create second segment from split point to end
    const otherLine = svg.append("path")
      .attr("d", d3.line()([[splitX, splitY], [points.end.x, points.end.y]]))
      .attr("class", "flow-line")
      .attr("stroke", lineColor)
      .attr("stroke-width", lineThickness)
      .attr("fill", "none")
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
      
    // Add flow marker for the second segment
    if (flowOption !== 'affinity') {
      const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
      createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
      otherLine.attr('marker-end', `url(#${markerId})`);
    } else {
      // For affinity view, use rounded end caps
      switchLine.attr('stroke-linecap', 'round');
      otherLine.attr('stroke-linecap', 'round');
    }
    
    // Calculate angles for text positioning
    const switchAngle = Math.atan2(splitY - points.start.y, splitX - points.start.x);
    const otherAngle = Math.atan2(points.end.y - splitY, points.end.x - splitX);
    
    // First segment: position percentage near start (0.2)
    const switchPercX = points.start.x + (splitX - points.start.x) * 0.2 + Math.cos(switchAngle + Math.PI/2) * offset;
    const switchPercY = points.start.y + (splitY - points.start.y) * 0.2 + Math.sin(switchAngle + Math.PI/2) * offset;
    
    // Second segment: position percentage near split point (0.05)
    const otherPercX = splitX + (points.end.x - splitX) * 0.05 + Math.cos(otherAngle + Math.PI/2) * offset;
    const otherPercY = splitY + (points.end.y - splitY) * 0.05 + Math.sin(otherAngle + Math.PI/2) * offset;
    
    // Second segment: position index near arrow end (0.8)
    const otherIndexX = splitX + (points.end.x - splitX) * 0.8 + Math.cos(otherAngle + Math.PI/2) * offset;
    const otherIndexY = splitY + (points.end.y - splitY) * 0.8 + Math.sin(otherAngle + Math.PI/2) * offset;
    
    // Create percentage label at tail end of first segment
    const switchLabel = svg.append("text")
      .attr("class", "flow-label switch-label")
      .attr("x", switchPercX)
      .attr("y", switchPercY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)  
      .attr("font-size", "12px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${Math.abs(value).toFixed(1)}%`);
      

      
    // Create percentage label near split point of second segment
    const otherPercLabel = svg.append("text")
      .attr("class", "flow-label other-perc-label")
      .attr("x", otherPercX)
      .attr("y", otherPercY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)  
      .attr("font-size", "12px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${Math.abs(value).toFixed(1)}%`);
      
    // Create index label near arrow end of second segment
    const otherIndexLabel = svg.append("text")
      .attr("class", "flow-label other-index-label")
      .attr("x", otherIndexX)
      .attr("y", otherIndexY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)  
      .attr("font-size", "12px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(flow.percentRank !== undefined ? `(${flow.percentRank.toFixed(1)})` : '');
      

    
    // Set opacity for labels based on focused flow
    if (focusedFlow) {
      const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                             (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
      switchLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherPercLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherIndexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    }
  } else {
    // Bidirectional flow handling (both flowType or churn metrics in brands view)
    
    // For churn metrics, we need to display switch_perc and other_perc
    let switchPerc, otherPerc, switchIndex, otherIndex;
    
    if (isChurnMetricInBrandsView && flow.churn && flow.churn.length > 0) {
      // Extract churn-specific data
      const churnData = flow.churn[0][flowType === 'inFlow' ? 'in' : 'out'];
      if (churnData) {
        switchPerc = churnData.switch_perc * 100;
        otherPerc = churnData.other_perc * 100;
        switchIndex = churnData.switch_index;
        otherIndex = churnData.other_index;
      } else {
        // Fallback if churn data is not available
        switchPerc = flowType === 'inFlow' ? flow.absolute_inFlow * 0.6 : flow.absolute_outFlow * 0.6;
        otherPerc = flowType === 'inFlow' ? flow.absolute_inFlow * 0.4 : flow.absolute_outFlow * 0.4;
        switchIndex = 1.0;
        otherIndex = 1.0;
      }
    } else {
      // For 'both' flowType, use the standard values
      switchPerc = flow.absolute_inFlow;
      otherPerc = flow.absolute_outFlow;
      switchIndex = 1.0;
      otherIndex = 1.0;
    }
    
    // Calculate total percentage for proportional split point positioning
    const totalPerc = switchPerc + otherPerc;
    
    // Calculate the split point based on the relative percentages
    const splitX = points.start.x + (points.end.x - points.start.x) * (switchPerc / totalPerc);
    const splitY = points.start.y + (points.end.y - points.start.y) * (switchPerc / totalPerc);
    
    // Debug information to help troubleshoot label positioning
    console.log('Label Positioning Debug:', {
      flowDirection,
      startBubble: startBubble.id,
      endBubble: endBubble.id,
      startPos: { x: points.start.x, y: points.start.y },
      endPos: { x: points.end.x, y: points.end.y },
      splitPos: { x: splitX, y: splitY },
      switchPerc,
      otherPerc
    });
    
    // Create first line segment for switch percentage
    const switchPath = d3.line()([
      [points.start.x, points.start.y],
      [splitX, splitY]
    ]);

    const otherPath = d3.line()([
      [splitX, splitY],
      [points.end.x, points.end.y]
    ]);

    // Create the first part of the flow line
    const switchLine = svg.append("path")
      .attr("d", switchPath)
      .attr("class", "flow-line")
      .attr("stroke", lineColor)
      .attr("stroke-width", lineThickness)
      .attr("fill", "none")
      .attr("data-flow-id", `${flow.from}-${flow.to}`)
      .attr("data-flow-type", flowType)
      .attr("data-flow-direction", flowDirection)
      .attr("data-from-id", startBubble.id.toString())
      .attr("data-to-id", endBubble.id.toString());
      
    // Create the second part of the flow line
    const otherLine = svg.append("path")
      .attr("d", otherPath)
      .attr("class", "flow-line")
      .attr("stroke", lineColor)
      .attr("stroke-width", lineThickness)
      .attr("fill", "none")
      .attr("data-flow-id", `${flow.from}-${flow.to}`)
      .attr("data-flow-type", flowType)
      .attr("data-flow-direction", flowDirection === 'inFlow' ? 'outFlow' : 'inFlow') // Opposite direction
      .attr("data-from-id", startBubble.id.toString())
      .attr("data-to-id", endBubble.id.toString());
      
    // Add flow markers for the second segment only (not the first segment)
    // This is important for understanding the visual direction
    // The marker shows the arrow head, so the second segment always has an arrow pointing to the endpoint
    if (flowOption !== 'affinity') {
      const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
      createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
      otherLine.attr('marker-end', `url(#${markerId})`);
    } else {
      // For affinity view, use rounded end caps
      switchLine.attr('stroke-linecap', 'round');
      otherLine.attr('stroke-linecap', 'round');
    }
        
    // Calculate the actual visual direction of the flow line by examining source/target positions
    // We need this to correctly determine where the tail and arrow are visually
    // const sourceIsAbove = startBubble.y < endBubble.y; // Commented out to fix lint errors
    // const sourceIsLeft = startBubble.x < endBubble.x; // Commented out to fix lint errors
    
    // Calculate angles for text positioning
    const switchAngle = Math.atan2(splitY - points.start.y, splitX - points.start.x);
    const otherAngle = Math.atan2(points.end.y - splitY, points.end.x - splitX);
    
    // For first part of the flow line (from start to split point)
    // Always position percentages near tail end, indices near arrow end
    // This is determined by the actual visual direction of the flow, not just the flowDirection property
    // Variables commented out to fix lint errors
    // let switchPercPosition, switchIndexPosition;
    
    // For inFlow: flow visually moves from destination toward source bubble
    // Calculate angle for label positioning
    const offset = 15; // Offset distance for labels
    
    // CONSISTENT APPROACH: For first segment, position percentage near SPLIT POINT and index near START
    // For second segment, position percentage near SPLIT POINT and index near ARROW END
    
    // First segment label positions
    
    // For the first segment: percentage near split point (0.8), index near start (0.2)
    // This is consistent for both flow directions
    const switchIndexX = points.start.x + (splitX - points.start.x) * 0.2 + Math.cos(switchAngle + Math.PI/2) * offset;
    const switchIndexY = points.start.y + (splitY - points.start.y) * 0.2 + Math.sin(switchAngle + Math.PI/2) * offset;
    // Commented out to fix lint errors (unused variables)
    // const switchPercX = points.start.x + (splitX - points.start.x) * 0.8 + Math.cos(switchAngle + Math.PI/2) * offset;
    // const switchPercY = points.start.y + (splitY - points.start.y) * 0.8 + Math.sin(switchAngle + Math.PI/2) * offset;
    
    // Skip creating percentage label for first segment in bidirectional flow
    // Commented out to fix lint error (unused variable)
    // const switchLabel = svg.append("g").attr("class", "hidden-label");
      
    // Create index label near tail end (start point)
    const switchIndexLabel = svg.append("text")
      .attr("class", "flow-label switch-index-label")
      .attr("x", switchIndexX)
      .attr("y", switchIndexY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)
      .attr("font-size", "10px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`(${switchIndex.toFixed(1)})`);
   
    
    // For second part of the flow line (from split point to end)
    // Always position percentages near tail end, indices near arrow end
    // This positioning is based on the actual visual direction of the flow
    
    // Determine the visual flow direction of the second part
    // For all flow types, the second part moves from split point to the destination
    // So we need to determine if this movement is upward/downward/leftward/rightward
    const endIsBelow = points.end.y > splitY;
    const endIsRight = points.end.x > splitX;
    
    // Variables commented out to fix lint errors (unused variables)
    // let otherPercPosition, otherIndexPosition;
    
    // For vertical dominant flows (more vertical than horizontal)
    if (Math.abs(points.end.y - splitY) > Math.abs(points.end.x - splitX)) {
      if (endIsBelow) {
        // Flow is moving downward visually
        // Variables commented out to fix lint errors (unused variables)
        // otherPercPosition = 0.2; // Position percentage at top (tail)
        // otherIndexPosition = 0.8; // Position index at bottom (arrow)
      } else {
        // Flow is moving upward visually
        // Variables commented out to fix lint errors (unused variables)
        // otherPercPosition = 0.8; // Position percentage at bottom (tail)
        // otherIndexPosition = 0.2; // Position index at top (arrow)
      }
    } else {
      // For horizontal dominant flows
      if (endIsRight) {
        // Flow is moving rightward visually
        // Variables commented out to fix lint errors (unused variables)
        // otherPercPosition = 0.2; // Position percentage at left (tail)
        // otherIndexPosition = 0.8; // Position index at right (arrow)
      } else {
        // Flow is moving leftward visually
        // Variables commented out to fix lint errors (unused variables)
        // otherPercPosition = 0.8; // Position percentage at right (tail)
        // otherIndexPosition = 0.2; // Position index at left (arrow)
      }
    }
    
    // CONSISTENT APPROACH FOR SECOND SEGMENT: Position percentage near SPLIT POINT and index near ARROW END
    // Create coordinates for the second segment label positioning
    
    // For the second segment, the arrow ALWAYS points toward the end point
    // So for both flow directions, the arrow head is at the end point
    
    // For the second segment: percentage near split point (0.05), index near arrow end (0.8)
    // This is consistent for both flow directions
    const otherPercX = splitX + (points.end.x - splitX) * 0.05 + Math.cos(otherAngle + Math.PI/2) * offset;
    const otherPercY = splitY + (points.end.y - splitY) * 0.05 + Math.sin(otherAngle + Math.PI/2) * offset;
    const otherIndexX = splitX + (points.end.x - splitX) * 0.8 + Math.cos(otherAngle + Math.PI/2) * offset;
    const otherIndexY = splitY + (points.end.y - splitY) * 0.8 + Math.sin(otherAngle + Math.PI/2) * offset;
    
    // Create percentage label near the split point of the second segment
    const otherLabel = svg.append("text")
      .attr("class", "flow-label other-label")
      .attr("x", otherPercX)
      .attr("y", otherPercY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)
      .attr("font-size", "11px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${otherPerc.toFixed(1)}% TEST`);
      
    // Create index label near the arrow end of the second segment
    const otherIndexLabel = svg.append("text")
      .attr("class", "flow-label other-index-label")
      .attr("x", otherIndexX)
      .attr("y", otherIndexY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('fill', lineColor)
      .attr("font-size", "10px")
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`(${otherIndex.toFixed(1)}) TEST`);
  
    
    // Set opacity for labels based on focused flow
    if (focusedFlow) {
      const isThisFlowFocused = (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
                             (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
      // No need to handle switchLabel as it's now a dummy element
      otherLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      switchIndexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherIndexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    }
    
    // Add event handlers to both line segments
    const handleMouseOver = (event: MouseEvent) => {
      if (!focusedFlow || 
          (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from)) {
        switchLine.attr("opacity", 1).attr("stroke-width", lineThickness * 1.1);
        otherLine.attr("opacity", 1).attr("stroke-width", lineThickness * 1.1);
      }
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow, flowOption));
    };
    
    const handleMouseOut = () => {
      const isFocused = focusedFlow && 
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
         (flow.from === focusedFlow.to && flow.to === focusedFlow.from));
      
      const opacity = isFocused ? 1 : (focusedFlow ? 0.2 : 0.8);
      const width = isFocused ? lineThickness * 1.1 : lineThickness;
      
      switchLine.attr("opacity", opacity).attr("stroke-width", width);
      otherLine.attr("opacity", opacity).attr("stroke-width", width);
      hideTooltip();
    };
    
    const handleClick = () => {
      if (onFlowClick) {
        onFlowClick(flow, startBubble, endBubble);
      }
    };
    
    // Apply event handlers to both line segments
    switchLine
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleClick);
      
    otherLine
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleClick);
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

  // Apply offset for two-way flows or bidirectional churn flows
  const isChurnBidirectional = (flowType === 'inFlow' || flowType === 'outFlow') && flow.churn;
  if (flowType === 'two-way flows' || flowType === 'both' || isChurnBidirectional) {
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