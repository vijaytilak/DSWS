import * as d3 from 'd3';
import type { Flow, Bubble } from '../types';
import { formatNumber } from './format';

type TooltipDatum = {
  content?: string;
};

type TooltipSelection = d3.Selection<HTMLDivElement, TooltipDatum, null | HTMLElement, undefined>;
let tooltip: TooltipSelection;

export function createTooltip(isDarkTheme: boolean): TooltipSelection {
  // Remove existing tooltip if any
  d3.select(".tooltip").remove();

  // Try to find SVG container
  const svg = d3.select<SVGSVGElement, undefined>("svg");
  const svgElement = svg.node();
  
  if (svgElement && svgElement.parentElement) {
    tooltip = d3.select(svgElement.parentElement)
      .append<HTMLDivElement>("div")
      .datum<TooltipDatum>({ content: '' })
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("font-weight", "400")
      .style("line-height", "1.3")
      .style("letter-spacing", "0.01em")
      .style("box-shadow", "0 2px 4px rgba(0, 0, 0, 0.1)")
      .style("min-width", "200px")
      .style("max-width", "300px")
      .style("width", "auto")
      .style("white-space", "normal")
      .style("word-wrap", "break-word")
      .style("text-align", "left")
      .style("backdrop-filter", "blur(8px)")
      .style("-webkit-backdrop-filter", "blur(8px)")
      .style("z-index", "1000") as TooltipSelection;
  } else {
    console.warn("SVG container not found, falling back to body");
    tooltip = d3.select("body")
      .append<HTMLDivElement>("div")
      .datum<TooltipDatum>({ content: '' })
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("font-weight", "400")
      .style("line-height", "1.3")
      .style("letter-spacing", "0.01em")
      .style("box-shadow", "0 2px 4px rgba(0, 0, 0, 0.1)")
      .style("min-width", "200px")
      .style("max-width", "300px")
      .style("width", "auto")
      .style("white-space", "normal")
      .style("word-wrap", "break-word")
      .style("text-align", "left")
      .style("backdrop-filter", "blur(8px)")
      .style("-webkit-backdrop-filter", "blur(8px)")
      .style("z-index", "1000") as TooltipSelection;
  }

  // Update tooltip theme
  updateTooltipTheme(isDarkTheme);
  
  return tooltip;
}

export function updateTooltipTheme(isDarkTheme: boolean) {
  if (!tooltip) return;

  tooltip
    .style("background-color", isDarkTheme ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)")
    .style("color", isDarkTheme ? "#fff" : "#000")
    .style("border", `1px solid ${isDarkTheme ? "#333" : "#ddd"}`);
}

export function showTooltip(event: MouseEvent, content: string) {
  if (!tooltip) return;

  const svg = d3.select<SVGSVGElement, undefined>("svg");
  const svgElement = svg.node();
  if (!svgElement) return;

  const rect = svgElement.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  tooltip.datum({ content });
  tooltip.transition()
    .duration(200)
    .style("opacity", 0.9);

  tooltip
    .html(d => d.content || '')
    .style("left", `${x + 10}px`)
    .style("top", `${y - 28}px`);
}

