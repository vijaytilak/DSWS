import { DataAdapter } from '../adapters/DataAdapter';
import { DataProcessor, FilterOptions } from '../core/DataProcessor';
import { getViewConfiguration } from '../config/ViewConfigurations';
import type { FlowType, MetricType } from '../config/ViewConfigurations';
import type { Flow, FlowData } from '../types';

/**
 * Example demonstrating how to use the new data processing pipeline
 * This shows the integration between the adapter, processor, and configuration
 */
export class PipelineExample {
  private dataAdapter: DataAdapter;
  
  constructor() {
    this.dataAdapter = new DataAdapter();
  }
  
  /**
   * Process market flows using the new pipeline
   */
  async processMarketFlows(
    flowType: FlowType = 'net',
    metric: MetricType = 'churn',
    threshold: number = 0,
    focusBubbleId: number | null = null,
    centerFlow: boolean = false
  ): Promise<Flow[]> {
    // 1. Load data using the adapter
    const data = await this.dataAdapter.loadData();
    
    // 2. Get the appropriate view configuration
    const viewConfig = getViewConfiguration('markets');
    
    // 3. Create filter options
    const filterOptions: FilterOptions = {
      flowType,
      metric,
      threshold,
      focusBubbleId,
      centerFlow
    };
    
    // 4. Create and use the data processor
    const processor = new DataProcessor(viewConfig);
    const result = processor.process(data, filterOptions);
    
    return result.flows;
  }
  
  /**
   * Process brand flows using the new pipeline
   */
  async processBrandFlows(
    flowType: FlowType = 'net',
    metric: MetricType = 'churn',
    threshold: number = 0,
    focusBubbleId: number | null = null,
    centerFlow: boolean = false
  ): Promise<Flow[]> {
    // 1. Load data using the adapter
    const data = await this.dataAdapter.loadData();
    
    // 2. Get the appropriate view configuration
    const viewConfig = getViewConfiguration('brands');
    
    // 3. Create filter options
    const filterOptions: FilterOptions = {
      flowType,
      metric,
      threshold,
      focusBubbleId,
      centerFlow
    };
    
    // 4. Create and use the data processor
    const processor = new DataProcessor(viewConfig);
    const result = processor.process(data, filterOptions);
    
    return result.flows;
  }
  
  /**
   * Compare legacy flow processing with new pipeline
   * This is useful for validation during the transition
   */
  async compareLegacyAndNewPipeline(
    flowType: string,
    metric: 'churn' | 'switching',
    isMarketView: boolean,
    threshold: number = 0,
    focusBubbleId: number | null = null,
    centerFlow: boolean = false
  ): Promise<{legacy: Flow[], pipeline: Flow[]}> {
    // Load data
    const data = await this.dataAdapter.loadData();
    
    // Process with legacy approach (using FlowAdapter)
    const { prepareFlowData } = await import('../adapters/FlowAdapter');
    const legacyFlows = prepareFlowData(
      data,
      flowType,
      centerFlow,
      threshold,
      focusBubbleId,
      isMarketView,
      metric
    );
    
    // Process with new pipeline
    const viewId = isMarketView ? 'markets' : 'brands';
    const viewConfig = getViewConfiguration(viewId);
    
    const filterOptions: FilterOptions = {
      flowType: flowType as FlowType,
      metric: metric as MetricType,
      threshold,
      focusBubbleId,
      centerFlow
    };
    
    const processor = new DataProcessor(viewConfig);
    const pipelineResult = processor.process(data, filterOptions);
    
    return {
      legacy: legacyFlows,
      pipeline: pipelineResult.flows
    };
  }
}
