import type { FlowData, Bubble } from '../types';
import type { Flow, FlowGenerationConfig } from './FlowFactory';
import type { SegmentGenerationConfig } from './FlowSegmentGenerator';
import FlowFactory from './FlowFactory';
import FlowSegmentGenerator from './FlowSegmentGenerator';
import ViewManager from './ViewManager';
import { ConfigurationManager } from '../config/ConfigurationManager';

/**
 * Configuration for the FlowDataService
 */
export interface FlowDataServiceConfig {
  bubbles: Bubble[];
  canvasWidth: number;
  canvasHeight: number;
  threshold?: number;
  focusBubbleId?: number | null;
}

/**
 * Event callbacks for reactive updates
 */
export interface FlowDataServiceCallbacks {
  onFlowsChanged?: (flows: Flow[]) => void;
  onConfigChanged?: (config: FlowGenerationConfig) => void;
}

/**
 * Main FlowDataService - Coordinates Flow and FlowSegment generation
 * Provides reactive interface for the new Flow/FlowSegment system
 */
export default class FlowDataService {
  private static instance: FlowDataService;
  private flowFactory: FlowFactory;
  private segmentGenerator: FlowSegmentGenerator;
  private viewManager: ViewManager;
  private configManager: ConfigurationManager;
  
  // Current state
  private rawData: FlowData | null = null;
  private currentFlows: Flow[] = [];
  private currentConfig: FlowDataServiceConfig | null = null;
  private callbacks: FlowDataServiceCallbacks = {};

  private constructor() {
    this.flowFactory = FlowFactory.getInstance();
    this.segmentGenerator = FlowSegmentGenerator.getInstance();
    this.viewManager = ViewManager.getInstance();
    this.configManager = ConfigurationManager.getInstance();
    
    // Subscribe to configuration changes for reactive updates
    this.setupReactiveUpdates();
  }

  public static getInstance(): FlowDataService {
    if (!FlowDataService.instance) {
      FlowDataService.instance = new FlowDataService();
    }
    return FlowDataService.instance;
  }

  /**
   * Initialize the service with raw data
   */
  public initialize(rawData: FlowData): void {
    this.rawData = rawData;
    this.regenerateFlows();
  }

  /**
   * Update configuration and regenerate flows
   */
  public updateConfig(config: FlowDataServiceConfig): void {
    this.currentConfig = config;
    this.regenerateFlows();
  }

