import type { FlowData, Flow, BrandFlow as ImportedBrandFlow } from '../types';
import { isBidirectionalFlowType } from './flowTypeUtils';

interface MarketFlow {
  itemID: number;
  churn: { in: number; out: number; net: number; both: number; };
  switching: { in: number; out: number; net: number; both: number; };
}

interface ChurnFlowData {
  in: {
    abs: number;
    switch_perc: number;
    other_perc: number;
    switch_index: number;
    other_index: number;
  };
  out: {
    abs: number;
    switch_perc: number;
    other_perc: number;
    switch_index: number;
    other_index: number;
  };
  net: {
    abs: number;
    perc: number;
    index: number;
  };
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    out_index: number;
    in_index: number;
  };
}

interface SwitchingFlowData {
  in: {
    abs: number;
    perc: number;
    index: number;
  };
  out: {
    abs: number;
    perc: number;
    index: number;
  };
  net: {
    abs: number;
    perc: number;
    index: number;
  };
  both: {
    abs: number;
    out_perc: number;
    in_perc: number;
    out_index: number;
    in_index: number;
  };
}

// Local interface for backward compatibility
interface LocalBrandFlow {
  from: number;
  to: number;
  outFlow: number;
  inFlow: number;
  interaction: number;
  churn: ChurnFlowData[];
  switching: SwitchingFlowData[];
}

type FlowDirection = "inFlow" | "outFlow";

