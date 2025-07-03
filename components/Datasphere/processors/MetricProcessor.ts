import type { Flow } from '../types';
import type { ViewConfiguration, MetricType } from '../config/ViewConfigurations';

/**
 * Processes metric-specific data transformations
 * Handles both markets and brands data structures dynamically
 */
export class MetricProcessor {
  
  /**
   * Process flows based on the selected metric
   */
  processMetric(rawData: unknown[], metric: MetricType, config: ViewConfiguration): Flow[] {
    switch (config.dataSource) {
      case 'flows_markets':
        return this.processMarketFlows(rawData, metric);
      case 'flows_brands':
        return this.processBrandFlows(rawData, metric);
      default:
        throw new Error(`Unsupported data source: ${config.dataSource}`);
    }
  }

  /**
   * Process market flows data
   */
  private processMarketFlows(marketData: unknown[], metric: MetricType): Flow[] {
    return marketData.map((flow, index) => {
      const metricData = flow[metric];
      
      if (!metricData) {
        console.warn(`No ${metric} data found for market flow ${flow.bubbleID || index}`);
        return this.createEmptyFlow(flow.bubbleID || index, this.getCenterBubbleId(marketData));
      }

      // Handle both array and object structures
      const data = Array.isArray(metricData) ? metricData[0] : metricData;
      
      // Handle spend metric differently (more/less vs in/out)
      if (metric === 'spend') {
        const moreValues = this.extractAllValues(data, 'more');
        const lessValues = this.extractAllValues(data, 'less');
        
        return {
          from: flow.bubbleID,
          to: this.getCenterBubbleId(marketData),
          absolute_inFlow: moreValues.abs,
          absolute_outFlow: lessValues.abs,
          absolute_netFlowDirection: this.determineSpendDirection(data),
          absolute_netFlow: Math.abs(moreValues.abs - lessValues.abs),
          
          // Spend-specific values for display
          moreFlow_abs: moreValues.abs,
          moreFlow_perc: moreValues.perc,
          moreFlow_index: moreValues.index,
          lessFlow_abs: lessValues.abs,
          lessFlow_perc: lessValues.perc,
          lessFlow_index: lessValues.index,
          
          // Preserve original data
          [metric]: Array.isArray(metricData) ? metricData : [metricData]
        } as Flow;
      }
      
      // Handle churn/switching metrics (in/out structure)
      const inValues = this.extractAllValues(data, 'in');
      const outValues = this.extractAllValues(data, 'out');
      const netValues = this.extractAllValues(data, 'net');
      const bothValues = this.extractAllValues(data, 'both');
      const flowDirection = this.determineFlowDirection(data);
      
      const processedFlow: Flow = {
        from: flow.bubbleID,
        to: this.getCenterBubbleId(marketData),
        absolute_inFlow: inValues.abs,
        absolute_outFlow: outValues.abs,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: netValues.abs,
        
        // Core flow values for display
        inFlow_abs: inValues.abs,
        inFlow_perc: inValues.perc,
        inFlow_index: inValues.index,
        outFlow_abs: outValues.abs,
        outFlow_perc: outValues.perc,
        outFlow_index: outValues.index,
        netFlow_abs: netValues.abs,
        netFlow_perc: netValues.perc,
        netFlow_index: netValues.index,
        
        // Preserve original data for bidirectional rendering
        [metric]: Array.isArray(metricData) ? metricData : [metricData]
      };
      
      // Handle bidirectional flows (when both field contains out_perc and in_perc)
      if (data.both && typeof data.both === 'object') {
        const both = data.both;
        if (typeof both.out_perc === 'number' && typeof both.in_perc === 'number') {
          processedFlow.bidirectional_outPerc = both.out_perc;
          processedFlow.bidirectional_inPerc = both.in_perc;
          processedFlow.bidirectional_outIndex = both.out_index || 0;
          processedFlow.bidirectional_inIndex = both.in_index || 0;
          processedFlow.isBidirectional = true;
        }
      }
      
      return processedFlow;
    });
  }

  /**
   * Process brand flows data
   */
  private processBrandFlows(brandData: unknown[], metric: MetricType): Flow[] {
    const flows: Flow[] = [];
    
    for (const flow of brandData) {
      const metricData = flow[metric];
      
      if (!metricData || !Array.isArray(metricData) || metricData.length === 0) {
        console.warn(`No ${metric} data found for brand flow ${flow.from}-${flow.to}`);
        continue;
      }

      const data = metricData[0];
      const inValues = this.extractAllValues(data, 'in');
      const outValues = this.extractAllValues(data, 'out');
      const netValues = this.extractAllValues(data, 'net');
      const flowDirection = this.determineFlowDirection(data);
      
      const processedFlow: Flow = {
        from: flow.from,
        to: flow.to,
        absolute_inFlow: inValues.abs,
        absolute_outFlow: outValues.abs,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: netValues.abs,
        
        // Core flow values for display
        inFlow_abs: inValues.abs,
        inFlow_perc: inValues.perc,
        inFlow_index: inValues.index,
        outFlow_abs: outValues.abs,
        outFlow_perc: outValues.perc,
        outFlow_index: outValues.index,
        netFlow_abs: netValues.abs,
        netFlow_perc: netValues.perc,
        netFlow_index: netValues.index,
        
        // Preserve original data for advanced rendering
        churn: flow.churn,
        switching: flow.switching,
        tabledata: flow.tabledata
      };

      // Add bidirectional data if available
      if (data.both && typeof data.both === 'object') {
        const both = data.both;
        if (typeof both.out_perc === 'number' && typeof both.in_perc === 'number') {
          processedFlow.bidirectional_outPerc = both.out_perc;
          processedFlow.bidirectional_inPerc = both.in_perc;
          processedFlow.bidirectional_outIndex = both.out_index || 0;
          processedFlow.bidirectional_inIndex = both.in_index || 0;
          processedFlow.isBidirectional = true;
        }
      }

      flows.push(processedFlow);
    }

    return flows;
  }

