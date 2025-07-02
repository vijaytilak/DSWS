import { FlowData, BrandFlow } from '@/components/Datasphere/types';

/**
 * Adapts the raw data format to match the FlowData type expected by the DataSphere component
 * @param rawData The raw data from sample.json
 * @returns Data formatted according to the FlowData type
 */
export function adaptFlowData(rawData: any): FlowData {
  // Copy itemIDs and flows_markets as they are
  const adaptedData: FlowData = {
    itemIDs: rawData.itemIDs,
    flows_markets: rawData.flows_markets,
    flows_brands: []
  };

  // Transform flows_brands to match BrandFlow type if available
  adaptedData.flows_brands = rawData.flows_brands ? rawData.flows_brands.map((flow: any): BrandFlow => {
    // Calculate outFlow, inFlow, and interaction from churn and switching data if available
    let outFlow = 0;
    let inFlow = 0;
    let interaction = 0;

    // Extract values from churn data if available
    if (flow.churn && flow.churn.length > 0) {
      const churnData = flow.churn[0];
      if (churnData.out && churnData.out.abs) {
        outFlow = churnData.out.abs;
      }
      if (churnData.in && churnData.in.abs) {
        inFlow = churnData.in.abs;
      }
      // Interaction can be calculated as the sum of inFlow and outFlow
      interaction = inFlow + outFlow;
    }

    // Extract values from switching data if available and outFlow/inFlow not set yet
    if (outFlow === 0 && inFlow === 0 && flow.switching && flow.switching.length > 0) {
      const switchingData = flow.switching[0];
      if (switchingData.out && switchingData.out.abs) {
        outFlow = switchingData.out.abs;
      }
      if (switchingData.in && switchingData.in.abs) {
        inFlow = switchingData.in.abs;
      }
      // Interaction can be calculated as the sum of inFlow and outFlow
      interaction = inFlow + outFlow;
    }

    // Create a BrandFlow object with required properties
    return {
      from: flow.from,
      to: flow.to,
      outFlow,
      inFlow,
      interaction,
      // Copy original data for reference
      churn: flow.churn,
      switching: flow.switching
    } as BrandFlow;
  }) : [];

  return adaptedData;
}
