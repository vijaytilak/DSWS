import type { Flow, FlowData, Bubble } from '../types';
import type { MetricType, FlowType } from '../config/ViewConfigurations';
import { getViewConfiguration } from '../config/ViewConfigurations';
import ViewManager from './ViewManager';
import { MetricProcessor } from '../processors/MetricProcessor';

/**
 * Interface representing the internal processor response
 */
interface ProcessorResponse {
  flows: Flow[];
}

/**
 * Flow direction type
 */
export type FlowDirection = 'from-to' | 'to-from' | 'bidirectional';

/**
 * Flow filter options interface
 */
export interface FlowFilterOptions {
  flowType: FlowType;
  metric: MetricType;
  threshold: number;
  focusBubbleId: number | null;
  centerFlow: boolean;
}

/**
 * FlowManager singleton service
 * Centralizes flow data processing and manipulation
 */
export default class FlowManager {
  private static instance: FlowManager;
  private viewManager: ViewManager;
  private metricProcessor: MetricProcessor;

  private constructor() {
    this.viewManager = ViewManager.getInstance();
    this.metricProcessor = new MetricProcessor();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FlowManager {
    if (!FlowManager.instance) {
      FlowManager.instance = new FlowManager();
    }
    return FlowManager.instance;
  }

  /**
   * Process flow data for visualization
   * @param data Raw flow data
   * @param flowType Flow direction type ('in', 'out', 'net', 'both')
   * @param metric Flow metric type ('churn', 'switching')
   * @param threshold Minimum threshold value for flows
   * @param focusBubbleId Optional ID of focused bubble
   * @param centerFlow Whether to use center flow
   */
  public processFlows(
    data: FlowData | { flows: Flow[] },
    flowType: string,
    metric: string = 'churn',
    threshold: number = 0,
    focusBubbleId: number | null = null,
    centerFlow: boolean = false
  ): Promise<Flow[]> {
    return new Promise<Flow[]>((resolve) => {
      // Direct flow array case - this allows us to use directly provided flow arrays
      if ('flows' in data && Array.isArray(data.flows)) {
        let flows = [...data.flows];
        
        // Apply any additional processing needed
        if (focusBubbleId !== null) {
          flows = this.filterFlowsByFocusBubble(flows, focusBubbleId);
        }
        
        if (threshold > 0) {
          flows = this.filterFlowsByThreshold(flows, flowType, threshold);
        }
        
        resolve(flows);
        return;
      }
      
      // If it's the standard FlowData object, use MetricProcessor to extract flows
      const viewId = this.viewManager.getViewType();
      const isMarketView = viewId === 'markets';
      const viewConfig = getViewConfiguration(viewId);
      
      // Get flows from the appropriate data source based on view type
      const flowsKey = isMarketView ? 'flow_markets' : 'flow_brands';
      let rawFlows: any[] = (data as FlowData)[flowsKey] || [];
      
      // Use MetricProcessor to transform raw flows into Flow objects
      const flows = this.metricProcessor.processMetric(rawFlows, metric as MetricType, viewConfig);
      
      // Apply any filters or processing
      let processedFlows = flows;
      
      if (focusBubbleId !== null) {
        processedFlows = this.filterFlowsByFocusBubble(processedFlows, focusBubbleId);
      }
      
      if (threshold > 0) {
        processedFlows = this.filterFlowsByThreshold(processedFlows, flowType, threshold);
      }
      
      resolve(processedFlows);
    });
  }
  
  /**
   * Helper method to extract flow values from different data structures
   */

  /**
   * Determine if a flow should be bidirectional
   * @param flowType Flow type
   * @param metric Metric type
   */
  public isBidirectionalFlow(flowType: string, metric: string = 'churn'): boolean {
    // Get the current view configuration
    const viewId = this.viewManager.getViewType();
    const viewConfig = getViewConfiguration(viewId);
    
    // Return true for 'both' flow type
    if (flowType === 'both') {
      return true;
    }
    
    // Check view-specific bidirectional flow types
    if (viewId === 'brands' && metric === 'churn' && (flowType === 'in' || flowType === 'out')) {
      return true;
    }
    
    return false;
  }

  /**
   * Get appropriate flow data for visualization based on flow type and relationship to focus bubble
   * @param flow Flow data
   * @param focusBubble Focused bubble 
   * @param flowType Flow type ('in', 'out', 'net', 'both')
   */
  public getFlowValue(flow: Flow, focusBubble: Bubble | null, flowType: string): number {
    if (!focusBubble) {
      // Without a focus bubble, use default flow values
      if (flowType === 'in') return flow.inFlow || flow.absolute_inFlow || 0;
      if (flowType === 'out') return flow.outFlow || flow.absolute_outFlow || 0;
      if (flowType === 'more') return flow.moreFlow_abs || 0;
      if (flowType === 'less') return flow.lessFlow_abs || 0;
      if (flowType === 'net') return flow.netFlow || flow.absolute_netFlow || 0;
      // For 'both', use the sum of in and out (or more and less for spend)
      if (flow.moreFlow_abs !== undefined && flow.lessFlow_abs !== undefined) {
        return flow.moreFlow_abs + flow.lessFlow_abs;
      }
      return (flow.inFlow || flow.absolute_inFlow || 0) + (flow.outFlow || flow.absolute_outFlow || 0);
    }
    
    // With a focused bubble, the flow value depends on both flow type and relationship to bubble
    const isFocusBubbleSource = flow.from === focusBubble.id;
    const isFocusBubbleTarget = flow.to === focusBubble.id;
    
    if (flowType === 'in') {
      // For 'in' flows, show flows INTO the focus bubble
      if (isFocusBubbleTarget) return flow.outFlow || flow.absolute_outFlow || 0;
      if (isFocusBubbleSource) return flow.inFlow || flow.absolute_inFlow || 0;
    } else if (flowType === 'out') {
      // For 'out' flows, show flows OUT OF the focus bubble
      if (isFocusBubbleSource) return flow.outFlow || flow.absolute_outFlow || 0;
      if (isFocusBubbleTarget) return flow.inFlow || flow.absolute_inFlow || 0;
    } else if (flowType === 'more') {
      // For 'more' flows (spend metric), show more values
      return flow.moreFlow_abs || 0;
    } else if (flowType === 'less') {
      // For 'less' flows (spend metric), show less values
      return flow.lessFlow_abs || 0;
    } else if (flowType === 'net') {
      // For 'net' flows, use the net value
      return flow.netFlow || flow.absolute_netFlow || 0;
    } else {
      // For 'both', use the sum of in and out (or more and less for spend)
      if (flow.moreFlow_abs !== undefined && flow.lessFlow_abs !== undefined) {
        return flow.moreFlow_abs + flow.lessFlow_abs;
      }
      return (flow.inFlow || flow.absolute_inFlow || 0) + (flow.outFlow || flow.absolute_outFlow || 0);
    }
    
    return 0;
  }
  
  /**
   * Filter flows based on focus bubble
   * @param flows Array of flows to filter
   * @param focusBubbleId ID of the focus bubble
   */
  public filterFlowsByFocusBubble(flows: Flow[], focusBubbleId: number): Flow[] {
    return flows.filter(flow => 
      flow.from === focusBubbleId || flow.to === focusBubbleId
    );
  }
  
  /**
   * Filter flows based on threshold
   * @param flows Array of flows to filter
   * @param flowType Flow type for determining which value to compare
   * @param threshold Threshold value
   */
  public filterFlowsByThreshold(flows: Flow[], flowType: string, threshold: number): Flow[] {
    return flows.filter(flow => {
      // Get the value to compare against threshold
      let value = 0;
      
      if (flowType === 'in') {
        value = flow.inFlow || flow.absolute_inFlow || 0;
      } else if (flowType === 'out') {
        value = flow.outFlow || flow.absolute_outFlow || 0;
      } else if (flowType === 'more') {
        value = flow.moreFlow_abs || 0;
      } else if (flowType === 'less') {
        value = flow.lessFlow_abs || 0;
      } else if (flowType === 'net') {
        value = Math.abs(flow.netFlow || flow.absolute_netFlow || 0);
      } else {
        // For 'both', use the sum of in and out (or more and less for spend)
        if (flow.moreFlow_abs !== undefined && flow.lessFlow_abs !== undefined) {
          value = flow.moreFlow_abs + flow.lessFlow_abs;
        } else {
          value = (flow.inFlow || flow.absolute_inFlow || 0) + 
                 (flow.outFlow || flow.absolute_outFlow || 0);
        }
      }
      
      return value >= threshold;
    });
  }
  
  /**
   * Determine the display direction for a flow
   * @param flow Flow data
   * @param flowType Flow type ('in', 'out', 'net', 'both')
   */
  public getFlowDirection(flow: Flow, flowType: string): FlowDirection {
    if (this.isBidirectionalFlow(flowType)) {
      return 'bidirectional';
    }
    
    if (flowType === 'in') {
      return 'to-from'; // Arrows point FROM flow.to TO flow.from
    } else if (flowType === 'out') {
      return 'from-to'; // Arrows point FROM flow.from TO flow.to
    } else if (flowType === 'more') {
      return 'from-to'; // For 'more' spending, arrows point from bubble to center
    } else if (flowType === 'less') {
      return 'from-to'; // For 'less' spending, arrows point from bubble to center
    } else if (flowType === 'net') {
      // For net flows, direction depends on the sign of the net flow
      const netFlowValue = flow.netFlow || flow.absolute_netFlow || 0;
      return netFlowValue >= 0 ? 'from-to' : 'to-from';
    }
    
    // Default direction
    return 'from-to';
  }
}
