import type { FlowData, BrandFlow, MarketFlow } from '../types';
import type { MetricType, FlowType } from '../config/ViewConfigurations';
import ViewManager from './ViewManager';

// New Flow and FlowSegment interfaces according to user specification
export interface FlowSegment {
  // Data properties
  id: string;
  parentFlowId: string;
  abs: number;
  perc: number;
  index: number;
  
  // Direction properties
  direction: 'outgoing' | 'incoming' | 'single';
  startBubble: string;
  endBubble: string;
  
  // Visual properties
  startPoint: { x: number, y: number };
  endPoint: { x: number, y: number };
  midPoint?: { x: number, y: number };
  
  // Styling
  color: string;
  thickness: number;
  opacity: number;
  strokeDasharray?: string;
  
  // Marker properties
  marker: {
    type: 'arrow' | 'circle' | 'none';
    position: 'start' | 'end' | 'both' | 'none';
    size?: number;
    color?: string;
    opacity: number;
  };
  
  // Label properties
  labels: Array<{
    type: 'percentage' | 'index';
    value: string;
    position: { x: number, y: number };
    visible: boolean;
    color: string;
    fontSize: string;
    fontWeight: string;
    offset?: { x: number, y: number };
  }>;
  
  // Interaction
  tooltip: {
    enabled: boolean;
    content: string;
    trigger?: 'hover' | 'click';
  };
  
  // State properties
  visible: boolean;
  highlighted: boolean;
  selected: boolean;
  hovering?: boolean;
  
  // Animation
  animationProgress?: number;
}

export interface Flow {
  // Data properties
  id: string;
  from: string;
  to: string;
  
  // Flow characteristics
  type: 'unidirectional' | 'bidirectional';
  view: 'markets' | 'brands';
  metric: 'churn' | 'switching' | 'spend';
  flowType: 'in' | 'out' | 'net' | 'both' | 'more' | 'less';
  
  // Segments
  flowSegments: FlowSegment[];
  
  // Aggregate data
  abs: number;
  rank?: number;
  
  // Raw flow data for segment generation
  rawFlowData?: any;
  
  // State properties
  visible: boolean;
  highlighted: boolean;
  selected: boolean;
  isCentreFlow: boolean;
  
  // Visual properties
  zIndex?: number;
  
  // Metadata
  metadata?: {
    sourceName?: string;
    targetName?: string;
  };
}

// Helper interfaces for raw data transformation
interface FlowDataBidirectional {
  abs: number;
  out_perc: number;
  in_perc: number;
  out_index: number;
  in_index: number;
}

interface FlowDataUnidirectional {
  abs: number;
  perc: number;
  index: number;
}

/**
 * Configuration for flow generation
 */
export interface FlowGenerationConfig {
  view: 'markets' | 'brands';
  metric: 'churn' | 'switching' | 'spend';
  flowType: 'in' | 'out' | 'net' | 'both' | 'more' | 'less';
  focusBubbleId?: number | null;
  threshold?: number;
}

/**
 * FlowFactory service - Creates new Flow objects from raw data
 */
export default class FlowFactory {
  private static instance: FlowFactory;
  private viewManager: ViewManager;

  private constructor() {
    this.viewManager = ViewManager.getInstance();
  }

  public static getInstance(): FlowFactory {
    if (!FlowFactory.instance) {
      FlowFactory.instance = new FlowFactory();
    }
    return FlowFactory.instance;
  }

  /**
   * Generate Flow objects from raw data based on configuration
   */
  public generateFlows(data: FlowData, config: FlowGenerationConfig): Flow[] {
    console.log('FlowFactory.generateFlows Debug:', {
      config,
      brandFlowsCount: data.flow_brands?.length || 0,
      marketFlowsCount: data.flow_markets?.length || 0,
      bubblesCount: data.bubbles?.length || 0
    });
    
    if (config.view === 'brands') {
      return this.generateBrandFlows(data.flow_brands, config);
    } else {
      return this.generateMarketFlows(data.flow_markets, config, data.bubbles.length);
    }
  }

  /**
   * Generate flows for brands view
   */
  private generateBrandFlows(brandFlows: BrandFlow[], config: FlowGenerationConfig): Flow[] {
    const flows: Flow[] = [];

    for (const brandFlow of brandFlows) {
      // Apply focus bubble filter if specified
      if (config.focusBubbleId !== null && config.focusBubbleId !== undefined) {
        if (brandFlow.from !== config.focusBubbleId && brandFlow.to !== config.focusBubbleId) {
          continue;
        }
      }

      const metricData = this.extractMetricData(brandFlow, config.metric);
      if (!metricData) continue;

      const flowTypeData = metricData[config.flowType];
      if (!flowTypeData) continue;

      // Apply threshold filter
      if (config.threshold && flowTypeData.abs < config.threshold) {
        continue;
      }

      const flow = this.createFlowFromBrandData(brandFlow, config, flowTypeData, metricData);
      if (flow) {
        flows.push(flow);
      }
    }

    return flows;
  }

