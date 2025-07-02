import type { FlowData, Flow } from '../types';
import type { ViewConfiguration, MetricType, FlowType } from '../config/ViewConfigurations';
import { DataProcessor, FilterOptions, ProcessedFlowData } from '../core/DataProcessor';
import { FlowProcessor } from './FlowProcessor';
import { getViewConfiguration } from '../config/ViewConfigurations';

/**
 * Integration processor that bridges between the legacy flow processing
 * and the new modular pipeline architecture
 * 
 * This class provides a clean interface for the transition period
 * and ensures backward compatibility while using the new pipeline
 */
export class FlowIntegrationProcessor {
  private flowProcessor: FlowProcessor;
  
  constructor() {
    this.flowProcessor = new FlowProcessor();
  }
  
  /**
   * Process flow data using the new pipeline architecture
   * This method replaces the legacy prepareFlowData function
   */
  async processFlowData(
    data: FlowData,
    isMarketView: boolean,
    flowType: string,
    flowOption: string,
    focusBubbleId: number | null = null,
    threshold: number = 0,
    showCentreFlows: boolean = false
  ): Promise<Flow[]> {
    // 1. Get the appropriate view configuration
    const viewId = isMarketView ? 'markets' : 'brands';
    const viewConfig = getViewConfiguration(viewId);
    
    // 2. Create filter options
    const filterOptions: FilterOptions = {
      flowType: flowType as FlowType,
      metric: flowOption as MetricType,
      threshold,
      focusBubbleId,
      centerFlow: showCentreFlows
    };
    
    // 3. Create and use the data processor
    const processor = new DataProcessor(viewConfig);
    const result = await processor.process(data, filterOptions);
    
    return result.flows;
  }
  
  /**
   * Synchronous version of processFlowData
   * This method is used by the DataAdapter to avoid Promise return type
   */
  processFlowDataSync(
    data: FlowData,
    isMarketView: boolean,
    flowType: string,
    flowOption: string,
    focusBubbleId: number | null = null,
    threshold: number = 0,
    showCentreFlows: boolean = false
  ): Flow[] {
    // 1. Get the appropriate view configuration
    const viewId = isMarketView ? 'markets' : 'brands';
    const viewConfig = getViewConfiguration(viewId);
    
    // 2. Create filter options
    const filterOptions: FilterOptions = {
      flowType: flowType as FlowType,
      metric: flowOption as MetricType,
      threshold,
      focusBubbleId,
      centerFlow: showCentreFlows
    };
    
    // 3. Create and use the data processor
    const processor = new DataProcessor(viewConfig);
    const result = processor.processSync(data, filterOptions);
    
    return result.flows;
  }
  
  /**
   * Get flow value for a specific flow type
   * Utility method to replace repeated switch statements in the legacy code
   */
  getFlowValue(flow: Flow, flowType: string): number {
    switch (flowType) {
      case 'net':
        return flow.absolute_netFlow;
      case 'in':
        return flow.absolute_inFlow;
      case 'out':
        return flow.absolute_outFlow;
      case 'both':
        return Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      default:
        return flow.absolute_netFlow;
    }
  }
  
  /**
   * Calculate flow percentage relative to maximum value
   * Utility method to replace threshold filtering in legacy code
   */
  calculateFlowPercentage(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }
  
  /**
   * Apply threshold filtering to flows
   */
  applyThresholdFilter(flows: Flow[], flowType: string, threshold: number): Flow[] {
    if (threshold <= 0) return flows;
    
    return flows.filter(flow => {
      const value = this.getFlowValue(flow, flowType);
      
      const maxValue = Math.max(...flows.map(f => this.getFlowValue(f, flowType)));
      
      return this.calculateFlowPercentage(value, maxValue) >= threshold;
    });
  }
  
  /**
   * Get flow direction based on flow type and values
   */
  getFlowDirection(flow: Flow, flowType: string): 'from-to' | 'to-from' | 'bidirectional' {
    if (flow.isBidirectional) {
      return 'bidirectional';
    }
    
    switch (flowType) {
      case 'in':
        return 'to-from';
      case 'out':
        return 'from-to';
      case 'net':
        return flow.absolute_netFlowDirection === 'inFlow' ? 'from-to' : 'to-from';
      default:
        return flow.absolute_inFlow >= flow.absolute_outFlow ? 'to-from' : 'from-to';
    }
  }
}
