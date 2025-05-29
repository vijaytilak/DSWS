import type {
  NewFlowData,
  Flow,
  ViewsArrayMember,
  MarketViewActual,
  BrandsView,
  FlowObject,
  ArrowDataBase,
  ChurnSwitchingOutArrowData,
  ChurnSwitchingInArrowData,
  NetArrowData,
  BothArrowData,
  SpendingArrowData,
  ChurnSwitchingCategory,
  SpendingCategory
} from '../types';

type FlowDirection = "inFlow" | "outFlow";

// Helper to map flowOption to actual keys in the data
const getCategoryKey = (flowOption: string): keyof MarketViewActual | keyof BrandsView | null => {
  switch (flowOption.toLowerCase()) {
    case 'churn': return 'Churn';
    case 'switching': return 'Switching';
    case 'spending': return 'Spending'; // For BrandsView
    case 'affinity': return null; // Affinity was in old structure, handle if needed or remove
    default: return null;
  }
};

export function prepareFlowData(
  data: NewFlowData,
  flowType: string, // e.g., 'netFlow', 'inFlow only', 'outFlow only', 'bi-directional', 'both', 'Lower', 'Higher'
  centreFlow: boolean,
  threshold: number,
  focusBubbleId: number | null,
  isMarketView: boolean = false,
  flowOption: string = 'churn' // 'churn', 'switching', 'affinity' (now 'spending')
): Flow[] {
  if (!data || !data.views || data.views.length === 0) {
    return [];
  }

  const viewData: ViewsArrayMember = data.views[0];
  const currentViewContent: MarketViewActual | BrandsView = isMarketView ? viewData.Market : viewData.Brands;
  const categoryKey = getCategoryKey(flowOption);

  if (!categoryKey) {
    console.warn(`Invalid flowOption: ${flowOption}`);
    return [];
  }

  // Check if categoryKey is valid for the current view
  if (!(categoryKey in currentViewContent)) {
      console.warn(`Category ${categoryKey} not found in ${isMarketView ? 'Market' : 'Brands'} view.`);
      return [];
  }
  
  const categoryData = currentViewContent[categoryKey as keyof typeof currentViewContent];

  let rawFlowObjects: FlowObject<ArrowDataBase>[] = [];

  if (categoryKey === 'Spending') { // Specific to BrandsView
    const spendingCat = categoryData as SpendingCategory;
    if (flowType.toLowerCase() === 'lower') {
      rawFlowObjects.push(...spendingCat.Lower);
    } else if (flowType.toLowerCase() === 'higher') {
      rawFlowObjects.push(...spendingCat.Higher);
    } else { // Default or 'all' for spending could be both
      rawFlowObjects.push(...spendingCat.Lower, ...spendingCat.Higher);
    }
  } else { // Churn or Switching
    const csCat = categoryData as ChurnSwitchingCategory;
    switch (flowType.toLowerCase()) {
      case 'inflow only': // Matches "inFlow only"
      case 'in': // Short alias
        rawFlowObjects.push(...csCat.in);
        break;
      case 'outflow only': // Matches "outFlow only"
      case 'out': // Short alias
        rawFlowObjects.push(...csCat.out);
        break;
      case 'netflow': // Matches "netFlow"
      case 'net':
        rawFlowObjects.push(...csCat.net);
        break;
      case 'bi-directional': // Matches "bi-directional"
      case 'both':
        rawFlowObjects.push(...csCat.both);
        break;
      default: // Default to all flows for the category if flowType is unknown or 'all'
        rawFlowObjects.push(...csCat.in, ...csCat.out, ...csCat.net, ...csCat.both);
        break;
    }
  }
  
  let processedFlows: Flow[] = rawFlowObjects.map(rawFlow => {
    const magnitude = rawFlow.arrow_data.abs;
    let absolute_inFlow = 0;
    let absolute_outFlow = 0;
    let absolute_netFlowDirection: FlowDirection = "inFlow"; // Default

    // Determine flow direction and in/out values based on the original array type or flowType
    // This logic needs to be robust based on how flowType maps to rawFlow's origin
    
    // A more robust way to check origin if rawFlowObjects were annotated during collection
    // For now, make broad assumptions based on flowType or arrow_data structure
    if (flowType.toLowerCase() === 'inflow only' || (rawFlow.arrow_data as ChurnSwitchingInArrowData).save_pect !== undefined) {
        absolute_inFlow = magnitude;
        absolute_outFlow = 0;
        absolute_netFlowDirection = "inFlow";
    } else if (flowType.toLowerCase() === 'outflow only' || (rawFlow.arrow_data as ChurnSwitchingOutArrowData).spend_pect !== undefined) {
        absolute_outFlow = magnitude;
        absolute_inFlow = 0;
        absolute_netFlowDirection = "outFlow";
    } else if ((rawFlow.arrow_data as BothArrowData).in_perc !== undefined && (rawFlow.arrow_data as BothArrowData).out_perc !== undefined) {
        const bothData = rawFlow.arrow_data as BothArrowData;
        absolute_inFlow = magnitude * (bothData.in_perc / (bothData.in_perc + bothData.out_perc)); // Normalize if percentages are not summing to 1
        absolute_outFlow = magnitude * (bothData.out_perc / (bothData.in_perc + bothData.out_perc));
        absolute_netFlowDirection = absolute_inFlow >= absolute_outFlow ? "inFlow" : "outFlow";
    } else { // For NetArrowData, SpendingArrowData, or default
        absolute_inFlow = magnitude; // Default assumption
        absolute_outFlow = 0;
        absolute_netFlowDirection = "inFlow";
    }
    
    return {
      from: rawFlow.from,
      to: rawFlow.to,
      absolute_inFlow,
      absolute_outFlow,
      absolute_netFlowDirection,
      absolute_netFlow: magnitude, 
      originalArrowData: rawFlow.arrow_data, 
    };
  });

  if (centreFlow) {
    processedFlows = prepareCentreFlowData(processedFlows, data.itemIDs.length, isMarketView);
  }

  if (focusBubbleId !== null) {
    processedFlows = processedFlows.filter(flow =>
      flow.from === focusBubbleId || flow.to === focusBubbleId
    );
  }
  
  // Apply threshold filtering based on the primary magnitude (absolute_netFlow)
  const maxValue = Math.max(...processedFlows.map(f => f.absolute_netFlow), 0);
  if (maxValue === 0) return []; // Avoid division by zero if all flows are zero

  return processedFlows.filter(flow => {
    const value = flow.absolute_netFlow; // Use the primary magnitude for thresholding
    return (value / maxValue) * 100 >= threshold;
  });
}


