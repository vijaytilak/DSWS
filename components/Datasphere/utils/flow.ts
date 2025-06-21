import type { FlowData, Flow } from '../types';
import { isBidirectionalFlowType } from './flowTypeUtils';

interface MarketFlow {
  itemID: number;
  churn: { in: number; out: number; net: number; both: number; };
  switching: { in: number; out: number; net: number; both: number; };
  affinity: { in: number; out: number; net: number; both: number; };
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

interface BrandFlow {
  from: number;
  to: number;
  outFlow: number;
  inFlow: number;
  interaction: number;
  churn: ChurnFlowData[];
  switching: SwitchingFlowData[];
  affinity: ChurnFlowData[];
}

type FlowDirection = "inFlow" | "outFlow";

export function prepareFlowData(
  data: FlowData,
  flowType: string,
  centreFlow: boolean,
  threshold: number,
  focusBubbleId: number | null,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn'
): Flow[] {
  const bidirectional = isBidirectionalFlowType(flowType);

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
      };
    });

    // Filter flows if there's a focus bubble
    let filteredFlows = marketFlows;
    if (focusBubbleId !== null) {
      filteredFlows = marketFlows.filter(flow => 
        flow.from === focusBubbleId || flow.to === focusBubbleId
      );
    }

    // Apply threshold filtering
    return filteredFlows.filter(flow => {
      const value = flowType === 'netFlow' ? flow.absolute_netFlow :
                   flowType === 'inFlow only' ? flow.absolute_inFlow :
                   flowType === 'outFlow only' ? flow.absolute_outFlow :
                   bidirectional ? flow.absolute_inFlow :
                   Math.max(flow.absolute_inFlow, flow.absolute_outFlow);

      const maxValue = Math.max(...marketFlows.map(f =>
        flowType === 'netFlow' ? f.absolute_netFlow :
        flowType === 'inFlow only' ? f.absolute_inFlow :
        flowType === 'outFlow only' ? f.absolute_outFlow :
        bidirectional ? f.absolute_inFlow :
        Math.max(f.absolute_inFlow, f.absolute_outFlow)
      ));

      return (value / maxValue) * 100 >= threshold;
    });
  } else {
    // For Brands view, use the original brand flows
    const brandFlowsWithNulls = data.flows_brands.map((flow) => {
      const brandFlow = flow as BrandFlow;
      // Since churn, switching, and affinity are arrays, we need to access the first element
      const optionDataArray = brandFlow[flowOption];
      
      // Make sure we have data for this flow option
      if (!optionDataArray || optionDataArray.length === 0) {
        console.error(`No ${flowOption} data found for flow from ${brandFlow.from} to ${brandFlow.to}`);
        return null; // Skip this flow
      }
      
      const optionData = optionDataArray[0];
      const flowDirection: FlowDirection = optionData.net.perc >= 0 ? "inFlow" : "outFlow";
      
      // For 'both' type, we use the 'both' value directly from the flow option data
      const bothValue = optionData.both.abs;
      const inValue = optionData.in.abs;
      const outValue = optionData.out.abs;

      console.log('DEBUG - Flow Preparation:', {
        from: brandFlow.from,
        to: brandFlow.to,
        flowType,
        bothValue,
        inValue,
        outValue,
        absolute_inFlow: bidirectional ? bothValue : inValue,
        absolute_outFlow: bidirectional ? (100 - bothValue) : outValue
      });

      return {
        from: brandFlow.from,
        to: brandFlow.to,
        absolute_inFlow: bidirectional ? bothValue : inValue,
        absolute_outFlow: bidirectional ? (100 - bothValue) : outValue,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(optionData.net.abs),
        // Include the original data arrays for churn, switching, and affinity
        churn: brandFlow.churn,
        switching: brandFlow.switching,
        affinity: brandFlow.affinity
      };
    });
    
    // Filter out null values and cast to Flow type
    const brandFlows = brandFlowsWithNulls.filter((flow): flow is NonNullable<typeof flow> => flow !== null) as unknown as Flow[];

    // Handle centre flow aggregation for brands
    let flows = centreFlow ? prepareCentreFlowData(brandFlows, data.itemIDs.length) : brandFlows;

    // Filter flows if there's a focus bubble
    if (focusBubbleId !== null) {
      flows = flows.filter((flow) => 
        flow.from === focusBubbleId || flow.to === focusBubbleId
      );
    }

    // Apply threshold filtering
    return flows.filter((flow: Flow) => {
      const value = flowType === 'netFlow' ? flow.absolute_netFlow :
                   flowType === 'inFlow only' ? flow.absolute_inFlow :
                   flowType === 'outFlow only' ? flow.absolute_outFlow :
                   bidirectional ? flow.absolute_inFlow :
                   Math.max(flow.absolute_inFlow, flow.absolute_outFlow);

      const maxValue = Math.max(...flows.map((f: Flow) =>
        flowType === 'netFlow' ? f.absolute_netFlow :
        flowType === 'inFlow only' ? f.absolute_inFlow :
        flowType === 'outFlow only' ? f.absolute_outFlow :
        bidirectional ? f.absolute_inFlow :
        Math.max(f.absolute_inFlow, f.absolute_outFlow)
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
