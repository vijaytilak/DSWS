import * as d3 from 'd3';
import { Bubble, Flow } from '../types';
import ThemeManager from '../services/ThemeManager';
import { formatNumber } from '../utils/format';
import ViewManager from '../services/ViewManager';

/**
 * Interface for tooltip configuration
 */
export interface TooltipConfig {
  minWidth?: string;
  maxWidth?: string;
  padding?: string;
  zIndex?: string;
  fontSize?: string;
}

/**
 * Interface for tooltip initialization
 */
export interface TooltipInitConfig {
  container: HTMLElement | null;
  flowOption?: 'churn' | 'switching';
  config?: TooltipConfig;
}

/**
 * Type for tooltip data
 */
type TooltipDatum = {
  content?: string;
};

/**
 * TooltipManager class
 * Handles creation and management of tooltips for bubbles and flows
 * Serves as the central tooltip system for the entire application
 */
export class TooltipManager {
  private tooltip: d3.Selection<HTMLDivElement, TooltipDatum, any, any> | null = null;
  private container: HTMLElement | null = null;
  private themeManager: ThemeManager;
  private viewManager: ViewManager;
  private flowOption: 'churn' | 'switching' = 'churn';
  private defaultConfig: TooltipConfig = {
    minWidth: '200px',
    maxWidth: '300px',
    padding: '8px 10px',
    zIndex: '1000',
    fontSize: '12px'
  };
  
  constructor(themeManager: ThemeManager, viewManager: ViewManager) {
    this.themeManager = themeManager;
    this.viewManager = viewManager;
  }
  
  
  /**
   * Initialize the tooltip manager with container and theme
   */
  initialize(config: TooltipInitConfig): void {
    this.container = config.container;
    this.flowOption = config.flowOption || 'churn';
    
    // Merge default config with provided config
    const mergedConfig = { ...this.defaultConfig, ...(config.config || {}) };
    this.createTooltip(mergedConfig);
    
    // Subscribe to theme changes
    this.themeManager.onThemeChange(this.updateTheme.bind(this));
  }
  
