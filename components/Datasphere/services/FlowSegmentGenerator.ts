import type { Bubble } from '../types';
import type { Flow, FlowSegment } from './FlowFactory';
import ThemeManager from './ThemeManager';

/**
 * Configuration for segment generation
 */
export interface SegmentGenerationConfig {
  bubbles: Bubble[];
  canvasWidth: number;
  canvasHeight: number;
  thicknesScale?: (value: number, maxValue: number) => number;
  colorScale?: (flowType: string, metric: string) => string;
}

/**
 * FlowSegmentGenerator service - Converts Flow objects to renderable FlowSegment objects
 */
export default class FlowSegmentGenerator {
  private static instance: FlowSegmentGenerator;
  private themeManager: ThemeManager;
  private bubbles: Bubble[] = [];

  private constructor() {
    this.themeManager = ThemeManager.getInstance();
  }

  public static getInstance(): FlowSegmentGenerator {
    if (!FlowSegmentGenerator.instance) {
      FlowSegmentGenerator.instance = new FlowSegmentGenerator();
    }
    return FlowSegmentGenerator.instance;
  }

  /**
   * Generate FlowSegment objects from Flow objects
   */
  public generateSegments(flows: Flow[], config: SegmentGenerationConfig): Flow[] {
    // Store bubbles for color calculations
    this.bubbles = config.bubbles;
    
    const maxFlowValue = Math.max(...flows.map(f => f.abs));

    return flows.map(flow => {
      const segments = this.createSegmentsForFlow(flow, config, maxFlowValue);
      return {
        ...flow,
        flowSegments: segments
      };
    });
  }

  /**
   * Create FlowSegment objects for a single Flow
   */
  private createSegmentsForFlow(
    flow: Flow, 
    config: SegmentGenerationConfig, 
    maxFlowValue: number
  ): FlowSegment[] {
    if (flow.type === 'unidirectional') {
      return [this.createUnidirectionalSegment(flow, config, maxFlowValue)];
    } else {
      return this.createBidirectionalSegments(flow, config, maxFlowValue);
    }
  }

  /**
   * Create a single segment for unidirectional flows
   */
  private createUnidirectionalSegment(
    flow: Flow, 
    config: SegmentGenerationConfig, 
    maxFlowValue: number
  ): FlowSegment {
    const startBubble = this.findBubble(flow.from, config.bubbles);
    const endBubble = this.findBubble(flow.to, config.bubbles);

    if (!startBubble) {
      console.error(`Start bubble ${flow.from} not found in bubbles:`, config.bubbles.map(b => ({ id: b.id, label: b.label })));
      throw new Error(`Start bubble ${flow.from} not found`);
    }

    // Calculate start point at outer edge of source bubble
    const startPoint = this.calculateBubbleEdgePoint(startBubble, endBubble, config);
    
    // Handle center flow case - calculate end point at outer edge
    const endPoint = endBubble ? 
      this.calculateBubbleEdgePoint(endBubble, startBubble, config) : 
      { x: config.canvasWidth / 2, y: config.canvasHeight / 2 };
    
    // Calculate midpoint for label positioning
    const midPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };

    // Extract flow data values based on flow type
    const flowData = this.extractFlowData(flow);

    const segment: FlowSegment = {
      id: `${flow.id}-segment-single`,
      parentFlowId: flow.id,
      abs: flowData.abs,
      perc: flowData.perc,
      index: flowData.index,
      
      direction: 'single',
      startBubble: flow.from,
      endBubble: flow.to,
      
      startPoint,
      endPoint,
      midPoint,
      
      color: this.getFlowColor(flow),
      thickness: this.calculateThickness(flow.abs, maxFlowValue),
      opacity: 1,
      
      marker: {
        type: 'arrow',
        position: this.getMarkerPosition(flow),
        opacity: 1,
      },
      
      labels: this.createLabels(flowData, midPoint),
      
      tooltip: {
        enabled: true,
        content: this.generateTooltipContent(flow),
      },
      
      visible: flow.visible,
      highlighted: flow.highlighted,
      selected: flow.selected,
      animationProgress: 1,
    };

