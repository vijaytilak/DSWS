export const CONFIG = {
  flow: {
    minLineThickness: 4,
    maxLineThickness: 8,
    parallelOffset: 10,
    labelOffset: 15,
    unfocusedOpacity: 0.2
  },
  bubble: {
    minDistanceBetweenRings: 100,
    minDistanceBetweenBubbleAndRing: 20,
    minBubbleRadiusPercentage: 0.2,
    labelOffset: 5,
    labelLineHeightFactor: 1.2,
    maxOuterRingRadius: 350,
    minBubbleRadius: 20,
    minFontSize: 8,
    minFontSizeFactor: 0.7,
    outerRing: {
      show: true,
      strokeWidth: 2,
      strokeDasharray: "5,5",
      opacity: 0.6
    }
  },
  visualization: {
    minWidth: 320,
    minHeight: 480,
    controlsHeight: 64,
    headerHeight: 64 // Height of the dashboard header
  },
  fontSizes: {
    flowLabel: "10px",
    bubbleLabel: "12px"
  },
  colors: {
    palette: [
      "#FF5733", "#03a9f4", "#5733FF", "#FF33A6", "#33FF00",
      "#FF0033", "#FFE701", "#33C866", "#d289ff", "#009688",
      "#ff98a1", "#FF3366", "#3382FF", "#A633FF", "#FF33F0",
      "#9DFF33", "#FF4033", "#335DFF", "#E733FF", "#FF338C"
    ],
    dark: {
      centerFlow: "#FFFFFF",
      centerBubbleFill: "#333333",
      centerBubbleStroke: "#FFFFFF",
      focusedBubbleStroke: "#4285F4",
      hoverBubbleStroke: "#CCCCCC",
      text: "#FFFFFF"
    },
    light: {
      centerFlow: "#000000",
      centerBubbleFill: "#F0F0F0",
      centerBubbleStroke: "#000000",
      focusedBubbleStroke: "#1A73E8",
      hoverBubbleStroke: "#333333",
      text: "#000000"
    }
  }
};