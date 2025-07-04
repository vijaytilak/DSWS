import type { Flow } from '../services/FlowFactory';
import { Bubble } from '../types';
import { CONFIG } from '../constants/config';
import { isBidirectionalFlowType } from '../utils/flowTypeUtils';

/**
 * Interface for rendering rule configuration
 */
export interface RenderingRuleConfig {
  flowOpacity: number;
  bubbleOpacity: number;
  highlightOpacity: number;
  defaultOpacity: number;
  focusedFlowOpacity: number;
  unfocusedFlowOpacity: number;
  minFlowThickness: number;
  maxFlowThickness: number;
  minBubbleSize: number;
  maxBubbleSize: number;
  theme: 'light' | 'dark';
  viewType: 'brand' | 'market';
  flowColors: {
    inflow: string;
    outflow: string;
    positive: string;
    negative: string;
    neutral: string;
  };
  bubbleColors: {
    default: string;
    focused: string;
    related: string;
  };
  labelConfig: {
    fontSize: number;
    fontFamily: string;
    color: string;
    focusedColor: string;
  };
}

/**
 * Default rendering rule configuration
 */
export const DEFAULT_RENDERING_RULES: RenderingRuleConfig = {
  flowOpacity: 0.6,
  bubbleOpacity: 0.8,
  highlightOpacity: 1.0,
  defaultOpacity: 0.5,
  focusedFlowOpacity: 1.0,
  unfocusedFlowOpacity: 0.2,
  minFlowThickness: 1,
  maxFlowThickness: 10,
  minBubbleSize: 20,
  maxBubbleSize: 80,
  theme: 'light',
  viewType: 'brand',
  flowColors: {
    // Placeholder values - actual flow colors determined by rules engine
    inflow: CONFIG.colors[1],    // Blue
    outflow: CONFIG.colors[0],   // Orange
    positive: CONFIG.colors[4],  // Green
    negative: CONFIG.colors[5],  // Red
    neutral: CONFIG.colors[6]    // Yellow
  },
  bubbleColors: {
    default: CONFIG.colors[8],   // Light purple
    focused: CONFIG.colors[2],   // Deep purple  
    related: CONFIG.colors[13]   // Medium purple
  },
  labelConfig: {
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    color: '#333333',
    focusedColor: '#000000'
  }
};

/**
 * Class that defines rendering rules for flows and bubbles
 * Contains centralized decision logic for rendering conditions
 */
export class RenderingRules {
  private config: RenderingRuleConfig;

  constructor(config: Partial<RenderingRuleConfig> = {}) {
    this.config = { ...DEFAULT_RENDERING_RULES, ...config };
  }

  /**
   * Get the current rendering configuration
   */
  getConfig(): RenderingRuleConfig {
    return this.config;
  }

