import * as d3 from 'd3';
import { Flow, Bubble } from '../types';
import { RenderingRules } from '../core/RenderingRules';
import { ArrowFactory } from '../arrows/ArrowFactory';
import EventManager from '../services/EventManager';
import { Point } from '../config/ArrowTypes';

/**
 * Interface for flow renderer configuration
 */
export interface FlowRendererConfig {
  renderingRules: RenderingRules;
}

/**
 * Interface for flow renderer initialization
 */
export interface FlowRendererInitConfig {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
}

/**
 * FlowRenderer class
 * Handles rendering of flows in the visualization
 */
export class FlowRenderer {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private renderingRules: RenderingRules;
  private flowContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private arrowFactory: ArrowFactory;
  private onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
  private eventManager: EventManager;
  
  constructor(
    renderingRules: RenderingRules,
    arrowFactory: ArrowFactory,
    eventManager: EventManager
  ) {
    this.renderingRules = renderingRules;
    this.arrowFactory = arrowFactory;
    this.eventManager = eventManager;
  }
  
  /**
   * Initialize the renderer with SVG and event handlers
   */
  initialize(config: FlowRendererInitConfig): void {
    this.svg = config.svg;
    this.onFlowClick = config.onFlowClick;
    
    // Initialize container
    this.flowContainer = this.svg.append('g').attr('class', 'flow-container');
  }
  
  /**
   * Render flows with the provided data
   */
  renderFlows(
    flows: Flow[], 
    bubbles: Bubble[], 
    flowType: string,
    focusedFlow: { from: number, to: number } | null = null
  ): void {
    if (!flows || flows.length === 0 || !bubbles || bubbles.length === 0) return;
    
    const self = this;
    
    // Clear existing flows
    this.flowContainer.selectAll('*').remove();
    
    // Create a map of bubbles by ID for quick lookup
    const bubblesById = new Map<number, Bubble>();
    bubbles.forEach(bubble => bubblesById.set(bubble.id, bubble));
    
    // Draw flows
    flows.forEach(flow => {
      const sourceBubble = bubblesById.get(flow.from);
      const targetBubble = bubblesById.get(flow.to);
      
      if (!sourceBubble || !targetBubble) return;
      
      // Calculate flow thickness based on value
      const thickness = this.renderingRules.calculateFlowThickness(flow);
      
      // Get flow color based on type and direction
      const color = this.renderingRules.getFlowColor(flow, flowType);
      
      // Get flow opacity based on focus state
      const opacity = this.renderingRules.getFlowOpacity(flow, focusedFlow);
      
      // Create arrow path
      const arrow = this.createArrow(flow, sourceBubble, targetBubble, flowType);
      
      // Create the SVG arrow element
      const arrowElement = arrow.createSvgElement();
      
      // Extract the arrow path and add it to our container
      const flowElement = this.flowContainer
        .append('path')
        .attr('d', arrowElement.getAttribute('d') || '')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', thickness)
        .attr('opacity', opacity)
        .attr('class', 'flow')
        .attr('data-from', flow.from.toString())
        .attr('data-to', flow.to.toString());
      
      // Add marker/arrowhead if the SVG element has marker attributes
      if (arrowElement.getAttribute('marker-end')) {
        // Define marker
        const markerId = `marker-${flow.from}-${flow.to}`;
        const marker = this.svg.append('defs')
          .append('marker')
          .attr('id', markerId)
          .attr('viewBox', '0 0 10 10')
          .attr('refX', '5')
          .attr('refY', '5')
          .attr('markerWidth', '4')
          .attr('markerHeight', '4')
          .attr('orient', 'auto');
          
        marker.append('path')
          .attr('d', 'M 0 0 L 10 5 L 0 10 z')
          .attr('fill', color);
          
        flowElement.attr('marker-end', `url(#${markerId})`);
      }
      
      // No need to attach event handlers here
      // EventManager handles all flow interactions
      // Just add data attributes for identification
      flowElement
        .attr('data-from', flow.from.toString())
        .attr('data-to', flow.to.toString());
      
      // Store original stroke width for hover effects
      flowElement.attr('data-original-width', flowElement.attr('stroke-width'));
    });
  }
  
  /**
   * Create appropriate arrow for the flow
   */
  private createArrow(flow: Flow, source: Bubble, target: Bubble, flowType: string) {
    // Create points with proper type structure
    const sourcePoint: Point = { 
      x: source.x || 0, 
      y: source.y || 0 
    };
    const targetPoint: Point = { 
      x: target.x || 0, 
      y: target.y || 0 
    };
    
    // Add radius as custom property for arrow calculations
    (sourcePoint as any).radius = source.r || 0;
    (targetPoint as any).radius = target.r || 0;
    
    // Determine if this should be a bidirectional arrow
    const isBidirectional = flow.isBidirectional || flowType === 'both';
    
    // Create appropriate arrow type using the static method
    return ArrowFactory.createArrow({
      type: isBidirectional ? 'bidirectional' : 'unidirectional',
      startPoint: sourcePoint,
      endPoint: targetPoint,
      style: {
        color: '#666',
        thickness: 2,
        opacity: 1
      },
      endMarker: {
        type: 'arrow',
        size: 5,
        color: '#666'
      }
    });
  }
  
  /**
   * Clear all rendered flows
   */
  clear(): void {
    this.flowContainer.selectAll('*').remove();
  }
}
