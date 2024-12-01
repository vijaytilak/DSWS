import { Bubble, Flow, DatasphereConfig } from './DatasphereTypes';

export const calculateRelativeSizePercent = (array: any[], sizeProperty1: string, sizeProperty2?: string): any[] => {
  let minSize: number, maxSize: number;
  if (sizeProperty2) {
    minSize = Math.min(...array.map(obj => Math.min(obj[sizeProperty1], obj[sizeProperty2])));
    maxSize = Math.max(...array.map(obj => Math.max(obj[sizeProperty1], obj[sizeProperty2])));
  } else {
    minSize = Math.min(...array.map(obj => obj[sizeProperty1]));
    maxSize = Math.max(...array.map(obj => obj[sizeProperty1]));
  }

  const sizeRange = maxSize - minSize;

  return array.map(obj => {
    const sizePercent1 = sizeRange > 0 ? ((obj[sizeProperty1] - minSize) / sizeRange) * 100 : 100;
    const updatedObj: any = {
      ...obj,
      ['sizePercent_' + sizeProperty1]: parseFloat(sizePercent1.toFixed(2))
    };

    if (sizeProperty2) {
      const sizePercent2 = sizeRange > 0 ? ((obj[sizeProperty2] - minSize) / sizeRange) * 100 : 100;
      updatedObj['sizePercent_' + sizeProperty2] = parseFloat(sizePercent2.toFixed(2));
    }

    return updatedObj;
  });
};

export const filterByPercentRanks = (arr: any[], valueKey: string, threshold?: number): any[] => {
  const values = arr.map(item => item[valueKey]);
  values.sort((a, b) => a - b);
  const len = values.length;

  arr.forEach(item => {
    if (len <= 1) {
      item.percentRank = 100;
    } else {
      const value = item[valueKey];
      let rank = 0;
      for (let i = 0; i < len; i++) {
        if (values[i] < value) {
          rank++;
        }
      }
      const adjustedPercentile = (rank / (len - 1)) * 100;
      item.percentRank = adjustedPercentile;
    }
  });

  if (threshold !== undefined) {
    return arr.filter(item => item.percentRank >= threshold);
  }

  return arr;
};

export const prepareBubbleData = (data: any[], config: DatasphereConfig): Bubble[] => {
  const processedData = calculateRelativeSizePercent(data, 'itemSize_absolute');
  const noOfBubbles = processedData.length;
  const positionCircleRadius = Math.min(config.canvasWidth, config.canvasHeight) / 2 - config.marginForPositionCircle;
  const outerRingRadius = Math.min((2 * Math.PI * positionCircleRadius - (noOfBubbles - 1) * config.minDistanceBetweenRings) / (2 * noOfBubbles), config.maxOuterRingRadius);
  const maxBubbleRadius = outerRingRadius - config.minDistanceBetweenBubbleAndRing;
  const minBubbleRadius = config.minBubbleRadiusPercentage * maxBubbleRadius;

  return processedData.map((d: any, index: number) => {
    const rankPercentage = d.sizePercent_itemSize_absolute;
    const scaledRadius = minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (rankPercentage / 100);
    const angle = (2 * Math.PI * index) / noOfBubbles;
    const x = config.canvasWidth / 2 + positionCircleRadius * Math.cos(angle);
    const y = config.canvasHeight / 2 + positionCircleRadius * Math.sin(angle);

    return {
      id: d.itemID,
      label: d.itemLabel,
      radius: scaledRadius,
      x: x,
      y: y,
      angle: angle,
      itemSizeAbsolute: d.itemSize_absolute,
      sizeRankPercentage: rankPercentage,
      color: config.highContrastColors[index % config.highContrastColors.length],
      focus: false
    };
  });
};

