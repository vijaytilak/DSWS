import { CONFIG } from '../constants/config';
import type { FlowData, Bubble } from '../types';
import { calculateRelativeSizePercent, calculatePercentRanks } from './calculations';

export function prepareBubbleData(
  data: FlowData,
  positionCircleRadius: number,
  noOfBubbles: number,
): { bubbles: Bubble[], maxBubbleRadius: number, minBubbleRadius: number } {
  // Calculate the outer ring radius based on available circumference space
  const circumference = 2 * Math.PI * positionCircleRadius;
  const minSpacing = positionCircleRadius * CONFIG.bubble.MIN_BUBBLE_SPACING_RATIO;
  const totalGapSpace = (noOfBubbles - 1) * minSpacing;
  const availableSpace = Math.max(circumference - totalGapSpace, 0);
  const outerRingRadius = Math.min(
    Math.max(availableSpace / (2 * noOfBubbles), positionCircleRadius * CONFIG.bubble.MIN_BUBBLE_SIZE_RATIO * 2),
    positionCircleRadius * CONFIG.bubble.MAX_BUBBLE_SIZE_RATIO * 1.2
  );

  // Calculate max and min bubble radius based on outer ring
  const outerRingPadding = positionCircleRadius * CONFIG.bubble.OUTER_RING_PADDING_RATIO;
  const minBubbleRadiusValue = positionCircleRadius * CONFIG.bubble.MIN_BUBBLE_SIZE_RATIO;
  const maxBubbleRadius = Math.max(
    outerRingRadius - outerRingPadding,
    minBubbleRadiusValue
  );
  const minBubbleRadius = Math.max(
    0.5 * maxBubbleRadius, // 50% of max as minimum
    minBubbleRadiusValue
  );

  // Calculate relative sizes and percentile ranks
  const itemsWithSizes = data.bubbles.map(item => ({
    ...item,
    bubbleID: item.bubbleID
  }));
  
  const itemsWithRanks = calculatePercentRanks(
    calculateRelativeSizePercent(itemsWithSizes, 'bubbleSize_absolute')
  );

  // Create bubbles for all items except center
  const bubbles = itemsWithRanks.map((item, index) => {
    // Format label with line breaks for words longer than 3 letters
    const formatLabel = (label: string) => {
      const words = label.split(' ');
      let formattedLabel = '';
      let currentLine = '';
      
      words.forEach((word, i) => {
        if (word.length > 3 && currentLine) {
          formattedLabel += currentLine + '\n' + word;
          currentLine = '';
        } else {
          if (currentLine) currentLine += ' ';
          currentLine += word;
          if (i === words.length - 1) formattedLabel += (formattedLabel ? '\n' : '') + currentLine;
        }
      });
      
      return formattedLabel || currentLine;
    };

    // Scale the bubble radius based on percentile rank
    const scaledRadius = Math.max(
      minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (item.percentRank / 100),
      minBubbleRadiusValue
    );
    
    // Calculate position on the circle
    const angle = (2 * Math.PI * index) / noOfBubbles;
    const x = positionCircleRadius * Math.cos(angle);
    const y = positionCircleRadius * Math.sin(angle);
    
    // Calculate text position with consistent radial offset from outer ring
    const outerRingRadius = scaledRadius + outerRingPadding;
    const labelOffsetRatio = positionCircleRadius * CONFIG.bubble.LABEL_OFFSET_RATIO;
    const labelOffset = labelOffsetRatio + outerRingRadius;
    const textX = x + labelOffset * Math.cos(angle);
    const textY = y + labelOffset * Math.sin(angle);
    
    // Calculate font size based on bubble radius
    const fontSize = Math.max(scaledRadius * 0.8, CONFIG.bubble.minFontSize);

    return {
      id: item.bubbleID,
      label: formatLabel(item.bubbleLabel),
      radius: scaledRadius,
      x,
      y,
      textX,
      textY,
      angle,
      itemSizeAbsolute: item.bubbleSize_absolute,
      sizeRankPercentage: item.percentRank,
      color: CONFIG.colors[item.bubbleID % CONFIG.colors.length],
      focus: false,
      fontSize,
      outerRingRadius,
      totalBubbles: noOfBubbles + 1, // Total including center bubble
    } as Bubble;
  });

  // Add center bubble
  const isDark = document.documentElement.classList.contains('dark');
  const centerBubble: Bubble = {
    id: noOfBubbles,
    label: "Market",
    radius: 0.15 * positionCircleRadius,
    x: 0,
    y: 0,
    textX: 0,
    textY: 0,
    angle: 0,
    itemSizeAbsolute: 0,
    sizeRankPercentage: 0,
    color: isDark ? "white" : "black",
    focus: false,
    fontSize: CONFIG.bubble.minFontSize * 0.7,
    outerRingRadius: 0.15 * positionCircleRadius + outerRingPadding,
    totalBubbles: noOfBubbles + 1, // Total including center bubble
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
  
  // Calculate the minimum radius needed to maintain minDistanceBetweenRings
  const maxBubbleOuterRadius = Math.max(...bubbles.slice(0, -1).map(b => b.outerRingRadius));
  const minRequiredCircumference = noOfBubbles * (2 * maxBubbleOuterRadius + minSpacing);
  const minRequiredRadius = minRequiredCircumference / (2 * Math.PI);
  
  const adjustedRadius = Math.max(
    minRequiredRadius,
    Math.min(positionCircleRadius, Math.min(centerX, centerY))
  );
  
  const maxLabelOffset = Math.min(centerX, centerY) * 0.3;

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
