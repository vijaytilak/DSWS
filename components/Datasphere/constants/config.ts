export const CONFIG = {
  flow: {
    minLineThickness: 4,
    maxLineThickness: 8,
    parallelOffset: 5
  },
  bubble: {
    minDistanceBetweenRings: 30,
    minDistanceBetweenBubbleAndRing: 20,
    minBubbleRadiusPercentage: 0.2,
    labelOffset: 20,
    maxOuterRingRadius: 100,
    minBubbleRadius: 6,
    minFontSize: 16,
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