import * as d3 from 'd3';
import type { Flow, Bubble } from '../types';
import { CONFIG } from '../constants/config';
import { getFlowLineColor, calculateFlowPoints, calculateLineThickness, calculateMarkerSize } from './flowUtils';
import { showTooltip, hideTooltip, getFlowTooltip, getBubbleTooltip } from './tooltip'; // Added getBubbleTooltip

export function createFlowMarker(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  id: string,
  size: number,
  color: string,
  flowDirection: string
): void {
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

export function attachFlowEventHandlers(
  selection: d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>,
  flow: Flow,
  startBubble: Bubble,
  endBubble: Bubble,
  flowDirectionForTooltip: string,
  centreFlow: boolean,
  flowOption: 'churn' | 'switching' | 'affinity',
  lineThickness: number,
  isFocused: boolean,
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  otherSegmentSelection?: d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>
): void {
  const restingOpacity = isFocused ? 1 : (CONFIG.flow.unfocusedOpacity || 0.2);
  const restingStrokeWidth = isFocused ? lineThickness * 1.1 : lineThickness;

  selection
    .on("mouseover", (event: MouseEvent) => {
      // Cast to unknown first to avoid type error
      (selection as unknown as d3.Selection<SVGElement, any, any, any>)
          .attr("opacity", 1)
          .attr("stroke-width", lineThickness * 1.1);
      otherSegmentSelection?.attr("opacity", 1).attr("stroke-width", lineThickness * 1.1);
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirectionForTooltip, centreFlow, flowOption));
    })
    .on("mouseout", (event: MouseEvent) => {
      // Cast to unknown first to avoid type error
      (selection as unknown as d3.Selection<SVGElement, any, any, any>)
          .attr("opacity", restingOpacity)
          .attr("stroke-width", restingStrokeWidth);
      otherSegmentSelection?.attr("opacity", restingOpacity).attr("stroke-width", restingStrokeWidth);
      hideTooltip();
    })
    .on('click', () => {
      if (onFlowClick) {
        onFlowClick(flow, startBubble, endBubble);
      }
    });
}

