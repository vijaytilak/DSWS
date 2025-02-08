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
  const totalGapSpace = (noOfBubbles - 1) * CONFIG.bubble.minDistanceBetweenRings;
  const availableSpace = Math.max(circumference - totalGapSpace, 0);
  const outerRingRadius = Math.min(
    Math.max(availableSpace / (2 * noOfBubbles), CONFIG.bubble.minBubbleRadius * 2),
    CONFIG.bubble.maxOuterRingRadius
  );

  // Calculate max and min bubble radius based on outer ring
  const maxBubbleRadius = Math.max(
    outerRingRadius - CONFIG.bubble.minDistanceBetweenBubbleAndRing,
    CONFIG.bubble.minBubbleRadius
  );
  const minBubbleRadius = Math.max(
    CONFIG.bubble.minBubbleRadiusPercentage * maxBubbleRadius,
    CONFIG.bubble.minBubbleRadius
  );

  // Calculate relative sizes and percentile ranks
  const itemsWithSizes = data.itemIDs.map(item => ({
    ...item,
    itemID: item.itemID
  }));
  
  const itemsWithRanks = calculatePercentRanks(
    calculateRelativeSizePercent(itemsWithSizes, 'itemSize_absolute')
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
      CONFIG.bubble.minBubbleRadius
    );
    
    // Calculate position on the circle
    const angle = (2 * Math.PI * index) / noOfBubbles;
    const x = positionCircleRadius * Math.cos(angle);
    const y = positionCircleRadius * Math.sin(angle);
    
    // Calculate text position with consistent radial offset from outer ring
    const outerRingRadius = scaledRadius + CONFIG.bubble.minDistanceBetweenBubbleAndRing;
    const labelOffset = CONFIG.bubble.labelOffset + outerRingRadius;
    const textX = x + labelOffset * Math.cos(angle);
    const textY = y + labelOffset * Math.sin(angle);
    
    // Calculate font size based on bubble radius
    const fontSize = Math.max(scaledRadius * 0.8, CONFIG.bubble.minFontSize);

    return {
      id: item.itemID,
      label: formatLabel(item.itemLabel),
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
    outerRingRadius: 0.15 * positionCircleRadius + CONFIG.bubble.minDistanceBetweenBubbleAndRing,
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
  const minRequiredCircumference = noOfBubbles * (2 * maxBubbleOuterRadius + CONFIG.bubble.minDistanceBetweenRings);
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
