import * as d3 from 'd3';
import type { Bubble, Flow } from '../../types';
import { RenderingRules, RenderingRuleConfig } from '../../core/RenderingRules';
import { BubbleRenderer } from '../../renderers/BubbleRenderer';
import { FlowRenderer } from '../../renderers/FlowRenderer';
import { TooltipManager } from '../../renderers/TooltipManager';
import { InteractionManager } from '../../renderers/InteractionManager';
import { DependencyContainer } from '../../core/DependencyContainer';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import ViewManager from '../../services/ViewManager';

/**
 * Singleton class that manages the visualization of flows and bubbles
 * Uses modular renderers for improved maintainability
 */
class VisualizationManager {
  private static instance: VisualizationManager;
  private svgElement: SVGSVGElement | null = null;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private renderingRules: RenderingRules;
  private bubbleRenderer: BubbleRenderer | null = null;
  private flowRenderer: FlowRenderer | null = null;
  private tooltipManager: TooltipManager | null = null;
  private interactionManager: InteractionManager | null = null;
  private themeObserver: MutationObserver;
  
  // Visualization state
  private bubbles: Bubble[] = [];
  private flows: Flow[] = [];
  private viewManager: ViewManager;
  private isDarkTheme: boolean = false;
  private flowType: string = 'net';
  private flowOption: 'churn' | 'switching' = 'churn';
  private focusBubbleId: number | null = null;
  private centreFlow: boolean = false;
  private width: number = 800;
  private height: number = 600;
  private focusedFlow: { from: number; to: number } | null = null;
  
  // Callbacks
  private onBubbleClickCallback: ((bubble: Bubble) => void) | null = null;
  private onFlowClickCallback: ((flow: Flow) => void) | null = null;

