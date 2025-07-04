import { Bubble } from '../types';
import type { Flow } from '../services/FlowFactory';
// FlowIntegrationProcessor removed - using FlowDataService directly
import { DataAdapter } from '../adapters/DataAdapter';
import { prepareBubbleData } from '../utils/bubble-utils';

/**
 * Interface for visualization state options
 */
export interface VisualizationStateOptions {
  flowType: string;
  flowOption: 'churn' | 'switching';
  isMarketView: boolean;
  focusBubbleId: number | null;
  centreFlow: boolean;
  threshold: number;
  focusedFlow: { from: number; to: number } | null;
}

/**
 * Default visualization state options
 */
export const DEFAULT_VISUALIZATION_OPTIONS: VisualizationStateOptions = {
  flowType: 'net',
  flowOption: 'churn',
  isMarketView: true,
  focusBubbleId: null,
  centreFlow: false,
  threshold: 0,
  focusedFlow: null
};

/**
 * Class that manages the state of the visualization
 * Provides methods to update state and retrieve processed data
 */
export class VisualizationState {
  private options: VisualizationStateOptions;
  private dataAdapter: DataAdapter;
  // flowProcessor removed - using FlowDataService directly
  private bubbles: Bubble[] = [];
  private flows: Flow[] = [];
  private listeners: Array<() => void> = [];
  
  constructor(
    dataAdapter: DataAdapter,
    options: Partial<VisualizationStateOptions> = {}
  ) {
    this.options = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };
    this.dataAdapter = dataAdapter;
    // flowProcessor initialization removed - using FlowDataService directly
    
    // Initialize data
    this.processData();
  }
  
  /**
   * Process data based on current options
   */
  private async processData(): Promise<void> {
    const {
      flowType,
      flowOption,
      isMarketView,
      focusBubbleId,
      centreFlow,
      threshold
    } = this.options;
    
    try {
      // Get the loaded data which includes bubbles
      const data = this.dataAdapter.getData();
      
      // Prepare bubble data using the utility function
      // Using default values for positioning - these should be provided from component
      const positionCircleRadius = 300; // Default value
      const noOfBubbles = data.bubbles.length;
      const { bubbles } = prepareBubbleData(data, positionCircleRadius, noOfBubbles);
      this.bubbles = bubbles;
      
      // Process flow data using DataAdapter
      if (isMarketView) {
        this.flows = await this.dataAdapter.processMarketFlowData(
          flowType,
          flowOption,
          focusBubbleId,
          threshold,
          centreFlow
        );
      } else {
        this.flows = await this.dataAdapter.processBrandFlowData(
          flowType,
          flowOption,
          focusBubbleId,
          threshold,
          centreFlow
        );
      }
      
      // Notify listeners of state change
      this.notifyListeners();
    } catch (error) {
      console.error('Error processing visualization data:', error);
    }
  }
  
  /**
   * Get the current bubbles
   */
  getBubbles(): Bubble[] {
    return this.bubbles;
  }
  
  /**
   * Get the current flows
   */
  getFlows(): Flow[] {
    return this.flows;
  }
  
  /**
   * Get the current options
   */
  getOptions(): VisualizationStateOptions {
    return { ...this.options };
  }
  
  /**
   * Update options and reprocess data
   */
  async updateOptions(options: Partial<VisualizationStateOptions>): Promise<void> {
    this.options = { ...this.options, ...options };
    await this.processData();
  }
  
  /**
   * Set the flow type
   */
  async setFlowType(flowType: string): Promise<void> {
    await this.updateOptions({ flowType });
  }
  
  /**
   * Set the flow option
   */
  async setFlowOption(flowOption: 'churn' | 'switching'): Promise<void> {
    await this.updateOptions({ flowOption });
  }
  
  /**
   * Set the view type
   */
  async setIsMarketView(isMarketView: boolean): Promise<void> {
    await this.updateOptions({ isMarketView });
  }
  
  /**
   * Set the focus bubble ID
   */
  async setFocusBubbleId(focusBubbleId: number | null): Promise<void> {
    await this.updateOptions({ focusBubbleId });
  }
  
  /**
   * Set the centre flow option
   */
  async setCentreFlow(centreFlow: boolean): Promise<void> {
    await this.updateOptions({ centreFlow });
  }
  
  /**
   * Set the threshold
   */
  async setThreshold(threshold: number): Promise<void> {
    await this.updateOptions({ threshold });
  }
  
  /**
   * Set the focused flow
   */
  async setFocusedFlow(focusedFlow: { from: number; to: number } | null): Promise<void> {
    await this.updateOptions({ focusedFlow });
  }
  
  /**
   * Add a listener for state changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Return a function to remove the listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Reset the state to default options
   */
  async reset(): Promise<void> {
    this.options = { ...DEFAULT_VISUALIZATION_OPTIONS };
    await this.processData();
  }
  
  /**
   * Get a bubble by ID
   */
  getBubbleById(id: number): Bubble | undefined {
    return this.bubbles.find(bubble => bubble.id === id);
  }
  
  /**
   * Get a flow by source and target IDs
   */
  getFlowByIds(fromId: string, toId: string): Flow | undefined {
    return this.flows.find(flow => flow.from === fromId && flow.to === toId);
  }
  
  /**
   * Get flows connected to a bubble
   */
  getFlowsForBubble(bubbleId: string): Flow[] {
    return this.flows.filter(flow => flow.from === bubbleId || flow.to === bubbleId);
  }
}
