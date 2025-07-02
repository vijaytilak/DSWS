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
  // Calculate the outer ring radius based on available circumference space
  const circumference = 2 * Math.PI * positionCircleRadius;
  const totalGapSpace = (noOfBubbles - 1) * CONFIG.bubble.minDistanceBetweenRings;
  const availableSpace = Math.max(circumference - totalGapSpace, 0);
  
  // Ensure outer ring radius is proportional to position circle radius but within bounds
  const outerRingRadius = Math.min(
    Math.max(availableSpace / (2 * noOfBubbles), CONFIG.bubble.minBubbleRadius * 2),
    CONFIG.bubble.maxOuterRingRadius,
    positionCircleRadius * 0.15 // Ensure outer ring isn't too large relative to position circle
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

    // Scale the bubble radius based on percentile rank with a more gradual scale
    // Use a square root scale to make size differences more perceptible
    const percentRankFactor = Math.sqrt(item.percentRank / 100);
    const scaledRadius = Math.max(
      minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * percentRankFactor,
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
      color: CONFIG.colors.palette[item.itemID % CONFIG.colors.palette.length],
      focus: false,
      fontSize,
      outerRingRadius,
      totalBubbles: noOfBubbles + 1, // Total including center bubble
      isMarketView: ViewManager.getInstance().isMarketView(), // Use view manager
      isDarkTheme: false, // Default value, will be updated
    } as Bubble;
  });

  // Add center bubble with appropriate sizing relative to the visualization
  const centerBubbleRadius = Math.min(
    0.15 * positionCircleRadius,
    CONFIG.bubble.maxCenterBubbleRadius || 50
  );
  
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
    color: CONFIG.colors.palette[0 % CONFIG.colors.palette.length], // Use last color from config
    focus: false,
    isCentre: true, // Mark as center bubble
    isSelected: false,
    fontSize: Math.max(CONFIG.bubble.minFontSize * 1.2, centerBubbleRadius * 0.4),
    outerRingRadius: centerBubbleRadius + CONFIG.bubble.minDistanceBetweenBubbleAndRing,
    totalBubbles: noOfBubbles + 1, // Total including center bubble
    isMarketView: true, // Default value, will be updated
    isDarkTheme: false, // Default value, will be updated
  };

  return { 
    bubbles: [...bubbles, centerBubble],
    maxBubbleRadius,
    minBubbleRadius
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
  // Get theme state from ThemeManager
  const themeManager = ThemeManager.getInstance();
  const isDarkTheme = themeManager.isDark();
  // Get ViewManager instance
  const viewManager = ViewManager.getInstance();
  
  // Set view type based on isMarketView parameter for backward compatibility
  viewManager.setViewType(isMarketView ? 'markets' : 'brands');
  const noOfBubbles = bubbles.length - 1; // Excluding center bubble
  
  // Calculate the minimum radius needed to maintain minDistanceBetweenRings
  const maxBubbleOuterRadius = Math.max(...bubbles.slice(0, -1).map(b => b.outerRingRadius));
  const minRequiredCircumference = noOfBubbles * (2 * maxBubbleOuterRadius + CONFIG.bubble.minDistanceBetweenRings);
  const minRequiredRadius = minRequiredCircumference / (2 * Math.PI);
  
  // Calculate adjusted radius based on container size and minimum requirements
  // Use a proportion of the available space to ensure bubbles aren't too close to the edge
  const containerRadius = Math.min(centerX, centerY) * 0.85;
  const adjustedRadius = Math.max(
    minRequiredRadius,
    Math.min(positionCircleRadius, containerRadius)
  );
  
  // Calculate maximum label offset based on container size
  const maxLabelOffset = Math.min(centerX, centerY) * 0.25;

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
        isMarketView: viewManager.isMarketView(),
        isDarkTheme,
      };
    }

    // Calculate position for regular bubbles
    const angle = ((2 * Math.PI * index) / noOfBubbles) - Math.PI / 2;
    const x = centerX + adjustedRadius * Math.cos(angle);
    const y = centerY + adjustedRadius * Math.sin(angle);
    
    // Calculate optimal label position based on bubble size and angle
    // For bubbles on the right side, position labels to the right
    // For bubbles on the left side, position labels to the left
    // This creates a more balanced visual appearance
    const isRightSide = Math.cos(angle) >= 0;
    const isTopHalf = Math.sin(angle) <= 0;
    
    // Adjust label offset based on bubble size and position
    const baseLabelOffset = bubble.radius * 1.5;
    const labelLengthFactor = bubble.label.length * (baseTextSize * 0.15);
    
    const labelOffset = Math.min(
      baseLabelOffset + labelLengthFactor,
      maxLabelOffset
    );
    
    // Position labels with appropriate spacing from the bubble
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
      fontSize: baseTextSize,
      isMarketView,
      isDarkTheme,
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
  // Get theme state from ThemeManager
  const themeManager = ThemeManager.getInstance();
  const isDarkTheme = themeManager.isDark();
  // Get ViewManager instance
  const viewManager = ViewManager.getInstance();
  
  // Set view type based on isMarketView parameter for backward compatibility
  viewManager.setViewType(isMarketView ? 'markets' : 'brands');
  const baseTextSize = Math.max(
    Math.min(centerX, centerY) * 0.035,
    CONFIG.bubble.minFontSize
  );

  const positionCircleRadius = Math.min(width, height) / 2;

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