  /**
   * Update the rendering configuration
   */
  updateConfig(config: Partial<RenderingRuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate flow line thickness based on flow value and percentile rank
   */
  calculateFlowThickness(flow: Flow): number {
    const { minFlowThickness, maxFlowThickness } = this.config;
    const value = flow.abs || 0;
    
    // For now, use a simple scaling based on absolute value
    // This should be replaced with proper percentile ranking
    const maxValue = 10000; // Approximate max value, should be calculated from all flows
    const ratio = Math.min(value / maxValue, 1);
    
    return minFlowThickness + ((maxFlowThickness - minFlowThickness) * ratio);
  }

  /**
   * Calculate bubble size based on value
   */
  calculateBubbleSize(bubble: Bubble): number {
    const { minBubbleSize, maxBubbleSize } = this.config;
    const value = bubble.percentRank || 0;
    
    // Linear scaling of size based on percentile rank
    return minBubbleSize + ((maxBubbleSize - minBubbleSize) * value) / 100;
  }

  /**
   * Get flow color based on flow type and direction
   */
  getFlowColor(flow: Flow, flowType: string): string {
    if (flowType === 'in') {
      return this.config.flowColors.inflow;
    } else if (flowType === 'out') {
      return this.config.flowColors.outflow;
    } else if (flowType === 'net') {
      // For net flows, use positive/negative colors based on value
      return (flow.abs ?? 0) >= 0 ? this.config.flowColors.positive : this.config.flowColors.negative;
    } else {
      // For bidirectional flows, use neutral color
      return this.config.flowColors.neutral;
    }
  }

  /**
   * Determine if flow should be rendered as bidirectional
   */
  shouldRenderAsBidirectional(flow: Flow, flowType: string, viewType: 'market' | 'brand', flowOption: 'churn' | 'switching'): boolean {
    return flow.type === 'bidirectional' || 
           flowType === 'both' || 
           isBidirectionalFlowType(flowType, viewType === 'market' ? 'Markets' : 'Brands', flowOption);
  }

  /**
   * Determine flow direction based on flow type and value
   */
  getFlowDirection(flow: Flow, flowType: string): 'normal' | 'reversed' | 'bidirectional' {
    if (flowType === 'in') {
      // In flows point from target to source (reversed)
      return 'reversed';
    } else if (flowType === 'out') {
      // Out flows point from source to target (normal)
      return 'normal';
    } else if (flowType === 'net') {
      // Net flows direction depends on value
      return (flow.abs ?? 0) >= 0 ? 'normal' : 'reversed';
    } else {
      // Both flows are bidirectional
      return 'bidirectional';
    }
  }

  /**
   * Get flow data field to use based on flow type and direction
   */
  getFlowDataField(flow: Flow, flowType: string, focusBubbleId: number | null): 'in' | 'out' | 'net' | 'both' {
    if (!focusBubbleId) return flowType as any;

    if (flowType === 'in') {
      // For "in" flows
      if (flow.to === focusBubbleId?.toString()) {
        // When focus bubble is destination, use "out" data
        return 'out';
      } else if (flow.from === focusBubbleId?.toString()) {
        // When focus bubble is source, use "in" data
        return 'in';
      }
    } else if (flowType === 'out') {
      // For "out" flows
      if (flow.from === focusBubbleId?.toString()) {
        // When focus bubble is source, use "out" data
        return 'out';
      } else if (flow.to === focusBubbleId?.toString()) {
        // When focus bubble is destination, use "in" data
        return 'in';
      }
    }

    // For "net" and "both" flows, use the corresponding data field
    return flowType as any;
  }

  /**
   * Get bubble color based on focus state
   */
  getBubbleColor(bubble: Bubble, focusBubbleId: number | null): string {
    // If this is the focused bubble, use the focused color
    if (bubble.id === focusBubbleId) {
      return this.config.bubbleColors.focused;
    }

    // If this bubble is related to the focused bubble, use the related color
    if (focusBubbleId !== null && bubble.relatedTo && bubble.relatedTo.includes(focusBubbleId)) {
      return this.config.bubbleColors.related;
    }

    // Otherwise use the default color
    return this.config.bubbleColors.default;
  }

  /**
   * Determine if bubble should show outer ring
   */
  shouldShowOuterRing(bubble: Bubble, focusBubbleId: number | null): boolean {
    return CONFIG.bubble.outerRing.show;
  }

  /**
   * Get outer ring stroke width
   */
  getOuterRingStrokeWidth(bubble: Bubble, focusBubbleId: number | null): number {
    return CONFIG.bubble.outerRing.strokeWidth;
  }

  /**
   * Get outer ring stroke dasharray
   */
  getOuterRingStrokeDasharray(bubble: Bubble, focusBubbleId: number | null): string {
    return CONFIG.bubble.outerRing.strokeDasharray;
  }

  /**
   * Get outer ring opacity
   */
  getOuterRingOpacity(bubble: Bubble, focusBubbleId: number | null): number {
    return CONFIG.bubble.outerRing.opacity;
  }

  /**
   * Get bubble stroke based on focus state
   */
  getBubbleStroke(bubble: Bubble, focusBubbleId: number | null, isDarkTheme: boolean): string {
    // Apply special stroke for focused bubble
    if (bubble.id === focusBubbleId) {
      return isDarkTheme ? '#ffffff' : '#000000';
    }
    return 'none';
  }

  /**
   * Get bubble stroke width based on focus state
   */
  getBubbleStrokeWidth(bubble: Bubble, focusBubbleId: number | null): number {
    return bubble.id === focusBubbleId ? 2 : 0;
  }

  /**
   * Get flow opacity based on focus state
   */
  getFlowOpacity(flow: Flow, focusedFlow: { from: number; to: number } | null): number {
    const { flowOpacity, focusedFlowOpacity, unfocusedFlowOpacity } = this.config;
    
    if (focusedFlow === null) {
      return flowOpacity;
    }
    
    const isFocused = 
      (flow.from === focusedFlow.from.toString() && flow.to === focusedFlow.to.toString()) ||
      (flow.from === focusedFlow.to.toString() && flow.to === focusedFlow.from.toString());
      
    return isFocused ? focusedFlowOpacity : unfocusedFlowOpacity;
  }

  /**
   * Get bubble opacity based on focus state
   */
  getBubbleOpacity(bubble: Bubble, focusBubbleId: number | null): number {
    const { bubbleOpacity, highlightOpacity, defaultOpacity } = this.config;
    
    if (focusBubbleId === null) {
      return bubbleOpacity;
    }
    
    if (bubble.id === focusBubbleId) {
      return highlightOpacity;
    }
    
    // Check if bubble is related to focused bubble
    if (bubble.relatedTo && bubble.relatedTo.includes(focusBubbleId)) {
      return bubbleOpacity;
    }
    
    return defaultOpacity;
  }

  /**
   * Get label configuration based on focus state
   */
  getLabelConfig(bubble: Bubble, focusBubbleId: number | null): {
    fontSize: number;
    fontFamily: string;
    color: string;
  } {
    const { labelConfig } = this.config;
    
    const isFocused = bubble.id === focusBubbleId;
    
    return {
      fontSize: labelConfig.fontSize,
      fontFamily: labelConfig.fontFamily,
      color: isFocused ? labelConfig.focusedColor : labelConfig.color
    };
  }
}
