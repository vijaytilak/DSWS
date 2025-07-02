import * as d3 from 'd3';
import { createTooltip, updateTooltipTheme } from '../tooltip';
import type { Bubble, Flow } from '../../types';
import { FlowRenderer } from '../../core/FlowRenderer';
import { RenderingRules, RenderingRuleConfig } from '../../core/RenderingRules';
import ThemeManager from '../../services/ThemeManager';
import ViewManager from '../../services/ViewManager';
import FlowManager from '../../services/FlowManager';

/**
 * Singleton class that manages the visualization of flows and bubbles
 * Refactored to use the new Flow Rendering Engine
 */
class VisualizationManager {
  private static instance: VisualizationManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private svgElement: SVGSVGElement | null = null;
  private flowRenderer: FlowRenderer | null = null;
  private bubbles: Bubble[] = [];
  private flows: Flow[] = [];
  private themeManager: ThemeManager;
  private viewManager: ViewManager;
  private flowManager: FlowManager;
  private flowType: string = 'net';
  private flowOption: 'churn' | 'switching' = 'churn';
  private focusBubbleId: number | null = null;
  private centreFlow: boolean = false;
  private width: number = 800;
  private height: number = 600;
  private renderingRules: RenderingRules;
  private focusedFlow: { from: number; to: number } | null = null;
  private onBubbleClickCallback: ((bubble: Bubble) => void) | null = null;
  private onFlowClickCallback: ((flow: Flow) => void) | null = null;

  private constructor() {
    this.renderingRules = new RenderingRules();
    this.viewManager = ViewManager.getInstance();
    this.themeManager = ThemeManager.getInstance();
    this.flowManager = FlowManager.getInstance();
    
    // Subscribe to theme changes from ThemeManager
    this.themeManager.onThemeChange((isDark: boolean) => {
      if (this.svg) {
        updateTooltipTheme(isDark);
        
        // Update rendering rules for dark/light theme
        this.updateThemeColors(isDark);
        
        // Re-render visualization with updated theme
        this.render();
      }
    });
  }

  /**
   * Get the singleton instance of VisualizationManager
   */
  public static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  /**
   * Initialize the visualization with an SVG element
   */
  public initialize(svgElement: SVGSVGElement, width: number, height: number): void {
    this.svgElement = svgElement;
    this.svg = d3.select(svgElement);
    this.width = width;
    this.height = height;
    
    // Initialize the flow renderer
    if (this.svgElement) {
      this.flowRenderer = new FlowRenderer({
        svgElement: this.svgElement,
        width: this.width,
        height: this.height,
        renderingRules: this.renderingRules.getConfig(),
        onFlowClick: (flow, source, target) => this.handleFlowClick(flow, source, target),
        onBubbleClick: (bubble) => this.handleBubbleClick(bubble)
      });
    }
    
    // Initialize tooltip
    // Get theme from ThemeManager
    const isDarkTheme = this.themeManager.isDark();
    createTooltip(isDarkTheme);
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
    // Update view manager with the provided view type
    this.viewManager.setViewType(isMarketView ? 'markets' : 'brands');
    this.flowOption = flowOption;
    this.focusedFlow = focusedFlow;
    
    // Update theme colors
    // Update theme colors based on current theme
    this.updateThemeColors(this.themeManager.isDark());
    
    // Render the visualization
    this.render();
  }

  /**
   * Render the visualization using the Flow Renderer
   */
  private render(): void {
    if (!this.flowRenderer || !this.svg) {
      return;
    }
    
    // Process flows through FlowManager before rendering
    const flowsData = { flows: this.flows as any[] };
    
    this.flowManager.processFlows(
      flowsData,
      this.flowType,
      this.flowOption,
      0, // threshold
      this.focusBubbleId,
      this.centreFlow
    ).then(processedFlows => {
      // Render the visualization with processed flows
      if (this.flowRenderer) {
        this.flowRenderer.render(
          processedFlows,
          this.bubbles,
          this.flowType,
          this.focusBubbleId,
          this.centreFlow,
          this.viewManager.isMarketView(),
          this.flowOption,
          this.focusedFlow
        );
      }
    }).catch(error => {
      console.error('Error processing flows:', error);
      // Fallback to direct rendering if flow processing fails
      if (this.flowRenderer) {
        this.flowRenderer.render(
          this.flows,
          this.bubbles,
          this.flowType,
          this.focusBubbleId,
          this.centreFlow,
          this.viewManager.isMarketView(),
          this.flowOption,
          this.focusedFlow
        );
      }
    });
    
    // Render bubbles
    this.renderBubbles();
    
    // Initialize force simulation for bubble positioning if needed
    if (this.bubbles.some(b => b.x === undefined || b.y === undefined)) {
      this.flowRenderer.initializeSimulation(this.bubbles);
    }
  }

