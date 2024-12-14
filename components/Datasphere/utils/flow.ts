import type { FlowData, Flow } from '../types';

export function prepareFlowData(
  data: FlowData,
  flowType: string,
  centreFlow: boolean,
  threshold: number,
  focusBubbleId: number | null
): Flow[] {
  let flows: Flow[] = data.flows_absolute.map(flow => {
    return {
      from: flow.from,
      to: flow.to,
      absolute_inFlow: flow.inFlow,
      absolute_outFlow: flow.outFlow,
      absolute_netFlowDirection: flow.interaction >= 0 ? "inFlow" : "outFlow",
      absolute_netFlow: Math.abs(flow.interaction),
    };
  });

  // Handle centre flow aggregation
  if (centreFlow) {
    const noOfBubbles = data.itemIDs.length;
    flows = prepareCentreFlowData(flows, noOfBubbles);
  }

  let filteredFlows = flows;
  if (focusBubbleId !== null) {
    filteredFlows = flows.filter(flow => 
      flow.from === focusBubbleId || flow.to === focusBubbleId
    );
  }

  return filteredFlows.filter(flow => {
    const value = flowType === 'netFlow' ? flow.absolute_netFlow :
                 flowType === 'inFlow only' ? flow.absolute_inFlow :
                 flowType === 'outFlow only' ? flow.absolute_outFlow :
                 Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
    
    const maxValue = Math.max(...flows.map(f => 
      flowType === 'netFlow' ? f.absolute_netFlow :
      flowType === 'inFlow only' ? f.absolute_inFlow :
      flowType === 'outFlow only' ? f.absolute_outFlow :
      Math.max(f.absolute_inFlow, f.absolute_outFlow)
    ));

    return (value / maxValue) * 100 >= threshold;
  });
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
    .map(([id, flow]) => ({
      from: id,
      to: noOfBubbles,
      absolute_inFlow: flow.totalInFlow,
      absolute_outFlow: flow.totalOutFlow,
      absolute_netFlowDirection: flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow",
      absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
    }));
}
