import * as d3 from 'd3';
import { Bubble } from '../types';
import type { Flow } from '../services/FlowFactory';
import { RenderingRules } from './RenderingRules';
import { BubbleRenderer } from '../renderers/BubbleRenderer';
import { ModernFlowRenderer } from '../renderers/ModernFlowRenderer';
import { TooltipManager } from '../renderers/TooltipManager';
// InteractionManager removed - using EventManager directly
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
  private flowRenderer: ModernFlowRenderer | null = null;
  private tooltipManager: TooltipManager;
  // interactionManager removed - using EventManager directly
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
    tooltipManager: TooltipManager,
    configManager: ConfigurationManager,
    renderingRules: RenderingRules
  ) {
    this.bubbleRenderer = bubbleRenderer;
    this.tooltipManager = tooltipManager;
    this.configManager = configManager;
    this.renderingRules = renderingRules;
    // flowRenderer will be initialized when SVG is set
    
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
    
    // Create ModernFlowRenderer with SVG
    this.flowRenderer = new ModernFlowRenderer({
      svg: this.svg,
      width: this.width,
      height: this.height,
      onFlowClick: (flow, segment) => this.handleModernFlowClick(flow, segment)
    });
    
    this.tooltipManager.initialize({
      container: document.body,
      flowOption: this.flowOption
    });
    
    // interactionManager initialization removed - events handled directly by EventManager
    
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
  /**
   * Update the internal data state
   */
  public updateData(bubbles: Bubble[], flows: Flow[]): void {
    this.bubbles = bubbles;
    this.flows = flows;
  }

  public render(): void {
    if (!this.svg) return;
    
    // Complete SVG clear - remove all children to ensure clean slate
    this.svg.selectAll('*').remove();
    
    // Re-initialize containers after complete clear
    this.bubbleRenderer.initialize({
      svg: this.svg,
      onBubbleClick: (bubble) => this.handleBubbleClick(bubble)
    });
    
    // Re-initialize flow renderer containers after SVG clear
    if (this.flowRenderer) {
      this.flowRenderer = new ModernFlowRenderer({
        svg: this.svg,
        width: this.width,
        height: this.height,
        onFlowClick: (flow, segment) => this.handleModernFlowClick(flow, segment)
      });
    }
    
    // Clear individual renderers (this will now be redundant but keeping for consistency)
    this.bubbleRenderer.clear();
    if (this.flowRenderer) {
      this.flowRenderer.clearHighlights();
    }
    
    // Get the current theme
    const isDarkTheme = document.documentElement.classList.contains('dark');
    
    // Render bubbles
    this.bubbleRenderer.renderBubbles(
      this.bubbles,
      this.focusBubbleId,
      this.isMarketView
    );
    
    // Note: Bubble labels are rendered as part of renderBubbles in the updated implementation
    
    // Render flows
    if (this.flowRenderer) {
      this.flowRenderer.render(this.flows);
    }
  }

  /**
   * Update theme colors based on dark/light mode
   */
  private updateThemeColors(isDarkTheme: boolean): void {
    // Update rendering rules for theme
    // Use default configuration with theme-specific overrides
    const config = this.configManager.getRenderingConfig();
    // Apply theme-specific settings if needed
    this.renderingRules.updateConfig(config);
  }

  /**
   * Handle flow click event from legacy renderer
   */
  private handleFlowClick(flow: Flow, source: Bubble, target: Bubble): void {
    if (this.onFlowClickCallback) {
      this.onFlowClickCallback(flow, source, target);
    }
  }

  /**
   * Handle flow click event from modern renderer
   */
  private handleModernFlowClick(flow: Flow, segment: any): void {
    if (this.onFlowClickCallback) {
      // Find source and target bubbles
      const source = this.bubbles.find(b => b.id.toString() === flow.from);
      const target = this.bubbles.find(b => b.id.toString() === flow.to);
      if (source && target) {
        this.onFlowClickCallback(flow, source, target);
      }
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
    
    // Clear all SVG content
    if (this.svg) {
      this.svg.selectAll('*').remove();
    }
    
    // Clear renderer states
    this.bubbleRenderer.clear();
    if (this.flowRenderer) {
      this.flowRenderer.clearHighlights();
    }
    
    // Reset state
    this.bubbles = [];
    this.flows = [];
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
    
    // Flow renderer doesn't need to be re-initialized
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
