import { CONFIG } from '../constants/config';
import type { FlowData, Bubble } from '../types';
import { calculateRelativeSizePercent, calculatePercentRanks } from './calculations';
import ViewManager from '../services/ViewManager';
import ThemeManager from '../services/ThemeManager';

/**
 * Prepare bubble data based on flow data
 * This function calculates bubble sizes, positions, and properties
 */
export function prepareBubbleData(
  data: FlowData,
  positionCircleRadius: number,
  noOfBubbles: number,
): { bubbles: Bubble[], maxBubbleRadius: number, minBubbleRadius: number } {
  // Step 1: Calculate bubble size constraints based on positioning circle
  const minBubbleRadius = positionCircleRadius * CONFIG.bubble.MIN_BUBBLE_SIZE_RATIO;
  const maxBubbleRadius = positionCircleRadius * CONFIG.bubble.MAX_BUBBLE_SIZE_RATIO;
  const minSpacing = positionCircleRadius * CONFIG.bubble.MIN_BUBBLE_SPACING_RATIO;
  const outerRingPadding = positionCircleRadius * CONFIG.bubble.OUTER_RING_PADDING_RATIO;
  
  // Step 2: Verify spacing constraints for collision prevention
  const availableArcLength = (2 * Math.PI * positionCircleRadius) / noOfBubbles;
  const maxFitRadius = (availableArcLength - minSpacing) / 2;
  const effectiveMaxBubbleRadius = Math.min(maxBubbleRadius, maxFitRadius);
  
  // Step 3: Ensure minimum size requirements are met
  const finalMinBubbleRadius = Math.max(minBubbleRadius, CONFIG.bubble.minFontSize / 2);
  const finalMaxBubbleRadius = Math.max(effectiveMaxBubbleRadius, finalMinBubbleRadius * 1.5);

  // Step 4: Calculate relative sizes and percentile ranks
  const itemsWithSizes = data.bubbles.map(item => ({
    ...item,
    bubbleID: item.bubbleID
  }));
  
  const itemsWithRanks = calculatePercentRanks(
    calculateRelativeSizePercent(itemsWithSizes, 'bubbleSize_absolute')
  );

  // Step 5: Create bubbles with optimized sizing
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

    // Scale the bubble radius based on data using square root scale for better perception
    const percentRankFactor = Math.sqrt(item.percentRank / 100);
    const scaledRadius = finalMinBubbleRadius + (finalMaxBubbleRadius - finalMinBubbleRadius) * percentRankFactor;
    
    // Calculate position on the circle (starting from top, going clockwise)
    const angle = ((2 * Math.PI * index) / noOfBubbles) - Math.PI / 2;
    const x = positionCircleRadius * Math.cos(angle);
    const y = positionCircleRadius * Math.sin(angle);
    
    // Calculate outer ring radius
    const outerRingRadius = scaledRadius + outerRingPadding;
    // Temporary label positioning (will be properly calculated in calculateBubbleLayout)
    const textX = 0;
    const textY = 0;
    
    // Use fixed font size for bubble labels
    const fontSize = CONFIG.bubble.BUBBLE_FONT_SIZE;

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
      totalBubbles: noOfBubbles + 1 // Total including center bubble
    } as Bubble;
  });

  // Add center bubble with ratio-based sizing
  const centerBubbleRadius = positionCircleRadius * CONFIG.bubble.CENTER_BUBBLE_SIZE_RATIO;
  
  const centerBubble: Bubble = {
    id: noOfBubbles,
    label: "Market",
    radius: centerBubbleRadius,
    x: 0,
    y: 0,
    textX: 0,
    textY: 0,
    angle: 0,
    itemSizeAbsolute: 0,
    itemSizeRelative: 0,
    sizeRankPercentage: 0,
    color: CONFIG.colors[0 % CONFIG.colors.length], // Use first color from config
    focus: false,
    isCentre: true, // Mark as center bubble
    isSelected: false,
    fontSize: CONFIG.bubble.CENTER_BUBBLE_FONT_SIZE,
    outerRingRadius: centerBubbleRadius + outerRingPadding,
    totalBubbles: noOfBubbles + 1 // Total including center bubble
  };

  return { 
    bubbles: [...bubbles, centerBubble],
    maxBubbleRadius: finalMaxBubbleRadius,
    minBubbleRadius: finalMinBubbleRadius
  };
}