export function createFlowLabel(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flow: Flow,
  startBubble: Bubble,
  endBubble: Bubble,
  labelFromBubble: Bubble,
  labelToBubble: Bubble,
  points: { start: { x: number; y: number }; end: { x: number; y: number } },
  lineColor: string,
  isFocused: boolean,
  flowDirectionForText: string,
  labelTextOverride?: string
): void {
  const midX = (points.start.x + points.end.x) / 2;
  const midY = (points.start.y + points.end.y) / 2;
  const dx = points.end.x - points.start.x;
  const dy = points.end.y - points.start.y;
  const angle = Math.atan2(dy, dx);
  const offset = 15;

  // Safety check for NaN values in calculations
  if (isNaN(midX) || isNaN(midY) || isNaN(angle)) {
    console.warn('Flow label position calculation resulted in NaN values:', { midX, midY, angle, flow });
    return; // Don't attempt to draw the label if we have invalid positioning
  }

  let textContent: string;
  if (labelTextOverride) {
    textContent = labelTextOverride;
  } else {
    let value: number;
    switch (flowDirectionForText) {
      case 'inFlow':
        value = flow.absolute_inFlow;
        break;
      case 'outFlow':
        value = flow.absolute_outFlow;
        break;
      case 'netFlow':
        value = flow.absolute_netFlow;
        break;
      default:
        console.log('DEBUG - Flow Input:', {
          from: flow.from,
          to: flow.to,
          absolute_inFlow: flow.absolute_inFlow,
          absolute_outFlow: flow.absolute_outFlow,
          absolute_netFlowDirection: flow.absolute_netFlowDirection,
          absolute_netFlow: flow.absolute_netFlow
        });
        // Use absolute_netFlow instead of non-existent 'value' property
        value = flow.absolute_netFlow || 0;
    }
    textContent = `${Math.abs(value).toFixed(1)}%`;
  }

  // Calculate positions with safety checks
  const labelX = midX + offset * Math.sin(angle);
  const labelY = midY - offset * Math.cos(angle);
  
  // Safety check for final position values
  if (isNaN(labelX) || isNaN(labelY)) {
    console.warn('Final label position calculation resulted in NaN values:', { labelX, labelY, flow });
    return; // Don't attempt to draw the label if we have invalid positioning
  }

  const flowLabel = svg.append("text")
    .attr("class", "flow-label")
    .attr("x", labelX)
    .attr("y", labelY)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr('fill', lineColor)
    .attr("font-size", CONFIG.fontSizes.flowLabel || "12px") // Use config or fallback
    .attr('data-from-id', labelFromBubble.id.toString())
    .attr('data-to-id', labelToBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(textContent);

  const restingOpacity = isFocused ? 1 : (CONFIG.flow.unfocusedOpacity || 0.2);
  flowLabel.attr('opacity', restingOpacity);
}

export function drawSingleFlowLine(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flow: Flow,
  startBubbleGfx: Bubble,
  endBubbleGfx: Bubble,
  allBubbles: Bubble[],
  flowDirectionForMarkerAndTooltip: string,
  flowTypeForColorAndPoints: string,
  flowOption: 'churn' | 'switching' | 'affinity',
  isMarketView: boolean,
  isDarkTheme: boolean,
  centreFlow: boolean,
  focusedFlow: { from: number, to: number } | null,
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void
): void {
  const points = calculateFlowPoints(startBubbleGfx, endBubbleGfx, flowTypeForColorAndPoints, flowDirectionForMarkerAndTooltip, flow);
  const lineThickness = calculateLineThickness(flow);
  // Fix function call to match correct signature (7 args, not 9)
  const lineColor = getFlowLineColor(startBubbleGfx, endBubbleGfx, allBubbles, flowDirectionForMarkerAndTooltip, flowOption, isMarketView, isDarkTheme);

  // Make sure the points are valid before drawing the line
  if (isNaN(points.start.x) || isNaN(points.start.y) || isNaN(points.end.x) || isNaN(points.end.y)) {
    console.warn('Flow line calculation resulted in NaN coordinates:', { start: points.start, end: points.end, flow });
    return; // Skip this flow line if coordinates are invalid
  }

  // Create path data string manually instead of using d3.line() to ensure proper format
  const startPoint = `${points.start.x},${points.start.y}`;
  const endPoint = `${points.end.x},${points.end.y}`;
  const flowPath = `M${startPoint} L${endPoint}`;
  
  console.log('DEBUG - Flow path:', {
    flow,
    startPoint,
    endPoint,
    pathData: flowPath
  });

  const isLineFocused = focusedFlow ? (flow.from === focusedFlow.from && flow.to === focusedFlow.to) || (flow.from === focusedFlow.to && flow.to === focusedFlow.from) : false;
  const restingOpacity = isLineFocused ? 1 : (CONFIG.flow.unfocusedOpacity || 0.2);
  const restingStrokeWidth = isLineFocused ? lineThickness * 1.1 : lineThickness;

  const fromCenter = startBubbleGfx.id === allBubbles.length - 1;

  // Create the path element with explicit attributes to ensure visibility
  const flowLine = svg.append("path")
    .datum(flow)
    .attr("d", flowPath)
    .attr("class", "flow-line")
    .attr("stroke", lineColor)
    .attr("stroke-width", restingStrokeWidth)
    .attr("opacity", restingOpacity)
    .attr("fill", "none")  // Important! SVG paths need fill="none" for lines
    .attr("data-flow-direction", flowDirectionForMarkerAndTooltip)
    .attr("data-from-center", fromCenter.toString())
    .attr("data-from-id", startBubbleGfx.id.toString())
    .attr("data-to-id", endBubbleGfx.id.toString());
    
  console.log('DEBUG - Flow line created:', {
    id: `${flow.from}-${flow.to}`,
    stroke: lineColor,
    strokeWidth: restingStrokeWidth,
    opacity: restingOpacity
  });

  if (flowOption !== 'affinity') {
    const markerId = `${flowDirectionForMarkerAndTooltip}-${startBubbleGfx.id}-${endBubbleGfx.id}`;
    const markerSize = calculateMarkerSize(lineThickness);
    createFlowMarker(svg, markerId, markerSize, lineColor, flowDirectionForMarkerAndTooltip);
    flowLine.attr('marker-end', `url(#${markerId})`);
  } else {
    flowLine.attr('stroke-linecap', 'round');
  }

  createFlowLabel(svg, flow, startBubbleGfx, endBubbleGfx, startBubbleGfx, endBubbleGfx, points, lineColor, isLineFocused, flowDirectionForMarkerAndTooltip);
  attachFlowEventHandlers(flowLine, flow, startBubbleGfx, endBubbleGfx, flowDirectionForMarkerAndTooltip, centreFlow, flowOption, lineThickness, isLineFocused, onFlowClick);
}


export function drawSplitFlowLine(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flow: Flow,
  sourceBubble: Bubble,
  targetBubble: Bubble,
  allBubbles: Bubble[],
  originalFlowType: string,
  flowOption: 'churn' | 'switching' | 'affinity',
  isMarketView: boolean,
  isDarkTheme: boolean,
  centreFlow: boolean,
  focusedFlow: { from: number, to: number } | null,
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  isBrandsChurnView = false // Default to false and make it optional
): void {
  const totalFlowForThickness = flow.absolute_inFlow + flow.absolute_outFlow;
  // Create a modified flow object without the non-existent 'value' property
  const lineThickness = calculateLineThickness({
    ...flow,
    percentRank: flow.percentRank,
    // Value property will be accessed by the function but isn't part of the type
    // So we use a temporary type assertion to avoid the TypeScript error
    absolute_netFlow: totalFlowForThickness
  });

  const points = calculateFlowPoints(sourceBubble, targetBubble, originalFlowType, 'both', flow, centreFlow);
  const { start, end } = points;

  let switchPerc = flow.absolute_outFlow;
  let otherPerc = flow.absolute_inFlow;
  let switchIndex = 1.0;
  let otherIndex = 1.0;
  let flowTypeForColorAndPoints = originalFlowType; // Default, might need adjustment based on context

  if (isBrandsChurnView && flow.churn && flow.churn.length > 0) {
      // This logic might need refinement based on how originalFlowType is passed
      // For now, assuming it's the overall type.
      // The key 'in' or 'out' for churn data should correspond to the perspective of 'flow.from'
      const perspectiveKey = flow.from === sourceBubble.id ? 'out' : 'in'; // Simplified assumption
      const churnDataPerspective = flow.churn[0]?.[perspectiveKey];

      if (perspectiveKey === 'out' && flow.churn[0]?.out) {
          switchPerc = flow.churn[0].out.switch_perc * 100;
          switchIndex = flow.churn[0].out.switch_index;
          // If there's also an 'in' flow for the reverse direction for Brands Churn.
          if(flow.churn[0]?.in){
            otherPerc = flow.churn[0].in.switch_perc * 100;
            otherIndex = flow.churn[0].in.switch_index;
          } else { // Fallback if no reverse churn data, use direct flow value
            otherPerc = flow.absolute_inFlow;
          }
      } else if (perspectiveKey === 'in' && flow.churn[0]?.in) {
          // This case means sourceBubble is the target of the 'in' flow from churn perspective
          switchPerc = flow.churn[0].in.switch_perc * 100; // Flow towards sourceBubble (from targetBubble)
          switchIndex = flow.churn[0].in.switch_index;
          if(flow.churn[0]?.out){ // Flow away from sourceBubble (towards targetBubble)
            otherPerc = flow.churn[0].out.switch_perc * 100;
            otherIndex = flow.churn[0].out.switch_index;
          } else {
            otherPerc = flow.absolute_outFlow;
          }
      }
  }

  const totalPercentageForSplit = switchPerc + otherPerc;
  const splitRatio = totalPercentageForSplit === 0 ? 0.5 : switchPerc / totalPercentageForSplit;

  const splitX = start.x + (end.x - start.x) * splitRatio;
  const splitY = start.y + (end.y - start.y) * splitRatio;

  // Fix function call to match correct signature (7 args, not 9)
  const outFlowColor = getFlowLineColor(sourceBubble, targetBubble, allBubbles, 'outFlow', flowOption, isMarketView, isDarkTheme);
  // Fix function call to match correct signature (7 args, not 9)
  const inFlowColor = getFlowLineColor(targetBubble, sourceBubble, allBubbles, 'inFlow', flowOption, isMarketView, isDarkTheme);

  const isLineFocused = focusedFlow ? (flow.from === focusedFlow.from && flow.to === focusedFlow.to) || (flow.from === focusedFlow.to && flow.to === focusedFlow.from) : false;
  const restingOpacity = isLineFocused ? 1 : (CONFIG.flow.unfocusedOpacity || 0.2);

  const outFlowPath = `M${start.x},${start.y} L${splitX},${splitY}`;
  const inFlowPath = `M${splitX},${splitY} L${end.x},${end.y}`;

  console.log('DEBUG - Split Flow Paths:', {
    outFlowPath,
    inFlowPath,
    start: `${start.x},${start.y}`,
    split: `${splitX},${splitY}`,
    end: `${end.x},${end.y}`
  });

  const outFlowLine = svg.append('path')
    .datum(flow)
    .attr('d', outFlowPath)
    .attr('stroke', outFlowColor)
    .attr('stroke-width', lineThickness)
    .attr('class', 'flow-line')
    .attr('data-flow-direction', 'outFlow')
    .attr('data-from-id', sourceBubble.id.toString())
    .attr('data-to-id', targetBubble.id.toString())
    .attr("opacity", restingOpacity)
    .attr("fill", "none");

  const inFlowLine = svg.append('path')
    .datum(flow)
    .attr('d', inFlowPath)
    .attr('stroke', inFlowColor)
    .attr('stroke-width', lineThickness)
    .attr('class', 'flow-line')
    .attr('data-flow-direction', 'inFlow')
    .attr('data-from-id', targetBubble.id.toString())
    .attr('data-to-id', sourceBubble.id.toString())
    .attr("opacity", restingOpacity)
    .attr("fill", "none");

  if (flowOption !== 'affinity') {
    const markerSize = calculateMarkerSize(lineThickness);
    createFlowMarker(svg, `outFlow-${sourceBubble.id}-${targetBubble.id}`, markerSize, outFlowColor, 'outFlow');
    outFlowLine.attr('marker-end', `url(#outFlow-${sourceBubble.id}-${targetBubble.id})`);

    createFlowMarker(svg, `inFlow-${targetBubble.id}-${sourceBubble.id}`, markerSize, inFlowColor, 'inFlow');
    inFlowLine.attr('marker-end', `url(#inFlow-${targetBubble.id}-${sourceBubble.id})`);
  } else {
    outFlowLine.attr('stroke-linecap', 'round');
    inFlowLine.attr('stroke-linecap', 'round');
  }

  attachFlowEventHandlers(outFlowLine as unknown as d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>, flow, sourceBubble, targetBubble, 'outFlow', centreFlow, flowOption, lineThickness, isLineFocused, onFlowClick, inFlowLine as unknown as d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>);
  attachFlowEventHandlers(inFlowLine as unknown as d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>, flow, targetBubble, sourceBubble, 'inFlow', centreFlow, flowOption, lineThickness, isLineFocused, onFlowClick, outFlowLine as unknown as d3.Selection<SVGPathElement | SVGLineElement, Flow, any, any>);

  const labelOffset = CONFIG.flow.labelOffset || 15;
  if (switchPerc > 0) { // Label for flow from sourceBubble
    const outAngle = Math.atan2(splitY - start.y, splitX - start.x);
    const outLabelX = start.x + (splitX - start.x) * 0.5 + Math.sin(outAngle) * labelOffset * (start.y > splitY ? 1 : -1); // Adjust offset direction
    const outLabelY = start.y + (splitY - start.y) * 0.5 - Math.cos(outAngle) * labelOffset * (start.x < splitX ? 1: -1);
    
    // Safety check for NaN values
    if (isNaN(outLabelX) || isNaN(outLabelY)) {
      console.warn('Out-label position calculation resulted in NaN values:', { outLabelX, outLabelY, flow });
    } else {
      const outLabelText = isBrandsChurnView ? `${switchPerc.toFixed(1)}% (${switchIndex.toFixed(1)})` : `${switchPerc.toFixed(1)}%`;
      svg.append('text')
        .attr('x', outLabelX).attr('y', outLabelY)
        .attr('class', 'flow-label').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', outFlowColor).attr("font-size", CONFIG.fontSizes.flowLabel)
        .attr('data-from-id', sourceBubble.id.toString()).attr('data-to-id', targetBubble.id.toString())
        .attr('data-flow-id', `${flow.from}-${flow.to}-out`)
        .attr("opacity", restingOpacity).text(outLabelText);
    }
  }

  if (otherPerc > 0) { // Label for flow to sourceBubble (from targetBubble)
    const inAngle = Math.atan2(end.y - splitY, end.x - splitX);
    const inLabelX = splitX + (end.x - splitX) * 0.5 + Math.sin(inAngle) * labelOffset * (splitY > end.y ? 1: -1);
    const inLabelY = splitY + (end.y - splitY) * 0.5 - Math.cos(inAngle) * labelOffset * (splitX < end.x ? 1: -1);
    
    // Safety check for NaN values
    if (isNaN(inLabelX) || isNaN(inLabelY)) {
      console.warn('In-label position calculation resulted in NaN values:', { inLabelX, inLabelY, flow });
    } else {
      const inLabelText = isBrandsChurnView ? `${otherPerc.toFixed(1)}% (${otherIndex.toFixed(1)})` : `${otherPerc.toFixed(1)}%`;
      svg.append('text')
        .attr('x', inLabelX).attr('y', inLabelY)
        .attr('class', 'flow-label').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', inFlowColor).attr("font-size", CONFIG.fontSizes.flowLabel)
        .attr('data-from-id', targetBubble.id.toString()).attr('data-to-id', sourceBubble.id.toString())
        .attr('data-flow-id', `${flow.from}-${flow.to}-in`)
        .attr("opacity", restingOpacity).text(inLabelText);
    }
  }
}

// --- Flow-Type Specific Drawing Functions (Wrappers) ---
// Common parameter object type for flow drawing wrappers
type FlowWrapperParams = {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  bubbles: Bubble[];
  flowOption: 'churn' | 'switching' | 'affinity';
  isMarketView: boolean;
  isDarkTheme: boolean;
  centreFlow: boolean;
  focusedFlow: { from: number; to: number } | null;
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
  isBrandsChurnView?: boolean; // Optional, only for bi-directional
};

export function drawInflowOnlyTypeFlows(
  flowsWithMetrics: Flow[],
  flowType: string, // 'inFlow only'
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    if (flow.absolute_inFlow > 0) {
      const sourceGfx = params.bubbles.find(b => b.id === flow.to);
      const targetGfx = params.bubbles.find(b => b.id === flow.from);
      if (!sourceGfx || !targetGfx) return;
      // Call with only required arguments
      drawSingleFlowLine(
        params.svg, 
        flow, 
        sourceGfx, 
        targetGfx, 
        params.bubbles, 
        'inFlow', 
        flowType, 
        params.flowOption, 
        params.isMarketView, 
        params.isDarkTheme, 
        params.centreFlow, 
        params.focusedFlow, 
        params.onFlowClick
      );
    }
  });
}

