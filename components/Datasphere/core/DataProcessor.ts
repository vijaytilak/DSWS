import type { FlowData, Flow } from '../types';
import type { ViewConfiguration, MetricType, FlowType } from '../config/ViewConfigurations';
import { DataPipeline } from './DataPipeline';
import { MetricProcessor } from '../processors/MetricProcessor';
import { FilterProcessor } from '../processors/FilterProcessor';
import { FlowProcessor } from '../processors/FlowProcessor';

export interface FilterOptions {
  metric: MetricType;
  threshold: number;
  focusBubbleId: number | null;
  centerFlow: boolean;
  flowType?: FlowType;
}

export interface ProcessedFlowData {
  flows: Flow[];
  metadata: {
    totalFlows: number;
    filteredFlows: number;
    processedAt: Date;
    viewConfiguration: ViewConfiguration;
  };
}

/**
 * Main data processor that orchestrates the data processing pipeline
 * Uses configuration-driven approach to handle different view types
 */
export class DataProcessor {
  private metricProcessor: MetricProcessor;
  private filterProcessor: FilterProcessor;
  private flowProcessor: FlowProcessor;

  constructor(private config: ViewConfiguration) {
    this.metricProcessor = new MetricProcessor();
    this.filterProcessor = new FilterProcessor();
    this.flowProcessor = new FlowProcessor();
  }

  /**
   * Process raw flow data through the complete pipeline
   * Async version to support future async operations
   */
  async process(rawData: FlowData, filters: FilterOptions): Promise<ProcessedFlowData> {
    return this.processSync(rawData, filters);
  }
  
