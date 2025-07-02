import type { Flow } from '../types';
import type { ViewConfiguration, MetricType, FlowType } from '../config/ViewConfigurations';
import { isBidirectionalFlowType } from '../utils/flowTypeUtils';

/**
 * Processes flow data for visualization
 * Handles flow direction, bidirectional flows, and value calculations
 */
export class FlowProcessor {
  /**
   * Process flow data based on flow type and metric
   */
  processFlowValues(
    flow: Flow, 
    flowType: FlowType, 
    metric: MetricType, 
    config: ViewConfiguration
  ): Flow {
    // Create a copy of the flow to avoid mutating the original
    const processedFlow = { ...flow };
    
    // Check if this flow type should be rendered as bidirectional
    const bidirectional = isBidirectionalFlowType(
      flowType, 
      config.id === 'markets' ? 'Markets' : 'Brands', 
      metric
    );
    
    // Set appropriate values based on flow type
    if (flowType === 'net') {
      // For net flows, use the net flow value directly
      processedFlow.displayValue = processedFlow.absolute_netFlow;
      processedFlow.displayDirection = processedFlow.absolute_netFlowDirection === 'inFlow' ? 'to-from' : 'from-to';
    } else if (flowType === 'in') {
      // For in flows, use the in flow value
      processedFlow.displayValue = processedFlow.absolute_inFlow;
      processedFlow.displayDirection = 'to-from';
    } else if (flowType === 'out') {
      // For out flows, use the out flow value
      processedFlow.displayValue = processedFlow.absolute_outFlow;
      processedFlow.displayDirection = 'from-to';
    } else if (flowType === 'both') {
      // For both flows, use the larger of in or out flow
      if (processedFlow.absolute_inFlow >= processedFlow.absolute_outFlow) {
        processedFlow.displayValue = processedFlow.absolute_inFlow;
        processedFlow.displayDirection = 'to-from';
      } else {
        processedFlow.displayValue = processedFlow.absolute_outFlow;
        processedFlow.displayDirection = 'from-to';
      }
    }
    
    // Set bidirectional flag and values
    processedFlow.isBidirectional = bidirectional;
    
    return processedFlow;
  }
  
  /**
   * Determine which flow value to use based on flow type and focus bubble
   * Implements the logic from the memory about flow filtering when a bubble is focused
   */
  getFlowValueForFocusedBubble(
    flow: Flow, 
    flowType: FlowType, 
    focusBubbleId: number
  ): number {
    // When flow type "in" is selected:
    if (flowType === 'in') {
      // If focus bubble is the destination, use outFlow data
      if (flow.to === focusBubbleId) {
        return flow.absolute_outFlow;
      }
      // If focus bubble is the source, use inFlow data
      else if (flow.from === focusBubbleId) {
        return flow.absolute_inFlow;
      }
    }
    // When flow type "out" is selected:
    else if (flowType === 'out') {
      // If focus bubble is the source, use outFlow data
      if (flow.from === focusBubbleId) {
        return flow.absolute_outFlow;
      }
      // If focus bubble is the destination, use inFlow data
      else if (flow.to === focusBubbleId) {
        return flow.absolute_inFlow;
      }
    }
    // When flow types "net" or "both" are selected:
    else if (flowType === 'net') {
      return flow.absolute_netFlow;
    }
    else if (flowType === 'both') {
      return Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
    }
    
    // Default fallback
    return flow.absolute_netFlow;
  }
  
  /**
   * Determine the direction to draw the flow based on flow type and focus bubble
   */
  getFlowDirectionForFocusedBubble(
    flow: Flow, 
    flowType: FlowType, 
    focusBubbleId: number
  ): 'from-to' | 'to-from' | 'bidirectional' {
    // For bidirectional flows
    if (flow.isBidirectional) {
      return 'bidirectional';
    }
    
    // For unidirectional "in" flows
    if (flowType === 'in') {
      // Arrows point FROM flow.to TO flow.from (reversed from data)
      return 'to-from';
    }
    
    // For unidirectional "out" flows
    if (flowType === 'out') {
      // Arrows point FROM flow.from TO flow.to (matching data)
      return 'from-to';
    }
    
    // For unidirectional "net" flows
    if (flowType === 'net') {
      // For positive values: arrows point FROM flow.from TO flow.to
      // For negative values: arrows point FROM flow.to TO flow.from
      const isPositive = flow.absolute_netFlowDirection === 'inFlow';
      return isPositive ? 'from-to' : 'to-from';
    }
    
    // Default for "both" and other flow types
    return flow.absolute_inFlow >= flow.absolute_outFlow ? 'to-from' : 'from-to';
  }
  
  /**
   * Calculate the percentage of a flow value relative to the maximum value
   */
  calculateFlowPercentage(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }
}
