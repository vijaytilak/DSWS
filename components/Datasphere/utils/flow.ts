import type { FlowData, Flow } from '../types';

interface MarketFlow {
  itemID: number;
  churn: { in: number; out: number; net: number; both: number; };
  switching: { in: number; out: number; net: number; both: number; };
  affinity: { in: number; out: number; net: number; both: number; };
}

interface BrandFlow {
  from: number;
  to: number;
  outFlow: number;
  inFlow: number;
  interaction: number;
  churn: { in: number; out: number; net: number; both: number; };
  switching: { in: number; out: number; net: number; both: number; };
  affinity: { in: number; out: number; net: number; both: number; };
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
  if (isMarketView) {
    // For Markets view, create centre flows for each market
    const marketFlows = data.flows_markets.map((flow) => {
      const marketFlow = flow as MarketFlow;
      const optionData = marketFlow[flowOption];
      const flowDirection: FlowDirection = optionData.net >= 0 ? "inFlow" : "outFlow";
      
      return {
        from: marketFlow.itemID,
        to: data.itemIDs.length, // Center bubble ID
        absolute_inFlow: flowType === 'both' ? optionData.both : optionData.in,
        absolute_outFlow: flowType === 'both' ? (100 - optionData.both) : optionData.out,
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
                   flowType === 'both' ? flow.absolute_inFlow :
                   Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      
      const maxValue = Math.max(...marketFlows.map(f => 
        flowType === 'netFlow' ? f.absolute_netFlow :
        flowType === 'inFlow only' ? f.absolute_inFlow :
        flowType === 'outFlow only' ? f.absolute_outFlow :
        flowType === 'both' ? f.absolute_inFlow :
        Math.max(f.absolute_inFlow, f.absolute_outFlow)
      ));

      return (value / maxValue) * 100 >= threshold;
    });
  } else {
    // For Brands view, use the original brand flows
    const brandFlows = data.flows_brands.map((flow) => {
      const brandFlow = flow as BrandFlow;
      const optionData = brandFlow[flowOption];
      const flowDirection: FlowDirection = optionData.net >= 0 ? "inFlow" : "outFlow";
      
      // For 'both' type, we use the 'both' value directly from the flow option data
      const bothValue = optionData.both;
      const inValue = optionData.in;
      const outValue = optionData.out;

      console.log('DEBUG - Flow Preparation:', {
        from: brandFlow.from,
        to: brandFlow.to,
        flowType,
        bothValue,
        inValue,
        outValue,
        absolute_inFlow: (flowType === 'both' || flowType === 'bi-directional') ? bothValue : inValue,
        absolute_outFlow: (flowType === 'both' || flowType === 'bi-directional') ? outValue : outValue
      });

      return {
        from: brandFlow.from,
        to: brandFlow.to,
        absolute_inFlow: (flowType === 'both' || flowType === 'bi-directional') ? bothValue : inValue,
        absolute_outFlow: (flowType === 'both' || flowType === 'bi-directional') ? outValue : outValue,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(optionData.net),
      };
    });

    // Handle centre flow aggregation for brands
    let flows = centreFlow ? prepareCentreFlowData(brandFlows, data.itemIDs.length) : brandFlows;

    // Filter flows if there's a focus bubble
    if (focusBubbleId !== null) {
      flows = flows.filter(flow => 
        flow.from === focusBubbleId || flow.to === focusBubbleId
      );
    }

    // Apply threshold filtering
    return flows.filter(flow => {
      const value = flowType === 'netFlow' ? flow.absolute_netFlow :
                   flowType === 'inFlow only' ? flow.absolute_inFlow :
                   flowType === 'outFlow only' ? flow.absolute_outFlow :
                   flowType === 'both' ? flow.absolute_inFlow :
                   Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      
      const maxValue = Math.max(...flows.map(f => 
        flowType === 'netFlow' ? f.absolute_netFlow :
        flowType === 'inFlow only' ? f.absolute_inFlow :
        flowType === 'outFlow only' ? f.absolute_outFlow :
        flowType === 'both' ? f.absolute_inFlow :
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