export function drawOutflowOnlyTypeFlows(
  flowsWithMetrics: Flow[],
  flowType: string, // 'outFlow only'
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    if (flow.absolute_outFlow > 0) {
      const sourceGfx = params.bubbles.find(b => b.id === flow.from);
      const targetGfx = params.bubbles.find(b => b.id === flow.to);
      if (!sourceGfx || !targetGfx) return;
      // Call with only required arguments
      drawSingleFlowLine(
        params.svg, 
        flow, 
        sourceGfx, 
        targetGfx, 
        params.bubbles, 
        'outFlow', 
        flowType, 
        params.flowOption, 
        params.isMarketView, 
        params.isDarkTheme, 
        params.centreFlow, 
        params.focusedFlow, 
        params.onFlowClick
      );
    }
  });
}

export function drawNetFlowTypeFlows(
  flowsWithMetrics: Flow[],
  flowType: string, // 'netFlow'
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    let sourceGfx, targetGfx, flowDirectionMarker;
    if (flow.absolute_netFlowDirection === 'inFlow') {
      sourceGfx = params.bubbles.find(b => b.id === flow.to);
      targetGfx = params.bubbles.find(b => b.id === flow.from);
      flowDirectionMarker = 'inFlow';
    } else {
      sourceGfx = params.bubbles.find(b => b.id === flow.from);
      targetGfx = params.bubbles.find(b => b.id === flow.to);
      flowDirectionMarker = 'outFlow';
    }
    if (!sourceGfx || !targetGfx) return;
    // Call with only required arguments
    drawSingleFlowLine(
      params.svg, 
      flow, 
      sourceGfx, 
      targetGfx, 
      params.bubbles, 
      flowDirectionMarker, 
      flowType,
      params.flowOption, 
      params.isMarketView, 
      params.isDarkTheme, 
      params.centreFlow, 
      params.focusedFlow, 
      params.onFlowClick
    );
  });
}

