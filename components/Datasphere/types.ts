export interface TableDataItem {
  item: string;
  index: string | number;
  abs: string;
}

interface FlowDataWithSinglePercentage {
  abs: number;
  perc: number;
  index: number;
}

interface FlowDataWithBidirectionalPercentages {
  abs: number;
  out_perc: number;
  in_perc: number;
  out_index: number;
  in_index: number;
}

interface BrandChurnFlow {
  in: FlowDataWithBidirectionalPercentages;
  out: FlowDataWithBidirectionalPercentages;
  net: FlowDataWithSinglePercentage;
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    out_index: number;
    in_index: number;
  };
}

interface BrandSwitchingFlow {
  in: FlowDataWithSinglePercentage;
  out: FlowDataWithSinglePercentage;
  net: FlowDataWithSinglePercentage;
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    out_index: number;
    in_index: number;
  };
}

interface MarketChurnFlow {
  in: FlowDataWithSinglePercentage;
  out: FlowDataWithSinglePercentage;
  net: FlowDataWithSinglePercentage;
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    index: number;
  };
}

interface MarketSwitchingFlow {
  in: FlowDataWithSinglePercentage;
  out: FlowDataWithSinglePercentage;
  net: FlowDataWithSinglePercentage;
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    index: number;
  };
}

interface SpendFlow {
  more: FlowDataWithSinglePercentage;
  less: FlowDataWithSinglePercentage;
}

export interface BrandFlow {
  from: number;
  to: number;
  tabledata?: TableDataItem[];
  churn?: BrandChurnFlow[];
  switching?: BrandSwitchingFlow[];
}

export interface MarketFlow {
  bubbleID: number;  // Bubble ID for the market flow
  churn: MarketChurnFlow[];     // Array of churn flow data
  switching: MarketSwitchingFlow[]; // Array of switching flow data
  spend: SpendFlow[];     // Array of spend flow data (Markets only)
  tabledata?: TableDataItem[];
}

export interface FlowData {
  bubbles: Array<{
    bubbleID: number;
    bubbleLabel: string;
    bubbleSize_absolute: number;
    bubbleSize_relative: number;
    tabledata: TableDataItem[];
  }>;
  flow_brands: BrandFlow[];
  flow_markets: MarketFlow[];
}

export interface Bubble {
  id: number;
  label: string;
  radius: number;
  x: number;
  y: number;
  textX: number;
  textY: number;
  angle: number;
  itemSizeAbsolute: number;
  itemSizeRelative?: number; // Relative size of the bubble
  sizeRankPercentage: number;
  color: string;
  focus: boolean;
  isCentre?: boolean; // Whether this is the center bubble
  isSelected?: boolean; // Whether this bubble is currently selected
  fontSize: number;
  outerRingRadius: number;
  totalBubbles: number; // Total number of bubbles including center
  // Additional properties needed by rendering code
  r?: number; // Alias for radius used in d3 simulations
  relatedTo?: number[]; // Related bubble IDs
  percentRank?: number; // Percentage rank for sizing
  // Note: isMarketView and isDarkTheme removed - use ViewManager and ThemeManager services instead
}

// LegacyFlow interface removed - use Flow from FlowFactory instead