export const prepareFlowData = (loadedFlowData: any, flowType: string, centreFlow: boolean, netFlowFilterThreshold: number): Flow[] => {
  const filtered: { [key: string]: any } = {};

  Object.entries(loadedFlowData).forEach(([key, val]: [string, any]) => {
    const cleanedKey = key.replace(/'/g, '');
    const reversedKey = cleanedKey.split(",").reverse().join(",");
    if (!filtered[reversedKey]) {
      filtered[cleanedKey] = val;
    }
  });

  let flowDataArray: Flow[] = Object.entries(filtered).map(([key, flow]: [string, any]) => {
    const [from, to] = key.split(',').map(Number);
    return {
      from,
      to,
      absolute_inFlow: flow.inFlow,
      absolute_outFlow: flow.outFlow,
      absolute_netFlowDirection: flow.inFlow >= flow.outFlow ? "inFlow" : "outFlow",
      absolute_netFlow: Math.abs(flow.inFlow - flow.outFlow)
    };
  });

  if (centreFlow) {
    flowDataArray = prepareCentreFlowData(flowDataArray);
  }

  flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold);

  return calculateRelativeSizePercent(flowDataArray, 'absolute_inFlow', 'absolute_outFlow');
};

const prepareCentreFlowData = (flowData: Flow[]): Flow[] => {
  const centreFlowMap = new Map<number, { totalInFlow: number; totalOutFlow: number }>();

  flowData.forEach((flow) => {
    const { from, to, absolute_inFlow, absolute_outFlow } = flow;

    if (!centreFlowMap.has(from)) centreFlowMap.set(from, { totalInFlow: 0, totalOutFlow: 0 });
    if (!centreFlowMap.has(to)) centreFlowMap.set(to, { totalInFlow: 0, totalOutFlow: 0 });

    const fromFlow = centreFlowMap.get(from)!;
    const toFlow = centreFlowMap.get(to)!;

    fromFlow.totalOutFlow += absolute_outFlow;
    fromFlow.totalInFlow += absolute_inFlow;
    toFlow.totalOutFlow += absolute_inFlow;
    toFlow.totalInFlow += absolute_outFlow;
  });

  return Array.from(centreFlowMap.entries()).map(([id, flow]) => ({
    from: id,
    to: -1, // Representing the central node
    absolute_inFlow: flow.totalInFlow,
    absolute_outFlow: flow.totalOutFlow,
    absolute_netFlowDirection: flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow",
    absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
  }));
};

export const calculateOuterRingPoints = (fromBubble: Bubble, toBubble: Bubble, outerRingRadius: number, parallelOffsetBtwFlowLines: number) => {
  const centerStart = calculateOuterRingPoint(fromBubble, toBubble, outerRingRadius);
  const centerEnd = calculateOuterRingPoint(toBubble, fromBubble, outerRingRadius);
  const offsetPoints = calculateOffsetPoints(centerStart, centerEnd, parallelOffsetBtwFlowLines);

  return {
    inFlow: offsetPoints.positive,
    outFlow: offsetPoints.negative,
    netFlow: {
      start: centerStart,
      end: centerEnd
    },
    interaction: {
      start: centerStart,
      end: centerEnd
    }
  };
};

const calculateOuterRingPoint = (fromBubble: Bubble, toBubble: Bubble, outerRingRadius: number) => {
  const dx = toBubble.x - fromBubble.x;
  const dy = toBubble.y - fromBubble.y;
  const angle = Math.atan2(dy, dx);
  return {
    x: fromBubble.x + outerRingRadius * Math.cos(angle),
    y: fromBubble.y + outerRingRadius * Math.sin(angle)
  };
};

const calculateOffsetPoints = (start: { x: number; y: number }, end: { x: number; y: number }, offset: number) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const offsetX = offset * Math.sin(angle);
  const offsetY = offset * Math.cos(angle);
  return {
    positive: {
      start: { x: start.x + offsetX, y: start.y - offsetY },
      end: { x: end.x + offsetX, y: end.y - offsetY }
    },
    negative: {
      start: { x: start.x - offsetX, y: start.y + offsetY },
      end: { x: end.x - offsetX, y: end.y + offsetY }
    }
  };
};

export const calculateLineThickness = (sizePercent: number, minThickness: number, maxThickness: number): number => {
  return minThickness + ((maxThickness - minThickness) * sizePercent / 100);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('en-US').format(number);
};