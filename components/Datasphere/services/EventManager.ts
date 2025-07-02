import * as d3 from 'd3';
import { Bubble, Flow } from '../types';
import { ThemeManager } from './ThemeManager';
import { TooltipManager } from '../renderers/TooltipManager';

/**
 * Event types supported by the EventManager
 */
export enum EventType {
  CLICK = 'click',
  MOUSEOVER = 'mouseover',
  MOUSEOUT = 'mouseout',
  MOUSEMOVE = 'mousemove',
  DRAG = 'drag',
  ZOOM = 'zoom',
  WINDOW_RESIZE = 'windowResize'
}

/**
 * Event targets that can be registered with the EventManager
 */
export enum EventTarget {
  BUBBLE = 'bubble',
  FLOW = 'flow',
  SVG = 'svg'
}

/**
 * Event handler function type
 */
export type EventHandlerFunction = (event: any, data?: any, element?: any) => void;

/**
 * Configuration for the EventManager
 */
export interface EventManagerConfig {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  tooltipManager?: TooltipManager;
}

/**
 * Event registration configuration
 */
export interface EventRegistrationConfig {
  eventType: EventType;
  selector: string;
  handler: EventHandlerFunction;
  useCapture?: boolean;
}

/**
 * EventManager class
 * Centralizes and standardizes event handling across the application
 */
export default class EventManager {
  private static instance: EventManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private tooltipManager: TooltipManager | null = null;
  private themeManager: ThemeManager;
  private eventHandlers: Map<string, EventHandlerFunction[]> = new Map();
  private bubblesById: Map<number, Bubble> = new Map();
  private flowsById: Map<string, Flow> = new Map();
  private windowEventHandlers: Map<string, EventHandlerFunction[]> = new Map();

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Initialize theme manager
    this.themeManager = ThemeManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Initialize the EventManager
   * @param config Configuration object
   */
  public initialize(config: EventManagerConfig): void {
    this.svg = config.svg;
    this.tooltipManager = config.tooltipManager || null;

    // Clear existing event handlers
    this.eventHandlers.clear();
  }

  /**
   * Register bubbles for interaction
   * @param bubbles Array of bubbles to register
   */
  public registerBubbles(bubbles: Bubble[]): void {
    // Clear existing bubble map
    this.bubblesById.clear();
    
    // Add bubbles to map for quick lookup
    bubbles.forEach(bubble => {
      this.bubblesById.set(bubble.id, bubble);
    });

    // Remove previous event handlers
    if (this.svg) {
      this.svg.selectAll('.bubble')
        .on('mouseover', null)
        .on('mouseout', null)
        .on('click', null);
    }
  }

  /**
   * Register flows for interaction
   * @param flows Array of flows to register
   */
  public registerFlows(flows: Flow[]): void {
    // Clear existing flow map
    this.flowsById.clear();
    
    // Add flows to map for quick lookup
    flows.forEach(flow => {
      const flowKey = `${flow.from}-${flow.to}`;
      this.flowsById.set(flowKey, flow);
    });

    // Remove previous event handlers
    if (this.svg) {
      this.svg.selectAll('.flow')
        .on('mouseover', null)
        .on('mouseout', null)
        .on('click', null);
    }
  }