  /**
   * Extract all values (abs, perc, index) from data structure
   */
  private extractAllValues(data: unknown, field: 'in' | 'out' | 'net' | 'both' | 'more' | 'less'): { abs: number; perc: number; index: number } {
    if (!data || typeof data !== 'object') {
      return { abs: 0, perc: 0, index: 0 };
    }

    const value = data[field];
    
    if (typeof value === 'number') {
      return { abs: value, perc: value, index: value };
    }
    
    if (typeof value === 'object' && value !== null) {
      return {
        abs: typeof value.abs === 'number' ? value.abs : 0,
        perc: typeof value.perc === 'number' ? value.perc : 0,
        index: typeof value.index === 'number' ? value.index : 0
      };
    }

    return { abs: 0, perc: 0, index: 0 };
  }

  /**
   * Extract value from data structure (backward compatibility)
   */
  private extractValue(data: unknown, field: 'in' | 'out' | 'net' | 'both' | 'more' | 'less'): number {
    const values = this.extractAllValues(data, field);
    return values.abs; // Use abs value for backward compatibility
  }

  /**
   * Determine flow direction based on net value
   */
  private determineFlowDirection(data: unknown): "inFlow" | "outFlow" {
    const netValue = this.extractValue(data, 'net');
    return netValue >= 0 ? "inFlow" : "outFlow";
  }

  /**
   * Determine spend direction based on more vs less values
   */
  private determineSpendDirection(data: unknown): "inFlow" | "outFlow" {
    const moreValue = this.extractValue(data, 'more');
    const lessValue = this.extractValue(data, 'less');
    return moreValue >= lessValue ? "inFlow" : "outFlow";
  }

  /**
   * Get center bubble ID for market flows
   */
  private getCenterBubbleId(marketData: unknown[]): number {
    // Find the maximum bubble ID and add 1 for center bubble
    const maxId = Math.max(...marketData.map(flow => flow.bubbleID || 0));
    return maxId + 1;
  }

  /**
   * Create empty flow for missing data
   */
  private createEmptyFlow(from: number, to: number): Flow {
    return {
      from,
      to,
      absolute_inFlow: 0,
      absolute_outFlow: 0,
      absolute_netFlowDirection: "inFlow",
      absolute_netFlow: 0
    } as Flow;
  }

  /**
   * Calculate percentage ranks for flows
   */
  calculatePercentageRanks(flows: Flow[], valueKey: keyof Flow): Flow[] {
    const values = flows.map(flow => {
      const value = flow[valueKey];
      return typeof value === 'number' ? value : 0;
    }).sort((a, b) => a - b);

    const length = values.length;

    return flows.map(flow => {
      const value = flow[valueKey];
      if (typeof value !== 'number') {
        return { ...flow, percentRank: 0 };
      }

      if (length <= 1) {
        return { ...flow, percentRank: 100 };
      }

      let rank = 0;
      for (let i = 0; i < length; i++) {
        if (values[i] < value) {
          rank++;
        }
      }

      const percentRank = (rank / (length - 1)) * 100;
      return { ...flow, percentRank };
    });
  }

  /**
   * Calculate relative size percentages for flows
   */
  calculateRelativeSizes(flows: Flow[], ...sizeProperties: (keyof Flow)[]): Flow[] {
    // Get all values across all specified properties
    const allValues: number[] = [];
    
    for (const property of sizeProperties) {
      flows.forEach(flow => {
        const value = flow[property];
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    }

    if (allValues.length === 0) {
      return flows;
    }

    const minSize = Math.min(...allValues);
    const maxSize = Math.max(...allValues);
    const sizeRange = maxSize - minSize;

    return flows.map(flow => {
      const updatedFlow = { ...flow };
      
      for (const property of sizeProperties) {
        const value = flow[property];
        if (typeof value === 'number' && !isNaN(value)) {
          const sizePercent = sizeRange > 0 ? ((value - minSize) / sizeRange) * 100 : 100;
          (updatedFlow as Record<string, unknown>)[`sizePercent_${String(property)}`] = parseFloat(sizePercent.toFixed(2));
        }
      }
      
      return updatedFlow;
    });
  }

  /**
   * Validate metric data structure
   */
  validateMetricData(data: unknown[], metric: MetricType): boolean {
    return data.every(item => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const metricData = item[metric];
      if (!metricData) {
        return false;
      }

      // Handle both array and object structures
      const actualData = Array.isArray(metricData) ? metricData[0] : metricData;
      
      return actualData && typeof actualData === 'object';
    });
  }
}