  /**
   * Generate flows for markets view
   */
  private generateMarketFlows(marketFlows: MarketFlow[], config: FlowGenerationConfig, numBubbles: number): Flow[] {
    const flows: Flow[] = [];
    // Calculate center bubble ID - it should be the count of data bubbles (11 for data with bubbles 0-10)
    const centerBubbleId = numBubbles.toString();

    console.log('generateMarketFlows Debug:', {
      marketFlowsCount: marketFlows?.length || 0,
      centerBubbleId,
      config,
      sampleMarketFlow: marketFlows?.[0]
    });

    for (const marketFlow of marketFlows) {
      // Apply focus bubble filter if specified
      if (config.focusBubbleId !== null && config.focusBubbleId !== undefined) {
        if (marketFlow.bubbleID !== config.focusBubbleId) {
          continue;
        }
      }

      const metricData = this.extractMetricData(marketFlow, config.metric);
      if (!metricData) {
        console.log(`Market Flow ${marketFlow.bubbleID} - no metricData for ${config.metric}`);
        continue;
      }

      const flowTypeData = metricData[config.flowType];
      if (!flowTypeData) {
        console.log(`Market Flow ${marketFlow.bubbleID} - no flowTypeData for ${config.flowType} in`, metricData);
        continue;
      }

      // Apply threshold filter
      if (config.threshold && flowTypeData.abs < config.threshold) {
        continue;
      }

      const flow = this.createFlowFromMarketData(marketFlow, config, flowTypeData, centerBubbleId, metricData);
      if (flow) {
        flows.push(flow);
      }
    }

    console.log(`generateMarketFlows completed: ${flows.length} flows created`);
    return flows;
  }

  /**
   * Extract metric data from flow object
   */
  private extractMetricData(flow: BrandFlow | MarketFlow, metric: string): any {
    if (metric === 'churn' && flow.churn && flow.churn.length > 0) {
      return flow.churn[0];
    }
    if (metric === 'switching' && flow.switching && flow.switching.length > 0) {
      return flow.switching[0];
    }
    if (metric === 'spend' && 'spend' in flow && flow.spend && flow.spend.length > 0) {
      return flow.spend[0];
    }
    return null;
  }

  /**
   * Create Flow object from brand data
   */
  private createFlowFromBrandData(
    brandFlow: BrandFlow, 
    config: FlowGenerationConfig, 
    flowTypeData: any,
    metricData: any
  ): Flow | null {
    const flowId = `brand-${brandFlow.from}-${brandFlow.to}-${config.metric}-${config.flowType}`;
    
    const flow: Flow = {
      id: flowId,
      from: brandFlow.from.toString(),
      to: brandFlow.to.toString(),
      type: this.determineFlowType(config.flowType),
      view: 'brands',
      metric: config.metric as 'churn' | 'switching' | 'spend',
      flowType: config.flowType as 'in' | 'out' | 'net' | 'both' | 'more' | 'less',
      flowSegments: [], // Will be populated by FlowSegmentGenerator
      abs: flowTypeData.abs || 0,
      rawFlowData: metricData, // Include raw data for segment generation
      visible: true,
      highlighted: false,
      selected: false,
      isCentreFlow: false,
      metadata: {
        sourceName: `Bubble ${brandFlow.from}`,
        targetName: `Bubble ${brandFlow.to}`,
      }
    };

    return flow;
  }

  /**
   * Create Flow object from market data
   */
  private createFlowFromMarketData(
    marketFlow: MarketFlow, 
    config: FlowGenerationConfig, 
    flowTypeData: any,
    centerBubbleId: string,
    metricData: any
  ): Flow | null {
    const flowId = `market-${marketFlow.bubbleID}-center-${config.metric}-${config.flowType}`;
    
    const flow: Flow = {
      id: flowId,
      from: marketFlow.bubbleID.toString(),
      to: centerBubbleId, // Market flows go to center bubble
      type: this.determineFlowType(config.flowType),
      view: 'markets',
      metric: config.metric as 'churn' | 'switching' | 'spend',
      flowType: config.flowType as 'in' | 'out' | 'net' | 'both' | 'more' | 'less',
      flowSegments: [], // Will be populated by FlowSegmentGenerator
      abs: flowTypeData.abs || 0,
      rawFlowData: metricData, // Include raw data for segment generation
      visible: true,
      highlighted: false,
      selected: false,
      isCentreFlow: true,
      metadata: {
        sourceName: `Bubble ${marketFlow.bubbleID}`,
        targetName: 'Market Center',
      }
    };

    return flow;
  }

  /**
   * Determine if flow should be unidirectional or bidirectional
   */
  private determineFlowType(flowType: string): 'unidirectional' | 'bidirectional' {
    return flowType === 'both' ? 'bidirectional' : 'unidirectional';
  }

  /**
   * Sort flows by absolute value (descending)
   */
  public sortFlowsByValue(flows: Flow[]): Flow[] {
    return [...flows].sort((a, b) => b.abs - a.abs);
  }

  /**
   * Add ranking to flows
   */
  public addRankingToFlows(flows: Flow[]): Flow[] {
    const sortedFlows = this.sortFlowsByValue(flows);
    return sortedFlows.map((flow, index) => ({
      ...flow,
      rank: index + 1
    }));
  }
}