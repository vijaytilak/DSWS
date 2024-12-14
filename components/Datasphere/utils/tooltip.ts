import * as d3 from 'd3';
import type { Flow, Bubble } from '../types';
import { formatNumber } from './format';

let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

export function createTooltip(isDark: boolean) {
  // Remove any existing tooltip
  if (tooltip) tooltip.remove();
  
  tooltip = d3.select("body")
    .append("div")
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
  tooltip.transition()
    .duration(200)
    .style("opacity", 0.9);
  
  tooltip.html(content)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

export function hideTooltip() {
  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

export function getBubbleTooltip(bubble: Bubble): string {
  return `${formatNumber(bubble.itemSizeAbsolute)} people visited ${bubble.label}`;
}

export function getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string): string {
  const value = flowDirection === 'netFlow' ? flow.absolute_netFlow :
                flowDirection === 'inFlow' ? flow.absolute_inFlow :
                flowDirection === 'outFlow' ? flow.absolute_outFlow :
                Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
                
  const direction = flowDirection === 'interaction' ? 'interacted between' :
                   flowDirection === 'netFlow' ? (flow.absolute_netFlowDirection === 'inFlow' ? 'net flow from' : 'net flow to') :
                   flowDirection === 'inFlow' ? 'flow from' :
                   'flow to';

  return `${formatNumber(value)} people ${direction} ${source.label} and ${target.label}`;
}