export function prepareFlowData(
  data: FlowData,
  flowType: string,
  centreFlow: boolean,
  threshold: number,
  focusBubbleId: number | null,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' = 'churn'
): Flow[] {
  const bidirectional = isBidirectionalFlowType(
    flowType, 
    isMarketView ? 'Markets' : 'Brands', 
    flowOption
  );

  if (isMarketView) {
    // For Markets view, create centre flows for each market
    const marketFlows = data.flows_markets.map((flow) => {
      const marketFlow = flow as MarketFlow;
      const optionData = marketFlow[flowOption];
      const flowDirection: FlowDirection = optionData.net >= 0 ? "inFlow" : "outFlow";

      return {
        from: marketFlow.itemID,
        to: data.itemIDs.length, // Center bubble ID
        absolute_inFlow: bidirectional ? optionData.both : optionData.in,
        absolute_outFlow: bidirectional ? (100 - optionData.both) : optionData.out,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(optionData.net),
        bidirectional_inPerc: bidirectional ? optionData.both : undefined,
        bidirectional_outPerc: bidirectional ? (100 - optionData.both) : undefined,
      };
    });

    // Filter flows if there's a focus bubble
    let filteredFlows = marketFlows;
    if (focusBubbleId !== null) {
      console.log(`DEBUG - Market Focus Filtering: focusBubbleId=${focusBubbleId}, flowType=${flowType}`);
      
      if (flowType === 'in') {
        // For 'in' type, only show flows where focus bubble is the destination
        filteredFlows = marketFlows.filter(flow => flow.to === focusBubbleId);
        console.log(`DEBUG - IN FLOW: Filtered to ${filteredFlows.length} flows where focus bubble is target`);
      } else if (flowType === 'out') {
        // For 'out' type, only show flows where focus bubble is the source
        filteredFlows = marketFlows.filter(flow => flow.from === focusBubbleId);
        console.log(`DEBUG - OUT FLOW: Filtered to ${filteredFlows.length} flows where focus bubble is source`);
      } else {
        // For 'net' and 'both' types, show all flows connected to focus bubble
        filteredFlows = marketFlows.filter(flow => 
          flow.from === focusBubbleId || flow.to === focusBubbleId
        );
        console.log(`DEBUG - NET/BOTH FLOW: Filtered to ${filteredFlows.length} flows connected to focus bubble`);
      }
    }

    // Apply threshold filtering
    return filteredFlows.filter(flow => {
      const value = flowType === 'net' ? flow.absolute_netFlow :
                   flowType === 'in' ? flow.absolute_inFlow :
                   flowType === 'out' ? flow.absolute_outFlow :
                   flowType === 'both' ? Math.max(flow.absolute_inFlow, flow.absolute_outFlow) :
                   flow.absolute_netFlow;

      const maxValue = Math.max(...marketFlows.map(f =>
        flowType === 'net' ? f.absolute_netFlow :
        flowType === 'in' ? f.absolute_inFlow :
        flowType === 'out' ? f.absolute_outFlow :
        flowType === 'both' ? Math.max(f.absolute_inFlow, f.absolute_outFlow) :
        f.absolute_netFlow
      ));

      return (value / maxValue) * 100 >= threshold;
    });
  } else {
    // For Brands view, use the original brand flows
    const brandFlowsWithNulls = data.flows_brands.map((flow) => {
      const brandFlow = flow as unknown as LocalBrandFlow;
      // Since churn and switching are arrays, we need to access the first element
      const optionDataArray = brandFlow[flowOption];
      
      // Make sure we have data for this flow option
      if (!optionDataArray || optionDataArray.length === 0) {
        return null; // Skip this flow
      }
      
      const optionData = optionDataArray[0];
      const flowDirection: FlowDirection = optionData.net.perc >= 0 ? "inFlow" : "outFlow";

      // For 'both' type, we use the 'both' value directly from the flow option data
      const bothValue = optionData.both.abs;
      const inValue = optionData.in.abs;
      const outValue = optionData.out.abs;
      const inPerc = optionData.both.in_perc * 100;
      const outPerc = optionData.both.out_perc * 100;
      const inIndex = optionData.both.in_index;
      const outIndex = optionData.both.out_index;

      return {
        from: brandFlow.from,
        to: brandFlow.to,
        absolute_inFlow: bidirectional ? bothValue : inValue,
        absolute_outFlow: bidirectional ? (100 - bothValue) : outValue,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(optionData.net.abs),
        // Include the original data arrays for churn and switching
        churn: brandFlow.churn,
        switching: brandFlow.switching,
        bidirectional_inPerc: bidirectional ? inPerc : undefined,
        bidirectional_outPerc: bidirectional ? outPerc : undefined,
        bidirectional_inIndex: bidirectional ? inIndex : undefined,
        bidirectional_outIndex: bidirectional ? outIndex : undefined
      };
    });
    
    // Filter out null values and cast to Flow type
    const brandFlows = brandFlowsWithNulls.filter((flow): flow is NonNullable<typeof flow> => flow !== null) as unknown as Flow[];

    // Add debug log for brand flows
    console.log(`DEBUG - Brand Flows before focus filtering: ${brandFlows.length} flows`);

    // Handle centre flow aggregation for brands
    let flows = centreFlow ? prepareCentreFlowData(brandFlows, data.itemIDs.length) : brandFlows;

    // Filter flows for focus bubble if specified
    if (focusBubbleId !== null) {
      console.log(`DEBUG - Brand Focus Filtering: focusBubbleId=${focusBubbleId}, flowType=${flowType}`);
      
      if (flowType === 'in') {
        // For 'in' type, only show flows where focus bubble is the destination
        flows = flows.filter(flow => flow.to === focusBubbleId);
        console.log(`DEBUG - IN FLOW: Filtered to ${flows.length} flows where focus bubble is target`);
      } else if (flowType === 'out') {
        // For 'out' type, only show flows where focus bubble is the source
        flows = flows.filter(flow => flow.from === focusBubbleId);
        console.log(`DEBUG - OUT FLOW: Filtered to ${flows.length} flows where focus bubble is source`);
      } else {
        // For 'net' and 'both' types, show all flows connected to focus bubble
        flows = flows.filter(flow => 
          flow.from === focusBubbleId || flow.to === focusBubbleId
        );
        console.log(`DEBUG - NET/BOTH FLOW: Filtered to ${flows.length} flows connected to focus bubble`);
      }
    }

    // Generic deduplication logic: ALL flow types should show only one flow per bubble pair
    // The difference between flow types is in how they're drawn (bidirectional vs unidirectional), not in data
    const flowPairs = new Map<string, Flow[]>();
    
    // Group flows by bubble pairs (bidirectional)
    flows.forEach(flow => {
      const bubblePair = [flow.from, flow.to].sort().join('-');
      if (!flowPairs.has(bubblePair)) {
        flowPairs.set(bubblePair, []);
      }
      flowPairs.get(bubblePair)!.push(flow);
    });

    // For each pair, keep only the best flow based on flow type
    flows = Array.from(flowPairs.values()).map(flowsInPair => {
      if (flowsInPair.length === 1) {
        // Only one direction exists, keep it
        return flowsInPair[0];
      } else {
        // Multiple flows between same bubbles, choose the best one for this flow type
        return flowsInPair.reduce((bestFlow, currentFlow) => {
          let bestValue: number;
          let currentValue: number;
          
          // Determine comparison values based on flow type
          switch (flowType) {
            case 'net':
              bestValue = bestFlow.absolute_netFlow;
              currentValue = currentFlow.absolute_netFlow;
              break;
            case 'out':
              bestValue = bestFlow.absolute_outFlow;
              currentValue = currentFlow.absolute_outFlow;
              break;
            case 'in':
              bestValue = bestFlow.absolute_inFlow;
              currentValue = currentFlow.absolute_inFlow;
              break;
            case 'both':
              // For 'both' flows, choose based on the larger of inFlow or outFlow
              bestValue = Math.max(bestFlow.absolute_inFlow, bestFlow.absolute_outFlow);
              currentValue = Math.max(currentFlow.absolute_inFlow, currentFlow.absolute_outFlow);
              break;
            default:
              // Fallback to net flow for any other flow types
              bestValue = bestFlow.absolute_netFlow;
              currentValue = currentFlow.absolute_netFlow;
              break;
          }
          
          return currentValue > bestValue ? currentFlow : bestFlow;
        });
      }
    }).filter(Boolean) as Flow[]; // Remove any undefined values

    // Filter flows if there's a focus bubble
    if (focusBubbleId !== null) {
      flows = flows.filter((flow) => 
        flow.from === focusBubbleId || flow.to === focusBubbleId
      );
    }

    // Apply threshold filtering
    return flows.filter((flow: Flow) => {
      const value = flowType === 'net' ? flow.absolute_netFlow :
                   flowType === 'in' ? flow.absolute_inFlow :
                   flowType === 'out' ? flow.absolute_outFlow :
                   flowType === 'both' ? Math.max(flow.absolute_inFlow, flow.absolute_outFlow) :
                   flow.absolute_netFlow;

      const maxValue = Math.max(...flows.map((f: Flow) =>
        flowType === 'net' ? f.absolute_netFlow :
        flowType === 'in' ? f.absolute_inFlow :
        flowType === 'out' ? f.absolute_outFlow :
        flowType === 'both' ? Math.max(f.absolute_inFlow, f.absolute_outFlow) :
        f.absolute_netFlow
      ));

      return (value / maxValue) * 100 >= threshold;
    });
  }
}

