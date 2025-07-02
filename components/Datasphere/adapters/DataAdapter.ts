import type { FlowData, Flow } from '../types';
import { FlowIntegrationProcessor } from '../processors/FlowIntegrationProcessor';

/**
 * Data adapter for loading and transforming data from ds.json
 * Handles data loading, transformation, and validation
 */
export class DataAdapter {
  private data: FlowData | null = null;
  private dataPath: string = '/data/ds.json';
  private processor: FlowIntegrationProcessor = new FlowIntegrationProcessor();

  /**
   * Load data from the specified path
   */
  async loadData(path?: string): Promise<FlowData> {
    const dataPath = path || this.dataPath;
    
    try {
      // In a browser environment, use fetch to get the data
      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.validateData(data);
      this.data = data;
      return data;
    } catch (error) {
      console.error('Error loading flow data:', error);
      throw new Error(`Failed to load flow data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the currently loaded data
   */
  getData(): FlowData {
    if (!this.data) {
      throw new Error('Data not loaded. Call loadData() first.');
    }
    return this.data;
  }
  
  /**
   * Process flow data for the specified view type
   * @param isMarketView Whether to process market view (true) or brand view (false)
   * @param flowType The type of flow to process ('in', 'out', 'net', 'both')
   * @param flowOption The flow option to use ('churn', 'switching', etc.)
   * @param focusBubbleId Optional ID of the focused bubble
   * @param threshold Optional threshold value for filtering
   * @param showCentreFlows Whether to show center flows
   */
  processFlowData(
    isMarketView: boolean,
    flowType: string,
    flowOption: string,
    focusBubbleId: number | null = null,
    threshold: number = 0,
    showCentreFlows: boolean = false
  ): Flow[] {
    if (!this.data) {
      throw new Error('Data not loaded. Call loadData() first.');
    }
    
    // Use the synchronous version of the processor to avoid Promise return type
    return this.processor.processFlowDataSync(
      this.data,
      isMarketView,
      flowType,
      flowOption,
      focusBubbleId,
      threshold,
      showCentreFlows
    );
  }
  
  /**
   * Process market flow data
   * @param flowType The type of flow to process ('in', 'out', 'net', 'both')
   * @param flowOption The flow option to use ('churn', 'switching', etc.)
   * @param focusBubbleId Optional ID of the focused bubble
   * @param threshold Optional threshold value for filtering
   * @param showCentreFlows Whether to show center flows
   */
  processMarketFlowData(
    flowType: string,
    flowOption: string,
    focusBubbleId: number | null = null,
    threshold: number = 0,
    showCentreFlows: boolean = false
  ): Flow[] {
    return this.processFlowData(true, flowType, flowOption, focusBubbleId, threshold, showCentreFlows);
  }
  
  /**
   * Process brand flow data
   * @param flowType The type of flow to process ('in', 'out', 'net', 'both')
   * @param flowOption The flow option to use ('churn', 'switching', etc.)
   * @param focusBubbleId Optional ID of the focused bubble
   * @param threshold Optional threshold value for filtering
   * @param showCentreFlows Whether to show center flows
   */
  processBrandFlowData(
    flowType: string,
    flowOption: string,
    focusBubbleId: number | null = null,
    threshold: number = 0,
    showCentreFlows: boolean = false
  ): Flow[] {
    return this.processFlowData(false, flowType, flowOption, focusBubbleId, threshold, showCentreFlows);
  }

  /**
   * Validate the loaded data structure
   */
  private validateData(data: any): void {
    // Basic structure validation
    if (!data) {
      throw new Error('Data is empty or null');
    }
    
    if (!Array.isArray(data.itemIDs)) {
      throw new Error('Data is missing itemIDs array');
    }
    
    if (!Array.isArray(data.flow_brands)) {
      throw new Error('Data is missing flow_brands array');
    }
    
    if (!Array.isArray(data.flow_markets)) {
      throw new Error('Data is missing flow_markets array');
    }
    
    // Validate item IDs
    for (const item of data.itemIDs) {
      if (typeof item.itemID !== 'number') {
        throw new Error(`Invalid itemID in itemIDs: ${JSON.stringify(item)}`);
      }
      if (typeof item.itemLabel !== 'string') {
        throw new Error(`Invalid itemLabel in itemIDs: ${JSON.stringify(item)}`);
      }
    }
    
    // Basic validation of brand flows
    for (const flow of data.flow_brands) {
      if (typeof flow.from !== 'number' || typeof flow.to !== 'number') {
        throw new Error(`Invalid brand flow: ${JSON.stringify(flow)}`);
      }
    }
    
    // Basic validation of market flows
    for (const flow of data.flow_markets) {
      if (typeof flow.itemID !== 'number') {
        throw new Error(`Invalid market flow: ${JSON.stringify(flow)}`);
      }
    }
    
    // Transform the data to match the expected FlowData structure
    data.flows_brands = data.flow_brands;
    data.flows_markets = data.flow_markets;
  }
}