export function drawInteractionTypeFlows(
  flowsWithMetrics: Flow[],
  flowType: string, // 'interaction'
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    const sourceGfx = params.bubbles.find(b => b.id === flow.from);
    const targetGfx = params.bubbles.find(b => b.id === flow.to);
    if (!sourceGfx || !targetGfx) return;
    // Call with only required arguments
    drawSingleFlowLine(
      params.svg, 
      flow, 
      sourceGfx, 
      targetGfx, 
      params.bubbles, 
      'interaction', 
      flowType,
      params.flowOption, 
      params.isMarketView, 
      params.isDarkTheme, 
      params.centreFlow, 
      params.focusedFlow, 
      params.onFlowClick
    );
  });
}

export function drawTwoWayTypeFlows(
  flowsWithMetrics: Flow[],
  flowType: string, // 'two-way flows'
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    if (flow.absolute_inFlow > 0) {
      const sourceGfxIn = params.bubbles.find(b => b.id === flow.to);
      const targetGfxIn = params.bubbles.find(b => b.id === flow.from);
      if (sourceGfxIn && targetGfxIn) {
        // Call with only required arguments
        drawSingleFlowLine(
          params.svg, 
          flow, 
          sourceGfxIn, 
          targetGfxIn, 
          params.bubbles, 
          'inFlow', 
          'inFlow', // flowTypeForColorAndPoints is 'inFlow'
          params.flowOption, 
          params.isMarketView, 
          params.isDarkTheme, 
          params.centreFlow, 
          params.focusedFlow, 
          params.onFlowClick
        );
      }
    }
    if (flow.absolute_outFlow > 0) {
      const sourceGfxOut = params.bubbles.find(b => b.id === flow.from);
      const targetGfxOut = params.bubbles.find(b => b.id === flow.to);
      if (sourceGfxOut && targetGfxOut) {
        // Call with only required arguments
        drawSingleFlowLine(
          params.svg, 
          flow, 
          sourceGfxOut, 
          targetGfxOut, 
          params.bubbles, 
          'outFlow', 
          'outFlow', // flowTypeForColorAndPoints is 'outFlow'
          params.flowOption, 
          params.isMarketView, 
          params.isDarkTheme, 
          params.centreFlow, 
          params.focusedFlow, 
          params.onFlowClick
        );
      }
    }
  });
}

