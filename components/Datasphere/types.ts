export interface TableDataItem {
  item: string;
  index: string | number;
  abs: string;
}

interface FlowDataWithPercentages {
  abs: number;
  out_perc: number;
  in_perc: number;
  out_index: number;
  in_index: number;
}

interface FlowDataWithSinglePercentage {
  abs: number;
  perc: number;
  index: number;
}

interface ChurnFlow {
  in: FlowDataWithPercentages;
  out: FlowDataWithPercentages;
  net: FlowDataWithSinglePercentage;
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    out_index: number;
    in_index: number;
  };
}

interface SwitchingFlow {
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

interface SpendFlow {
  more: FlowDataWithSinglePercentage;
  less: FlowDataWithSinglePercentage;
}

export interface BrandFlow {
  from: number;
  to: number;
  tabledata?: TableDataItem[];
  churn?: ChurnFlow[];
  switching?: SwitchingFlow[];
}

export interface MarketFlow {
  bubbleID: number;  // Bubble ID for the market flow
  churn: ChurnFlow[];     // Array of churn flow data
  switching: SwitchingFlow[]; // Array of switching flow data
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

export interface Flow {
  from: number;
  to: number;
  absolute_inFlow: number;
  absolute_outFlow: number;
  absolute_netFlowDirection: "inFlow" | "outFlow";
  absolute_netFlow: number;
  
  // Core flow values (abs, perc, index) for display
  inFlow_abs?: number;      // Absolute value for thickness calculation
  inFlow_perc?: number;     // Percentage for midpoint label
  inFlow_index?: number;    // Index for marker label
  outFlow_abs?: number;     // Absolute value for thickness calculation
  outFlow_perc?: number;    // Percentage for midpoint label
  outFlow_index?: number;   // Index for marker label
  netFlow_abs?: number;     // Net absolute value
  netFlow_perc?: number;    // Net percentage
  netFlow_index?: number;   // Net index
  
  // Bidirectional flow values (for flows with out_perc and in_perc)
  bidirectional_inPerc?: number;   // Percentage label on incoming segment
  bidirectional_outPerc?: number;  // Percentage label on outgoing segment  
  bidirectional_inIndex?: number;  // Index value on incoming segment
  bidirectional_outIndex?: number; // Index value on outgoing segment
  
  // Spend metric values (more/less instead of in/out)
  moreFlow_abs?: number;    // More absolute value
  moreFlow_perc?: number;   // More percentage
  moreFlow_index?: number;  // More index
  lessFlow_abs?: number;    // Less absolute value
  lessFlow_perc?: number;   // Less percentage
  lessFlow_index?: number;  // Less index
  
  sizePercent?: number;
  percentRank?: number;
  sizePercent_absolute_inFlow?: number;
  sizePercent_absolute_outFlow?: number;
  sizePercent_absolute_netFlow?: number;
  churn?: ChurnFlow[];
  switching?: ChurnFlow[];
  spend?: SpendFlow[];
  displayValue?: number;
  displayDirection?: 'from-to' | 'to-from' | 'bidirectional';
  isBidirectional?: boolean;
  // Additional properties needed by FlowRenderer
  inFlow?: number;
  outFlow?: number;
  netFlow?: number;
}