import * as d3 from 'd3';
import { Bubble, Flow } from '../types';
import { TooltipManager } from './TooltipManager';
import EventManager, { EventType, EventTarget } from '../services/EventManager';

/**
 * Interface for interaction manager configuration
 */
export interface InteractionManagerConfig {
  tooltipManager: TooltipManager;
}

/**
 * Interface for interaction manager initialization
 */
export interface InteractionManagerInitConfig {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  onBubbleClick?: (bubble: Bubble) => void;
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
}

/**
 * InteractionManager class
 * Handles interactions with bubbles and flows
 */
export class InteractionManager {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private tooltipManager: TooltipManager;
  private onBubbleClick?: (bubble: Bubble) => void;
  private onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void;
  private eventManager: EventManager;
  
  constructor(tooltipManager: TooltipManager) {
    this.tooltipManager = tooltipManager;
    this.eventManager = EventManager.getInstance();
  }
  
  /**
   * Initialize the interaction manager with SVG and event handlers
   */
  initialize(config: InteractionManagerInitConfig): void {
    this.svg = config.svg;
    this.onBubbleClick = config.onBubbleClick;
    this.onFlowClick = config.onFlowClick;
    
    // Initialize the event manager
    this.eventManager.initialize({
      svg: config.svg,
      tooltipManager: this.tooltipManager
    });
  }
  
  /**
   * Register bubbles for interaction
   */
  registerBubbles(bubbles: Bubble[]): void {
    // Register bubbles with the event manager
    this.eventManager.registerBubbles(bubbles);
    
    // Setup event handlers
    this.eventManager.on(EventTarget.BUBBLE, EventType.MOUSEOVER, (event, bubble) => {
      this.eventManager.defaultBubbleMouseoverHandler(event, bubble);
    });
    
    this.eventManager.on(EventTarget.BUBBLE, EventType.MOUSEOUT, () => {
      this.eventManager.defaultBubbleMouseoutHandler();
    });
    
    this.eventManager.on(EventTarget.BUBBLE, EventType.CLICK, (event, bubble) => {
      if (this.onBubbleClick) {
        this.onBubbleClick(bubble);
      }
    });
  }
  
  /**
   * Register flows for interaction
   */
  registerFlows(flows: Flow[]): void {
    // Register flows with the event manager
    this.eventManager.registerFlows(flows);
    
    // Setup event handlers
    this.eventManager.on(EventTarget.FLOW, EventType.MOUSEOVER, (event) => {
      this.eventManager.defaultFlowMouseoverHandler(event);
    });
    
    this.eventManager.on(EventTarget.FLOW, EventType.MOUSEOUT, () => {
      this.eventManager.defaultFlowMouseoutHandler();
    });
    
    this.eventManager.on(EventTarget.FLOW, EventType.CLICK, (event) => {
      const flowElement = d3.select(event.currentTarget);
      const fromId = parseInt(flowElement.attr('data-from') || '0');
      const toId = parseInt(flowElement.attr('data-to') || '0');
      
      const sourceBubble = this.eventManager.getBubbleById(fromId);
      const targetBubble = this.eventManager.getBubbleById(toId);
      const flow = this.eventManager.getFlowByIds(fromId, toId);
      
      if (flow && sourceBubble && targetBubble && this.onFlowClick) {
        this.onFlowClick(flow, sourceBubble, targetBubble);
      }
    });
  }
  
  // All event handling methods have been moved to EventManager
  
  /**
   * Update flow for tooltip display
   * @deprecated Use EventManager methods directly
   */
  setFlowForTooltip(flow: Flow): void {
    // No longer needed - EventManager handles this
  }
}
