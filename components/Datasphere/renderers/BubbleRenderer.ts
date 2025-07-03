import * as d3 from 'd3';
import { Bubble } from '../types';
import { RenderingRules } from '../core/RenderingRules';
import { CONFIG } from '../constants/config';
import ThemeManager from '../services/ThemeManager';
import EventManager from '../services/EventManager';
import ViewManager from '../services/ViewManager';

/**
 * Interface for bubble renderer configuration
 */
export interface BubbleRendererConfig {
  renderingRules: RenderingRules;
}

/**
 * Interface for bubble renderer initialization
 */
export interface BubbleRendererInitConfig {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  onBubbleClick?: (bubble: Bubble) => void;
}

/**
 * BubbleRenderer class
 * Handles rendering of bubbles in the visualization
 */
export class BubbleRenderer {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private renderingRules: RenderingRules;
  private bubbleContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private onBubbleClick?: (bubble: Bubble) => void;
  private themeManager: ThemeManager;
  private eventManager: EventManager;
  private viewManager: ViewManager;
  private lastBubbles: Bubble[] = [];
  private lastFocusBubbleId: number | null = null;
  private lastIsMarketView: boolean = false;

  constructor(
    renderingRules: RenderingRules,
    themeManager: ThemeManager,
    eventManager: EventManager,
    viewManager: ViewManager
  ) {
    this.renderingRules = renderingRules;
    this.themeManager = themeManager;
    this.eventManager = eventManager;
    this.viewManager = viewManager;
  }

  /**
   * Initialize the renderer with SVG and event handlers
   */
  initialize(config: BubbleRendererInitConfig): void {
    this.svg = config.svg;
    this.onBubbleClick = config.onBubbleClick;

    // Initialize containers
    this.bubbleContainer = this.svg.append('g').attr('class', 'bubble-container');
    this.labelContainer = this.svg.append('g').attr('class', 'label-container');

    // Add window resize handler for responsive rendering
    const resizeHandler = () => {
      // Only redraw if we have data and the container exists
      if (this.lastBubbles && this.lastBubbles.length > 0) {
        this.renderBubbles(
          this.lastBubbles,
          this.lastFocusBubbleId,
          this.lastIsMarketView
        );
      }
    };

    // Register resize event through EventManager
    this.eventManager.on('windowResize', this.debounce(resizeHandler, 250));
  }

  /**
   * Simple debounce function to limit resize handler calls
   */
  private debounce(func: Function, wait: number): () => void {
    let timeout: number | null = null;
    return () => {
      const later = () => {
        timeout = null;
        func();
      };
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(later, wait) as unknown as number;
    };
  }

  /**
   * Render bubbles with the provided data
   */
  renderBubbles(
    bubbles: Bubble[],
    focusBubbleId: number | null = null,
    isMarketView: boolean = false
  ): void {
    // Get current theme state from ThemeManager
    const isDarkTheme = this.themeManager.isDark();
    // Store parameters for resize handling
    this.lastBubbles = bubbles;
    this.lastFocusBubbleId = focusBubbleId;
    this.lastIsMarketView = isMarketView;
    if (!bubbles || bubbles.length === 0) return;

    const self = this;

    // Clear existing bubbles and labels
    this.bubbleContainer.selectAll('*').remove();
    this.labelContainer.selectAll('*').remove();

    // Tooltip management is now handled by EventManager

    // Draw bubbles
    const bubbleGroups = this.bubbleContainer
      .selectAll<SVGGElement, Bubble>('g.bubble')
      .data(bubbles)
      .join('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Draw outer rings with enhanced visual appearance
    if (CONFIG.bubble.outerRing.show) {
      bubbleGroups
        .append('circle')
        .attr('class', 'outer-ring')
        .attr('r', d => d.outerRingRadius)
        .attr('fill', 'none')
        .attr('stroke', d => {
          // Use appropriate colors for different bubble states
          if (d.focus) return isDarkTheme ? '#ffffff' : '#333333';
          return d.color;
        })
        .attr('stroke-width', d => {
          // Emphasize focused bubbles with thicker stroke
          return d.focus ? CONFIG.bubble.outerRing.strokeWidth * 1.5 : CONFIG.bubble.outerRing.strokeWidth;
        })
        .attr('stroke-dasharray', CONFIG.bubble.outerRing.strokeDasharray)
        .attr('opacity', d => {
          // Adjust opacity based on bubble state
          if (d.focus) return CONFIG.bubble.outerRing.opacity * 1.5;
          if (d.id === bubbles.length - 1 && !isMarketView) {
            return 0;
          }
          return CONFIG.bubble.outerRing.opacity;
        });
    }

    // Draw bubble circles
    bubbleGroups
      .append('circle')
      .attr('class', 'bubble-circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.isCentre) {
          return '#FF0033'; // Center bubble should be red for visibility
        }
        return d.color;
      })
      .attr('stroke', d => {
        if (d.isCentre) return isDarkTheme ? '#ffffff' : '#000000';
        if (d.focus || d.isSelected) return isDarkTheme ? '#ffffff' : '#000000';
        return 'none';
      })
      .attr('stroke-width', d => {
        if (d.isCentre) return 2; // Center bubble should always have a border
        if (d.focus || d.isSelected) return 4;
        return 0;
      })
      .attr('opacity', d => {
        if (d.isCentre) return 1; // Center bubble should always be visible
        return 1;
      })
      .attr('cursor', d => (d.isCentre ? 'default' : 'pointer'))
      // Add data attributes for EventManager to identify bubbles
      .attr('data-bubble-id', d => d.id)
      .attr('data-is-centre', d => d.isCentre ? 'true' : 'false');

