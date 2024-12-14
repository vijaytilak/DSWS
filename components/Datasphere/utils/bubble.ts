import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { FlowData, Bubble } from '../types';
import { calculateRelativeSizePercent, calculatePercentRanks } from './calculations';

export function prepareBubbleData(
  data: FlowData,
  positionCircleRadius: number,
  noOfBubbles: number,
): { bubbles: Bubble[], maxBubbleRadius: number, minBubbleRadius: number } {
  // Enforce minimum position circle radius
  const minPositionCircleRadius = Math.max(positionCircleRadius, CONFIG.bubble.minDistanceBetweenRings * 2);
  
  // Calculate outer ring radius based on available space and number of bubbles
  const outerRingRadius = (2 * Math.PI * minPositionCircleRadius - (noOfBubbles - 1) * CONFIG.bubble.minDistanceBetweenRings) / (2 * noOfBubbles);

  // Enforce minimum bubble radius
  const maxBubbleRadius = Math.max(
    outerRingRadius - CONFIG.bubble.minDistanceBetweenBubbleAndRing,
    CONFIG.bubble.minBubbleRadius
  );
  const minBubbleRadius = Math.max(
    CONFIG.bubble.minBubbleRadiusPercentage * maxBubbleRadius,
    CONFIG.bubble.minBubbleRadius
  );

  // Calculate relative sizes and percentile ranks
  const itemsWithSizes = Object.entries(data.itemIDs).map(([id, item]) => ({
    ...item,
    itemID: parseInt(id)
  }));
  
  const itemsWithRanks = calculatePercentRanks(
    calculateRelativeSizePercent(itemsWithSizes, 'itemSize_absolute')
  );

  // Create bubbles for all items except center
  const bubbles = itemsWithRanks.map((item, index) => {
    // Scale the bubble radius based on percentile rank
    const scaledRadius = minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (item.percentRank / 100);
    
    // Calculate position on the circle
    const angle = (2 * Math.PI * index) / noOfBubbles;
    const x = positionCircleRadius * Math.cos(angle);
    const y = positionCircleRadius * Math.sin(angle);
    
    // Calculate text position with offset
    const textOffset = scaledRadius + CONFIG.bubble.labelOffset;
    const textX = x + textOffset * Math.cos(angle);
    const textY = y + textOffset * Math.sin(angle);
    
    // Calculate font size based on bubble radius
    const fontSize = Math.max(scaledRadius * 0.8, CONFIG.bubble.minFontSize);

    return {
      id: item.itemID,
      label: item.itemLabel,
      radius: scaledRadius,
      x,
      y,
      textX,
      textY,
      angle,
      itemSizeAbsolute: item.itemSize_absolute,
      sizeRankPercentage: item.percentRank,
      color: CONFIG.colors[item.itemID % CONFIG.colors.length],
      focus: false,
      fontSize,
      outerRingRadius: scaledRadius + CONFIG.bubble.minDistanceBetweenBubbleAndRing,
    };
  });

  // Add center bubble
  const centerBubble = {
    id: noOfBubbles,
    label: "Major Chains",
    radius: 0.1 * minPositionCircleRadius,
    x: 0,
    y: 0,
    textX: 0,
    textY: 0,
    angle: 0,
    itemSizeAbsolute: 0,
    sizeRankPercentage: 0,
    color: "white",
    focus: false,
    fontSize: CONFIG.bubble.minFontSize,
    outerRingRadius: (0.1 * minPositionCircleRadius) + CONFIG.bubble.minDistanceBetweenBubbleAndRing,
  };

  return { 
    bubbles: [...bubbles, centerBubble],
    maxBubbleRadius,
    minBubbleRadius
  };
}

export function calculateBubbleLayout(
  bubbles: Bubble[],
  centerX: number,
  centerY: number,
  positionCircleRadius: number,
  baseTextSize: number
): Bubble[] {
  const noOfBubbles = bubbles.length - 1; // Excluding center bubble
  const adjustedRadius = Math.min(
    positionCircleRadius,
    Math.min(centerX, centerY) * 0.8
  );
  const maxLabelOffset = Math.min(centerX, centerY) * 0.2;

  return bubbles.map((bubble, index) => {
    if (index === bubbles.length - 1) {
      // Center bubble
      return {
        ...bubble,
        x: centerX,
        y: centerY,
        textX: centerX,
        textY: centerY,
        angle: 0,
        fontSize: baseTextSize
      };
    }

    // Calculate position for regular bubbles
    const angle = ((2 * Math.PI * index) / noOfBubbles) - Math.PI / 2;
    const x = centerX + adjustedRadius * Math.cos(angle);
    const y = centerY + adjustedRadius * Math.sin(angle);
    
    const labelOffset = Math.min(
      bubble.radius * 3 + bubble.label.length * (baseTextSize * 0.3),
      maxLabelOffset
    );
    const labelRadius = adjustedRadius + labelOffset;
    const textX = centerX + labelRadius * Math.cos(angle);
    const textY = centerY + labelRadius * Math.sin(angle);

    return {
      ...bubble,
      x,
      y,
      textX,
      textY,
      angle,
      fontSize: baseTextSize
    };
  });
}
