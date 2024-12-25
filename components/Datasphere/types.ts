export interface FlowData {
  itemIDs: Array<{
    itemID: number;
    itemLabel: string;
    itemSize_absolute: number;
    itemSize_relative: number;
  }>;
  flows_brands: Array<{
    from: number;
    to: number;
    outFlow: number;
    inFlow: number;
    interaction: number;
  }>;
  flows_markets: Array<{
    itemID: number;
    churn: {
      in: number;
      out: number;
      net: number;
    };
    switching: {
      in: number;
      out: number;
      net: number;
    };
    affinity: {
      in: number;
      out: number;
      net: number;
    };
  }>;
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
  sizeRankPercentage: number;
  color: string;
  focus: boolean;
  fontSize: number;
  outerRingRadius: number;
  totalBubbles: number; // Total number of bubbles including center
}

export interface Flow {
  from: number;
  to: number;
  absolute_inFlow: number;
  absolute_outFlow: number;
  absolute_netFlowDirection: "inFlow" | "outFlow";
  absolute_netFlow: number;
  sizePercent?: number;
  percentRank?: number;
  sizePercent_absolute_inFlow?: number;
  sizePercent_absolute_outFlow?: number;
  sizePercent_absolute_netFlow?: number;
}