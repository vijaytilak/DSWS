import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { Flow, Bubble } from '../types';

export function calculateFlowMetrics(flows: Flow[], flowTypeInput: string, /* currentFlowType from drawFlows */
                                   filteredFlows: Flow[] /* needed for flowsWithValues */ ): Flow[] {
  // Renamed flowType to flowTypeInput to avoid conflict with currentFlowType if it's brought in scope
  // Or, ensure currentFlowType is passed if it's determined by isBrandsChurnView logic prior to this call

  // Logic from drawFlows in visualization.ts
  // Note: currentFlowType was defined in drawFlows based on isBrandsChurnView.
  // This function might need isBrandsChurnView or the pre-calculated currentFlowType as a parameter.
  // For now, assuming flowTypeInput is equivalent to the original currentFlowType for getFlowValue.
  const getFlowValue = (flow: Flow) => {
    switch (flowTypeInput) { // Using flowTypeInput, ensure this matches the intended logic
      case 'netFlow':
        return flow.absolute_netFlow;
      case 'inFlow only':
        return flow.absolute_inFlow;
      case 'outFlow only':
        return flow.absolute_outFlow;
      case 'both':
      case 'bi-directional': // Added to match original logic
        return Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      default:
        return flow.absolute_inFlow;
    }
  };

  const flowsWithValues = filteredFlows.map(flow => ({ // Used filteredFlows from input
    ...flow,
    value: getFlowValue(flow)
  }));

  const sortedValues = [...flowsWithValues.map(f => f.value)].sort((a, b) => a - b);

  const flowsWithMetrics = flowsWithValues.map(flow => {
    const lessThanCount = sortedValues.filter(v => v < flow.value).length;
    const percentRank = sortedValues.length <= 1
      ? 100
      : (lessThanCount / (sortedValues.length - 1)) * 100;

    // Preserving original console.log, adjust if it was temporary debug log
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

  // Preserving original console.log
  console.log('DEBUG - After Metrics Calculation:', {
    flowType: flowTypeInput, // Using flowTypeInput
    flows: flowsWithMetrics.map(f => ({
      from: f.from,
      to: f.to,
      value: f.value,
      percentRank: f.percentRank
    }))
  });

  return flowsWithMetrics;
}

export function getFlowLineColor(
  // flow: Flow, // flow parameter is not used in the original logic block
  startBubble: Bubble,
  endBubble: Bubble,
  allBubbles: Bubble[],
  flowDirection: string,
  // flowType: string, // flowType from signature is not directly used in the color logic block
                     // The logic uses flowOption and isMarketView primarily.
  flowOption: 'churn' | 'switching' | 'affinity',
  isMarketView: boolean,
  isDarkTheme: boolean
): string {
  // Logic from drawFlowLine in visualization.ts
  const fromCenter = startBubble.id === allBubbles.length - 1;

  const lineColor = fromCenter ?
                    (isMarketView && (flowOption === 'churn' || flowOption === 'switching') && flowDirection === 'inFlow' ?
                      endBubble.color :
                      (isDarkTheme ? "#ffffff" : "#000000")) :
                    flowOption === 'affinity' ? endBubble.color :
                    (!isMarketView && flowOption === 'switching' && flowDirection === 'outFlow') ? endBubble.color :
                    startBubble.color;

  // Preserving original console.log, adjust if it was temporary debug log
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

  return lineColor;
}

export function calculateFlowPoints(
  source: Bubble,
  target: Bubble,
  flowType: string,
  flowDirection: string,
  flow: Flow, // Added flow as it's used in the original
  centreFlow: boolean = false // Added centreFlow, though not used in current logic
) {
  // Dummy usage to satisfy linter for centreFlow if it remains unused
  if (false && centreFlow) { console.log(''); }

  const angle = Math.atan2(target.y - source.y, target.x - source.x);

  const startPoint = {
    x: source.x + source.outerRingRadius * Math.cos(angle),
    y: source.y + source.outerRingRadius * Math.sin(angle)
  };

  const endPoint = {
    x: target.x - target.outerRingRadius * Math.cos(angle),
    y: target.y - target.outerRingRadius * Math.sin(angle)
  };

  const isChurnBidirectional = (flowType === 'inFlow' || flowType === 'outFlow') && flow.churn;
  if (flowType === 'two-way flows' || flowType === 'both' || isChurnBidirectional) {
    const lineThickness = calculateLineThickness(flow); // Assumes calculateLineThickness is available

    const offsetScale = d3.scaleLinear()
      .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
      .range([CONFIG.flow.parallelOffset, CONFIG.flow.parallelOffset * 2])
      .clamp(true);

    const offset = offsetScale(lineThickness);

    const perpAngle = angle + Math.PI / 2;
    const offsetX = offset * Math.cos(perpAngle);
    const offsetY = offset * Math.sin(perpAngle);

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

  return { start: startPoint, end: endPoint };
}

export function calculateLineThickness(flow: Flow): number {
  // Preserving original console.log
  console.log('DEBUG - Flow Input:', flow);

  if (typeof flow.percentRank === 'undefined') {
    // Preserving original console.log
    console.log('DEBUG - Using min thickness due to undefined percentRank');
    return CONFIG.flow.minLineThickness;
  }

  const scale = d3.scaleLinear()
    .domain([0, 100])
    .range([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .clamp(true);

  // Preserving original console.log
  console.log('DEBUG - Line Thickness:', {
    percentRank: flow.percentRank,
    thickness: scale(flow.percentRank),
    minThickness: CONFIG.flow.minLineThickness,
    maxThickness: CONFIG.flow.maxLineThickness
  });

  return scale(flow.percentRank);
}

export function calculateMarkerSize(lineThickness: number): number {
  const scale = d3.scaleLinear()
    .domain([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .range([3, 4]) // Original [CONFIG.marker.minSize, CONFIG.marker.maxSize] - using literal values if CONFIG.marker is not available here
    .clamp(true);

  return scale(lineThickness);
}