  /**
   * Create tooltip container
   */
  private createTooltip(config: TooltipConfig): void {
    if (!this.container) return;
    
    // Remove any existing tooltip
    d3.select('.tooltip').remove();
    
    try {
      // Create new tooltip
      this.tooltip = d3.select(this.container)
        .append('div')
        .datum<TooltipDatum>({ content: '' })
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('opacity', '0')
        .style('background-color', this.themeManager.getThemedColor('rgba(255, 255, 255, 0.8)', 'rgba(0, 0, 0, 0.8)'))
        .style('color', this.themeManager.getThemedColor('#333', '#fff'))
        .style('border', `1px solid ${this.themeManager.getThemedColor('#ddd', '#333')}`)
        .style('border-radius', '4px')
        .style('padding', config.padding || '8px 10px')
        .style('font-size', config.fontSize || '12px')
        .style('font-weight', '400')
        .style('line-height', '1.3')
        .style('letter-spacing', '0.01em')
        .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)')
        .style('min-width', config.minWidth || '200px')
        .style('max-width', config.maxWidth || '300px')
        .style('width', 'auto')
        .style('white-space', 'normal')
        .style('word-wrap', 'break-word')
        .style('text-align', 'left')
        .style('backdrop-filter', 'blur(8px)')
        .style('-webkit-backdrop-filter', 'blur(8px)')
        .style('pointer-events', 'none')
        .style('z-index', config.zIndex || '1000');
    } catch (error) {
      console.error('Failed to create tooltip:', error);
      // Fallback to body if container selection fails
      this.tooltip = d3.select('body')
        .append('div')
        .datum<TooltipDatum>({ content: '' })
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('opacity', '0')
        // Add all the same styles as above
        .style('background-color', this.themeManager.getThemedColor('rgba(255, 255, 255, 0.8)', 'rgba(0, 0, 0, 0.8)'))
        .style('color', this.themeManager.getThemedColor('#333', '#fff'))
        .style('border', `1px solid ${this.themeManager.getThemedColor('#ddd', '#333')}`)
        .style('border-radius', '4px')
        .style('padding', config.padding || '8px 10px')
        .style('font-size', config.fontSize || '12px')
        .style('font-weight', '400')
        .style('line-height', '1.3')
        .style('letter-spacing', '0.01em')
        .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)')
        .style('min-width', config.minWidth || '200px')
        .style('max-width', config.maxWidth || '300px')
        .style('width', 'auto')
        .style('white-space', 'normal')
        .style('word-wrap', 'break-word')
        .style('text-align', 'left')
        .style('backdrop-filter', 'blur(8px)')
        .style('-webkit-backdrop-filter', 'blur(8px)')
        .style('pointer-events', 'none')
        .style('z-index', config.zIndex || '1000');
    }
  }
  
  /**
   * Update tooltip theme
   */
  updateTheme(isDarkTheme: boolean): void {
    if (!this.tooltip) return;
    
    this.tooltip
      .style('background-color', this.themeManager.getThemedColor('rgba(255, 255, 255, 0.8)', 'rgba(0, 0, 0, 0.8)'))
      .style('color', this.themeManager.getThemedColor('#333', '#fff'))
      .style('border', `1px solid ${this.themeManager.getThemedColor('#ddd', '#333')}`);
  }
  
  updateFlowOption(flowOption: 'churn' | 'switching'): void {
    this.flowOption = flowOption;
  }
  
  /**
   * Show tooltip with content at specific position
   */
  /**
   * Show tooltip with content at specific position
   */
  show(x: number, y: number, content: string): void {
    if (this.tooltip) {
      this.tooltip.html(content)
        .style('visibility', 'visible')
        .style('opacity', '1')
        .style('left', `${x + 10}px`)
        .style('top', `${y - 10}px`);
    }
  }
  
  /**
   * Show tooltip on mouse event
   */
  showOnEvent(event: MouseEvent, content: string): void {
    if (!this.tooltip) return;
    
    const svg = d3.select<SVGSVGElement, any>("svg");
    const svgElement = svg.node();
    if (!svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.show(x, y, content);
  }
  
  /**
   * Hide tooltip
   */
  hide(): void {
    if (this.tooltip) {
      this.tooltip
        .style('visibility', 'hidden')
        .style('opacity', '0');
    }
  }
  
  /**
   * Create bubble tooltip content
   */
  getBubbleTooltip(bubble: Bubble): string {
    return `
      <div class="tooltip-content">
        <h4>${bubble.label}</h4>
        <p>Size: ${formatNumber(bubble.radius)}</p>
      </div>
    `;
  }
  
  /**
   * Get flow tooltip content
   */
  getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string = 'net', centreFlow: boolean = false, flowOption: 'churn' | 'switching' = 'churn'): string {
    // Get current view type from ViewManager
    const viewType = this.viewManager.getViewType();
    const isMarketView = this.viewManager.isMarketView();
    
    // Determine source and target labels
    const sourceLabel = source?.label || 'Unknown';
    const targetLabel = target?.label || 'Unknown';
    
    // Get flow value based on direction and option
    let flowValue = 0;
    let flowLabel = '';
    
    // Choose appropriate flow data based on direction
    if (flowDirection === 'net') {
      flowValue = flow.netFlow || 0;
      flowLabel = 'Net Flow';
    } else if (flowDirection === 'in') {
      flowValue = flow.inFlow || 0;
      flowLabel = 'In Flow';
    } else if (flowDirection === 'out') {
      flowValue = flow.outFlow || 0;
      flowLabel = 'Out Flow';
    } else {
      // Both direction (bidirectional)
      const inFlow = flow.inFlow || 0;
      const outFlow = flow.outFlow || 0;
      flowValue = inFlow + outFlow;
      flowLabel = 'Total Flow';
    }
    
    // Create tooltip HTML
    return `
      <div class="tooltip-content">
        <h4>${sourceLabel} → ${targetLabel}</h4>
        <p>${flowLabel}: ${formatNumber(flowValue)}</p>
        ${flow.inFlow !== undefined ? `<p>In Flow: ${formatNumber(flow.inFlow)}</p>` : ''}
        ${flow.outFlow !== undefined ? `<p>Out Flow: ${formatNumber(flow.outFlow)}</p>` : ''}
        ${flow.netFlow !== undefined ? `<p>Net Flow: ${formatNumber(flow.netFlow)}</p>` : ''}
        <div><strong>From:</strong> ${source.label || ''}</div>
        <div><strong>To:</strong> ${target.label || ''}</div>
        <div><strong>${flowLabel}:</strong> ${(flow as any).displayValue?.toLocaleString() || (flow as any).value?.toLocaleString() || 'N/A'}</div>
      </div>
    `;
  }
}
