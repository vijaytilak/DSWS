export interface TableDataItem {
  column1: string;
  column2: string;
  abs: number;
  rel: number;
  index: number;
}

export interface OriginalTableDataItem { // As per PRD for ItemID
    item: string;
    index: string | number;
    abs: string;
}

export interface ItemID {
    itemID: number;
    itemLabel: string;
    itemSize_absolute: number;
    itemSize_relative: number;
    tabledata: OriginalTableDataItem[];
}

interface ArrowDataBase {
  abs: number; // For thickness
}

export interface ChurnSwitchingOutArrowData extends ArrowDataBase {
  switch_perc: number;
  spend_pect: number; // For 'out'
  switch_index: number;
  spend_index: number; // For 'out'
}

export interface ChurnSwitchingInArrowData extends ArrowDataBase {
  switch_perc: number;
  save_pect: number; // For 'in'
  switch_index: number;
  save_index: number; // For 'in'
}

export interface NetArrowData extends ArrowDataBase {
  perc: number;
  index: number;
}

export interface BothArrowData extends ArrowDataBase {
  out_perc: number;
  in_perc: number;
  out_index: number;
  in_index: number;
}

export interface SpendingArrowData extends ArrowDataBase {
  perc: number;
  index: number;
}

export interface FlowObject<TArrowData extends ArrowDataBase> {
  from: number;
  to: number;
  arrow_data: TArrowData;
  table_data: TableDataItem[]; // This uses the new TableDataItem
}

export interface ChurnSwitchingCategory {
  out: FlowObject<ChurnSwitchingOutArrowData>[];
  in: FlowObject<ChurnSwitchingInArrowData>[];
  net: FlowObject<NetArrowData>[];
  both: FlowObject<BothArrowData>[];
}

export interface SpendingCategory {
  Lower: FlowObject<SpendingArrowData>[];
  Higher: FlowObject<SpendingArrowData>[];
}

export interface MarketViewActual {
    Churn: ChurnSwitchingCategory;
    Switching: ChurnSwitchingCategory;
}

export interface BrandsView {
  Churn: ChurnSwitchingCategory;
  Switching: ChurnSwitchingCategory;
  Spending: SpendingCategory;
}

export interface ViewsArrayMember {
  Market: MarketViewActual;
  Brands: BrandsView;
}

export interface NewFlowData {
  itemIDs: ItemID[];
  views: ViewsArrayMember[];
}

// Existing interfaces to keep
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
  originalArrowData?: ArrowDataBase | ChurnSwitchingOutArrowData | ChurnSwitchingInArrowData | NetArrowData | BothArrowData | SpendingArrowData;
}