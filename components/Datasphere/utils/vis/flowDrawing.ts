import * as d3 from 'd3';
import { CONFIG } from '../../constants/config';
import type { Flow, Bubble } from '../../types';
import { showTooltip, hideTooltip, getFlowTooltip } from '../tooltip';
import { isBidirectionalFlowType } from '../flowTypeUtils';

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
  focusedFlow: { from: number; to: number } | null = null
) {
  const currentFlowType = flowType;
  const isBrandsChurnView = !isMarketView && flowOption === 'churn';

  console.log(`DEBUG - drawFlows called with flowOption: ${flowOption}, flowType: ${flowType}, flows count: ${flows.length}`);

  // Check what exists before cleanup
  const beforeCleanup = {
    flowLine: svg.selectAll('.flow-line').nodes().length,
    bidirectionalInflow: svg.selectAll('.flow-bidirectional-inflow').nodes().length,
    bidirectionalOutflow: svg.selectAll('.flow-bidirectional-outflow').nodes().length,
    total: svg.selectAll('*').nodes().length
  };
  console.log('DEBUG - Before cleanup:', beforeCleanup);

  // Simple SVG cleanup
  svg.selectAll('.flow-line').remove();
  svg.selectAll('.flow-bidirectional-inflow').remove();
  svg.selectAll('.flow-bidirectional-outflow').remove();
  svg.selectAll('.flow-arrow').remove(); 
  svg.selectAll('.flow-label').remove();
  svg.selectAll('.flow-marker').remove();
  svg.selectAll('line').remove();
  svg.selectAll('path[class*="flow"]').remove();
  svg.selectAll('g[class*="flow"]').remove();
  svg.selectAll('marker').remove();

  // Check what exists after cleanup
  const afterCleanup = {
    flowLine: svg.selectAll('.flow-line').nodes().length,
    bidirectionalInflow: svg.selectAll('.flow-bidirectional-inflow').nodes().length,
    bidirectionalOutflow: svg.selectAll('.flow-bidirectional-outflow').nodes().length,
    total: svg.selectAll('*').nodes().length
  };
  console.log('DEBUG - After cleanup:', afterCleanup);

  // Log each flow that will be processed
  flows.forEach((flow, index) => {
    const source = bubbles.find((b) => b.id === flow.from);
    const target = bubbles.find((b) => b.id === flow.to);
    console.log(`DEBUG - Flow ${index + 1}/${flows.length}: ${source?.label || flow.from} -> ${target?.label || flow.to} (flowType: ${currentFlowType}, netFlow: ${flow.absolute_netFlow})`);
  });

  const getFlowValue = (flow: Flow) => {
    switch (currentFlowType) {
      case 'net':
        return flow.absolute_netFlow;
      case 'in':
        return flow.absolute_inFlow;
      case 'out':
        return flow.absolute_outFlow;
      case 'both':
        return Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      default:
        return flow.absolute_netFlow;
    }
  };

  const flowsWithValues = flows.map((flow) => ({ ...flow, value: getFlowValue(flow) }));
  const sortedValues = [...flowsWithValues.map((f) => f.value)].sort((a, b) => a - b);
  const flowsWithMetrics = flowsWithValues.map((flow) => {
    const lessThanCount = sortedValues.filter((v) => v < flow.value).length;
    const percentRank = sortedValues.length <= 1 ? 100 : (lessThanCount / (sortedValues.length - 1)) * 100;
    return { ...flow, percentRank } as Flow;
  });

  if (focusedFlow) {
    svg
      .selectAll<SVGPathElement | SVGLineElement, Flow>('.flow-line')
      .attr('opacity', function () {
        const line = d3.select(this);
        const fromId = parseInt(line.attr('data-from-id') || '0', 10);
        const toId = parseInt(line.attr('data-to-id') || '0', 10);
        const isFocused =
          (fromId === focusedFlow.from && toId === focusedFlow.to) ||
          (fromId === focusedFlow.to && toId === focusedFlow.from);
        return isFocused ? 1 : 0.2;
      });
  }

  flowsWithMetrics.forEach((flow, index) => {
    const source = bubbles.find((b) => b.id === flow.from);
    const target = bubbles.find((b) => b.id === flow.to);
    if (!source || !target) return;

    drawFlowLine(
      svg,
      flow,
      currentFlowType,
      source,
      target,
      currentFlowType,
      centreFlow,
      bubbles,
      flowOption,
      isMarketView,
      onFlowClick,
      focusedFlow
    );
  });

  // Count flows properly: unidirectional = 1 element per flow, bidirectional = 2 elements per flow
  const unidirectionalElements = svg.selectAll('.flow-line:not(.flow-bidirectional-inflow):not(.flow-bidirectional-outflow)').nodes().length;
  const bidirectionalFlows = svg.selectAll('.flow-bidirectional-inflow').nodes().length; // Count only inflow segments to avoid double-counting
  const totalFlowCount = unidirectionalElements + bidirectionalFlows;
  
  console.log(`DEBUG - drawFlows completed. Unidirectional: ${unidirectionalElements}, Bidirectional: ${bidirectionalFlows}, Total flows: ${totalFlowCount}`);
}

