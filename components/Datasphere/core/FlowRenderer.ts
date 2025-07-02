import * as d3 from 'd3';
import { Flow, Bubble } from '../types';
import { RenderingRules, RenderingRuleConfig } from './RenderingRules';
import { ArrowFactory } from '../arrows/ArrowFactory';
import { Point } from '../config/ArrowTypes';
import { CONFIG } from '../constants/config';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip, getFlowTooltip } from '../utils/tooltip';
import { isBidirectionalFlowType, FlowType } from '../config/FlowTypes';

/**
 * Interface for renderer configuration
 */
export interface RendererConfig {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  renderingRules?: RenderingRuleConfig;
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
  onBubbleClick?: (bubble: Bubble) => void;
}

/**
 * Flow Renderer class
 * Handles rendering of flows and bubbles in the visualization
 */
export class FlowRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private renderingRules: RenderingRules;
  private flowContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
  private bubbleContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
  private onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
  private onBubbleClick?: (bubble: Bubble) => void;
  private simulation: d3.Simulation<Bubble, undefined> | null = null;
  
  constructor(config: RendererConfig) {
    this.svg = d3.select(config.svgElement);
    this.width = config.width;
    this.height = config.height;
    this.renderingRules = new RenderingRules(config.renderingRules);
    this.onFlowClick = config.onFlowClick;
    this.onBubbleClick = config.onBubbleClick;
    
    // Initialize containers
    this.flowContainer = this.svg.append('g').attr('class', 'flow-container');
    this.bubbleContainer = this.svg.append('g').attr('class', 'bubble-container');
    this.labelContainer = this.svg.append('g').attr('class', 'label-container');
    
    // Set up the SVG
    this.setupSvg();
  }
  
  /**
   * Set up the SVG element
   */
  private setupSvg(): void {
    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
  }
  
  /**
   * Clear the visualization
   */
  clear(): void {
    this.flowContainer.selectAll('*').remove();
    this.bubbleContainer.selectAll('*').remove();
    this.labelContainer.selectAll('*').remove();
    
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }
  
  /**
   * Render the visualization with flows and bubbles
   */
  render(
    flows: Flow[],
    bubbles: Bubble[],
    flowType: FlowType | string = 'net',
    focusBubbleId: number | null = null,
    centreFlow: boolean = false,
    isMarketView: boolean = false,
    flowOption: 'churn' | 'switching' = 'churn',
    focusedFlow: { from: number; to: number } | null = null
  ): void {
    // Clear previous visualization
    this.clear();
    
    // Render flows first (so they appear behind bubbles)
    this.renderFlows(flows, bubbles, flowType, focusBubbleId, centreFlow, isMarketView, flowOption, focusedFlow);
    
    // Render bubbles
    this.renderBubbles(bubbles, focusBubbleId);
    
    // Render labels
    this.renderLabels(bubbles, focusBubbleId);
  }
  
  /**
   * Render flows between bubbles
   */
  private renderFlows(
    flows: Flow[],
    bubbles: Bubble[],
    flowType: FlowType | string,
    focusBubbleId: number | null,
    centreFlow: boolean,
    isMarketView: boolean,
    flowOption: 'churn' | 'switching',
    focusedFlow: { from: number; to: number } | null
  ): void {
    // Process each flow
    flows.forEach(flow => {
      const source = bubbles.find(b => b.id === flow.from);
      const target = bubbles.find(b => b.id === flow.to);
      
      if (!source || !target) {
        return;
      }
      
      // Determine if this flow should be bidirectional
      const isBidirectional = isBidirectionalFlowType(flowType as FlowType) || 
                             (flow.isBidirectional && flowType === 'both');
      
      if (isBidirectional) {
        this.renderBidirectionalFlow(
          flow,
          source,
          target,
          centreFlow,
          bubbles,
          flowOption,
          isMarketView,
          focusedFlow
        );
      } else {
        this.renderUnidirectionalFlow(
          flow,
          flowType,
          source,
          target,
          centreFlow,
          bubbles,
          flowOption,
          isMarketView,
          focusedFlow
        );
      }
    });
  }
  
  /**
   * Render a unidirectional flow between two bubbles
   */
  private renderUnidirectionalFlow(
    flow: Flow,
    flowType: FlowType | string,
    source: Bubble,
    target: Bubble,
    centreFlow: boolean,
    allBubbles: Bubble[],
    flowOption: 'churn' | 'switching',
    isMarketView: boolean,
    focusedFlow: { from: number; to: number } | null
  ): void {
    // Calculate flow points
    const { startPoint, endPoint, value, displayValue } = this.calculateFlowPoints(
      source,
      target,
      flowType,
      flow,
      centreFlow,
      isMarketView,
      flowOption
    );
    
    // Get flow color
    const color = this.renderingRules.getFlowColor(flow, flowType as FlowType);
    
    // Get flow opacity
    const opacity = this.renderingRules.getFlowOpacity(flow, focusedFlow);
    
    // Calculate line thickness
    const lineThickness = this.renderingRules.calculateFlowThickness(flow);
    
    // Create arrow using ArrowFactory
    const arrow = ArrowFactory.createFlowArrow(
      startPoint,
      endPoint,
      Math.abs(value),
      false, // Not bidirectional
      color
    );
    
    // Update arrow style with opacity
    const config = arrow.getConfiguration();
    config.style.opacity = opacity;
    
    // Add label if needed
    if (displayValue !== undefined) {
      config.labels = [{
        text: this.formatFlowValue(displayValue),
        position: 0.5, // Middle of the arrow
        offset: 10, // Offset from the line
        fontSize: 12,
        color: '#333333'
      }];
    }
    
    arrow.updateConfiguration(config);
    
    // Create SVG element for the arrow
    const arrowElement = arrow.createSvgElement();
    
    // Add data attributes for interaction
    arrowElement.setAttribute('data-from-id', flow.from.toString());
    arrowElement.setAttribute('data-to-id', flow.to.toString());
    arrowElement.setAttribute('class', 'flow-line');
    
    // Add to container
    const arrowGroup = this.flowContainer.append('g')
      .attr('class', 'flow-arrow-group')
      .node();
    
    if (arrowGroup) {
      arrowGroup.appendChild(arrowElement);
    }
    
    // Add interactivity
    d3.select(arrowElement)
      .on('mouseover', (event) => {
        const tooltip = getFlowTooltip(flow, source, target, flowType as string, centreFlow, flowOption, isMarketView);
        showTooltip(event, tooltip);
        d3.select(arrowElement).attr('stroke-opacity', 0.8);
      })
      .on('mouseout', () => {
        hideTooltip();
        d3.select(arrowElement).attr('stroke-opacity', opacity);
      })
      .on('click', () => {
        if (this.onFlowClick) {
          this.onFlowClick(flow, source, target);
        }
      });
  }
  
  /**
   * Render a bidirectional flow between two bubbles
   */
  private renderBidirectionalFlow(
    flow: Flow,
    source: Bubble,
    target: Bubble,
    centreFlow: boolean,
    allBubbles: Bubble[],
    flowOption: 'churn' | 'switching',
    isMarketView: boolean,
    focusedFlow: { from: number; to: number } | null
  ): void {
    // Get the inflow and outflow percentages
    const inPerc = flow.bidirectional_inPerc || 50;
    const outPerc = flow.bidirectional_outPerc || 50;
    
    // Calculate flow points
    const { startPoint, endPoint } = this.calculateFlowPoints(
      source,
      target,
      'both',
      flow,
      centreFlow,
      isMarketView,
      flowOption
    );
    
    // Get flow color and opacity
    const color = this.renderingRules.getFlowColor(flow, 'both');
    const opacity = this.renderingRules.getFlowOpacity(flow, focusedFlow);
    
    // Calculate line thickness
    const lineThickness = this.renderingRules.calculateFlowThickness(flow);
    
    // Create bidirectional arrow using ArrowFactory
    const arrow = ArrowFactory.createBidirectionalArrow(
      startPoint,
      endPoint,
      {
        thickness: lineThickness,
        color: color,
        opacity: opacity
      },
      undefined,
      {
        type: 'arrow',
        size: 5 + lineThickness / 2,
        color: color
      }
    );
    
    // Add labels for inflow and outflow values
    const inValue = flow.absolute_inFlow;
    const outValue = flow.absolute_outFlow;
    
    const config = arrow.getConfiguration();
    config.labels = [
      {
        text: this.formatFlowValue(inValue),
        position: 0.25, // Position on the inflow segment
        offset: 10,
        fontSize: 12,
        color: this.renderingRules.getFlowColor(flow, 'in')
      },
      {
        text: this.formatFlowValue(outValue),
        position: 0.75, // Position on the outflow segment
        offset: 10,
        fontSize: 12,
        color: this.renderingRules.getFlowColor(flow, 'out')
      }
    ];
    
    arrow.updateConfiguration(config);
    
    // Create SVG element for the arrow
    const arrowElement = arrow.createSvgElement();
    
    // Add data attributes for interaction
    arrowElement.setAttribute('data-from-id', flow.from.toString());
    arrowElement.setAttribute('data-to-id', flow.to.toString());
    arrowElement.setAttribute('class', 'flow-bidirectional');
    
    // Add to container
    const arrowGroup = this.flowContainer.append('g')
      .attr('class', 'flow-arrow-group')
      .node();
    
    if (arrowGroup) {
      arrowGroup.appendChild(arrowElement);
    }
    
    // Add interactivity
    d3.select(arrowElement)
      .on('mouseover', (event) => {
        const tooltip = getFlowTooltip(flow, source, target, 'both', centreFlow, flowOption, isMarketView);
        showTooltip(event, tooltip);
        d3.select(arrowElement).attr('stroke-opacity', 0.8);
      })
      .on('mouseout', () => {
        hideTooltip();
        d3.select(arrowElement).attr('stroke-opacity', opacity);
      })
      .on('click', () => {
        if (this.onFlowClick) {
          this.onFlowClick(flow, source, target);
        }
      });
  }
  
  /**
   * Render bubbles
   */
  private renderBubbles(bubbles: Bubble[], focusBubbleId: number | null): void {
    // Get theme and view configuration from rendering rules
    const isDarkTheme = this.renderingRules.getConfig().theme === 'dark';
    const isMarketView = this.renderingRules.getConfig().viewType === 'market';
    
    // Create bubble groups
    const bubbleGroups = this.bubbleContainer
      .selectAll<SVGGElement, Bubble>('g.bubble')
      .data(bubbles)
      .join('g')
      .attr('class', 'bubble')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    // Add outer ring if configured
    if (CONFIG.bubble?.outerRing?.show) {
      bubbleGroups
        .append('circle')
        .attr('class', 'outer-ring')
        .attr('r', (d) => d.outerRingRadius || d.radius * 1.2)
        .attr('fill', 'none')
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', CONFIG.bubble?.outerRing?.strokeWidth || 1)
        .attr('stroke-dasharray', CONFIG.bubble?.outerRing?.strokeDasharray || '3,3')
        .attr('opacity', (d) => {
          // Center bubble in non-market view should have no outer ring
          if (d.id === bubbles.length - 1 && !isMarketView) {
            return 0;
          }
          return CONFIG.bubble?.outerRing?.opacity || 0.5;
        });
    }

    // Add main bubble circles
    bubbleGroups
      .append('circle')
      .attr('class', 'bubble-circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        // Special case for center bubble
        if (d.id === bubbles.length - 1) {
          return isDarkTheme ? '#1a1a1a' : '#ffffff';
        }
        return d.color;
      })
      .attr('opacity', (d) => {
        // Center bubble in non-market view should have no outer ring
        if (d.id === bubbles.length - 1 && !isMarketView) {
          return 0;
        }
        return 1;
      })
      .attr('cursor', (d) => (d.id === bubbles.length - 1 ? 'default' : 'pointer'))
      .attr('data-id', (d) => d.id)
      .on('click', (event: MouseEvent, d: Bubble) => {
        if (d.id !== bubbles.length - 1 && this.onBubbleClick) {
          this.onBubbleClick(d);
        }
      })
      .on('mouseover', (event: MouseEvent, d: Bubble) => {
        if (d.id !== bubbles.length - 1 && d.id !== focusBubbleId) {
          const target = event.currentTarget as SVGCircleElement;
          d3.select(target)
            .attr('stroke', isDarkTheme ? '#ffffff' : '#000000')
            .attr('stroke-width', 2)
            .raise();
          
          // Show tooltip if available
          showTooltip(event, getBubbleTooltip(d));
        }
      })
      .on('mouseout', (event: MouseEvent, d: Bubble) => {
        if (d.id !== bubbles.length - 1 && d.id !== focusBubbleId) {
          const target = event.currentTarget as SVGCircleElement;
          d3.select(target)
            .attr('stroke', 'none')
            .attr('stroke-width', 0);
          
          // Hide tooltip if available
          hideTooltip();
        }
      });
  }
  
  /**
   * Render labels for bubbles
   */
  private renderLabels(bubbles: Bubble[], focusBubbleId: number | null): void {
    bubbles.forEach(bubble => {
      // Get label configuration
      const labelConfig = this.renderingRules.getLabelConfig(bubble, focusBubbleId);
      
      // Create label
      this.labelContainer.append('text')
        .attr('class', 'bubble-label')
        .attr('x', bubble.x)
        .attr('y', bubble.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', labelConfig.fontFamily)
        .attr('font-size', labelConfig.fontSize)
        .attr('fill', labelConfig.color)
        .text(bubble.label);
    });
  }
  
  /**
   * Calculate the points for a flow line
   */
  private calculateFlowPoints(
    source: Bubble,
    target: Bubble,
    flowType: FlowType | string,
    flow: Flow,
    centreFlow: boolean,
    isMarketView: boolean,
    flowOption: 'churn' | 'switching'
  ): { startPoint: Point; endPoint: Point; value: number; displayValue?: number } {
    // Determine which value to use based on flow type
    let value = 0;
    let displayValue: number | undefined = undefined;
    
    if (flowType === 'in') {
      // For inflow, use the appropriate value based on bubble relationship
      if (flow.to === source.id) {
        // Flow is coming into the source bubble
        value = flow.absolute_outFlow;
        displayValue = flow.outFlow;
      } else {
        // Flow is going from source to target
        value = flow.absolute_inFlow;
        displayValue = flow.inFlow;
      }
    } else if (flowType === 'out') {
      // For outflow, use the appropriate value based on bubble relationship
      if (flow.from === source.id) {
        // Flow is going from source to target
        value = flow.absolute_outFlow;
        displayValue = flow.outFlow;
      } else {
        // Flow is coming into the source bubble
        value = flow.absolute_inFlow;
        displayValue = flow.inFlow;
      }
    } else if (flowType === 'net') {
      // For net flow, use the net value
      value = flow.absolute_netFlow;
      displayValue = flow.netFlow;
    } else if (flowType === 'both') {
      // For bidirectional, use the max of in and out
      value = Math.max(flow.absolute_inFlow, flow.absolute_outFlow);
      // No display value for bidirectional as we'll show both values
    }
    
    // Calculate start and end points
    const startX = source.x;
    const startY = source.y;
    const endX = target.x;
    const endY = target.y;
    
    // Calculate the angle between bubbles
    const angle = Math.atan2(endY - startY, endX - startX);
    
    // Calculate the distance between bubble centers
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Adjust start and end points to be on the bubble edges
    const startRadius = source.radius || 30;
    const endRadius = target.radius || 30;
    
    const startPoint: Point = {
      x: startX + Math.cos(angle) * startRadius,
      y: startY + Math.sin(angle) * startRadius
    };
    
    const endPoint: Point = {
      x: endX - Math.cos(angle) * endRadius,
      y: endY - Math.sin(angle) * endRadius
    };
    
    return { startPoint, endPoint, value, displayValue };
  }
  
  /**
   * Format flow value for display
   */
  private formatFlowValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toFixed(0);
    }
  }
  
  /**
   * Initialize force simulation for bubble positioning
   */
  initializeSimulation(bubbles: Bubble[]): void {
    // Stop any existing simulation
    if (this.simulation) {
      this.simulation.stop();
    }
    
    // Create a new simulation
    this.simulation = d3.forceSimulation(bubbles)
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('collide', d3.forceCollide().radius((d: any) => ((d as Bubble).radius || 30) + 5))
      .on('tick', () => this.updatePositions(bubbles));
  }
  
  /**
   * Update positions of bubbles and flows during simulation
   */
  private updatePositions(bubbles: Bubble[]): void {
    // Update bubble positions
    this.bubbleContainer.selectAll('circle')
      .data(bubbles)
      .attr('cx', d => d.x || 0)
      .attr('cy', d => d.y || 0);
    
    // Update label positions
    this.labelContainer.selectAll('text')
      .data(bubbles)
      .attr('x', d => d.x || 0)
      .attr('y', d => d.y || 0);
    
    // Update flow positions would be more complex and is not implemented here
    // It would require recalculating all flow paths based on new bubble positions
  }
  
  /**
   * Update the renderer configuration
   */
  updateConfig(config: Partial<RendererConfig>): void {
    if (config.width !== undefined) {
      this.width = config.width;
    }
    
    if (config.height !== undefined) {
      this.height = config.height;
    }
    
    if (config.renderingRules !== undefined) {
      this.renderingRules.updateConfig(config.renderingRules);
    }
    
    if (config.onFlowClick !== undefined) {
      this.onFlowClick = config.onFlowClick;
    }
    
    if (config.onBubbleClick !== undefined) {
      this.onBubbleClick = config.onBubbleClick;
    }
    
    // Update SVG dimensions
    this.setupSvg();
  }
}
