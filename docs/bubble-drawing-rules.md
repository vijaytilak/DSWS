# DataSphere Bubble Visualization Logic

This document outlines the logic behind bubble visualization in the DataSphere application, including configuration values, rules, limits, and interaction behaviors.

## Bubble Initialization and Configuration

### Core Configuration Values

The bubble visualization uses several key configuration parameters:

- **Minimum Distance Between Rings**: `30px` - Controls minimum spacing between outer rings
- **Minimum Distance Between Bubble and Ring**: `20px` - Specifies padding between a bubble and its outer ring
- **Minimum Bubble Radius Percentage**: `0.2` (20%) - Smallest bubbles are at least 20% of max size
- **Label Offset**: `20px` - Base distance of labels from bubble edges
- **Maximum Outer Ring Radius**: `100px` - Cap for outer ring size
- **Minimum Bubble Radius**: `6px` - Absolute minimum bubble size
- **Minimum Font Size**: `16px` - Smallest allowed text size for labels

### Outer Ring Configuration

- **Show**: `true` by default - Can be toggled
- **Stroke Width**: `1px` - Line thickness
- **Stroke Dasharray**: `"3,3"` - Creates dashed line appearance
- **Opacity**: `0.3` - Subtle transparency for outer rings

## Bubble Drawing Logic Flow

### 1. Data Preparation

1. **Circumference Calculation**:
   - Calculate available circumference based on visualization space
   - Determine how much space is needed for all bubbles including gap spacing

2. **Outer Ring Sizing**:
   - Calculate optimal outer ring size based on:
     - Available circumference space
     - Number of bubbles
     - Minimum distance requirements
     - Within configured constraints (min/max values)

3. **Bubble Radius Determination**:
   - Max bubble radius = outer ring radius - minimum distance between bubble and ring
   - Min bubble radius = max(configured min percentage × max radius, absolute minimum)

4. **Relative Size Calculation**:
   - Convert raw data values to percentile ranks
   - Scale bubble sizes proportionally based on percentile rank
   - Apply min/max constraints for visual consistency

### 2. Layout Calculation

1. **Positioning Logic**:
   - Regular bubbles: Positioned in a circular arrangement around the center
   - Center bubble: Fixed at (centerX, centerY)

2. **Space Optimization**:
   - Calculate minimum required radius to maintain spacing constraints
   - Adjust position circle radius based on available viewport space
   - Ensure bubbles don't overlap by enforcing minimum distance between rings

### 3. Bubble Scaling Rules

- **Size Range**: Bubbles scale between minimum and maximum radius based on their percentile rank
- **Size Formula**: `minRadius + (maxRadius - minRadius) * (percentRank/100)`
- **Radius Constraints**: Regardless of calculated size, bubbles never shrink below `minBubbleRadius`

## Label Positioning Logic

### 1. Text Placement Strategy

- **Radial Positioning**: Labels are positioned radially outward from bubbles
- **Distance Calculation**:
   ```
   labelRadius = adjustedCircleRadius + 
                 min(bubble.radius * 3 + bubble.label.length * (baseTextSize * 0.3), maxLabelOffset)
   ```
- **Center Alignment**: Center bubble label is always centered

### 2. Text Anchor Determination

- **Dynamic Anchor Point**: Determined based on angle relative to center:
  - `start` (left-aligned): For angles between -45° and 45° (right side)
  - `end` (right-aligned): For angles between 135° and -135° (left side) 
  - `middle` (center-aligned): For all other angles (top and bottom)

### 3. Label Formatting

- **Line Breaking**: Long labels are split with newlines:
  - Words longer than 3 letters trigger new lines when preceded by other content
  - Multiline labels are centered vertically around anchor point
  - Line height is calculated as `fontSize * 1.2`

## Styling Logic

### 1. Bubble Styling

- **Color Assignment**: Colors are assigned from a predefined array in configuration
- **Fill Color**: 
  - Regular bubbles: From color array based on bubble ID
  - Center bubble: Dark theme: #1a1a1a, Light theme: #ffffff

- **Stroke (Border)**:
  - Focused bubble: 4px stroke in contrasting color (white in dark mode, black in light mode)
  - Center bubble: 2px stroke in contrasting color
  - Regular bubbles: No stroke by default

- **Opacity**:
  - Center bubble: Visible only in market view (opacity 1), hidden otherwise (opacity 0)
  - Regular bubbles: Always fully opaque (opacity 1)

### 2. Label Styling

- **Font Size**: 
  - Regular bubbles: Maximum of (bubble radius × 0.8) or minimum font size
  - Center bubble: 70% of the minimum font size

- **Color**: 
  - Matches the bubble color for consistent visual relationship
  - Center bubble label is transparent when not in market view

- **Weight**: Bold for all labels

## Interaction Behavior

### 1. Click Events

- **Regular Bubbles**:
  - Trigger focus state when clicked
  - Click the focussed bubble to remove focus
  - Changes visualization to show flows connected to the selected bubble
  - Applies focused styling (4px stroke)

- **Center Bubble**: 
  - No click behavior (cursor set to 'default')
  - Does not trigger focus state

### 2. Hover Events

- **Mouse Over**:
  - Applies highlight styling (2px stroke)
  - Displays tooltip with formatted information about the bubble
  - Includes bubble label and size metrics
  - Only applies to non-focused, regular bubbles

- **Mouse Out**:
  - Removes highlight styling
  - Hides tooltip
  - Returns bubble to default visual state

### 3. Tooltip Display

- **Content**: Shows formatted bubble data (e.g., visitor count)
- **Positioning**: Appears near the cursor position
- **Styling**: 
  - Semi-transparent background with blur effect
  - Themed based on light/dark mode
  - Animates in/out with opacity transitions

## Theme Adaptation

- **Theme Detection**: Observes changes for theme switching
- **Color Updates**: Dynamically updates:
  - Bubble fill colors
  - Stroke colors
  - Label colors
  - Tooltip styles

- **Center Element Handling**: Special logic for center bubble during theme changes
  - Updates center bubble fill and stroke
  - Updates connected flow colors
  - Updates label visibility