/**
 * Generic function to draw unidirectional flows with a single line
 * The direction is determined by flowDirection ('in', 'out', or 'net')
 */
export function drawUnidirectionalFlow(
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
  focusedFlow: { from: number; to: number } | null = null
) {
  const points = calculateFlowPoints(startBubble, endBubble, flowType, flowDirection, flow, centreFlow, isMarketView, flowOption);
  const lineThickness = calculateLineThickness(flow);
  
  // Extract flow value and index
  let value = 0;
  let indexValue = 0;
  
  // Get data from structured flow data
  if (flow[flowOption] && flow[flowOption].length > 0) {
    const flowData = flow[flowOption][0] as any;
    const direction = flowDirection.replace('Flow', ''); // Remove 'Flow' suffix
    
    // Access data based on direction (in, out, net)
    if (direction === 'in' && flowData.in) {
      if (typeof flowData.in.perc === 'number') {
        value = flowData.in.perc * 100;
        indexValue = typeof flowData.in.index === 'number' ? flowData.in.index : 0;
      } else if (typeof flowData.in.in_perc === 'number') {
        value = flowData.in.in_perc * 100;
        indexValue = typeof flowData.in.in_index === 'number' ? flowData.in.in_index : 0;
      }
    } 
    else if (direction === 'out' && flowData.out) {
      if (typeof flowData.out.perc === 'number') {
        value = flowData.out.perc * 100;
        indexValue = typeof flowData.out.index === 'number' ? flowData.out.index : 0;
      } else if (typeof flowData.out.out_perc === 'number') {
        value = flowData.out.out_perc * 100;
        indexValue = typeof flowData.out.out_index === 'number' ? flowData.out.out_index : 0;
      }
    }
    else if (direction === 'net' && flowData.net) {
      if (typeof flowData.net.perc === 'number') {
        value = flowData.net.perc * 100;
        indexValue = typeof flowData.net.index === 'number' ? flowData.net.index : 0;
      }
    }
  }
  
  // Fallback to legacy properties
  if (value === 0) {
    if (flowDirection === 'in' && typeof flow.absolute_inFlow === 'number') {
      value = flow.absolute_inFlow;
    } else if (flowDirection === 'out' && typeof flow.absolute_outFlow === 'number') {
      value = flow.absolute_outFlow;
    } else if (flowDirection === 'net' && typeof flow.absolute_netFlow === 'number') {
      value = flow.absolute_netFlow;
    }
  }
  
  // Ensure valid values
  if (isNaN(value) || value === undefined) value = 0;
  if (isNaN(indexValue) || indexValue === undefined) indexValue = 0;
  
  // Determine the correct points based on flow direction
  let startPoint = { x: points.start.x, y: points.start.y };
  let endPoint = { x: points.end.x, y: points.end.y };
  
  // CRITICAL DEBUG - Log detailed flow and direction info
  console.log(`FLOW-DEBUG: unidirectional flow [${flow.from}->${flow.to}], flowDirection=${flowDirection}`);
  console.log(`FLOW-DEBUG: bubble info - startBubble=${startBubble.id} (${startBubble.label}), endBubble=${endBubble.id} (${endBubble.label})`);
  
  const flowData = flow[flowOption]?.[0];
  if (flowData) {
    console.log(`FLOW-DEBUG: flow values - in=${JSON.stringify(flowData.in)}, out=${JSON.stringify(flowData.out)}`);
  }

  // Determine which way arrow should point based on data structure and flow type
  let shouldReverseDirection = false;
  // Get focus bubble ID safely from window object (or from parameters)
  const focusBubbleId = (window as any).datasphere?.focusBubbleId;
  
  // CRITICAL: Arrow direction decision logic
  if (flowDirection === 'in') {
    // IMPORTANT: For 'in' flows with focus bubble, the filtering already gives us flows
    // where the focus bubble is the target, so we should NOT reverse the path.
    // The arrow should point FROM source TO target (which is the focus bubble)
    shouldReverseDirection = false;
    console.log(`FLOW-DEBUG: For 'in' flow - keeping original direction: ${flow.from}->${flow.to}`);
  }
  // For 'out' flows, arrow should point AWAY from the focus bubble when it exists
  else if (flowDirection === 'out') {
    // If flow is already in right direction (FROM->TO for 'out' type), no reversal needed
    shouldReverseDirection = false;
  }
  // For netFlow, determine direction based on the value
  else if (flowDirection === 'net' && value < 0) {
    shouldReverseDirection = true;
    console.log(`FLOW-DEBUG: Reversing netFlow path due to negative value`);
    value = Math.abs(value); // Use absolute value for display
  }
  
  console.log(`FLOW-DEBUG: Path direction decision - shouldReverse=${shouldReverseDirection}`);
  
  if (shouldReverseDirection) {
    startPoint = { x: points.end.x, y: points.end.y };
    endPoint = { x: points.start.x, y: points.start.y };
  } else {
    // Keep default direction
    startPoint = { x: points.start.x, y: points.start.y };
    endPoint = { x: points.end.x, y: points.end.y };
  }

  // Color calculation
  const isDarkTheme = document.documentElement.classList.contains('dark');
  const fromCenter = startBubble.id === allBubbles.length - 1;
  const lineColor = fromCenter
    ? isMarketView && (flowOption === 'churn' || flowOption === 'switching') && flowDirection === 'in'
      ? endBubble.color
      : isDarkTheme
        ? '#ffffff'
        : '#000000'
    : flowOption === 'affinity'
      ? endBubble.color
      : !isMarketView && flowOption === 'switching' && flowDirection === 'out'
        ? endBubble.color
        : startBubble.color;

  // Create single flow line
  const flowPath = d3.line()([
    [startPoint.x, startPoint.y],
    [endPoint.x, endPoint.y],
  ]);

  const flowLine = svg
    .append('path')
    .attr('d', flowPath)
    .attr('class', 'flow-line')
    .attr('stroke', lineColor)
    .attr('stroke-width', () => {
      if (focusedFlow) {
        const isThisFlowFocused =
          (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
        return isThisFlowFocused ? lineThickness * 1.5 : lineThickness;
      }
      return lineThickness;
    })
    .attr('opacity', () => {
      if (focusedFlow) {
        const isThisFlowFocused =
          (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
        return isThisFlowFocused ? 1 : 0.2;
      }
      return 0.8;
    })
    .attr('data-flow-direction', flowDirection)
    .attr('data-from-center', fromCenter)
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .datum(flow);

  // Add marker for the flow (except for affinity)
  if (flowOption !== 'affinity') {
    const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
    createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, 'out');
    
    // Always apply marker at the end of the line
    flowLine.attr('marker-end', `url(#${markerId})`);
  } else {
    flowLine.attr('stroke-linecap', 'round');
  }

  // Calculate label positions along the line
  const lineAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const offset = 15;
  
  // Position percentage label at 30% along the line
  const percX = startPoint.x + (endPoint.x - startPoint.x) * 0.3 + Math.cos(lineAngle + Math.PI / 2) * offset;
  const percY = startPoint.y + (endPoint.y - startPoint.y) * 0.3 + Math.sin(lineAngle + Math.PI / 2) * offset;
  
  // Position index label at 70% along the line
  const indexX = startPoint.x + (endPoint.x - startPoint.x) * 0.7 + Math.cos(lineAngle + Math.PI / 2) * offset;
  const indexY = startPoint.y + (endPoint.y - startPoint.y) * 0.7 + Math.sin(lineAngle + Math.PI / 2) * offset;

  // Add percentage label
  const percLabel = svg
    .append('text')
    .attr('class', 'flow-label perc-label')
    .attr('x', percX)
    .attr('y', percY)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '12px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`${Math.abs(value).toFixed(1)}%`);

  // Add index label  
  const indexLabel = svg
    .append('text')
    .attr('class', 'flow-label index-label')
    .attr('x', indexX)
    .attr('y', indexY)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '12px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`(${indexValue ? indexValue.toFixed(2) : '0.00'})`);

  // Apply focus effects to labels
  if (focusedFlow) {
    const isThisFlowFocused =
      (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
      (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
    percLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    indexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
  }

  // Event handlers
  const handleMouseOver = (event: MouseEvent) => {
    if (
      !focusedFlow ||
      (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
      (flow.from === focusedFlow.to && flow.to === focusedFlow.from)
    ) {
      flowLine.attr('opacity', 1).attr('stroke-width', lineThickness * 1.1);
    }
    showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow, flowOption, isMarketView));
  };

  const handleMouseOut = () => {
    const isFocused =
      focusedFlow &&
      ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
        (flow.from === focusedFlow.to && flow.to === focusedFlow.from));

    const opacity = isFocused ? 1 : focusedFlow ? 0.2 : 0.8;
    const width = isFocused ? lineThickness * 1.1 : lineThickness;

    flowLine.attr('opacity', opacity).attr('stroke-width', width);
    hideTooltip();
  };

  const handleClick = () => {
    if (onFlowClick) {
      onFlowClick(flow, startBubble, endBubble);
    }
  };

  // Attach event handlers
  flowLine.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);
  percLabel.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
  indexLabel.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
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
  focusedFlow: { from: number; to: number } | null = null
) {
  const viewType = isMarketView ? 'Markets' : 'Brands';
  const metricType = flowOption === 'churn' ? 'Churn' : 
                   flowOption === 'switching' ? 'Switching' : 'Affinity';
  
  // Use the existing isBidirectionalFlowType function to correctly determine flow type
  const shouldUseBidirectional = isBidirectionalFlowType(
    flowDirection, 
    viewType,
    metricType
  );

  if (shouldUseBidirectional) {
    // Calculate percentages and indices for bidirectional flow
    let inPerc: number;
    let outPerc: number;
    let inIndex: number = 1.0;
    let outIndex: number = 1.0;

    if (!isMarketView && flowOption === 'churn' && flow.churn && flow.churn.length > 0 && flow.churn[0].both) {
      inPerc = flow.churn[0].both.in_perc * 100;
      outPerc = flow.churn[0].both.out_perc * 100;
      inIndex = flow.churn[0].both.in_index;
      outIndex = flow.churn[0].both.out_index;
    } else if (!isMarketView && flowOption === 'switching' && flow.switching && flow.switching.length > 0 && flow.switching[0].both) {
      inPerc = flow.switching[0].both.in_perc * 100;
      outPerc = flow.switching[0].both.out_perc * 100;
      inIndex = flow.switching[0].both.in_index;
      outIndex = flow.switching[0].both.out_index;
    } else {
      // Fallback values
      inPerc = flow.bidirectional_inPerc ?? flow.absolute_inFlow;
      outPerc = flow.bidirectional_outPerc ?? flow.absolute_outFlow;
      inIndex = flow.bidirectional_inIndex ?? 1.0;
      outIndex = flow.bidirectional_outIndex ?? 1.0;
    }

    // Draw bidirectional flow
    drawBidirectionalFlowLine(
      svg,
      flow,
      startBubble,
      endBubble,
      centreFlow,
      allBubbles,
      flowOption,
      isMarketView,
      inPerc,
      outPerc,
      inIndex,
      outIndex,
      onFlowClick,
      focusedFlow
    );
  } else {
    // Draw unidirectional flow
    drawUnidirectionalFlow(
      svg,
      flow,
      flowDirection,
      startBubble,
      endBubble,
      flowType,
      centreFlow,
      allBubbles,
      flowOption,
      isMarketView,
      onFlowClick,
      focusedFlow
    );
  }
}