  /**
   * Render bubbles
   */
  public renderBubbles(): void {
    // Logic to render bubbles
    if (this.svg) {
      // Render bubbles using the viewManager for view type
      console.log(`Rendering bubbles with view type: ${this.viewManager.getViewType()}`);
    }
  }

  /**
   * Update theme colors based on dark/light mode
   */
  private updateThemeColors(isDarkTheme: boolean): void {
    if (!this.renderingRules) {
      return;
    }
    
    const config: Partial<RenderingRuleConfig> = {
      bubbleColors: {
        default: isDarkTheme ? '#444444' : '#e0e0e0',
        focused: isDarkTheme ? '#666666' : '#c0c0c0',
        related: isDarkTheme ? '#555555' : '#d0d0d0'
      },
      labelConfig: {
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        color: isDarkTheme ? '#ffffff' : '#333333',
        focusedColor: isDarkTheme ? '#ffffff' : '#000000'
      }
    };
    
    this.renderingRules.updateConfig(config);
    
    // Update flow renderer with new rendering rules
    if (this.flowRenderer) {
      this.flowRenderer.updateConfig({
        renderingRules: this.renderingRules.getConfig()
      });
    }
  }

  /**
   * Handle flow click event
   */
  private handleFlowClick(flow: Flow, source: Bubble, target: Bubble): void {
    // Set focused flow
    this.focusedFlow = {
      from: flow.from,
      to: flow.to
    };
    
    // Call the callback if it exists
    if (this.onFlowClickCallback) {
      this.onFlowClickCallback(flow);
    }
    
    // Re-render with focused flow
    this.render();
  }

  /**
   * Handle bubble click event
   */
  private handleBubbleClick(bubble: Bubble): void {
    // Set focus bubble
    this.focusBubbleId = bubble.id;
    
    // Reset focused flow
    this.focusedFlow = null;
    
    // Call the callback if it exists
    if (this.onBubbleClickCallback) {
      this.onBubbleClickCallback(bubble);
    }
    
    // Re-render with focused bubble
    this.render();
  }

  /**
   * Clean up resources when component unmounts
   */
  public cleanup(): void {
    if (this.flowRenderer) {
      this.flowRenderer.clear();
    }
    
    this.svg = null;
    this.svgElement = null;
    this.flowRenderer = null;
  }

  /**
   * Resize the visualization
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    if (this.flowRenderer) {
      this.flowRenderer.updateConfig({
        width,
        height
      });
    }
    
    this.render();
  }

  /**
   * Get the current bubbles
   */
  public getBubbles(): Bubble[] {
    return this.bubbles;
  }

  /**
   * Get the current flows
   */
  public getFlows(): Flow[] {
    return this.flows;
  }

  /**
   * Get the current flow type
   */
  public getFlowType(): string {
    return this.flowType;
  }

  /**
   * Get the current focus bubble ID
   */
  public getFocusBubbleId(): number | null {
    return this.focusBubbleId;
  }

  /**
   * Set view type (market or brand)
   */
  setViewType(isMarketView: boolean): void {
    // Update view manager with new view type
    this.viewManager.setViewType(isMarketView ? 'markets' : 'brands');
    
    // Update rendering rules for the new view type
    this.renderingRules.updateConfig({
      viewType: isMarketView ? 'market' : 'brand'
    });
    
    if (this.flowRenderer) {
      // Flow renderer should also be updated with the new view type
      // We'll need to modify FlowRenderer to add this method if it doesn't exist
      // this.flowRenderer.setViewType(isMarketView);
      
      // For now, re-render to apply the change
      this.render();
    }
  }

  /**
   * Set the bubble click callback
   */
  public setOnBubbleClick(callback: (bubble: Bubble) => void): void {
    this.onBubbleClickCallback = callback;
  }

  /**
   * Set the flow click callback
   */
  public setOnFlowClick(callback: (flow: Flow) => void): void {
    this.onFlowClickCallback = callback;
  }

  /**
   * Update tooltip theme
   */
  private updateTooltipWithTheme(): void {
    if (this.svg) {
      updateTooltipTheme(this.themeManager.isDark());
    }
  }
}

export default VisualizationManager;