export function drawBiDirectionalTypeFlows(
  flowsWithMetrics: Flow[],
  originalFlowType: string,
  params: FlowWrapperParams
): void {
  flowsWithMetrics.forEach((flow) => {
    const sourceBubble = params.bubbles.find(b => b.id === flow.from);
    const targetBubble = params.bubbles.find(b => b.id === flow.to);
    if (!sourceBubble || !targetBubble) return;

    drawSplitFlowLine(
      params.svg, flow, sourceBubble, targetBubble, params.bubbles,
      originalFlowType, params.flowOption, params.isMarketView, params.isDarkTheme,
      params.centreFlow, params.focusedFlow, params.onFlowClick,
      params.isBrandsChurnView || false // Ensure isBrandsChurnView is boolean
    );
  });
}

// --- Bubble Drawing Helper Functions ---

export function createBubbleGroups(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bubbles: Bubble[]
): d3.Selection<SVGGElement, Bubble, SVGSVGElement, unknown> {
    return svg
        .selectAll<SVGGElement, Bubble>("g.bubble")
        .data(bubbles)
        .join("g")
        .attr("class", "bubble")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
}

export function drawOuterRings(
    bubbleGroupsSelection: d3.Selection<SVGGElement, Bubble, SVGSVGElement, unknown>,
    isMarketView: boolean,
    bubbles: Bubble[] // needed for d.id === bubbles.length -1 check
): void {
    if (CONFIG.bubble.outerRing.show) {
        bubbleGroupsSelection.append("circle")
            .attr("class", "outer-ring")
            .attr("r", (d) => d.outerRingRadius)
            .attr("fill", "none")
            .attr("stroke", (d) => d.color)
            .attr("stroke-width", CONFIG.bubble.outerRing.strokeWidth)
            .attr("stroke-dasharray", CONFIG.bubble.outerRing.strokeDasharray)
            .attr("opacity", (d) => {
                if (d.id === bubbles.length - 1 && !isMarketView) { // bubbles needed here
                    return 0;
                }
                return CONFIG.bubble.outerRing.opacity;
            });
    }
}