/**
 * Calculate bubble layout based on container dimensions
 */
export function calculateBubbleLayout(
  bubbles: Bubble[],
  centerX: number,
  centerY: number,
  positionCircleRadius: number,
  baseTextSize: number,
  isMarketView: boolean = true // Parameter kept for backward compatibility
): Bubble[] {
  // View and theme state are now managed centrally by services
  const noOfBubbles = bubbles.length - 1; // Excluding center bubble
  
  // Use the positioning circle radius directly - it's already optimally calculated
  const adjustedRadius = positionCircleRadius;
  
  // Calculate label offset based on positioning circle
  const maxLabelOffset = positionCircleRadius * CONFIG.bubble.LABEL_OFFSET_RATIO;

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
    
    // Calculate optimal label position based on bubble size and angle
    
    // Position labels radially outward from center of visualization
    // Calculate the minimum safe distance to prevent intersection
    const baseLabelDistance = adjustedRadius + bubble.radius + 20; // 20px minimum clearance
    const dynamicLabelOffset = Math.min(
      bubble.radius * 2 + bubble.label.length * (baseTextSize * 0.2),
      maxLabelOffset
    );
    
    // Position labels radially from the center of the entire visualization
    const labelRadius = baseLabelDistance + dynamicLabelOffset;
    const textX = centerX + labelRadius * Math.cos(angle);
    const textY = centerY + labelRadius * Math.sin(angle);

    return {
      ...bubble,
      x,
      y,
      textX,
      textY,
      angle,
      fontSize: CONFIG.bubble.BUBBLE_FONT_SIZE,
    };
  });
}

/**
 * Initialize bubble visualization with the provided data
 */
export function initializeBubbleVisualization(
  data: FlowData,
  width: number,
  height: number,
  noOfBubbles: number,
  centerX: number,
  centerY: number,
  isMarketView: boolean = true // Parameter kept for backward compatibility
): { bubbles: Bubble[]; maxBubbleRadius: number; minBubbleRadius: number } {
  // View and theme state are now managed centrally by services
  const baseTextSize = CONFIG.bubble.BUBBLE_FONT_SIZE;

  // Step 1: Calculate optimal positioning circle radius
  const baseRadius = Math.min(width, height) / 2 * CONFIG.bubble.CANVAS_UTILIZATION_RATIO;
  
  // Step 2: Ensure circumference can accommodate all bubbles with spacing
  const maxBubbleSize = baseRadius * CONFIG.bubble.MAX_BUBBLE_SIZE_RATIO;
  const minSpacing = baseRadius * CONFIG.bubble.MIN_BUBBLE_SPACING_RATIO;
  const minRequiredCircumference = noOfBubbles * (maxBubbleSize * 2 + minSpacing);
  const minRequiredRadius = minRequiredCircumference / (2 * Math.PI);
  
  // Step 3: Use the larger of base radius or minimum required radius
  const positionCircleRadius = Math.max(baseRadius, minRequiredRadius);

  const bubbleData = prepareBubbleData(data, positionCircleRadius, noOfBubbles);

  const bubbles = calculateBubbleLayout(
    bubbleData.bubbles,
    centerX,
    centerY,
    positionCircleRadius,
    baseTextSize,
    isMarketView
  );

  return {
    bubbles,
    maxBubbleRadius: bubbleData.maxBubbleRadius,
    minBubbleRadius: bubbleData.minBubbleRadius,
  };
}
