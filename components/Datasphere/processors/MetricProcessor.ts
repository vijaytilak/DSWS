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
        console.warn(`No ${metric} data found for market flow ${flow.itemID || index}`);
        return this.createEmptyFlow(flow.itemID || index, this.getCenterBubbleId(marketData));
      }

      // Handle both array and object structures
      const data = Array.isArray(metricData) ? metricData[0] : metricData;
      
      const flowDirection = this.determineFlowDirection(data);
      
      return {
        from: flow.itemID,
        to: this.getCenterBubbleId(marketData),
        absolute_inFlow: this.extractValue(data, 'in') || 0,
        absolute_outFlow: this.extractValue(data, 'out') || 0,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(this.extractValue(data, 'net') || 0),
        // Preserve original data for bidirectional rendering
        [metric]: Array.isArray(metricData) ? metricData : [metricData]
      } as Flow;
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
      const flowDirection = this.determineFlowDirection(data);
      
      const processedFlow: Flow = {
        from: flow.from,
        to: flow.to,
        absolute_inFlow: this.extractValue(data, 'in') || 0,
        absolute_outFlow: this.extractValue(data, 'out') || 0,
        absolute_netFlowDirection: flowDirection,
        absolute_netFlow: Math.abs(this.extractValue(data, 'net') || 0),
        // Preserve original data for advanced rendering
        churn: flow.churn,
        switching: flow.switching,
        tabledata: flow.tabledata
      };

      // Add bidirectional data if available
      if (data.both) {
        processedFlow.bidirectional_inPerc = (data.both.in_perc || 0) * 100;
        processedFlow.bidirectional_outPerc = (data.both.out_perc || 0) * 100;
        processedFlow.bidirectional_inIndex = data.both.in_index || 0;
        processedFlow.bidirectional_outIndex = data.both.out_index || 0;
      }

      flows.push(processedFlow);
    }

    return flows;
  }

  /**
   * Extract value from data structure (handles both new and legacy formats)
   */
  private extractValue(data: unknown, field: 'in' | 'out' | 'net' | 'both'): number {
    if (!data || typeof data !== 'object') {
      return 0;
    }

    const value = data[field];
    
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'object' && value !== null) {
      // Handle nested structure
      if (typeof value.abs === 'number') {
        return value.abs;
      }
      if (typeof value.perc === 'number') {
        return value.perc * 100; // Convert to percentage
      }
    }

    return 0;
  }

  /**
   * Determine flow direction based on net value
   */
  private determineFlowDirection(data: unknown): "inFlow" | "outFlow" {
    const netValue = this.extractValue(data, 'net');
    return netValue >= 0 ? "inFlow" : "outFlow";
  }

  /**
   * Get center bubble ID for market flows
   */
  private getCenterBubbleId(marketData: unknown[]): number {
    // Find the maximum bubbleID and add 1 for center bubble
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