export function drawMainBubbleCircles(
    bubbleGroupsSelection: d3.Selection<SVGGElement, Bubble, SVGSVGElement, unknown>,
    isDark: boolean,
    isMarketView: boolean,
    focusedBubbleId: number | null,
    bubbles: Bubble[] // needed for d.id === bubbles.length -1 check
): d3.Selection<SVGCircleElement, Bubble, SVGGElement, unknown> {
    return bubbleGroupsSelection.append("circle")
        .attr("class", "bubble-circle")
        .attr("r", (d) => d.radius)
        .attr("fill", (d) => {
            if (d.id === bubbles.length - 1) { // bubbles needed here
                return isDark ? (CONFIG.colors.dark as { centerBubbleFill: string }).centerBubbleFill : (CONFIG.colors.light as { centerBubbleFill: string }).centerBubbleFill;
            }
            return d.color;
        })
        .attr("stroke", (d) => {
            if (d.id === bubbles.length - 1) return isDark ? CONFIG.colors.dark.centerBubbleStroke : CONFIG.colors.light.centerBubbleStroke;
            if (focusedBubbleId === d.id) return isDark ? CONFIG.colors.dark.focusedBubbleStroke : CONFIG.colors.light.focusedBubbleStroke;
            return "none";
        })
        .attr("stroke-width", (d) => {
            if (d.id === bubbles.length - 1) return isMarketView ? 2 : 0;
            if (focusedBubbleId === d.id) return 4; // CONFIG.bubble.focusedStrokeWidth
            return 0;
        })
        .attr("opacity", (d) => {
            if (d.id === bubbles.length - 1) return isMarketView ? 1 : 0;
            return 1;
        })
        .attr("cursor", (d) => d.id === bubbles.length - 1 ? "default" : "pointer");
}

