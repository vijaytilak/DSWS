import * as d3 from 'd3';
import { Bubble, Flow } from '../types';
import { RenderingRules } from './RenderingRules';
import { BubbleRenderer } from '../renderers/BubbleRenderer';
import { FlowRenderer } from '../renderers/FlowRenderer';
import { TooltipManager } from '../renderers/TooltipManager';
import { InteractionManager } from '../renderers/InteractionManager';
import { ConfigurationManager } from '../config/ConfigurationManager';

/**
 * Interface for visualization manager initialization
 */
export interface VisualizationManagerInitConfig {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  onBubbleClick?: (bubble: Bubble) => void;
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
}

/**
 * VisualizationManager class
 * Manages the visualization of flows and bubbles using dependency injection
 */
export class VisualizationManager {
  private static instance: VisualizationManager;
  
  // Core components
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private svgElement: SVGSVGElement | null = null;
  private width: number = 800;
  private height: number = 600;
  
  // Injected dependencies
  private bubbleRenderer: BubbleRenderer;
  private flowRenderer: FlowRenderer;
  private tooltipManager: TooltipManager;
  private interactionManager: InteractionManager;
  private configManager: ConfigurationManager;
  private renderingRules: RenderingRules;
  
  // State
  private bubbles: Bubble[] = [];
  private flows: Flow[] = [];
  private flowType: string = 'net';
  private flowOption: 'churn' | 'switching' = 'churn';
  private focusBubbleId: number | null = null;
  private centreFlow: boolean = false;
  private isMarketView: boolean = true;
  private focusedFlow: { from: number; to: number } | null = null;
  private themeObserver: MutationObserver;
  
  // Callbacks
  private onBubbleClickCallback: ((bubble: Bubble) => void) | null = null;
  private onFlowClickCallback: ((flow: Flow, source: Bubble, target: Bubble) => void) | null = null;

