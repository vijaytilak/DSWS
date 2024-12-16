import * as d3 from 'd3';
import type { Flow, Bubble } from '../types';
import { formatNumber } from './format';

type TooltipSelection = d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
let tooltip: TooltipSelection | undefined;

export function createTooltip(isDark: boolean): TooltipSelection {
  // Remove any existing tooltip
  if (tooltip) tooltip.remove();
  
  // Find the SVG container
  const svg = d3.select<SVGSVGElement, unknown>("svg");
  const svgElement = svg.node();
  if (!svgElement) {
    console.warn("SVG container not found, falling back to body");
    const bodySelection = d3.select<HTMLBodyElement, unknown>("body");
    tooltip = bodySelection
      .append<HTMLDivElement>("div")
      .attr("class", "tooltip") as TooltipSelection;
    return tooltip;
  }
  
  // Get the SVG's parent container
  const parentElement = svgElement.parentElement;
  if (!parentElement) {
    console.warn("SVG parent container not found, falling back to body");
    const bodySelection = d3.select<HTMLBodyElement, unknown>("body");
    tooltip = bodySelection
      .append<HTMLDivElement>("div")
      .attr("class", "tooltip") as TooltipSelection;
    return tooltip;
  }

  // Create the tooltip
  const parentSelection = d3.select(parentElement) as unknown as d3.Selection<HTMLElement, unknown, HTMLElement, any>;
  tooltip = parentSelection
    .append<HTMLDivElement>("div")
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
    .style("z-index", "1000") as unknown as TooltipSelection;

  updateTooltipTheme(isDark);
  return tooltip;
}

export function updateTooltipTheme(isDark: boolean) {
  if (!tooltip) return;
  
  tooltip
    .style("background", isDark ? "rgba(23, 23, 23, 0.85)" : "rgba(255, 255, 255, 0.85)")
    .style("color", isDark ? "rgba(229, 231, 235, 1)" : "rgba(17, 24, 39, 1)")
    .style("border", isDark ? "1px solid rgba(75, 85, 99, 0.1)" : "1px solid rgba(229, 231, 235, 0.1)");
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
  tooltip?.transition()
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