  /**
   * Set callbacks for reactive updates
   */
  public setCallbacks(callbacks: FlowDataServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current flows with FlowSegments
   */
  public getCurrentFlows(): Flow[] {
    return this.currentFlows;
  }

  /**
   * Get flows filtered by specific criteria
   */
  public getFilteredFlows(filters: {
    view?: 'markets' | 'brands';
    metric?: 'churn' | 'switching' | 'spend';
    flowType?: 'in' | 'out' | 'net' | 'both' | 'more' | 'less';
    focusBubbleId?: number | null;
    threshold?: number;
  }): Flow[] {
    if (!this.rawData || !this.currentConfig) {
      return [];
    }

    const flowConfig: FlowGenerationConfig = {
      view: filters.view || this.viewManager.getViewType(),
      metric: filters.metric || this.configManager.getFlowOption(),
      flowType: filters.flowType || this.configManager.getFlowType() as 'in' | 'out' | 'net' | 'both' | 'more' | 'less',
      focusBubbleId: filters.focusBubbleId !== undefined ? filters.focusBubbleId : this.currentConfig.focusBubbleId,
      threshold: filters.threshold !== undefined ? filters.threshold : this.currentConfig.threshold,
    };

    // Generate flows
    const flows = this.flowFactory.generateFlows(this.rawData, flowConfig);
    const rankedFlows = this.flowFactory.addRankingToFlows(flows);

    // Debug: Log flow generation
    console.log('FlowDataService.getFilteredFlows Debug:', {
      rawDataExists: !!this.rawData,
      flowConfig,
      flowsGenerated: flows.length,
      rankedFlows: rankedFlows.length,
      sampleFlow: flows[0]
    });

    // Generate segments
    const segmentConfig: SegmentGenerationConfig = {
      bubbles: this.currentConfig.bubbles,
      canvasWidth: this.currentConfig.canvasWidth,
      canvasHeight: this.currentConfig.canvasHeight,
    };

    const segmentedFlows = this.segmentGenerator.generateSegments(rankedFlows, segmentConfig);
    
    console.log('FlowSegmentGenerator Debug:', {
      segmentConfig,
      segmentedFlowsCount: segmentedFlows.length,
      sampleSegmentedFlow: segmentedFlows[0]
    });

    return segmentedFlows;
  }

  /**
   * Update specific flow properties
   */
  public updateFlowProperties(flowId: string, updates: Partial<Flow>): void {
    const flowIndex = this.currentFlows.findIndex(flow => flow.id === flowId);
    if (flowIndex >= 0) {
      this.currentFlows[flowIndex] = {
        ...this.currentFlows[flowIndex],
        ...updates
      };
      
      // Trigger callback
      if (this.callbacks.onFlowsChanged) {
        this.callbacks.onFlowsChanged(this.currentFlows);
      }
    }
  }

  /**
   * Highlight flows connected to a specific bubble
   */
  public highlightFlowsForBubble(bubbleId: number | null): void {
    this.currentFlows.forEach(flow => {
      const isConnected = bubbleId === null || 
                         flow.from === bubbleId.toString() || 
                         flow.to === bubbleId.toString();
      
      this.updateFlowProperties(flow.id, { 
        highlighted: isConnected,
        visible: isConnected || bubbleId === null 
      });
    });
  }

  /**
   * Select a specific flow
   */
  public selectFlow(flowId: string | null): void {
    this.currentFlows.forEach(flow => {
      this.updateFlowProperties(flow.id, { 
        selected: flow.id === flowId 
      });
    });
  }

  /**
   * Get flows by view and metric
   */
  public getFlowsByViewAndMetric(
    view: 'markets' | 'brands', 
    metric: 'churn' | 'switching' | 'spend'
  ): Flow[] {
    return this.currentFlows.filter(flow => 
      flow.view === view && flow.metric === metric
    );
  }

  /**
   * Get unique flow types available for current configuration
   */
  public getAvailableFlowTypes(): string[] {
    const currentView = this.viewManager.getViewType();
    const currentMetric = this.configManager.getFlowOption();
    
    if (currentView === 'markets') {
      if (currentMetric === 'spend') {
        return ['more', 'less'];
      } else {
        return ['in', 'out', 'net', 'both'];
      }
    } else {
      return ['in', 'out', 'net', 'both'];
    }
  }

  /**
   * Get flow statistics
   */
  public getFlowStatistics(): {
    totalFlows: number;
    visibleFlows: number;
    averageValue: number;
    maxValue: number;
    minValue: number;
  } {
    const visibleFlows = this.currentFlows.filter(flow => flow.visible);
    const values = visibleFlows.map(flow => flow.abs);
    
    return {
      totalFlows: this.currentFlows.length,
      visibleFlows: visibleFlows.length,
      averageValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      maxValue: values.length > 0 ? Math.max(...values) : 0,
      minValue: values.length > 0 ? Math.min(...values) : 0,
    };
  }

  /**
   * Export current flows data
   */
  public exportFlowsData(): {
    flows: Flow[];
    config: FlowDataServiceConfig | null;
    statistics: any;
  } {
    return {
      flows: this.currentFlows,
      config: this.currentConfig,
      statistics: this.getFlowStatistics(),
    };
  }

  /**
   * Setup reactive updates when configuration changes
   */
  private setupReactiveUpdates(): void {
    // Listen for view changes
    this.viewManager.onViewChange(() => {
      this.regenerateFlows();
    });

    // Listen for configuration changes
    this.configManager.onConfigChange(() => {
      this.regenerateFlows();
    });
  }

  /**
   * Regenerate flows based on current configuration
   */
  private regenerateFlows(): void {
    if (!this.rawData || !this.currentConfig) {
      return;
    }

    try {
      const flowConfig: FlowGenerationConfig = {
        view: this.viewManager.getViewType(),
        metric: this.configManager.getFlowOption(),
        flowType: this.configManager.getFlowType() as 'in' | 'out' | 'net' | 'both' | 'more' | 'less',
        focusBubbleId: this.currentConfig.focusBubbleId,
        threshold: this.currentConfig.threshold,
      };

      // Generate flows
      const flows = this.flowFactory.generateFlows(this.rawData, flowConfig);
      const rankedFlows = this.flowFactory.addRankingToFlows(flows);

      // Generate segments
      const segmentConfig: SegmentGenerationConfig = {
        bubbles: this.currentConfig.bubbles,
        canvasWidth: this.currentConfig.canvasWidth,
        canvasHeight: this.currentConfig.canvasHeight,
      };

      this.currentFlows = this.segmentGenerator.generateSegments(rankedFlows, segmentConfig);

      // Trigger callbacks
      if (this.callbacks.onFlowsChanged) {
        this.callbacks.onFlowsChanged(this.currentFlows);
      }
      
      if (this.callbacks.onConfigChanged) {
        this.callbacks.onConfigChanged(flowConfig);
      }

    } catch (error) {
      console.error('Error regenerating flows:', error);
      this.currentFlows = [];
    }
  }

  /**
   * Clear all data and reset service
   */
  public reset(): void {
    this.rawData = null;
    this.currentFlows = [];
    this.currentConfig = null;
    this.callbacks = {};
  }

  /**
   * Validate flow data integrity
   */
  public validateFlows(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    this.currentFlows.forEach((flow, index) => {
      if (!flow.id) {
        errors.push(`Flow at index ${index} missing ID`);
      }
      
      if (!flow.from || !flow.to) {
        errors.push(`Flow ${flow.id} missing from/to properties`);
      }
      
      if (flow.flowSegments.length === 0) {
        errors.push(`Flow ${flow.id} has no segments`);
      }
      
      flow.flowSegments.forEach((segment, segIndex) => {
        if (!segment.id) {
          errors.push(`Segment ${segIndex} in flow ${flow.id} missing ID`);
        }
        
        if (!segment.startPoint || !segment.endPoint) {
          errors.push(`Segment ${segment.id} missing start/end points`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}