function prepareCentreFlowData(flows: Flow[], noOfBubbles: number): Flow[] {
  const centreFlowMap = new Map<number, { totalInFlow: number; totalOutFlow: number }>();

  // Initialize map for all bubbles
  flows.forEach(flow => {
    if (!centreFlowMap.has(flow.from)) {
      centreFlowMap.set(flow.from, { totalInFlow: 0, totalOutFlow: 0 });
    }
    if (!centreFlowMap.has(flow.to)) {
      centreFlowMap.set(flow.to, { totalInFlow: 0, totalOutFlow: 0 });
    }

    // Sum up flows
    const fromFlow = centreFlowMap.get(flow.from)!;
    const toFlow = centreFlowMap.get(flow.to)!;
    
    fromFlow.totalOutFlow += flow.absolute_outFlow;
    fromFlow.totalInFlow += flow.absolute_inFlow;
    toFlow.totalOutFlow += flow.absolute_inFlow;
    toFlow.totalInFlow += flow.absolute_outFlow;
  });

  // Convert aggregated flows to Flow objects through center
  return Array.from(centreFlowMap.entries())
    .filter(([id]) => id !== noOfBubbles) // Exclude the center node itself
    .map(([id, flow]) => {
      const flowDirection: FlowDirection = flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow";
      return {
        from: id,
        to: noOfBubbles,
        absolute_inFlow: flow.totalInFlow,
        absolute_outFlow: flow.totalOutFlow,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
      };
    });
}