function prepareCentreFlowData(flows: Flow[], noOfBubbles: number, isMarketView: boolean): Flow[] {
  // For MarketView and centreFlow, all flows are already to/from the conceptual center.
  // The 'to' field might need adjustment if it's not already the center bubble ID.
  // Or, if MarketView flows are between markets, then this aggregation is needed.
  // Based on the new structure, Market flows are like Brand flows (between itemIDs).
  
  const centreFlowMap = new Map<number, { totalInMagnitude: number; totalOutMagnitude: number }>();

  flows.forEach(flow => {
    // Ensure entries exist for both 'from' and 'to' nodes
    if (!centreFlowMap.has(flow.from)) {
      centreFlowMap.set(flow.from, { totalInMagnitude: 0, totalOutMagnitude: 0 });
    }
    // No need to initialize for flow.to if it's the center bubble already
    // but if flows can be between any two bubbles, then flow.to also needs initialization.

    const fromNodeAgg = centreFlowMap.get(flow.from)!;

    // If original flow was an inflow TO flow.from
    if (flow.absolute_netFlowDirection === 'inFlow' && flow.to === flow.from) { //This condition is tricky
         // This logic is tricky, depends on how original in/out was set for the flow
         // For now, let's assume absolute_netFlow is the value moving.
         // If flow.to is the current node (flow.from), then it's an IN flow for this node.
         // This part needs careful review of how absolute_inFlow/outFlow were set in the previous step.
    }


    // Simplified: aggregate based on the primary magnitude (absolute_netFlow)
    // If flow.from is the current bubble, its magnitude is outgoing towards center.
    // If flow.to is the current bubble, its magnitude is incoming from center.
    // This assumes flows are between bubbles, not already to/from center.

    fromNodeAgg.totalOutMagnitude += flow.absolute_netFlow; // All flows from this node go towards center
    
    // If we are creating flows TO the center bubble for each node:
    // We need to sum up all magnitudes associated with a node.
    // If a flow is A -> B, in centreFlow view, A -> Center and B -> Center.
    // A -> Center: magnitude of A's outflow. B -> Center: magnitude of B's inflow.
    // This requires knowing the original directionality if not already encoded in absolute_inFlow/outFlow.
  });
  
  // The logic from the original prepareCentreFlowData was:
  // fromFlow.totalOutFlow += flow.absolute_outFlow;
  // fromFlow.totalInFlow += flow.absolute_inFlow;
  // toFlow.totalOutFlow += flow.absolute_inFlow; // Note: in becomes out for the other side
  // toFlow.totalInFlow += flow.absolute_outFlow; // Note: out becomes in for the other side

  // New approach: For each bubble, sum all its 'abs' values.
  // This is not quite right. We need to sum net flows for each bubble.

  const bubbleNetFlows = new Map<number, number>(); // bubbleId -> netMagnitude (positive for net in, negative for net out)

  flows.forEach(flow => {
      // For flow A -> B with magnitude M
      // A loses M, B gains M
      bubbleNetFlows.set(flow.from, (bubbleNetFlows.get(flow.from) || 0) - flow.absolute_netFlow);
      bubbleNetFlows.set(flow.to, (bubbleNetFlows.get(flow.to) || 0) + flow.absolute_netFlow);
  });


  return Array.from(bubbleNetFlows.entries())
    .filter(([id]) => id !== noOfBubbles) // Exclude the center node itself if it was part of aggregation
    .map(([id, netMagnitude]) => {
      const isNetInflow = netMagnitude >=0;
      const absMagnitude = Math.abs(netMagnitude);
      return {
        from: isNetInflow ? noOfBubbles : id, // from center if net inflow to bubble
        to: isNetInflow ? id : noOfBubbles,   // to center if net outflow from bubble
        absolute_inFlow: isNetInflow ? absMagnitude : 0,
        absolute_outFlow: !isNetInflow ? absMagnitude : 0,
        absolute_netFlowDirection: isNetInflow ? "inFlow" : "outFlow",
        absolute_netFlow: absMagnitude,
        // For aggregated flows, originalArrowData might be less relevant or could be an array of original data.
        // For now, we'll leave it undefined for these aggregated flows, as the primary data is in the direct flow properties.
        // If a specific originalArrowData is needed, logic to select/aggregate it would be required.
      };
    });
}