export function createFlowMarker(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  id: string,
  size: number,
  color: string,
  flowDirection: string
) {
  const marker = svg
    .append('defs')
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8) // Always use the same reference point
    .attr('refY', 0)
    .attr('markerWidth', size)
    .attr('markerHeight', size)
    .attr('orient', 'auto');

  if (flowDirection === 'interaction') {
    marker.append('circle').attr('cx', '5').attr('cy', '0').attr('r', '4').attr('fill', color);
  } else {
    // Always use the same arrow shape pointing right (→)
    marker.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
  }
}

function calculateFlowPoints(
  source: Bubble,
  target: Bubble,
  flowType: string,
  flowDirection: string,
  flow: Flow,
  centreFlow: boolean = false,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn'
) {
  const angle = Math.atan2(target.y - source.y, target.x - source.x);

  const startPoint = {
    x: source.x + source.outerRingRadius * Math.cos(angle),
    y: source.y + source.outerRingRadius * Math.sin(angle),
  };

  const endPoint = {
    x: target.x - target.outerRingRadius * Math.cos(angle),
    y: target.y - target.outerRingRadius * Math.sin(angle),
  };

  if (isBidirectionalFlowType(
    flowType, 
    isMarketView ? 'Markets' : 'Brands', 
    flowOption === 'churn' ? 'Churn' : flowOption === 'switching' ? 'Switching' : 'Affinity'
  )) {
    const lineThickness = calculateLineThickness(flow);
    const offsetScale = d3
      .scaleLinear()
      .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
      .range([CONFIG.flow.parallelOffset, CONFIG.flow.parallelOffset * 2])
      .clamp(true);
    const offset = offsetScale(lineThickness);
    const perpAngle = angle + Math.PI / 2;
    const offsetX = offset * Math.cos(perpAngle);
    const offsetY = offset * Math.sin(perpAngle);
    const originalFromId = flowDirection === 'in' ? target.id : source.id;
    const originalToId = flowDirection === 'in' ? source.id : target.id;
    const direction = originalFromId < originalToId ? 1 : -1;
    return {
      start: { x: startPoint.x + offsetX * direction, y: startPoint.y + offsetY * direction },
      end: { x: endPoint.x + offsetX * direction, y: endPoint.y + offsetY * direction },
    };
  }

  return { start: startPoint, end: endPoint };
}