export function attachBubbleEventHandlers(
    bubbleCirclesSelection: d3.Selection<SVGCircleElement, Bubble, SVGGElement, unknown>,
    isDark: boolean,
    focusedBubbleId: number | null,
    onClick: (bubble: Bubble) => void,
    bubbles: Bubble[] // needed for d.id === bubbles.length -1 check
): void {
    bubbleCirclesSelection
        .on("click", (event: MouseEvent, d: Bubble) => {
            if (d.id !== bubbles.length - 1) { // bubbles needed here
                onClick(d);
            }
        })
        .on("mouseover", (event: MouseEvent, d: Bubble) => {
            if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) { // bubbles needed here
                const target = event.currentTarget as SVGCircleElement;
                d3.select<SVGCircleElement, Bubble>(target)
                    .attr("stroke", isDark ? CONFIG.colors.dark.hoverBubbleStroke : CONFIG.colors.light.hoverBubbleStroke)
                    .attr("stroke-width", 2) // CONFIG.bubble.hoverStrokeWidth
                    .raise();
                showTooltip(event, getBubbleTooltip(d));
            }
        })
        .on("mouseout", (event: MouseEvent, d: Bubble) => {
            if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) { // bubbles needed here
                const target = event.currentTarget as SVGCircleElement;
                // Stroke reset to its original state (which depends on whether it's center/focused)
                const originalStroke = (bubbleDatum: Bubble) => {
                    if (bubbleDatum.id === bubbles.length - 1) return isDark ? CONFIG.colors.dark.centerBubbleStroke : CONFIG.colors.light.centerBubbleStroke;
                    // focusedBubbleId check was already done for mouseover
                    return "none";
                };
                const originalStrokeWidth = (bubbleDatum: Bubble) => {
                     if (bubbleDatum.id === bubbles.length - 1) return (bubbleCirclesSelection.filter(datum => datum.id === bubbleDatum.id).attr('opacity') !== '0') ? 2 : 0; // Check if visible
                    return 0;
                };
                 d3.select<SVGCircleElement, Bubble>(target)
                    .attr("stroke", originalStroke(d))
                    .attr("stroke-width", originalStrokeWidth(d));
            }
            hideTooltip();
        });
}

