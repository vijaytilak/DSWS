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
  console.log('DEBUG - drawFlows called with flowOption:', flowOption);
  const filteredFlows =
    focusBubbleId !== null
      ? flows.filter((flow) => flow.from === focusBubbleId || flow.to === focusBubbleId)
      : flows;

  const getFlowValue = (flow: Flow) => {
    switch (currentFlowType) {
      case 'netFlow':
        return flow.absolute_netFlow;
      case 'inFlow only':
        return flow.absolute_inFlow;
      case 'outFlow only':
        return flow.absolute_outFlow;
      default:
        return isBidirectionalFlowType(currentFlowType)
          ? Math.max(flow.absolute_inFlow, flow.absolute_outFlow)
          : flow.absolute_inFlow;

    }
  };

  const flowsWithValues = filteredFlows.map((flow) => ({ ...flow, value: getFlowValue(flow) }));
  const sortedValues = [...flowsWithValues.map((f) => f.value)].sort((a, b) => a - b);
  const flowsWithMetrics = flowsWithValues.map((flow) => {
    const lessThanCount = sortedValues.filter((v) => v < flow.value).length;
    const percentRank = sortedValues.length <= 1 ? 100 : (lessThanCount / (sortedValues.length - 1)) * 100;
    console.log('DEBUG - Percentile Calculation:', {
      value: flow.value,
      lessThanCount,
      totalValues: sortedValues.length,
      percentRank,
    });
    return { ...flow, percentRank } as Flow;
  });

  console.log('DEBUG - After Metrics Calculation:', {
    flowType,
    flows: flowsWithMetrics.map((f) => ({
      from: f.from,
      to: f.to,
      value: f.absolute_netFlow,
      percentRank: f.percentRank,
    })),
  });

  svg.selectAll('line').remove();
  svg.selectAll('marker').remove();

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

  flowsWithMetrics.forEach((flow) => {
    const source = bubbles.find((b) => b.id === flow.from);
    const target = bubbles.find((b) => b.id === flow.to);
    if (!source || !target) return;

    if (isBidirectionalFlowType(currentFlowType)) {
      drawBidirectionalFlowLine(
        svg,
        flow,
        source,
        target,
        centreFlow,
        bubbles,
        flowOption,
        isMarketView,
        flow.bidirectional_inPerc ?? flow.absolute_inFlow,
        flow.bidirectional_outPerc ?? flow.absolute_outFlow,
        flow.bidirectional_inIndex,
        flow.bidirectional_outIndex,
        onFlowClick,
        focusedFlow
      );
    } else if (isBrandsChurnView && (flowType === 'inFlow' || flowType === 'outFlow')) {
      drawFlowLine(
        svg,
        flow,
        flowType,
        source,
        target,
        flowType,
        centreFlow,
        bubbles,
        flowOption,
        isMarketView,
        onFlowClick,
        focusedFlow
      );
    } else {
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
  focusedFlow: { from: number; to: number } | null = null
) {
  if (false && centreFlow) {
    console.log('');
  }

  const points = calculateFlowPoints(startBubble, endBubble, flowType, flowDirection, flow);
  const lineThickness = calculateLineThickness(flow);
  const flowPath = d3.line()([
    [points.start.x, points.start.y],
    [points.end.x, points.end.y],
  ]);

  const isDarkTheme = document.documentElement.classList.contains('dark');
  const fromCenter = startBubble.id === allBubbles.length - 1;
  const lineColor = fromCenter
    ? isMarketView && (flowOption === 'churn' || flowOption === 'switching') && flowDirection === 'inFlow'
      ? endBubble.color
      : isDarkTheme
        ? '#ffffff'
        : '#000000'
    : flowOption === 'affinity'
      ? endBubble.color
      : !isMarketView && flowOption === 'switching' && flowDirection === 'outFlow'
        ? endBubble.color
        : startBubble.color;

  console.log('DEBUG - drawFlowLine color selection:', {
    flowOption,
    fromCenter,
    isDarkTheme,
    startBubbleId: startBubble.id,
    endBubbleId: endBubble.id,
    startBubbleColor: startBubble.color,
    endBubbleColor: endBubble.color,
    selectedColor: lineColor,
  });

  if (false && fromCenter && lineColor) {
    console.log('');
  }
  if (false && fromCenter && isMarketView) {
    console.log('');
  }

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

  if (flowOption !== 'affinity') {
    const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
    createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
    flowLine.attr('marker-end', `url(#${markerId})`);
  } else {
    flowLine.attr('stroke-linecap', 'round');
  }

  const offset = 15;
  const isChurnMetricInBrandsView = !isMarketView && flowOption === 'churn' && (flowType === 'inFlow' || flowType === 'outFlow');
  const isBidirectionalFlow = isBidirectionalFlowType(flowType) || isChurnMetricInBrandsView;

  if (!isBidirectionalFlow) {
    let value: number;
    const currentFlowDirection = flowDirection;
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

    const splitX = (points.start.x + points.end.x) / 2;
    const splitY = (points.start.y + points.end.y) / 2;

    flowLine.remove();

    const switchLine = svg
      .append('path')
      .attr('d', d3.line()([[points.start.x, points.start.y], [splitX, splitY]]))
      .attr('class', 'flow-line')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineThickness)
      .attr('fill', 'none')
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

    const otherLine = svg
      .append('path')
      .attr('d', d3.line()([[splitX, splitY], [points.end.x, points.end.y]]))
      .attr('class', 'flow-line')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineThickness)
      .attr('fill', 'none')
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

    if (flowOption !== 'affinity') {
      const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
      createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
      otherLine.attr('marker-end', `url(#${markerId})`);
    } else {
      switchLine.attr('stroke-linecap', 'round');
      otherLine.attr('stroke-linecap', 'round');
    }

    const switchAngle = Math.atan2(splitY - points.start.y, splitX - points.start.x);
    const otherAngle = Math.atan2(points.end.y - splitY, points.end.x - splitX);

    const switchPercX = points.start.x + (splitX - points.start.x) * 0.2 + Math.cos(switchAngle + Math.PI / 2) * offset;
    const switchPercY = points.start.y + (splitY - points.start.y) * 0.2 + Math.sin(switchAngle + Math.PI / 2) * offset;

    const otherPercX = splitX + (points.end.x - splitX) * 0.05 + Math.cos(otherAngle + Math.PI / 2) * offset;
    const otherPercY = splitY + (points.end.y - splitY) * 0.05 + Math.sin(otherAngle + Math.PI / 2) * offset;

    const otherIndexX = splitX + (points.end.x - splitX) * 0.8 + Math.cos(otherAngle + Math.PI / 2) * offset;
    const otherIndexY = splitY + (points.end.y - splitY) * 0.8 + Math.sin(otherAngle + Math.PI / 2) * offset;

    const switchLabel = svg
      .append('text')
      .attr('class', 'flow-label switch-label')
      .attr('x', switchPercX)
      .attr('y', switchPercY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '12px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${Math.abs(value).toFixed(1)}%`);

    const otherPercLabel = svg
      .append('text')
      .attr('class', 'flow-label other-perc-label')
      .attr('x', otherPercX)
      .attr('y', otherPercY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '12px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${Math.abs(value).toFixed(1)}%`);

    const otherIndexLabel = svg
      .append('text')
      .attr('class', 'flow-label other-index-label')
      .attr('x', otherIndexX)
      .attr('y', otherIndexY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '12px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(flow.percentRank !== undefined ? `(${flow.percentRank.toFixed(1)})` : '');

    if (focusedFlow) {
      const isThisFlowFocused =
        (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
        (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
      switchLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherPercLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherIndexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    }
  } else {
    let switchPerc: number;
    let otherPerc: number;
    let switchIndex: number;
    let otherIndex: number;

    if (isChurnMetricInBrandsView && flow.churn && flow.churn.length > 0) {
      const churnData = flow.churn[0][flowType === 'inFlow' ? 'in' : 'out'];
      if (churnData) {
        switchPerc = churnData.switch_perc * 100;
        otherPerc = churnData.other_perc * 100;
        switchIndex = churnData.switch_index;
        otherIndex = churnData.other_index;
      } else {
        switchPerc = flowType === 'inFlow' ? flow.absolute_inFlow * 0.6 : flow.absolute_outFlow * 0.6;
        otherPerc = flowType === 'inFlow' ? flow.absolute_inFlow * 0.4 : flow.absolute_outFlow * 0.4;
        switchIndex = 1.0;
        otherIndex = 1.0;
      }
    } else {
      switchPerc = flow.absolute_inFlow;
      otherPerc = flow.absolute_outFlow;
      switchIndex = 1.0;
      otherIndex = 1.0;
    }

    const totalPerc = switchPerc + otherPerc;
    const splitX = points.start.x + (points.end.x - points.start.x) * (switchPerc / totalPerc);
    const splitY = points.start.y + (points.end.y - points.start.y) * (switchPerc / totalPerc);

    console.log('Label Positioning Debug:', {
      flowDirection,
      startBubble: startBubble.id,
      endBubble: endBubble.id,
      startPos: { x: points.start.x, y: points.start.y },
      endPos: { x: points.end.x, y: points.end.y },
      splitPos: { x: splitX, y: splitY },
      switchPerc,
      otherPerc,
    });

    const switchPath = d3.line()([
      [points.start.x, points.start.y],
      [splitX, splitY],
    ]);

    const otherPath = d3.line()([
      [splitX, splitY],
      [points.end.x, points.end.y],
    ]);

    const switchLine = svg
      .append('path')
      .attr('d', switchPath)
      .attr('class', 'flow-line')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineThickness)
      .attr('fill', 'none')
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .attr('data-flow-type', flowType)
      .attr('data-flow-direction', flowDirection)
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString());

    const otherLine = svg
      .append('path')
      .attr('d', otherPath)
      .attr('class', 'flow-line')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineThickness)
      .attr('fill', 'none')
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .attr('data-flow-type', flowType)
      .attr('data-flow-direction', flowDirection === 'inFlow' ? 'outFlow' : 'inFlow')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString());

    if (flowOption !== 'affinity') {
      const markerId = `${flowDirection}-${startBubble.id}-${endBubble.id}`;
      createFlowMarker(svg, markerId, calculateMarkerSize(lineThickness), lineColor, flowDirection);
      otherLine.attr('marker-end', `url(#${markerId})`);
    } else {
      switchLine.attr('stroke-linecap', 'round');
      otherLine.attr('stroke-linecap', 'round');
    }

    const switchAngle = Math.atan2(splitY - points.start.y, splitX - points.start.x);
    const otherAngle = Math.atan2(points.end.y - splitY, points.end.x - splitX);
    const offset2 = 15;

    const switchIndexX = points.start.x + (splitX - points.start.x) * 0.2 + Math.cos(switchAngle + Math.PI / 2) * offset2;
    const switchIndexY = points.start.y + (splitY - points.start.y) * 0.2 + Math.sin(switchAngle + Math.PI / 2) * offset2;

    const otherPercX = splitX + (points.end.x - splitX) * 0.05 + Math.cos(otherAngle + Math.PI / 2) * offset2;
    const otherPercY = splitY + (points.end.y - splitY) * 0.05 + Math.sin(otherAngle + Math.PI / 2) * offset2;
    const otherIndexX = splitX + (points.end.x - splitX) * 0.8 + Math.cos(otherAngle + Math.PI / 2) * offset2;
    const otherIndexY = splitY + (points.end.y - splitY) * 0.8 + Math.sin(otherAngle + Math.PI / 2) * offset2;

    const switchIndexLabel = svg
      .append('text')
      .attr('class', 'flow-label switch-index-label')
      .attr('x', switchIndexX)
      .attr('y', switchIndexY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '10px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`(${switchIndex.toFixed(1)})`);

    const otherLabel = svg
      .append('text')
      .attr('class', 'flow-label other-label')
      .attr('x', otherPercX)
      .attr('y', otherPercY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '11px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`${otherPerc.toFixed(1)}% TEST`);

    const otherIndexLabel2 = svg
      .append('text')
      .attr('class', 'flow-label other-index-label')
      .attr('x', otherIndexX)
      .attr('y', otherIndexY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', lineColor)
      .attr('font-size', '10px')
      .attr('data-from-id', startBubble.id.toString())
      .attr('data-to-id', endBubble.id.toString())
      .attr('data-flow-id', `${flow.from}-${flow.to}`)
      .text(`(${otherIndex.toFixed(1)}) TEST`);

    if (focusedFlow) {
      const isThisFlowFocused =
        (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
        (flow.from === focusedFlow.to && flow.to === focusedFlow.from);
      otherLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      switchIndexLabel.attr('opacity', isThisFlowFocused ? 1 : 0.2);
      otherIndexLabel2.attr('opacity', isThisFlowFocused ? 1 : 0.2);
    }

    const handleMouseOver = (event: MouseEvent) => {
      if (
        !focusedFlow ||
        (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
        (flow.from === focusedFlow.to && flow.to === focusedFlow.from)
      ) {
        switchLine.attr('opacity', 1).attr('stroke-width', lineThickness * 1.1);
        otherLine.attr('opacity', 1).attr('stroke-width', lineThickness * 1.1);
      }
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow, flowOption));
    };

    const handleMouseOut = () => {
      const isFocused =
        focusedFlow &&
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from));

      const opacity = isFocused ? 1 : focusedFlow ? 0.2 : 0.8;
      const width = isFocused ? lineThickness * 1.1 : lineThickness;

      switchLine.attr('opacity', opacity).attr('stroke-width', width);
      otherLine.attr('opacity', opacity).attr('stroke-width', width);
      hideTooltip();
    };

    const handleClick = () => {
      if (onFlowClick) {
        onFlowClick(flow, startBubble, endBubble);
      }
    };

    switchLine.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);

    otherLine.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);
  }

  flowLine
    .on('mouseover', (event: MouseEvent) => {
      const target = event.currentTarget as SVGPathElement;
      const path = d3.select(target);
      const isFocused =
        focusedFlow &&
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from));

      if (!focusedFlow || isFocused) {
        path.attr('opacity', 1).attr('stroke-width', lineThickness * 1.1);
      }
      showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, flowDirection, centreFlow, flowOption));
    })
    .on('mouseout', (event: MouseEvent) => {
      const target = event.currentTarget as SVGPathElement;
      const path = d3.select(target);
      const isFocused =
        focusedFlow &&
        ((flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
          (flow.from === focusedFlow.to && flow.to === focusedFlow.from));

      path.attr('stroke-width', isFocused ? lineThickness * 1.1 : lineThickness);
      path.attr('opacity', isFocused ? 1 : focusedFlow ? 0.2 : 0.8);
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
  const marker = svg
    .append('defs')
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', size)
    .attr('markerHeight', size)
    .attr('orient', 'auto');

  if (flowDirection === 'interaction') {
    marker.append('circle').attr('cx', '5').attr('cy', '0').attr('r', '4').attr('fill', color);
  } else {
    marker.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
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
  if (false && centreFlow) {
    console.log('');
  }

  const angle = Math.atan2(target.y - source.y, target.x - source.x);

  const startPoint = {
    x: source.x + source.outerRingRadius * Math.cos(angle),
    y: source.y + source.outerRingRadius * Math.sin(angle),
  };

  const endPoint = {
    x: target.x - target.outerRingRadius * Math.cos(angle),
    y: target.y - target.outerRingRadius * Math.sin(angle),
  };

  const isChurnBidirectional = (flowType === 'inFlow' || flowType === 'outFlow') && flow.churn;
  if (isBidirectionalFlowType(flowType) || isChurnBidirectional) {
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
    const originalFromId = flowDirection === 'inFlow' ? target.id : source.id;
    const originalToId = flowDirection === 'inFlow' ? source.id : target.id;
    const direction = originalFromId < originalToId ? 1 : -1;
    return {
      start: { x: startPoint.x + offsetX * direction, y: startPoint.y + offsetY * direction },
      end: { x: endPoint.x + offsetX * direction, y: endPoint.y + offsetY * direction },
    };
  }

  return { start: startPoint, end: endPoint };
}

function calculateLineThickness(flow: Flow): number {
  console.log('DEBUG - Flow Input:', flow);

  if (typeof flow.percentRank === 'undefined') {
    console.log('DEBUG - Using min thickness due to undefined percentRank');
    return CONFIG.flow.minLineThickness;
  }

  const scale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([CONFIG.flow.minLineThickness, CONFIG.flow.maxLineThickness])
    .clamp(true);

  console.log('DEBUG - Line Thickness:', {
    percentRank: flow.percentRank,
    thickness: scale(flow.percentRank),
    minThickness: CONFIG.flow.minLineThickness,
    maxThickness: CONFIG.flow.maxLineThickness,
  });

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
  const lineColor = fromCenter
    ? isMarketView && (flowOption === 'churn' || flowOption === 'switching')
      ? endBubble.color
      : isDarkTheme
        ? '#ffffff'
        : '#000000'
    : flowOption === 'affinity'
      ? endBubble.color
      : !isMarketView && flowOption === 'switching'
        ? endBubble.color
        : startBubble.color;
  const points = calculateFlowPoints(startBubble, endBubble, 'bi-directional', 'inFlow', flow);
  const total = inPerc + outPerc;
  const splitRatio = total === 0 ? 0.5 : inPerc / total;
  const splitX = points.start.x + (points.end.x - points.start.x) * splitRatio;
  const splitY = points.start.y + (points.end.y - points.start.y) * splitRatio;

  const segmentStart = svg
    .append('path')
    .attr('d', d3.line()([[points.start.x, points.start.y], [splitX, splitY]]))
    .attr('class', 'flow-line')
    .attr('stroke', lineColor)
    .attr('stroke-width', lineThickness)
    .attr('fill', 'none')
    .attr('marker-start', `url(#bi-start-${startBubble.id}-${endBubble.id})`)
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .datum(flow);

  const segmentEnd = svg
    .append('path')
    .attr('d', d3.line()([[splitX, splitY], [points.end.x, points.end.y]]))
    .attr('class', 'flow-line')
    .attr('stroke', lineColor)
    .attr('stroke-width', lineThickness)
    .attr('fill', 'none')
    .attr('marker-end', `url(#bi-end-${startBubble.id}-${endBubble.id})`)
    .attr('data-from-id', startBubble.id.toString())
    .attr('data-to-id', endBubble.id.toString())
    .datum(flow);

  createFlowMarker(svg, `bi-start-${startBubble.id}-${endBubble.id}`, calculateMarkerSize(lineThickness), lineColor, 'inFlow');
  createFlowMarker(svg, `bi-end-${startBubble.id}-${endBubble.id}`, calculateMarkerSize(lineThickness), lineColor, 'outFlow');

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

  const label1 = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', perc1X)
    .attr('y', perc1Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '12px')
    .text(`${inPerc.toFixed(1)}%`);

  const label1Index = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', index1X)
    .attr('y', index1Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '10px')
    .text(inIndex !== undefined ? `(${inIndex.toFixed(1)})` : '');

  const label2 = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', perc2X)
    .attr('y', perc2Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '12px')
    .text(`${outPerc.toFixed(1)}%`);

  const label2Index = svg
    .append('text')
    .attr('class', 'flow-label')
    .attr('x', index2X)
    .attr('y', index2Y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', lineColor)
    .attr('font-size', '10px')
    .text(outIndex !== undefined ? `(${outIndex.toFixed(1)})` : '');

  const handleMouseOver = (event: MouseEvent) => {
    if (
      !focusedFlow ||
      (flow.from === focusedFlow.from && flow.to === focusedFlow.to) ||
      (flow.from === focusedFlow.to && flow.to === focusedFlow.from)
    ) {
      segmentStart.attr('stroke-width', lineThickness * 1.1);
      segmentEnd.attr('stroke-width', lineThickness * 1.1);
    }
    showTooltip(event, getFlowTooltip(flow, startBubble, endBubble, 'both', centreFlow, flowOption));
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

  segmentStart.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);
  segmentEnd.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut).on('click', handleClick);

  label1.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
  label1Index.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
  label2.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
  label2Index.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);
}
