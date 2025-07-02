export const CONFIG = {
  flow: {
    minLineThickness: 4,
    maxLineThickness: 8,
    parallelOffset: 5
  },
  bubble: {
    // Ratio-based constants for adaptive sizing (max 11 bubbles)
    CANVAS_UTILIZATION_RATIO: 1.1,      // Use 85% of available canvas space
    MIN_BUBBLE_SPACING_RATIO: 0.08,      // Minimum space between bubbles (8% of positioning radius)
    MIN_BUBBLE_SIZE_RATIO: 0.04,         // Minimum bubble size (4% of positioning radius)
    MAX_BUBBLE_SIZE_RATIO: 0.15,         // Maximum bubble size (12% of positioning radius)
    LABEL_OFFSET_RATIO: 0.15,            // Label distance from bubble center (35% of positioning radius)
    OUTER_RING_PADDING_RATIO: 0.05,      // Padding between bubble and outer ring (2% of positioning radius)
    CENTER_BUBBLE_SIZE_RATIO: 0.08,      // Center bubble size (8% of positioning radius)
    
    // Font configuration
    BUBBLE_FONT_SIZE: 16,           // Font size for bubble labels
    CENTER_BUBBLE_FONT_SIZE: 11.2,  // Font size for center bubble label
    FONT_WEIGHT: 'bold',            // Font weight for all labels
    minFontSize: 12,                // Fallback minimum font size
    
    outerRing: {
      show: true,
      strokeWidth: 2,
      strokeDasharray: "5,3",
      opacity: 0.6
    }
  },
  visualization: {
    minWidth: 320,
    minHeight: 480,
    controlsHeight: 64,
    headerHeight: 64 // Height of the dashboard header
  },
  colors: [
    "#FF5733", "#03a9f4", "#5733FF", "#FF33A6", "#33FF00",
    "#FF0033", "#FFE701", "#33C866", "#d289ff", "#009688",
    "#ff98a1", "#FF3366", "#3382FF", "#A633FF", "#FF33F0",
    "#9DFF33", "#FF4033", "#335DFF", "#E733FF", "#FF338C"
  ]
};