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
  if (flowDirection === 'inbound') {
    // For inbound segment of bidirectional flow, use in_perc and in_index from 'both'
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].both) {
      percentage = flow.churn[0].both.in_perc * 100;
      index = flow.churn[0].both.in_index || 0;
    } else if (flowOption === 'switching' && flow.switching && flow.switching.length > 0 && flow.switching[0].both) {
      percentage = flow.switching[0].both.in_perc * 100;
      index = flow.switching[0].both.in_index || 0;
    } else {
      percentage = flow.absolute_inFlow;
    }
    
    // For inbound segment of bidirectional flow
    return `${source.label} → ${target.label}\n` +
           `View: ${view} | Metric: ${metric} | Flow: inFlow\n` +
           `Percentage: ${percentage.toFixed(2)}% (Index: ${index.toFixed(2)})`;  
  } else if (flowDirection === 'outbound') {
    // For outbound segment of bidirectional flow, use out_perc and out_index from 'both'
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].both) {
      percentage = flow.churn[0].both.out_perc * 100;
      index = flow.churn[0].both.out_index || 0;
    } else if (flowOption === 'switching' && flow.switching && flow.switching.length > 0 && flow.switching[0].both) {
      percentage = flow.switching[0].both.out_perc * 100;
      index = flow.switching[0].both.out_index || 0;
    } else {
      percentage = flow.absolute_outFlow;
    }
    
    // For outbound segment of bidirectional flow
    return `${source.label} ← ${target.label}\n` +
           `View: ${view} | Metric: ${metric} | Flow: outFlow\n` +
           `Percentage: ${percentage.toFixed(2)}% (Index: ${index.toFixed(2)})`;
  } else if (flowDirection === 'both') {
    // For complete bidirectional flow, show absolute value
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].both) {
      percentage = flow.churn[0].both.abs || 0;
    } else if (flowOption === 'switching' && flow.switching && flow.switching.length > 0 && flow.switching[0].both) {
      percentage = flow.switching[0].both.abs || 0;
    } else {
      percentage = flow.absolute_netFlow;
    }
    
    // For bidirectional flows, use a bidirectional arrow
    return `${source.label} ↔ ${target.label}\n` +
           `View: ${view} | Metric: ${metric} | Flow: ${flowType}\n` +
           `Percentage: ${percentage.toFixed(2)}`;
  } else if (flowDirection === 'inFlow') {
    // For inbound flows
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].in) {
      percentage = flow.churn[0].in.in_perc * 100;
      index = flow.churn[0].in.in_index || 0;
    } else {
      percentage = flow.absolute_inFlow;
    }
  } else if (flowDirection === 'outFlow') {
    // For outbound flows
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].out) {
      percentage = flow.churn[0].out.in_perc * 100;
      index = flow.churn[0].out.in_index || 0;
    } else {
      percentage = flow.absolute_outFlow;
    }
  } else if (flowDirection === 'netFlow') {
    // For net flows
    percentage = flow.absolute_netFlow;
    if (flowOption === 'churn' && flow.churn && flow.churn.length > 0) {
      if (flow.absolute_netFlowDirection === 'inFlow' && flow.churn[0].in) {
        index = flow.churn[0].in.in_index || 0;
      } else if (flow.churn[0].out) {
        index = flow.churn[0].out.in_index || 0;
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