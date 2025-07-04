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

export function getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string, centreFlow: boolean = false, flowOption: 'churn' | 'switching' | 'affinity' = 'churn'): string {
  // For churn metrics, extract the correct percentage values from churn data
  let switchPerc, otherPerc, switchIndex, otherIndex;
  const isChurnMetric = flowOption === 'churn';
  
  if (isChurnMetric && flow.churn && flow.churn.length > 0) {
    // Extract churn-specific data for the correct flow direction
    if (flowDirection === 'inFlow' && flow.churn[0].in) {
      switchPerc = flow.churn[0].in.switch_perc * 100;
      otherPerc = flow.churn[0].in.other_perc * 100;
      switchIndex = flow.churn[0].in.switch_index;
      otherIndex = flow.churn[0].in.other_index;
    } else if (flowDirection === 'outFlow' && flow.churn[0].out) {
      switchPerc = flow.churn[0].out.switch_perc * 100;
      otherPerc = flow.churn[0].out.other_perc * 100;
      switchIndex = flow.churn[0].out.switch_index;
      otherIndex = flow.churn[0].out.other_index;
    }
  }
  
  if (centreFlow) {
    switch (flowDirection) {
      case 'inFlow':
        return `${source.label} to ${target.label}: ${flow.absolute_inFlow.toFixed(1)}%`;
      case 'outFlow':
        return `${source.label} to ${target.label}: ${flow.absolute_outFlow.toFixed(1)}%`;
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          return `Net flow from ${source.label} to ${target.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
        } else {
          return `Net flow from ${target.label} to ${source.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
        }
      case 'both':
        const complementaryValue = 100 - flow.absolute_inFlow;
        return `${source.label} to ${target.label}:
                Inbound: ${flow.absolute_inFlow.toFixed(1)}%
                Outbound: ${complementaryValue.toFixed(1)}%
                Net: ${flow.absolute_netFlow.toFixed(1)}%`;
    }
  } else {
    switch (flowDirection) {
      case 'inFlow':
        if (isChurnMetric && switchPerc !== undefined) {
          // Use the correct percentage from churn data
          const indexText = switchIndex ? ` (Index: ${switchIndex.toFixed(1)})` : '';
          return `${switchPerc.toFixed(1)}% sales churn in from ${source.label}${indexText}`;
        } else if (flowOption === 'switching') {
          return `${flow.absolute_inFlow.toFixed(1)}% switch in from ${source.label}`;
        } else {
          return `${flow.absolute_inFlow.toFixed(1)}% flow from ${source.label} to ${target.label}`;
        }
      case 'outFlow':
        if (isChurnMetric && switchPerc !== undefined) {
          // Use the correct percentage from churn data
          const indexText = switchIndex ? ` (Index: ${switchIndex.toFixed(1)})` : '';
          return `${switchPerc.toFixed(1)}% sales churn out to ${target.label}${indexText}`;
        } else if (flowOption === 'switching') {
          return `${flow.absolute_outFlow.toFixed(1)}% switch out to ${target.label}`;
        } else {
          return `${flow.absolute_outFlow.toFixed(1)}% flow from ${source.label} to ${target.label}`;
        }
      case 'netFlow':
        if (flow.absolute_netFlowDirection === 'inFlow') {
          // Get index value if available for inFlow
          let indexText = '';
          if (isChurnMetric && switchIndex !== undefined) {
            indexText = ` (Index: ${switchIndex.toFixed(1)})`;
          }
          
          if (isChurnMetric) {
            const percValue = switchPerc !== undefined ? switchPerc : flow.absolute_netFlow;
            return `Net sales churn in from ${source.label}: ${percValue.toFixed(1)}%${indexText}`;
          } else if (flowOption === 'switching') {
            return `Net switch in from ${source.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
          } else {
            return `Net flow from ${source.label} to ${target.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
          }
        } else {
          // Get index value if available for outFlow
          let indexText = '';
          if (isChurnMetric && switchIndex !== undefined) {
            indexText = ` (Index: ${switchIndex.toFixed(1)})`;
          }
          
          if (isChurnMetric) {
            const percValue = switchPerc !== undefined ? switchPerc : flow.absolute_netFlow;
            return `Net sales churn out to ${target.label}: ${percValue.toFixed(1)}%${indexText}`;
          } else if (flowOption === 'switching') {
            return `Net switch out to ${target.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
          } else {
            return `Net flow from ${source.label} to ${target.label}: ${flow.absolute_netFlow.toFixed(1)}%`;
          }
        }
      case 'both':
        if (isChurnMetric && switchPerc !== undefined && otherPerc !== undefined) {
          // For bidirectional flows with churn data, show both percentages
          const switchIndexText = switchIndex ? ` (Index: ${switchIndex.toFixed(1)})` : '';
          const otherIndexText = otherIndex ? ` (Index: ${otherIndex.toFixed(1)})` : '';
          
          return `${source.label} to ${target.label}:
                  Switch: ${switchPerc.toFixed(1)}%${switchIndexText}
                  Other: ${otherPerc.toFixed(1)}%${otherIndexText}`;
        } else {
          // Default bidirectional flow display
          return `${source.label} to ${target.label}:
                  Inbound: ${flow.absolute_inFlow.toFixed(1)}%
                  Outbound: ${flow.absolute_outFlow.toFixed(1)}%
                  Net: ${flow.absolute_netFlow.toFixed(1)}%`;
        }
    }
  }
  return '';
}