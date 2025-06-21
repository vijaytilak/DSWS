export interface TableDataItem {
  item: string;
  index: string | number;
  abs: string;
}

export interface BrandFlow {
  from: number;
  to: number;
  tabledata?: TableDataItem[];
  churn?: ChurnFlow[];
  switching?: SwitchingFlow[];
}

export interface MarketFlow {
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
  tabledata?: TableDataItem[];
}

export interface FlowData {
  itemIDs: Array<{
    itemID: number;
    itemLabel: string;
    itemSize_absolute: number;
    itemSize_relative: number;
    tabledata: TableDataItem[];
  }>;
  flows_brands: BrandFlow[];
  flows_markets: MarketFlow[];
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
  churn?: ChurnFlow[];
  switching?: ChurnFlow[];
  affinity?: ChurnFlow[];
  bidirectional_inPerc?: number;
  bidirectional_outPerc?: number;
  bidirectional_inIndex?: number;
  bidirectional_outIndex?: number;
}