    // Register bubbles with EventManager for event handling
    this.eventManager.registerBubbles(bubbles);

    // Add labels
    this.renderBubbleLabels(bubbles, focusBubbleId, isMarketView);
  }

  /**
   * Render labels for bubbles
   */
  private renderBubbleLabels(
    bubbles: Bubble[],
    focusBubbleId: number | null,
    isMarketView: boolean = false
  ): void {
    // Get current theme from ThemeManager
    const isDarkTheme = this.themeManager.isDark();
    const svgNode = this.svg.node();
    const centerX = svgNode && svgNode.clientWidth ? svgNode.clientWidth / 2 : 0;
    const centerY = svgNode && svgNode.clientHeight ? svgNode.clientHeight / 2 : 0;

    this.labelContainer
      .selectAll('text.bubble-label')
      .data(bubbles)
      .join('text')
      .attr('pointer-events', 'none')
      .attr('class', 'bubble-label')
      .attr('x', d => d.textX)
      .attr('y', d => d.textY)
      .attr('text-anchor', d => {
        if (d.isCentre) return 'middle';

        // Calculate angle for positioning text
        const angle = Math.atan2(d.y - centerY, d.x - centerX);
        const degrees = (angle * 180) / Math.PI;

        // Use documented angle ranges for text positioning
        // Right side: start (left-aligned), Left side: end (right-aligned)
        // Top and bottom: middle (center-aligned)
        if (degrees > -45 && degrees <= 45) return 'start';
        if (degrees > 135 || degrees <= -135) return 'end';
        return 'middle';
      })
      .attr('font-size', d => {
        // Use configured font sizes
        if (d.isCentre) return CONFIG.bubble.CENTER_BUBBLE_FONT_SIZE;
        return CONFIG.bubble.BUBBLE_FONT_SIZE;
      })
      .attr('font-weight', CONFIG.bubble.FONT_WEIGHT) // Use configured font weight
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => {
        // Apply text color per documentation rules
        if (d.isCentre) {
          return isDarkTheme ? '#ffffff' : '#000000';
        }
        if (d.focus || d.isSelected) {
          return isDarkTheme ? '#ffffff' : '#000000';
        }
        // Use exact bubble color for consistent visual relationship
        return d.color;
      })
      .each(function(d) {
        const lines = d.label.split('\n');
        const text = d3.select(this);
        // Line height is calculated as fontSize * 1.2
        const fontSize = d.isCentre ? CONFIG.bubble.CENTER_BUBBLE_FONT_SIZE : CONFIG.bubble.BUBBLE_FONT_SIZE;
        const lineHeight = fontSize * 1.2;
        text.selectAll('*').remove();
        lines.forEach((line, i) => {
          text
            .append('tspan')
            .attr('x', d.textX)
            .attr('dy', i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight)
            .text(line);
        });
      });
  }
  

  
  /**
   * Clear all rendered bubbles
   */
  clear(): void {
    this.bubbleContainer?.selectAll('*').remove();
    this.labelContainer?.selectAll('*').remove();
  }
}