  private constructor() {
    // Get dependencies from container
    const container = DependencyContainer.getInstance();
    this.renderingRules = container.resolve<RenderingRules>('renderingRules');
    this.viewManager = ViewManager.getInstance();
    
    // Create theme observer to handle theme changes
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) {
          const isDarkTheme = document.documentElement.classList.contains('dark');
          this.isDarkTheme = isDarkTheme;
          
          // Update tooltip theme
          if (this.tooltipManager) {
            this.tooltipManager.updateTheme(isDarkTheme);
          }
          
          // Update configuration for dark/light theme
          const configManager = container.resolve<ConfigurationManager>('configManager');
          configManager.applyTheme(isDarkTheme);
          
          // Update rendering rules for dark/light theme
          this.updateThemeColors(isDarkTheme);
          
          // Re-render visualization with updated theme
          this.render();
        }
      });
    });
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  /**
   * Initialize the visualization manager
   */
  initialize(svgElement: SVGSVGElement, width: number, height: number): void {
    this.svgElement = svgElement;
    this.svg = d3.select(svgElement);
    this.width = width;
    this.height = height;
    
    // Clear SVG
    this.svg.selectAll('*').remove();
    
    // Initialize renderers
    this.initializeRenderers();
    
    // Start observing theme changes
    this.themeObserver.observe(document.documentElement, { attributes: true });
    
    // Set initial theme
    this.isDarkTheme = document.documentElement.classList.contains('dark');
    this.updateThemeColors(this.isDarkTheme);
  }

  /**
   * Initialize renderers
   */
  private initializeRenderers(): void {
    if (!this.svg || !this.svgElement) return;
    
    // Get dependencies from container
    const container = DependencyContainer.getInstance();
    
    // Get renderers from container
    this.bubbleRenderer = container.resolve<BubbleRenderer>('bubbleRenderer');
    this.bubbleRenderer.initialize({
      svg: this.svg,
      onBubbleClick: this.handleBubbleClick.bind(this)
    });
    
    this.flowRenderer = container.resolve<FlowRenderer>('flowRenderer');
    this.flowRenderer.initialize({
      svg: this.svg,
      onFlowClick: this.handleFlowClick.bind(this)
    });
    
    this.tooltipManager = container.resolve<TooltipManager>('tooltipManager');
    this.tooltipManager.initialize({
      container: this.svgElement.parentElement,
      isDarkTheme: this.isDarkTheme,
      flowOption: this.flowOption
    });
    
    this.interactionManager = container.resolve<InteractionManager>('interactionManager');
    this.interactionManager.initialize({
      svg: this.svg,
      onBubbleClick: this.handleBubbleClick.bind(this),
      onFlowClick: this.handleFlowClick.bind(this)
    });
  }

  /**
   * Update theme colors in rendering rules
   */
  private updateThemeColors(isDarkTheme: boolean): void {
    const theme = isDarkTheme ? 'dark' : 'light';
    
    // Update rendering rules with theme-specific colors
    this.renderingRules.updateConfig({
      theme: theme,
      flowColors: {
        inflow: isDarkTheme ? '#4CAF50' : '#2E7D32',
        outflow: isDarkTheme ? '#F44336' : '#C62828',
        positive: isDarkTheme ? '#4CAF50' : '#2E7D32',
        negative: isDarkTheme ? '#F44336' : '#C62828',
        neutral: isDarkTheme ? '#9E9E9E' : '#616161'
      },
      bubbleColors: {
        default: isDarkTheme ? '#424242' : '#E0E0E0',
        focused: isDarkTheme ? '#2196F3' : '#1976D2',
        related: isDarkTheme ? '#90CAF9' : '#64B5F6'
      },
      labelConfig: {
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        color: isDarkTheme ? '#FFFFFF' : '#000000',
        focusedColor: isDarkTheme ? '#FFFFFF' : '#000000'
      }
    });
  }

  /**
   * Set data for visualization
   */
  setData(bubbles: Bubble[], flows: Flow[]): void {
    this.bubbles = bubbles;
    this.flows = flows;
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
  }

  /**
   * Set flow type
   */
  setFlowType(flowType: string): void {
    this.flowType = flowType;
  }

  /**
   * Set flow option
   */
  setFlowOption(flowOption: 'churn' | 'switching'): void {
    this.flowOption = flowOption;
    
    // Update tooltip manager
    if (this.tooltipManager) {
      this.tooltipManager.updateFlowOption(flowOption);
    }
  }

  /**
   * Set focus bubble ID
   */
  setFocusBubbleId(focusBubbleId: number | null): void {
    this.focusBubbleId = focusBubbleId;
  }

  /**
   * Set focused flow
   */
  setFocusedFlow(focusedFlow: { from: number; to: number } | null): void {
    this.focusedFlow = focusedFlow;
  }

  /**
   * Set centre flow flag
   */
  setCentreFlow(centreFlow: boolean): void {
    this.centreFlow = centreFlow;
  }

  /**
   * Set bubble click callback
   */
  setOnBubbleClick(callback: (bubble: Bubble) => void): void {
    this.onBubbleClickCallback = callback;
  }

  /**
   * Set flow click callback
   */
  setOnFlowClick(callback: (flow: Flow) => void): void {
    this.onFlowClickCallback = callback;
  }

  /**
   * Handle bubble click
   */
  private handleBubbleClick(bubble: Bubble): void {
    if (this.onBubbleClickCallback) {
      this.onBubbleClickCallback(bubble);
    }
  }

  /**
   * Handle flow click
   */
  private handleFlowClick(flow: Flow, source: Bubble, target: Bubble): void {
    if (this.onFlowClickCallback) {
      this.onFlowClickCallback(flow);
    }
  }

  /**
   * Render visualization
   */
  render(): void {
    if (!this.bubbleRenderer || !this.flowRenderer || !this.interactionManager) return;
    
    // Render flows
    this.flowRenderer.renderFlows(
      this.flows,
      this.bubbles,
      this.flowType,
      this.focusedFlow
    );
    
    // Render bubbles
    this.bubbleRenderer.renderBubbles(
      this.bubbles,
      this.focusBubbleId,
      this.viewManager.isMarketView(),
      this.isDarkTheme
    );
    
    // Register interactions
    this.interactionManager.registerBubbles(this.bubbles);
    this.interactionManager.registerFlows(this.flows);
  }

  /**
   * Clear visualization
   */
  clear(): void {
    if (this.bubbleRenderer) {
      this.bubbleRenderer.clear();
    }
    
    if (this.flowRenderer) {
      this.flowRenderer.clear();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Stop observing theme changes
    this.themeObserver.disconnect();
    
    // Clear visualization
    this.clear();
    
    // Remove all event listeners
    if (this.svg) {
      this.svg.selectAll('*').on('*', null);
    }
  }
}

export default VisualizationManager;