  /**
   * Constructor with dependency injection
   */
  constructor(
    bubbleRenderer: BubbleRenderer,
    flowRenderer: FlowRenderer,
    tooltipManager: TooltipManager,
    interactionManager: InteractionManager,
    configManager: ConfigurationManager,
    renderingRules: RenderingRules
  ) {
    this.bubbleRenderer = bubbleRenderer;
    this.flowRenderer = flowRenderer;
    this.tooltipManager = tooltipManager;
    this.interactionManager = interactionManager;
    this.configManager = configManager;
    this.renderingRules = renderingRules;
    
    // Create theme observer to handle theme changes
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) {
          const isDarkTheme = document.documentElement.classList.contains('dark');
          this.tooltipManager.updateTheme(isDarkTheme);
          
          // Update rendering rules for dark/light theme
          this.updateThemeColors(isDarkTheme);
          
          // Re-render visualization with updated theme
          this.render();
        }
      });
    });
  }

  /**
   * Get the singleton instance of VisualizationManager
   * Note: This is maintained for backward compatibility
   * In new code, use dependency injection instead
   */
  public static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      throw new Error('VisualizationManager not initialized. Use DependencyContainer to get an instance.');
    }
    return VisualizationManager.instance;
  }

  /**
   * Set the singleton instance
   * Used by DependencyContainer for backward compatibility
   */
  public static setInstance(instance: VisualizationManager): void {
    VisualizationManager.instance = instance;
  }

  /**
   * Initialize the visualization with an SVG element
   */
  public initialize(config: VisualizationManagerInitConfig): void {
    this.svgElement = config.svgElement;
    this.svg = d3.select(config.svgElement);
    this.width = config.width;
    this.height = config.height;
    
    // Set callbacks
    this.onBubbleClickCallback = config.onBubbleClick || null;
    this.onFlowClickCallback = config.onFlowClick || null;
    
    // Initialize renderers
    this.bubbleRenderer.initialize({
      svg: this.svg,
      onBubbleClick: (bubble) => this.handleBubbleClick(bubble)
    });
    
    this.flowRenderer.initialize({
      svg: this.svg,
      onFlowClick: (flow, source, target) => this.handleFlowClick(flow, source, target)
    });
    
    this.tooltipManager.initialize({
      container: document.body,
      isDarkTheme: document.documentElement.classList.contains('dark'),
      flowOption: this.flowOption
    });
    
    this.interactionManager.initialize({
      svg: this.svg,
      onBubbleClick: (bubble) => this.handleBubbleClick(bubble),
      onFlowClick: (flow, source, target) => this.handleFlowClick(flow, source, target)
    });
    
    // Start observing theme changes
    this.themeObserver.observe(document.documentElement, { attributes: true });
  }

  /**
   * Update the visualization with new data
   */
  public update(
    bubbles: Bubble[],
    flows: Flow[],
    flowType: string = 'net',
    focusBubbleId: number | null = null,
    centreFlow: boolean = false,
    isMarketView: boolean = true,
    flowOption: 'churn' | 'switching' = 'churn',
    focusedFlow: { from: number; to: number } | null = null
  ): void {
    this.bubbles = bubbles;
    this.flows = flows;
    this.flowType = flowType;
    this.focusBubbleId = focusBubbleId;
    this.centreFlow = centreFlow;
    this.isMarketView = isMarketView;
    this.flowOption = flowOption;
    this.focusedFlow = focusedFlow;
    
    // Update tooltip manager with flow option
    this.tooltipManager.updateFlowOption(flowOption);
    
    // Render the visualization
    this.render();
  }

  /**
   * Render the visualization
   */
  public render(): void {
    if (!this.svg) return;
    
    // Clear previous rendering
    this.bubbleRenderer.clear();
    this.flowRenderer.clear();
    
    // Get the current theme
    const isDarkTheme = document.documentElement.classList.contains('dark');
    
    // Render bubbles
    this.bubbleRenderer.renderBubbles(
      this.bubbles,
      this.focusBubbleId,
      this.isMarketView,
      isDarkTheme
    );
    
    // Note: Bubble labels are rendered as part of renderBubbles in the updated implementation
    
    // Render flows
    this.flowRenderer.renderFlows(
      this.flows,
      this.bubbles,
      this.flowType,
      this.focusedFlow
    );
  }

  /**
   * Update theme colors based on dark/light mode
   */
  private updateThemeColors(isDarkTheme: boolean): void {
    // Update rendering rules for theme
    // Use default configuration with theme-specific overrides
    const config = this.configManager.getConfiguration();
    // Apply theme-specific settings if needed
    this.renderingRules.updateConfig({
      ...config,
      isDarkTheme
    });
  }

  /**
   * Handle flow click event
   */
  private handleFlowClick(flow: Flow, source: Bubble, target: Bubble): void {
    if (this.onFlowClickCallback) {
      this.onFlowClickCallback(flow, source, target);
    }
  }

  /**
   * Handle bubble click event
   */
  private handleBubbleClick(bubble: Bubble): void {
    if (this.onBubbleClickCallback) {
      this.onBubbleClickCallback(bubble);
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  public cleanup(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  /**
   * Resize the visualization
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    if (this.svg) {
      this.svg
        .attr('width', width)
        .attr('height', height);
      
      this.render();
    }
  }
  
  /**
   * Update references for backward compatibility with existing code
   * @param svg D3 selection of SVG element
   * @param bubbles Array of bubbles
   * @param isMarketView Whether the current view is market view
   */
  public updateReferences(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bubbles: Bubble[],
    isMarketView: boolean
  ): void {
    this.svg = svg;
    this.bubbles = bubbles;
    this.isMarketView = isMarketView;
    
    // Update the bubble renderer with new references
    this.bubbleRenderer.initialize({
      svg: this.svg,
      onBubbleClick: (bubble) => this.handleBubbleClick(bubble)
    });
    
    // Update the flow renderer with new references
    this.flowRenderer.initialize({
      svg: this.svg,
      onFlowClick: (flow, source, target) => this.handleFlowClick(flow, source, target)
    });
  }

  // Getters for state
  public getBubbles(): Bubble[] {
    return this.bubbles;
  }

  public getFlows(): Flow[] {
    return this.flows;
  }

  public getFlowType(): string {
    return this.flowType;
  }

  public getFocusBubbleId(): number | null {
    return this.focusBubbleId;
  }

  public getIsMarketView(): boolean {
    return this.isMarketView;
  }

  // Setters for callbacks
  public setOnBubbleClick(callback: (bubble: Bubble) => void): void {
    this.onBubbleClickCallback = callback;
  }

  public setOnFlowClick(callback: (flow: Flow, source: Bubble, target: Bubble) => void): void {
    this.onFlowClickCallback = callback;
  }
}
