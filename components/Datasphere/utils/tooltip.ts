import * as d3 from 'd3';
import type { Flow, Bubble } from '../types';
import { formatNumber } from './format';

let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

export function createTooltip(isDark: boolean): d3.Selection<HTMLDivElement, unknown, HTMLElement, any> {
  // Remove any existing tooltip
  if (tooltip) tooltip.remove();
  
  // Find the SVG container
  const svg = d3.select<SVGSVGElement, unknown>("svg");
  const svgElement = svg.node();
  if (!svgElement) {
    console.warn("SVG container not found, falling back to body");
    tooltip = d3.select<HTMLElement, unknown>("body")
      .append<HTMLDivElement>("div")
      .attr("class", "tooltip");
    return tooltip;
  }
  
  // Get the SVG's parent container
  const parentElement = svgElement.parentElement;
  if (!parentElement) {
    console.warn("SVG parent container not found, falling back to body");
    tooltip = d3.select<HTMLElement, unknown>("body")
      .append<HTMLDivElement>("div")
      .attr("class", "tooltip");
    return tooltip;
  }

  const container = d3.select<HTMLElement, unknown>(parentElement);
  
  tooltip = container
    .append<HTMLDivElement>("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("padding", "6px 6px")
    .style("border-radius", "8px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .style("line-height", "1.4")
    .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)")
    .style("max-width", "300px")
    .style("white-space", "normal")
    .style("word-wrap", "break-word")
    .style("text-align", "center")
    .style("z-index", "1000");

  updateTooltipTheme(isDark);
  return tooltip;
}

export function updateTooltipTheme(isDark: boolean) {
  if (!tooltip) return;
  
  tooltip
    .style("background", isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)")
    .style("color", isDark ? "rgba(229, 231, 235, 1)" : "rgba(17, 24, 39, 1)")
    .style("border", isDark ? "1px solid rgba(75, 85, 99, 0.4)" : "1px solid rgba(229, 231, 235, 0.4)");
}

export function showTooltip(event: MouseEvent, content: string) {
  if (!tooltip) return;

  const svg = d3.select<SVGSVGElement, unknown>("svg");
  const svgElement = svg.node();
  if (!svgElement) return;

  const rect = svgElement.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  tooltip.transition()
    .duration(200)
    .style("opacity", 0.9);
  
  tooltip.html(content)
    .style("left", `${x + 10}px`)
    .style("top", `${y - 28}px`);
}

export function hideTooltip() {
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

export function getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string, centreFlow: boolean = false): string {
  if (centreFlow) {
    switch (flowDirection) {
      case 'inFlow':
        return `Churn into ${target.label} was ${formatNumber(flow.absolute_inFlow)}.`;
      case 'outFlow':
        return `Churn away from ${source.label} was ${formatNumber(flow.absolute_outFlow)}.`;
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          return `Churn into ${target.label} was ${formatNumber(flow.absolute_netFlow)}.`;
        } else {
          return `Churn away from ${source.label} was ${formatNumber(flow.absolute_netFlow)}.`;
        }
      case 'interaction':
        return `${formatNumber(flow.absolute_netFlow)} people interacted between ${source.label} and ${target.label}.`;
    }
  } else {
    switch (flowDirection) {
      case 'inFlow':
        return `${formatNumber(flow.absolute_inFlow)} people came to ${target.label} from ${source.label}.`;
      case 'outFlow':
        return `${formatNumber(flow.absolute_outFlow)} people went to ${target.label} from ${source.label}.`;
      case 'netFlow':
        return `${formatNumber(flow.absolute_netFlow)} people went from ${source.label} to ${target.label}.`;
      case 'interaction':
        return `${formatNumber(flow.absolute_netFlow)} people interacted between ${source.label} and ${target.label}.`;
    }
  }

  return ''; // Default case
}