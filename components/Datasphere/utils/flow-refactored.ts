import type { FlowData, Flow } from '../types';
import { FlowIntegrationProcessor } from '../processors/FlowIntegrationProcessor';
import { isBidirectionalFlowType } from '../utils/flowTypeUtils';
import ViewManager from '../services/ViewManager';

/**
 * Refactored version of the legacy prepareFlowData function
 * Uses the new pipeline architecture while maintaining the same interface
 * for backward compatibility during the transition period
 * 
 * This function removes all debug logs and uses the new modular approach
 */
export function prepareFlowData(
  data: FlowData,
  flowType: string,
  centreFlow: boolean,
  threshold: number,
  focusBubbleId: number | null,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' = 'churn'
): Flow[] {
  // Get ViewManager instance
  const viewManager = ViewManager.getInstance();
  
  // Set view type based on isMarketView parameter
  // This maintains backward compatibility with existing code
  viewManager.setViewType(isMarketView ? 'markets' : 'brands');
  // Create an instance of the integration processor
  const processor = new FlowIntegrationProcessor();
  
  // For now, we'll use a synchronous approach by directly creating the processor
  // and applying the necessary transformations
  
  // 1. Get the appropriate view configuration
  const viewId = viewManager.getViewType();
  
  // 2. Check if this flow type should be rendered as bidirectional
  const bidirectional = isBidirectionalFlowType(
    flowType, 
    viewManager.isMarketView() ? 'Markets' : 'Brands', 
    flowOption
  );
  
  // 3. Extract the appropriate data source
  const sourceData = data[viewManager.getDataSourceKey()];
  
  // 4. Transform the data into Flow objects
  let flows: Flow[] = [];
  
  // Guard against undefined sourceData
  if (!sourceData) {
    console.warn(`Source data is undefined for ${viewManager.isMarketView() ? 'market' : 'brand'} view`);
    return [];
  }
  
  if (viewManager.isMarketView()) {
    // Process market flows
    flows = sourceData.map((marketFlow: any) => {
      const optionData = marketFlow[flowOption];
      const flowDirection = optionData.net >= 0 ? "inFlow" : "outFlow";
      
      return {
        from: marketFlow.itemID,
        to: data.itemIDs.length, // Center bubble ID
        absolute_inFlow: bidirectional ? optionData.both : optionData.in,
        absolute_outFlow: bidirectional ? (100 - optionData.both) : optionData.out,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(optionData.net),
        isBidirectional: bidirectional,
        bidirectional_inPerc: bidirectional ? optionData.both : undefined,
        bidirectional_outPerc: bidirectional ? (100 - optionData.both) : undefined,
      };
    });
  } else {
    // Process brand flows
    flows = sourceData
      .filter((brandFlow: any) => {
        // Make sure we have data for this flow option
        const optionDataArray = brandFlow[flowOption];
        return optionDataArray && optionDataArray.length > 0;
      })
      .map((brandFlow: any) => {
        const optionDataArray = brandFlow[flowOption];
        const optionData = optionDataArray[0];
        const flowDirection = optionData.net.perc >= 0 ? "inFlow" : "outFlow";
        
        // For bidirectional flows, use the 'both' value directly from the flow option data
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
          // Include the original data arrays
          churn: brandFlow.churn,
          switching: brandFlow.switching,
          // Add bidirectional properties
          isBidirectional: bidirectional,
          bidirectional_inPerc: bidirectional ? inPerc : undefined,
          bidirectional_outPerc: bidirectional ? outPerc : undefined,
          bidirectional_inIndex: bidirectional ? inIndex : undefined,
          bidirectional_outIndex: bidirectional ? outIndex : undefined
        };
      });
  }
  
  // 4. Apply center flow aggregation if needed
  if (centreFlow) {
    flows = prepareCentreFlowData(flows, data.itemIDs.length);
  }
  
  // 5. Apply focus bubble filtering and data selection logic
  if (focusBubbleId !== null) {
    // First filter to only include flows connected to the focus bubble
    flows = flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId);
    
    // Then apply the data selection logic based on flow type and focus bubble relationship
    flows = flows.map(flow => {
      const processedFlow = { ...flow };
      
      if (flowType === 'in') {
        // For "in" flows (showing flows INTO the focused bubble)
        if (flow.to === focusBubbleId) {
          // When focus bubble is destination: Use out data field
          processedFlow.displayValue = flow.absolute_outFlow;
          processedFlow.displayDirection = 'to-from'; // FROM flow.to TO flow.from (reversed)
        } else if (flow.from === focusBubbleId) {
          // When focus bubble is source: Use in data field
          processedFlow.displayValue = flow.absolute_inFlow;
          processedFlow.displayDirection = 'to-from'; // FROM flow.to TO flow.from (reversed)
        }
      } else if (flowType === 'out') {
        // For "out" flows (showing flows OUT OF the focused bubble)
        if (flow.from === focusBubbleId) {
          // When focus bubble is source: Use out data field
          processedFlow.displayValue = flow.absolute_outFlow;
          processedFlow.displayDirection = 'from-to'; // FROM flow.from TO flow.to (matching data)
        } else if (flow.to === focusBubbleId) {
          // When focus bubble is destination: Use in data field
          processedFlow.displayValue = flow.absolute_inFlow;
          processedFlow.displayDirection = 'from-to'; // FROM flow.from TO flow.to (matching data)
        }
      } else if (flowType === 'net') {
        // For "net" flows
        processedFlow.displayValue = flow.absolute_netFlow;
        // For positive values: arrows point FROM flow.from TO flow.to
        // For negative values: arrows point FROM flow.to TO flow.from
        processedFlow.displayDirection = flow.absolute_netFlowDirection === 'inFlow' ? 'from-to' : 'to-from';
      } else if (flowType === 'both') {
        // For "both" flows, use the larger of in or out flow
        if (flow.absolute_inFlow >= flow.absolute_outFlow) {
          processedFlow.displayValue = flow.absolute_inFlow;
          processedFlow.displayDirection = 'to-from';
        } else {
          processedFlow.displayValue = flow.absolute_outFlow;
          processedFlow.displayDirection = 'from-to';
        }
      }
      
      return processedFlow;
    });
  }
  
  // 6. Apply threshold filtering
  if (threshold > 0) {
    flows = processor.applyThresholdFilter(flows, flowType, threshold);
  }
  
  return flows;
}

/**
 * Refactored version of the legacy prepareCentreFlowData function
 * Implements center flow aggregation logic without debug logs
 * 
 * Kept for backward compatibility during the transition period
 */
export function prepareCentreFlowData(flows: Flow[], noOfBubbles: number): Flow[] {
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
      const flowDirection = flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow";
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