  /**
   * Register an event handler for a specific target and event type
   * @param target Target element type
   * @param eventType Event type
   * @param handler Event handler function
   */
  public on(target: EventTarget, eventType: EventType, handler: EventHandlerFunction): void;
  public on(eventType: string, handler: EventHandlerFunction): void;
  public on(targetOrEventType: EventTarget | string, eventTypeOrHandler: EventType | EventHandlerFunction, handler?: EventHandlerFunction): void {
    // Handle window events (string-based)
    if (typeof targetOrEventType === 'string' && typeof eventTypeOrHandler === 'function') {
      const eventType = targetOrEventType;
      const eventHandler = eventTypeOrHandler;
      
      if (eventType === 'windowResize') {
        if (!this.windowEventHandlers.has('resize')) {
          this.windowEventHandlers.set('resize', []);
          
          // Add actual window event listener
          const windowHandler = (event: Event) => {
            const handlers = this.windowEventHandlers.get('resize') || [];
            handlers.forEach(h => h(event));
          };
          window.addEventListener('resize', windowHandler);
        }
        
        const handlers = this.windowEventHandlers.get('resize');
        if (handlers) {
          handlers.push(eventHandler);
        }
      }
      return;
    }
    
    // Handle SVG element events
    const target = targetOrEventType as EventTarget;
    const eventType = eventTypeOrHandler as EventType;
    const eventHandler = handler as EventHandlerFunction;
    
    const key = `${target}:${eventType}`;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, []);
    }
    
    const handlers = this.eventHandlers.get(key);
    if (handlers) {
      handlers.push(eventHandler);
    }

    // Apply event handler to elements
    this.applyEventHandlers(target, eventType);
  }

  /**
   * Remove an event handler
   * @param target Target element type
   * @param eventType Event type
   * @param handler Event handler function to remove (optional, removes all if not specified)
   */
  public off(target: EventTarget, eventType: EventType, handler?: EventHandlerFunction): void {
    const key = `${target}:${eventType}`;
    
    if (handler) {
      // Remove specific handler
      const handlers = this.eventHandlers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      // Remove all handlers for this target and event type
      this.eventHandlers.delete(key);
    }

    // If no handlers left, remove from elements
    if (!this.eventHandlers.get(key) || this.eventHandlers.get(key)?.length === 0) {
      if (this.svg) {
        const selector = this.getSelectorForTarget(target);
        this.svg.selectAll(selector).on(eventType, null);
      }
    }
  }

  /**
   * Apply registered event handlers to elements
   * @param target Target element type
   * @param eventType Event type
   */
  private applyEventHandlers(target: EventTarget, eventType: EventType): void {
    if (!this.svg) return;
    
    const key = `${target}:${eventType}`;
    const handlers = this.eventHandlers.get(key);
    if (!handlers || handlers.length === 0) return;

    const selector = this.getSelectorForTarget(target);
    const self = this;

    this.svg.selectAll(selector).on(eventType, function(event, d) {
      // Execute all registered handlers in order
      handlers.forEach(handler => {
        handler.call(self, event, d, this);
      });
    });
  }

  /**
   * Get CSS selector for a target type
   * @param target Target element type
   * @returns CSS selector
   */
  private getSelectorForTarget(target: EventTarget): string {
    switch(target) {
      case EventTarget.BUBBLE: return '.bubble';
      case EventTarget.FLOW: return '.flow';
      case EventTarget.SVG: return 'svg';
      default: return '';
    }
  }

  /**
   * Find bubble by ID
   * @param id Bubble ID
   * @returns Bubble or undefined
   */
  public getBubbleById(id: number): Bubble | undefined {
    return this.bubblesById.get(id);
  }

  /**
   * Find flow by source and target IDs
   * @param fromId Source bubble ID
   * @param toId Target bubble ID
   * @returns Flow or undefined
   */
  public getFlowByIds(fromId: number, toId: number): Flow | undefined {
    const flowKey = `${fromId}-${toId}`;
    return this.flowsById.get(flowKey);
  }

  /**
   * Helper method to show bubble tooltip
   * @param bubble Bubble to show tooltip for
   * @param event Mouse event
   */
  public showBubbleTooltip(bubble: Bubble, event: any): void {
    if (this.tooltipManager) {
      const content = this.tooltipManager.getBubbleTooltip(bubble);
      this.tooltipManager.showOnEvent(event, content);
    }
  }

  /**
   * Helper method to show flow tooltip
   * @param flow Flow to show tooltip for
   * @param sourceBubble Source bubble
   * @param targetBubble Target bubble
   * @param event Mouse event
   */
  public showFlowTooltip(flow: Flow, sourceBubble: Bubble, targetBubble: Bubble, event: any): void {
    if (this.tooltipManager) {
      // Use the flowType from the flow if available, or default to 'net'
      const flowType = (flow as any).flowType || 'net';
      const content = this.tooltipManager.getFlowTooltip(flow, sourceBubble, targetBubble, flowType);
      this.tooltipManager.showOnEvent(event, content);
    }
  }

  /**
   * Helper method to hide tooltip
   */
  public hideTooltip(): void {
    if (this.tooltipManager) {
      this.tooltipManager.hide();
    }
  }

  /**
   * Default bubble mouseover handler
   * @param event Mouse event
   * @param bubble Bubble data
   */
  public defaultBubbleMouseoverHandler(event: any, bubble: Bubble): void {
    // Show tooltip
    this.showBubbleTooltip(bubble, event);
    
    // Highlight bubble
    if (this.svg) {
      d3.select(event.currentTarget)
        .attr('stroke', this.themeManager.getThemedColor('#000000', '#ffffff'))
        .attr('stroke-width', 2);
    }
  }

  /**
   * Default bubble mouseout handler
   */
  public defaultBubbleMouseoutHandler(): void {
    // Hide tooltip
    this.hideTooltip();
    
    // Remove highlight from all bubbles
    if (this.svg) {
      this.svg.selectAll('.bubble')
        .attr('stroke', 'none')
        .attr('stroke-width', 0);
    }
  }

  /**
   * Default flow mouseover handler
   * @param event Mouse event
   */
  public defaultFlowMouseoverHandler(event: any): void {
    if (!this.svg) return;

    const flowElement = d3.select(event.currentTarget);
    const fromId = parseInt(flowElement.attr('data-from') || '0');
    const toId = parseInt(flowElement.attr('data-to') || '0');
    
    const sourceBubble = this.getBubbleById(fromId);
    const targetBubble = this.getBubbleById(toId);
    
    if (!sourceBubble || !targetBubble) return;
    
    // Find the flow
    const flow = this.getFlowByIds(fromId, toId);
    
    if (!flow) return;
    
    // Show tooltip
    this.showFlowTooltip(flow, sourceBubble, targetBubble, event);
    
    // Store original width for restoration
    if (!flowElement.attr('data-original-width')) {
      flowElement.attr('data-original-width', flowElement.attr('stroke-width'));
    }
    
    // Highlight flow
    flowElement.attr('stroke-width', (d: any) => {
      const currentWidth = parseFloat(flowElement.attr('stroke-width') || '1');
      return currentWidth * 1.5;
    });
  }

  /**
   * Default flow mouseout handler
   */
  public defaultFlowMouseoutHandler(): void {
    // Hide tooltip
    this.hideTooltip();
    
    // Reset flow thickness
    if (this.svg) {
      this.svg.selectAll('.flow')
        .attr('stroke-width', function() {
          const originalWidth = d3.select(this).attr('data-original-width');
          return originalWidth || d3.select(this).attr('stroke-width');
        });
    }
  }
}