export function drawBubbleLabels(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bubbles: Bubble[],
    centerY: number, // for text anchor calculation
    centerX: number, // for text anchor calculation
    isMarketView: boolean // for label visibility of center bubble
): void {
    svg.selectAll("text.bubble-label")
        .data(bubbles)
        .join("text")
        .attr("pointer-events", "none")
        .attr("class", "bubble-label")
        .attr("x", (d) => d.textX)
        .attr("y", (d) => d.textY)
        .attr("text-anchor", (d) => {
            if (d.id === bubbles.length - 1) return "middle";
            const angle = Math.atan2(d.y - centerY, d.x - centerX);
            const degrees = (angle * 180) / Math.PI;
            if (degrees > -45 && degrees <= 45) return "start";
            if (degrees > 135 || degrees <= -135) return "end";
            return "middle";
        })
        .attr("dominant-baseline", "middle")
        .attr("fill", (d) => {
            if (d.id === bubbles.length - 1 && !isMarketView) {
                return "transparent";
            }
            return d.color; // Or CONFIG.fontColors.bubbleLabel if all labels are same color
        })
        .attr("font-size", (d) => d.fontSize)
        .attr("font-weight", "bold")
        .each(function(d) {
            const lines = d.label.split('\n');
            const textElement = d3.select(this); // Renamed to avoid conflict
            const lineHeight = d.fontSize * CONFIG.bubble.labelLineHeightFactor;

            textElement.selectAll('tspan').remove(); // Clear any existing tspans

            lines.forEach((line, i) => {
                textElement.append('tspan')
                    .attr('x', d.textX)
                    .attr('dy', i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight)
                    .text(line);
            });
        });
}