export function hideTooltip() {
  if (!tooltip) return;
  
  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

export function getBubbleTooltip(bubble: Bubble): string {
  // Center bubble is always the last one in the array
  if (bubble.id === bubble.totalBubbles - 1) {
    return ''; // No tooltip for center bubble
  }
  return `${formatNumber(bubble.itemSizeAbsolute)} people visited ${bubble.label}`;
}

/**
 * Generates tooltip content for flow lines
 * Uses the same data access pattern as the drawFlowLine function
 * to ensure consistency between tooltips and labels
 *
 * @param flow - Flow data object
 * @param source - Source bubble
 * @param target - Target bubble
 * @param flowDirection - Direction of the flow ('inFlow', 'outFlow', 'netFlow', 'inbound', 'outbound', 'both')
 * @param centreFlow - Whether the flow is centered
 * @param flowOption - Type of flow metric ('churn', 'switching', 'affinity')
 * @param isMarketView - Whether the view is market view
 * @returns Formatted tooltip content string
 */
export function getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string, centreFlow: boolean = false, flowOption: 'churn' | 'switching' | 'affinity' = 'churn', isMarketView: boolean = false): string {
  // Use Markets/Brands for view as requested
  const view = isMarketView ? 'Markets' : 'Brands';
  
  // Get metric name with proper capitalization
  const metric = flowOption.charAt(0).toUpperCase() + flowOption.slice(1);
  
  // Use the original flow type directly as requested
  const flowType = flowDirection;
  
  let percentage = 0;
  let index = 0;
  
  // Extract data based on flow direction and metric
  if (flowDirection === 'inbound' || flowDirection === 'outbound') {
    // For bidirectional flows (inbound/outbound segments)
    if (flow[flowOption] && flow[flowOption].length > 0 && flow[flowOption][0].both) {
      const flowData = flow[flowOption][0].both;
      
      if (flowDirection === 'inbound') {
        // For inbound segment
        percentage = typeof flowData.in_perc === 'number' ? flowData.in_perc * 100 : 0;
        index = typeof flowData.in_index === 'number' ? flowData.in_index : 0;
        
        // For inbound segment of bidirectional flow
        return `${source.label} → ${target.label}\n` +
               `View: ${view} | Metric: ${metric} | Flow: inFlow\n` +
               `Percentage: ${percentage.toFixed(2)}% (Index: ${index.toFixed(2)})`;
      } else {
        // For outbound segment
        percentage = typeof flowData.out_perc === 'number' ? flowData.out_perc * 100 : 0;
        index = typeof flowData.out_index === 'number' ? flowData.out_index : 0;
        
        // For outbound segment of bidirectional flow
        return `${source.label} ← ${target.label}\n` +
               `View: ${view} | Metric: ${metric} | Flow: outFlow\n` +
               `Percentage: ${percentage.toFixed(2)}% (Index: ${index.toFixed(2)})`;
      }
    } else {
      // Fallback to legacy properties
      percentage = flowDirection === 'inbound' ? flow.absolute_inFlow : flow.absolute_outFlow;
    }
  } else if (flowDirection === 'both') {
    // For complete bidirectional flow, show absolute value
    if (flow[flowOption] && flow[flowOption].length > 0 && flow[flowOption][0].both) {
      const flowData = flow[flowOption][0].both;
      percentage = typeof flowData.abs === 'number' ? flowData.abs : 0;
    } else {
      percentage = flow.absolute_netFlow;
    }
    
    // For bidirectional flows, use a bidirectional arrow
    return `${source.label} ↔ ${target.label}\n` +
           `View: ${view} | Metric: ${metric} | Flow: ${flowType}\n` +
           `Percentage: ${percentage.toFixed(2)}%`;
  } else {
    // Handle unidirectional flows (inFlow, outFlow, netFlow)
    // Extract direction without 'Flow' suffix for data access
    const direction = flowDirection.replace('Flow', '');
    
    // Access flow data based on flowOption and direction
    if (flow[flowOption] && flow[flowOption].length > 0) {
      const flowData = flow[flowOption][0] as any;
      
      if (direction === 'in' && flowData.in) {
        // Handle inFlow data
        if (typeof flowData.in.perc === 'number') {
          percentage = flowData.in.perc * 100;
          index = typeof flowData.in.index === 'number' ? flowData.in.index : 0;
        } else if (typeof flowData.in.in_perc === 'number') {
          percentage = flowData.in.in_perc * 100;
          index = typeof flowData.in.in_index === 'number' ? flowData.in.in_index : 0;
        }
      } 
      else if (direction === 'out' && flowData.out) {
        // Handle outFlow data
        if (typeof flowData.out.perc === 'number') {
          percentage = flowData.out.perc * 100;
          index = typeof flowData.out.index === 'number' ? flowData.out.index : 0;
        } else if (typeof flowData.out.out_perc === 'number') {
          percentage = flowData.out.out_perc * 100;
          index = typeof flowData.out.out_index === 'number' ? flowData.out.out_index : 0;
        }
      }
      else if (direction === 'net' && flowData.net) {
        // Handle netFlow data
        if (typeof flowData.net.perc === 'number') {
          percentage = flowData.net.perc * 100;
          index = typeof flowData.net.index === 'number' ? flowData.net.index : 0;
        }
      }
    }
    
    // Fallback to legacy properties if no data found
    if (percentage === 0) {
      if (flowDirection === 'inFlow' && typeof flow.absolute_inFlow === 'number') {
        percentage = flow.absolute_inFlow;
      } else if (flowDirection === 'outFlow' && typeof flow.absolute_outFlow === 'number') {
        percentage = flow.absolute_outFlow;
      } else if (flowDirection === 'netFlow' && typeof flow.absolute_netFlow === 'number') {
        percentage = flow.absolute_netFlow;
      }
    }
  }
  
  // For non-bidirectional flows, use appropriate arrow direction
  const direction = flow.absolute_netFlowDirection === 'inFlow' ? 
    `${source.label} → ${target.label}` : 
    `${source.label} ← ${target.label}`;
  
  return `${direction}\n` +
         `View: ${view} | Metric: ${metric} | Flow: ${flowType}\n` +
         `Percentage: ${percentage.toFixed(2)}% (Index: ${index.toFixed(2)})`;
}