  /**
   * Synchronous version of the process method
   * Used by the FlowIntegrationProcessor for backward compatibility
   */
  processSync(rawData: FlowData, filters: FilterOptions): ProcessedFlowData {
    const startTime = Date.now();
    
    try {
      const pipeline = new DataPipeline()
        .addStage('extract', () => this.extractData(rawData))
        .addStage('transform', (data) => this.transformData(data, filters.metric))
        .addStage('filter', (data) => this.filterData(data, filters))
        .addStage('aggregate', (data) => this.aggregateData(data, filters.centerFlow, rawData.itemIDs?.length))
        .addStage('process-flow-values', (data) => this.processFlowValues(data, filters))
        .addStage('sort', (data) => this.sortData(data))
        .addStage('validate', (data) => this.validateData(data));

      const flows = pipeline.execute();

      return {
        flows,
        metadata: {
          totalFlows: this.getTotalFlowCount(rawData),
          filteredFlows: flows.length,
          processedAt: new Date(),
          viewConfiguration: this.config
        }
      };
    } catch (error) {
      console.error('Data processing failed:', error);
      throw new Error(`Data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract data from the appropriate source based on view configuration
   */
  private extractData(rawData: FlowData): unknown[] {
    switch (this.config.dataSource) {
      case 'flows_markets':
        return rawData.flows_markets || [];
      case 'flows_brands':
        return rawData.flows_brands || [];
      default:
        throw new Error(`Unknown data source: ${this.config.dataSource}`);
    }
  }

  /**
   * Transform data based on the selected metric
   */
  private transformData(data: unknown[], metric: MetricType): Flow[] {
    return this.metricProcessor.processMetric(data, metric, this.config);
  }

  /**
   * Filter data based on threshold and focus bubble
   */
  private filterData(flows: Flow[], filters: FilterOptions): Flow[] {
    return this.filterProcessor.filterFlows(flows, filters, this.config);
  }

  /**
   * Aggregate flows if center flow is enabled
   */
  private aggregateData(flows: Flow[], centerFlow: boolean, noOfBubbles?: number): Flow[] {
    if (!centerFlow || !this.config.supportsCenterFlow) {
      return flows;
    }

    // Center flow aggregation logic
    return this.aggregateToCenter(flows);
  }

  /**
   * Process flow values based on flow type and metric
   * Applies the appropriate data selection logic based on flow type and focus bubble
   */
  private processFlowValues(flows: Flow[], filters: FilterOptions): Flow[] {
    if (!filters.flowType) {
      return flows;
    }
    
    return flows.map(flow => {
      // Create a copy of the flow to avoid mutating the original
      const processedFlow = { ...flow };
      
      // Apply flow value processing based on flow type and focus bubble
      if (filters.focusBubbleId !== null) {
        // Use the FlowProcessor to determine the correct flow value and direction
        // based on the focused bubble and flow type
        const flowValue = this.flowProcessor.getFlowValueForFocusedBubble(
          flow, 
          filters.flowType!, 
          filters.focusBubbleId
        );
        
        const flowDirection = this.flowProcessor.getFlowDirectionForFocusedBubble(
          flow, 
          filters.flowType!, 
          filters.focusBubbleId
        );
        
        // Set the display value and direction for rendering
        processedFlow.displayValue = flowValue;
        processedFlow.displayDirection = flowDirection;
      } else {
        // If no bubble is focused, use standard flow value processing
        return this.flowProcessor.processFlowValues(flow, filters.flowType!, filters.metric, this.config);
      }
      
      return processedFlow;
    });
  }

  /**
   * Sort flows for consistent rendering order
   */
  private sortData(flows: Flow[]): Flow[] {
    return [...flows].sort((a, b) => {
      // Sort by flow magnitude (largest first)
      const aMagnitude = Math.max(a.absolute_inFlow, a.absolute_outFlow, a.absolute_netFlow);
      const bMagnitude = Math.max(b.absolute_inFlow, b.absolute_outFlow, b.absolute_netFlow);
      return bMagnitude - aMagnitude;
    });
  }

  /**
   * Validate processed data
   */
  private validateData(flows: Flow[]): Flow[] {
    const validFlows = flows.filter(flow => {
      // Basic validation checks
      return (
        typeof flow.from === 'number' &&
        typeof flow.to === 'number' &&
        typeof flow.absolute_inFlow === 'number' &&
        typeof flow.absolute_outFlow === 'number' &&
        typeof flow.absolute_netFlow === 'number' &&
        !isNaN(flow.absolute_inFlow) &&
        !isNaN(flow.absolute_outFlow) &&
        !isNaN(flow.absolute_netFlow)
      );
    });

    if (validFlows.length !== flows.length) {
      console.warn(`Filtered out ${flows.length - validFlows.length} invalid flows during validation`);
    }

    return validFlows;
  }

  /**
   * Aggregate flows to center bubble
   */
  private aggregateToCenter(flows: Flow[]): Flow[] {
    // Get the center bubble ID (assuming it's the highest ID + 1)
    const maxBubbleId = Math.max(...flows.flatMap(f => [f.from, f.to]));
    const centerBubbleId = maxBubbleId + 1;

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
      .filter(([id]) => id !== centerBubbleId) // Exclude the center node itself
      .map(([id, flow]) => {
        const flowDirection = flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow";
        return {
          from: id,
          to: centerBubbleId,
          absolute_inFlow: flow.totalInFlow,
          absolute_outFlow: flow.totalOutFlow,
          absolute_netFlowDirection: flowDirection,
          absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
        } as Flow;
      });
  }

  /**
   * Get total flow count from raw data
   */
  private getTotalFlowCount(rawData: FlowData): number {
    switch (this.config.dataSource) {
      case 'flows_markets':
        return rawData.flows_markets?.length || 0;
      case 'flows_brands':
        return rawData.flows_brands?.length || 0;
      default:
        return 0;
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: ViewConfiguration): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ViewConfiguration {
    return this.config;
  }
  
  /**
   * Aggregate flows around center for legacy compatibility
   * @param flows The flows to aggregate
   * @param noOfBubbles The number of bubbles
   * @returns Aggregated flows
   */
  aggregateFlowsAroundCenter(flows: Flow[], noOfBubbles: number): Flow[] {
    // This is a wrapper around aggregateToCenter for backward compatibility
    return this.aggregateToCenter(flows);
  }
}
