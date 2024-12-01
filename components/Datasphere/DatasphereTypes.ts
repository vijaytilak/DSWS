export interface Bubble {
  id: number;
  label: string;
  radius: number;
  x: number;
  y: number;
  angle: number;
  itemSizeAbsolute: number;
  sizeRankPercentage: number;
  color: string;
  focus: boolean;
}

export interface Flow {
  from: number;
  to: number;
  absolute_inFlow: number;
  absolute_outFlow: number;
  absolute_netFlowDirection: string;
  absolute_netFlow: number;
  [key: string]: number | string; // Add this line
}

export interface DatasphereConfig {
  canvasWidth: number;
  canvasHeight: number;
  outerRingVisibility: boolean;
  positionCircleVisibility: boolean;
  maxOuterRingRadius: number;
  minFlowLineThickness: number;
  maxFlowLineThickness: number;
  minMarkerSize: number;
  maxMarkerSize: number;
  parallelOffsetBtwFlowLines: number;
  marginForPositionCircle: number;
  minDistanceBetweenRings: number;
  minDistanceBetweenBubbleAndRing: number;
  minBubbleRadiusPercentage: number;
  labelOffset: number;
  highContrastColors: string[];
}