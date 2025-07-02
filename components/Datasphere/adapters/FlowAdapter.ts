import type { FlowData, Flow } from '../types';
import type { ViewId, FlowType, MetricType } from '../config/ViewConfigurations';
import { getViewConfiguration } from '../config/ViewConfigurations';
import { DataProcessor, FilterOptions } from '../core/DataProcessor';

/**
 * Adapter to bridge between legacy flow data processing and the new pipeline
 * Provides backward compatibility while leveraging the new modular architecture
 */
export class FlowAdapter {
  /**
   * Process flow data using the new pipeline while maintaining the same interface
   * as the legacy prepareFlowData function
   */
  static async prepareFlowData(
    data: FlowData,
    flowType: string,
    centreFlow: boolean,
    threshold: number,
    focusBubbleId: number | null,
    isMarketView: boolean = false,
    flowOption: 'churn' | 'switching' = 'churn'
  ): Promise<Flow[]> {
    // Convert legacy parameters to new configuration types
    const viewId: ViewId = isMarketView ? 'markets' : 'brands';
    const metricType: MetricType = flowOption as MetricType;
    const flowTypeId = flowType as FlowType;
    
    // Get the appropriate view configuration
    const viewConfig = getViewConfiguration(viewId);
    
    // Create filter options for the data processor
    const filterOptions: FilterOptions = {
      metric: metricType,
      threshold,
      focusBubbleId,
      centerFlow: centreFlow
    };
    
    // Create and use the data processor
    const processor = new DataProcessor(viewConfig);
    
    try {
      // Use await to properly handle the Promise
      const result = await processor.process(data, filterOptions);
      return result.flows;
    } catch (error) {
      console.error('Error processing flow data:', error);
      return [];
    }
  }
  
  /**
   * Legacy compatibility method for center flow preparation
   * Delegates to the DataProcessor's aggregation functionality
   */
  static prepareCentreFlowData(flows: Flow[], noOfBubbles: number): Flow[] {
    // This is now handled internally by the DataProcessor
    // This method is kept for backward compatibility
    const processor = new DataProcessor({
      id: 'legacy',
      name: 'Legacy View',
      dataSource: 'flows_brands',
      supportsCenterFlow: true,
      defaultFlowType: 'net',
      supportedFlowTypes: ['in', 'out', 'net', 'both'],
      defaultMetric: 'churn',
      supportedMetrics: ['churn', 'switching'],
      flowRenderingRules: []
    });
    
    return processor.aggregateFlowsAroundCenter(flows, noOfBubbles);
  }
}