    return segment;
  }

  /**
   * Create segments for bidirectional flows
   */
  private createBidirectionalSegments(
    flow: Flow, 
    config: SegmentGenerationConfig, 
    maxFlowValue: number
  ): FlowSegment[] {
    const startBubble = this.findBubble(flow.from, config.bubbles);
    const endBubble = this.findBubble(flow.to, config.bubbles);

    if (!startBubble) {
      throw new Error(`Start bubble ${flow.from} not found`);
    }

    // Calculate actual edge points for start and end bubbles
    const startEdgePoint = this.calculateBubbleEdgePoint(startBubble, endBubble, config);
    const endEdgePoint = endBubble ? 
      this.calculateBubbleEdgePoint(endBubble, startBubble, config) : 
      { x: config.canvasWidth / 2, y: config.canvasHeight / 2 };

    // Calculate split point based on flow percentages
    const splitPoint = this.calculateSplitPoint(flow, startEdgePoint, endEdgePoint);

    // Extract bidirectional flow data
    const bidirectionalData = this.extractBidirectionalData(flow);

    // Create outgoing segment (from start bubble edge to split point)
    const outgoingSegment: FlowSegment = {
      id: `${flow.id}-segment-outgoing`,
      parentFlowId: flow.id,
      abs: bidirectionalData.outAbs,
      perc: bidirectionalData.outPerc,
      index: bidirectionalData.outIndex,
      
      direction: 'outgoing',
      startBubble: flow.from,
      endBubble: 'split',
      
      startPoint: startEdgePoint,
      endPoint: splitPoint,
      midPoint: {
        x: (startEdgePoint.x + splitPoint.x) / 2,
        y: (startEdgePoint.y + splitPoint.y) / 2
      },
      
      color: this.getFlowColor(flow, 'outgoing'),
      thickness: this.calculateThickness(bidirectionalData.outAbs, maxFlowValue),
      opacity: 1,
      
      marker: {
        type: 'arrow',
        position: 'end',
        opacity: 1,
      },
      
      labels: this.createLabels(
        { abs: bidirectionalData.outAbs, perc: bidirectionalData.outPerc, index: bidirectionalData.outIndex },
        {
          x: (startEdgePoint.x + splitPoint.x) / 2,
          y: (startEdgePoint.y + splitPoint.y) / 2
        }
      ),
      
      tooltip: {
        enabled: true,
        content: this.generateTooltipContent(flow, 'outgoing'),
      },
      
      visible: flow.visible,
      highlighted: flow.highlighted,
      selected: flow.selected,
      animationProgress: 1,
    };

    // Create incoming segment (from split point to end bubble edge)
    const incomingSegment: FlowSegment = {
      id: `${flow.id}-segment-incoming`,
      parentFlowId: flow.id,
      abs: bidirectionalData.inAbs,
      perc: bidirectionalData.inPerc,
      index: bidirectionalData.inIndex,
      
      direction: 'incoming',
      startBubble: 'split',
      endBubble: flow.to,
      
      startPoint: splitPoint,
      endPoint: endEdgePoint,
      midPoint: {
        x: (splitPoint.x + endEdgePoint.x) / 2,
        y: (splitPoint.y + endEdgePoint.y) / 2
      },
      
      color: this.getFlowColor(flow, 'incoming'),
      thickness: this.calculateThickness(bidirectionalData.inAbs, maxFlowValue),
      opacity: 1,
      
      marker: {
        type: 'arrow',
        position: 'end',
        opacity: 1,
      },
      
      labels: this.createLabels(
        { abs: bidirectionalData.inAbs, perc: bidirectionalData.inPerc, index: bidirectionalData.inIndex },
        {
          x: (splitPoint.x + endEdgePoint.x) / 2,
          y: (splitPoint.y + endEdgePoint.y) / 2
        }
      ),
      
      tooltip: {
        enabled: true,
        content: this.generateTooltipContent(flow, 'incoming'),
      },
      
      visible: flow.visible,
      highlighted: flow.highlighted,
      selected: flow.selected,
      animationProgress: 1,
    };

    return [outgoingSegment, incomingSegment];
  }

  /**
   * Find bubble by ID
   */
  private findBubble(bubbleId: string, bubbles: Bubble[]): Bubble | null {
    if (bubbleId === 'center') return null; // Center is conceptual
    return bubbles.find(b => b.id.toString() === bubbleId) || null;
  }

  /**
   * Calculate split point for bidirectional flows
   */
  private calculateSplitPoint(
    flow: Flow, 
    startPoint: { x: number, y: number }, 
    endPoint: { x: number, y: number }
  ): { x: number, y: number } {
    // Get the bidirectional data to calculate proportions
    const bidirectionalData = this.extractBidirectionalData(flow);
    const totalAbs = bidirectionalData.inAbs + bidirectionalData.outAbs;
    
    // If no total, default to midpoint
    if (totalAbs === 0) {
      return {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2
      };
    }

    // Calculate split ratio based on outgoing flow percentage
    const outRatio = bidirectionalData.outAbs / totalAbs;
    
    // Split point is closer to start for higher outgoing values
    // This creates visual balance where thicker outgoing segment is shorter
    const splitRatio = 0.3 + (0.4 * (1 - outRatio)); // Range: 0.3 to 0.7
    
    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * splitRatio,
      y: startPoint.y + (endPoint.y - startPoint.y) * splitRatio
    };
  }

  /**
   * Extract flow data values from Flow object
   */
  private extractFlowData(flow: Flow): { abs: number, perc: number, index: number } {
    if (!flow.rawFlowData || !flow.rawFlowData[flow.flowType]) {
      return {
        abs: flow.abs,
        perc: 0,
        index: 0
      };
    }

    const flowTypeData = flow.rawFlowData[flow.flowType];
    return {
      abs: flow.abs,
      perc: flowTypeData.perc || 0,
      index: flowTypeData.index || 0
    };
  }

  /**
   * Extract bidirectional flow data
   */
  private extractBidirectionalData(flow: Flow): {
    inAbs: number, inPerc: number, inIndex: number,
    outAbs: number, outPerc: number, outIndex: number
  } {
    if (!flow.rawFlowData || !flow.rawFlowData.both) {
      // Default split if no specific data available
      const defaultInRatio = 0.4;
      const defaultOutRatio = 0.6;
      
      return {
        inAbs: Math.round(flow.abs * defaultInRatio),
        inPerc: defaultInRatio,
        inIndex: 1,
        outAbs: Math.round(flow.abs * defaultOutRatio),
        outPerc: defaultOutRatio,
        outIndex: 2
      };
    }

    const bothData = flow.rawFlowData.both;
    
    return {
      inAbs: Math.round(flow.abs * (bothData.in_perc || 0.4)),
      inPerc: bothData.in_perc || 0.4,
      inIndex: bothData.index || 1,
      outAbs: Math.round(flow.abs * (bothData.out_perc || 0.6)),
      outPerc: bothData.out_perc || 0.6,
      outIndex: bothData.index || 1 // Same index for both directions typically
    };
  }

  /**
   * Calculate line thickness based on flow value
   */
  private calculateThickness(value: number, maxValue: number): number {
    const minThickness = 2;
    const maxThickness = 12;
    const ratio = maxValue > 0 ? value / maxValue : 0;
    return minThickness + (maxThickness - minThickness) * ratio;
  }

  /**
   * Get flow color based on source bubble color
   */
  private getFlowColor(flow: Flow, direction?: 'incoming' | 'outgoing'): string {
    // Find the source bubble to get its color
    const sourceBubble = this.findBubble(flow.from, this.bubbles);
    let baseColor: string;
    
    if (sourceBubble && sourceBubble.color) {
      // Use the source bubble's color
      baseColor = sourceBubble.color;
    } else {
      // Fallback to theme-based colors if bubble color not available
      const isDark = this.themeManager.isDark();
      const colorMap = {
        churn: isDark ? '#ef4444' : '#dc2626',    // Red
        switching: isDark ? '#3b82f6' : '#2563eb', // Blue
        spend: isDark ? '#10b981' : '#059669'      // Green
      };
      baseColor = colorMap[flow.metric] || (isDark ? '#6b7280' : '#4b5563');
    }

    // Modify opacity for bidirectional flows - incoming should be slightly dimmer
    if (direction === 'incoming') {
      baseColor = this.adjustColorOpacity(baseColor, 0.8);
    }

    return baseColor;
  }

  /**
   * Adjust color opacity
   */
  private adjustColorOpacity(color: string, opacity: number): string {
    // Simple opacity adjustment - in real implementation, use proper color manipulation
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  }

  /**
   * Get marker position based on flow direction
   */
  private getMarkerPosition(flow: Flow): 'start' | 'end' | 'both' | 'none' {
    // For markets view, arrows should point TO the center
    if (flow.view === 'markets') {
      if (flow.flowType === 'in') return 'start'; // Arrow points away from center (incoming to bubble)
      if (flow.flowType === 'out') return 'end';  // Arrow points toward center (outgoing from bubble)
      if (flow.flowType === 'net') {
        // For net flows, direction depends on value sign
        return flow.abs >= 0 ? 'end' : 'start';
      }
      return 'end'; // Default for markets - toward center
    }
    
    // For brands view, standard arrow directions
    if (flow.flowType === 'in') return 'start';
    if (flow.flowType === 'out') return 'end';
    if (flow.flowType === 'net') {
      return flow.abs >= 0 ? 'end' : 'start';
    }
    return 'end'; // Default
  }

  /**
   * Create labels for segment
   */
  private createLabels(
    data: { abs: number, perc: number, index: number },
    position: { x: number, y: number }
  ): FlowSegment['labels'] {
    const isDark = this.themeManager.isDark();
    const textColor = isDark ? '#f3f4f6' : '#1f2937';

    return [
      {
        type: 'percentage',
        value: `${(data.perc * 100).toFixed(1)}%`,
        position: { x: position.x, y: position.y - 10 },
        visible: true,
        color: textColor,
        fontSize: '12px',
        fontWeight: 'normal',
      },
      {
        type: 'index',
        value: `(${data.index})`,
        position: { x: position.x, y: position.y + 10 },
        visible: true,
        color: textColor,
        fontSize: '10px',
        fontWeight: 'normal',
      }
    ];
  }

  /**
   * Generate tooltip content
   */
  private generateTooltipContent(flow: Flow, direction?: 'incoming' | 'outgoing'): string {
    const directionLabel = direction ? ` (${direction})` : '';
    return `${flow.metadata?.sourceName} → ${flow.metadata?.targetName}${directionLabel}\n` +
           `${flow.metric}: ${flow.abs}\n` +
           `Type: ${flow.flowType}`;
  }

  /**
   * Calculate the point on the outer edge of a bubble towards another bubble
   */
  private calculateBubbleEdgePoint(fromBubble: Bubble, toBubble: Bubble | null, config: SegmentGenerationConfig): { x: number, y: number } {
    // Default target is canvas center if no target bubble
    const targetX = toBubble ? toBubble.x : config.canvasWidth / 2;
    const targetY = toBubble ? toBubble.y : config.canvasHeight / 2;
    
    // Calculate angle from bubble center to target
    const deltaX = targetX - fromBubble.x;
    const deltaY = targetY - fromBubble.y;
    const angle = Math.atan2(deltaY, deltaX);
    
    // Calculate point on outer edge of bubble
    const edgeX = fromBubble.x + fromBubble.radius * Math.cos(angle);
    const edgeY = fromBubble.y + fromBubble.radius * Math.sin(angle);
    
    return { x: edgeX, y: edgeY };
  }
}