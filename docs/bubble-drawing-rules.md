# DataSphere Bubble Drawing Rules

This document outlines the rules and steps for drawing bubbles in the DataSphere visualization based on the reference implementation.

## Data Source
All input data should be loaded from `data/ds.json`, which contains:
- `itemIDs`: Array of items with properties like `itemID`, `itemLabel`, `itemSize_absolute`, etc.
- `flow_brands`: Flow data between brands
- `flow_markets`: Flow data for markets

## Bubble Sizing and Preparation

### 1. Bubble Radius Calculation
- **Outer ring radius** is calculated based on available circumference space:
  ```typescript
  const circumference = 2 * Math.PI * positionCircleRadius;
  const totalGapSpace = (noOfBubbles - 1) * CONFIG.bubble.minDistanceBetweenRings;
  const availableSpace = Math.max(circumference - totalGapSpace, 0);
  const outerRingRadius = Math.min(
    Math.max(availableSpace / (2 * noOfBubbles), CONFIG.bubble.minBubbleRadius * 2),
    CONFIG.bubble.maxOuterRingRadius
  );
  ```

- **Maximum bubble radius** is derived from outer ring radius:
  ```typescript
  const maxBubbleRadius = Math.max(
    outerRingRadius - CONFIG.bubble.minDistanceBetweenBubbleAndRing,
    CONFIG.bubble.minBubbleRadius
  );
  ```

- **Minimum bubble radius** is a percentage of the maximum:
  ```typescript
  const minBubbleRadius = Math.max(
    CONFIG.bubble.minBubbleRadiusPercentage * maxBubbleRadius,
    CONFIG.bubble.minBubbleRadius
  );
  ```

- **Actual bubble radius** is scaled based on percentile rank:
  ```typescript
  const scaledRadius = Math.max(
    minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (item.percentRank / 100),
    CONFIG.bubble.minBubbleRadius
  );
  ```

### 2. Center Bubble
- Has a fixed radius (15% of position circle radius)
- Positioned at the center coordinates (centerX, centerY)
- Has special styling for market vs. non-market views
- Created separately from regular bubbles:
  ```typescript
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
    totalBubbles: noOfBubbles + 1
  };
  ```

### 3. Bubble Layout
- Regular bubbles are positioned on a circle with radius based on minimum required spacing
- Positions are calculated using angle and radius from center:
  ```typescript
  const angle = ((2 * Math.PI * index) / noOfBubbles) - Math.PI / 2;
  const x = centerX + adjustedRadius * Math.cos(angle);
  const y = centerY + adjustedRadius * Math.sin(angle);
  ```
- Angles are distributed evenly around the circle

## Bubble Appearance

### 1. Outer Ring
- Only shown if `CONFIG.bubble.outerRing.show` is true
- Uses bubble color with configurable stroke width, dash array, and opacity:
  ```typescript
  .attr('stroke', (d) => d.color)
  .attr('stroke-width', CONFIG.bubble.outerRing.strokeWidth)
  .attr('stroke-dasharray', CONFIG.bubble.outerRing.strokeDasharray)
  ```
- Center bubble in non-market view has opacity 0:
  ```typescript
  .attr('opacity', (d) => {
    if (d.id === bubbles.length - 1 && !isMarketView) {
      return 0;
    }
    return CONFIG.bubble.outerRing.opacity;
  });
  ```

### 2. Main Circle
- Regular bubbles use color from CONFIG.colors array (indexed by itemID)
- Center bubble uses dark/light theme colors:
  ```typescript
  .attr('fill', (d) => {
    if (d.id === bubbles.length - 1) {
      return isDark ? '#1a1a1a' : '#ffffff';
    }
    return d.color;
  })
  ```
- Focused bubble gets a stroke:
  ```typescript
  .attr('stroke', (d) => {
    if (d.id === bubbles.length - 1) return isDark ? '#ffffff' : '#000000';
    if (focusedBubbleId === d.id) return isDark ? '#ffffff' : '#000000';
    return 'none';
  })
  ```
- Center bubble in non-market view has opacity 0:
  ```typescript
  .attr('opacity', (d) => {
    if (d.id === bubbles.length - 1) return isMarketView ? 1 : 0;
    return 1;
  })
  ```

### 3. Labels
- Position calculated based on angle and label offset:
  ```typescript
  const labelOffset = Math.min(
    bubble.radius * 3 + bubble.label.length * (baseTextSize * 0.3),
    maxLabelOffset
  );
  const labelRadius = adjustedRadius + labelOffset;
  const textX = centerX + labelRadius * Math.cos(angle);
  const textY = centerY + labelRadius * Math.sin(angle);
  ```
- Font size based on bubble radius (with minimum size from config)
- Text anchor based on angle:
  ```typescript
  .attr('text-anchor', (d) => {
    if (d.id === bubbles.length - 1) return 'middle';
    const angle = Math.atan2(d.y - centerY, d.x - centerX);
    const degrees = (angle * 180) / Math.PI;
    if (degrees > -45 && degrees <= 45) return 'start';
    if (degrees > 135 || degrees <= -135) return 'end';
    return 'middle';
  })
  ```
- Multi-line formatting for words longer than 3 letters
- Center bubble label in non-market view is transparent

## Interactivity

### 1. Click Handling
- Regular bubbles trigger onClick callback:
  ```typescript
  .on('click', (event: MouseEvent, d: Bubble) => {
    if (d.id !== bubbles.length - 1) {
      onClick(d);
    }
  })
  ```
- Center bubble has no click action

### 2. Hover Effects
- Regular non-focused bubbles get stroke on hover:
  ```typescript
  .on('mouseover', (event: MouseEvent, d: Bubble) => {
    if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
      const target = event.currentTarget as SVGCircleElement;
      d3.select<SVGCircleElement, Bubble>(target)
        .attr('stroke', isDark ? '#ffffff' : '#000000')
        .attr('stroke-width', 2)
        .raise();
      showTooltip(event, getBubbleTooltip(d));
    }
  })
  ```
- Tooltip shows on hover with bubble information
- Hover effects removed on mouseout:
  ```typescript
  .on('mouseout', (event: MouseEvent, d: Bubble) => {
    if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
      const target = event.currentTarget as SVGCircleElement;
      d3.select<SVGCircleElement, Bubble>(target)
        .attr('stroke', 'none')
        .attr('stroke-width', 0);
    }
    hideTooltip();
  });
  ```

## Important Notes
1. All bubble sizing and appearance should be configuration-driven, not hardcoded
2. All input data should come from `data/ds.json`
3. Bubble sizes should be scaled based on the `itemSize_absolute` values from the data
4. Theme and view type should be determined from context/configuration, not hardcoded on bubble objects