function calculateLineThickness(flow: Flow): number {
  if (typeof flow.percentRank === 'undefined') {
    return CONFIG.flow.minLineThickness;
  }

  const scale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .clamp(true);

  return scale(flow.percentRank);
}

function calculateMarkerSize(lineThickness: number): number {
  const scale = d3
    .scaleLinear()
    .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .range([3, 4])
    .clamp(true);

  return scale(lineThickness);
}

export function drawBidirectionalFlowLine(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flow: Flow,
  startBubble: Bubble,
  endBubble: Bubble,
  centreFlow: boolean,
  allBubbles: Bubble[],
  flowOption: 'churn' | 'switching' | 'affinity',
  isMarketView: boolean,
  inPerc: number,
  outPerc: number,
  inIndex?: number,
  outIndex?: number,
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  focusedFlow: { from: number; to: number } | null = null
) {
  const lineThickness = calculateLineThickness(flow);
  const isDarkTheme = document.documentElement.classList.contains('dark');
  const fromCenter = startBubble.id === allBubbles.length - 1;
  
  // Determine colors for each segment
  let sourceColor, destColor;
  
  if (fromCenter) {
    // Special handling for flows from center
    sourceColor = isDarkTheme ? '#ffffff' : '#000000';
    destColor = isMarketView && (flowOption === 'churn' || flowOption === 'switching') 
      ? endBubble.color 
      : isDarkTheme ? '#ffffff' : '#000000';
  } else {
    // Normal color assignment
    sourceColor = startBubble.color;
    destColor = endBubble.color;
    
    // Special case for affinity or switching flows
    if (flowOption === 'affinity' || (!isMarketView && flowOption === 'switching')) {
      // Keep the colors as is - already handled by direct assignment above
    }
  }
  console.log(`FLOW-DEBUG: bidirectional flow [${flow.from}->${flow.to}]`);
  console.log(`FLOW-DEBUG: bubble info - startBubble=${startBubble.id} (${startBubble.label}), endBubble=${endBubble.id} (${endBubble.label})`);
  console.log(`FLOW-DEBUG: bidirectional values - inPerc=${inPerc}, outPerc=${outPerc}`);
  
  const flowData = flow[flowOption]?.[0];
  if (flowData) {
    console.log(`FLOW-DEBUG: flow data - in=${JSON.stringify(flowData.in)}, out=${JSON.stringify(flowData.out)}`);
    console.log(`FLOW-DEBUG: bidirectional data - ${JSON.stringify(flowData.both)}`);
  }

  const points = calculateFlowPoints(startBubble, endBubble, 'bi-directional', 'in', flow);
  const total = inPerc + outPerc;
  const splitRatio = total === 0 ? 0.5 : inPerc / total;
  const splitX = points.start.x + (points.end.x - points.start.x) * splitRatio;
  const splitY = points.start.y + (points.end.y - points.start.y) * splitRatio;
  
  // IMPORTANT: We will strictly use flow.from and flow.to to determine flow direction,
  // regardless of which bubble is focused or the visual ordering of the bubbles.
  // This ensures the visualization always accurately reflects the data structure.
  console.log(`FLOW-DEBUG: bidirectional flow direction strictly based on JSON data (from=${flow.from}, to=${flow.to})`);

  // Determine which bubbles are source and target based on the flow data
  const fromBubble = flow.from === startBubble.id ? startBubble : endBubble;
  const toBubble = flow.to === startBubble.id ? startBubble : endBubble;
  console.log(`FLOW-DEBUG: identified fromBubble=${fromBubble.id}, toBubble=${toBubble.id}`);
  
  // Set up coordinates for each segment:
  // 1. Inflow - shows flow FROM source (flow.from) TO split point
  // 2. Outflow - shows flow FROM split point TO target (flow.to)
  const inDirection = toBubble.id === startBubble.id ? 'split-to-start' : 'split-to-end';
  const outDirection = fromBubble.id === startBubble.id ? 'split-to-start' : 'split-to-end';
  console.log(`FLOW-DEBUG: flow direction - inDirection=${inDirection}, outDirection=${outDirection}`);
  
  // BOTH segments should start from split point and go toward respective bubbles
  // But we maintain the correct tooltip data attributes to reflect the actual flow direction
  
  // The outflow segment should go FROM split point TO the flow.to bubble (target)
  let outflowSource = { x: splitX, y: splitY };
  let outflowTarget = toBubble.id === startBubble.id ? points.start : points.end;
  
  // The inflow segment should go FROM split point TO the flow.from bubble (source)
  let inflowSource = { x: splitX, y: splitY };
  let inflowTarget = fromBubble.id === startBubble.id ? points.start : points.end;
  
  console.log(`FLOW-DEBUG: bidirectional segments now both start from split point - visual correction`);
  console.log(`FLOW-DEBUG: outflow goes to flow.to=${flow.to}, inflow goes to flow.from=${flow.from}`);

  console.log(`FLOW-DEBUG: bidirectional path coords - inflow: [${inflowSource.x},${inflowSource.y}]->[${inflowTarget.x},${inflowTarget.y}]`);
  console.log(`FLOW-DEBUG: bidirectional path coords - outflow: [${outflowSource.x},${outflowSource.y}]->[${outflowTarget.x},${outflowTarget.y}]`);
  
  // Inflow segment - shows flow coming INTO the focus bubble
  const segmentStart = svg
    .append('path')
    .attr('d', d3.line()([[inflowSource.x, inflowSource.y], [inflowTarget.x, inflowTarget.y]]))
    .attr('class', 'flow-line flow-bidirectional-inflow')
    .attr('stroke', destColor) // Use destination color for inflow segment
    .attr('stroke-width', lineThickness)
    .attr('fill', 'none')
    .attr('marker-end', `url(#bi-to-${startBubble.id}-${endBubble.id})`)
    .attr('data-from-id', flow.from.toString()) // Always use flow.from for inflow source
    .attr('data-to-id', flow.to.toString()) // Always use flow.to for inflow target
    .attr('data-segment-type', 'inflow')
    .datum(flow);

  // Outflow segment - shows flow going OUT from the focus bubble  
  const segmentEnd = svg
    .append('path')
    .attr('d', d3.line()([[outflowSource.x, outflowSource.y], [outflowTarget.x, outflowTarget.y]]))
    .attr('class', 'flow-line flow-bidirectional-outflow')
    .attr('stroke', sourceColor) // Use source color for outflow segment
    .attr('stroke-width', lineThickness)
    .attr('fill', 'none')
    .attr('marker-end', `url(#bi-from-${startBubble.id}-${endBubble.id})`)
    .attr('data-from-id', flow.to.toString()) // Always use flow.to for outflow source
    .attr('data-to-id', flow.from.toString()) // Always use flow.from for outflow target
    .attr('data-segment-type', 'outflow')
    .datum(flow);

  // Create markers with appropriate colors and directions
  createFlowMarker(svg, `bi-to-${startBubble.id}-${endBubble.id}`, calculateMarkerSize(lineThickness), destColor, 'out');
  createFlowMarker(svg, `bi-from-${startBubble.id}-${endBubble.id}`, calculateMarkerSize(lineThickness), sourceColor, 'out');
  console.log(`FLOW-DEBUG: created markers for bidirectional flow segments pointing to respective bubbles`);
  
  const offset = 15;
  const angle1 = Math.atan2(splitY - points.start.y, splitX - points.start.x);
  const angle2 = Math.atan2(points.end.y - splitY, points.end.x - splitX);

  const perc1X = points.start.x + (splitX - points.start.x) * 0.2 + Math.cos(angle1 + Math.PI / 2) * offset;
  const perc1Y = points.start.y + (splitY - points.start.y) * 0.2 + Math.sin(angle1 + Math.PI / 2) * offset;
  const index1X = points.start.x + (splitX - points.start.x) * 0.8 + Math.cos(angle1 + Math.PI / 2) * offset;
  const index1Y = points.start.y + (splitY - points.start.y) * 0.8 + Math.sin(angle1 + Math.PI / 2) * offset;

  const perc2X = splitX + (points.end.x - splitX) * 0.05 + Math.cos(angle2 + Math.PI / 2) * offset;
  const perc2Y = splitY + (points.end.y - splitY) * 0.05 + Math.sin(angle2 + Math.PI / 2) * offset;
  const index2X = splitX + (points.end.x - splitX) * 0.8 + Math.cos(angle2 + Math.PI / 2) * offset;
  const index2Y = splitY + (points.end.y - splitY) * 0.8 + Math.sin(angle2 + Math.PI / 2) * offset;

  // Get absolute value for inflow if available
  let inAbsValue = '';
  if (flow.churn && flow.churn.length > 0 && flow.churn[0].in) {
    inAbsValue = flow.churn[0].in.abs.toString();
  } else if (flow.switching && flow.switching.length > 0 && flow.switching[0].in) {
    inAbsValue = flow.switching[0].in.abs.toString();
  }

  const label1 = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', perc1X)
    .attr('y', perc1Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', destColor)
    .attr('font-size', '12px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`${inPerc.toFixed(1)}% (${inAbsValue})`);

  const label1Index = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', index1X)
    .attr('y', index1Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', destColor)
    .attr('font-size', '10px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`(${inIndex !== undefined ? inIndex.toFixed(2) : '0.00'})`);

  // Get absolute value for outflow if available
  let outAbsValue = '';
  if (flow.churn && flow.churn.length > 0 && flow.churn[0].out) {
    outAbsValue = flow.churn[0].out.abs.toString();
  } else if (flow.switching && flow.switching.length > 0 && flow.switching[0].out) {
    outAbsValue = flow.switching[0].out.abs.toString();
  }

  const label2 = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', perc2X)
    .attr('y', perc2Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', sourceColor)
    .attr('font-size', '12px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`${outPerc.toFixed(1)}% (${outAbsValue})`);

  const label2Index = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', index2X)
    .attr('y', index2Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', sourceColor)
    .attr('font-size', '10px')
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .attr('data-flow-id', `${flow.from}-${flow.to}`)
    .text(`(${outIndex !== undefined ? outIndex.toFixed(2) : '0.00'})`);

  // Separate handlers for inbound and outbound segments
  const handleInboundMouseOver = (event: MouseEvent) => {
    if (
      !focusedFlow ||
      (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
      (flow.from === focusedFlow.to && flow.to === focusedFlow.from)
    ) {
      segmentStart.attr('stroke-width', lineThickness * 1.1);
    }
    // For inbound segment, pass a special 'inbound' flow direction to indicate we want inbound data from 'both'
    showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, 'inbound', centreFlow, flowOption, isMarketView));
  };

  const handleOutboundMouseOver = (event: MouseEvent) => {
    if (
      !focusedFlow ||
      (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
      (flow.from === focusedFlow.to && flow.to === focusedFlow.from)
    ) {
      segmentEnd.attr('stroke-width', lineThickness * 1.1);
    }
    // For outbound segment, pass a special 'outbound' flow direction to indicate we want outbound data from 'both'
    showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, 'outbound', centreFlow, flowOption, isMarketView));
  };

  const handleMouseOut = () => {
    const isFocused =
      focusedFlow &&
      ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
        (flow.from === focusedFlow.to && flow.to === focusedFlow.from));

    const width = isFocused ? lineThickness * 1.1 : lineThickness;
    segmentStart.attr('stroke-width', width);
    segmentEnd.attr('stroke-width', width);
    hideTooltip();
  };

  const handleClick = () => {
    if (onFlowClick) onFlowClick(flow, startBubble, endBubble);
  };

  // Use separate handlers for inbound and outbound segments
  segmentStart.on('mouseover', handleInboundMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);
  segmentEnd.on('mouseover', handleOutboundMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);

  // Update labels to use the appropriate handlers
  label1.on('mouseover', handleInboundMouseOver).on('mouseout', handleMouseOut);
  label1Index.on('mouseover', handleInboundMouseOver).on('mouseout', handleMouseOut);
  label2.on('mouseover', handleOutboundMouseOver).on('mouseout', handleMouseOut);
  label2Index.on('mouseover', handleOutboundMouseOver).on('mouseout', handleMouseOut);
}
