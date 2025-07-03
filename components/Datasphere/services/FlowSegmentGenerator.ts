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
      throw new Error(`Start bubble ${flow.from} not found`);
    }

    // Handle center flow case
    const endPoint = endBubble ? 
      { x: endBubble.x, y: endBubble.y } : 
      { x: config.canvasWidth / 2, y: config.canvasHeight / 2 };

    const startPoint = { x: startBubble.x, y: startBubble.y };
    
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

    const endPoint = endBubble ? 
      { x: endBubble.x, y: endBubble.y } : 
      { x: config.canvasWidth / 2, y: config.canvasHeight / 2 };

    const startPoint = { x: startBubble.x, y: startBubble.y };

    // Calculate split point based on flow percentages
    const splitPoint = this.calculateSplitPoint(flow, startPoint, endPoint);

    // Extract bidirectional flow data
    const bidirectionalData = this.extractBidirectionalData(flow);

    // Create outgoing segment (from split point to end bubble)
    const outgoingSegment: FlowSegment = {
      id: `${flow.id}-segment-outgoing`,
      parentFlowId: flow.id,
      abs: bidirectionalData.outAbs,
      perc: bidirectionalData.outPerc,
      index: bidirectionalData.outIndex,
      
      direction: 'outgoing',
      startBubble: 'split',
      endBubble: flow.to,
      
      startPoint: splitPoint,
      endPoint,
      midPoint: {
        x: (splitPoint.x + endPoint.x) / 2,
        y: (splitPoint.y + endPoint.y) / 2
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
          x: (splitPoint.x + endPoint.x) / 2,
          y: (splitPoint.y + endPoint.y) / 2
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

    // Create incoming segment (from split point to start bubble)
    const incomingSegment: FlowSegment = {
      id: `${flow.id}-segment-incoming`,
      parentFlowId: flow.id,
      abs: bidirectionalData.inAbs,
      perc: bidirectionalData.inPerc,
      index: bidirectionalData.inIndex,
      
      direction: 'incoming',
      startBubble: 'split',
      endBubble: flow.from,
      
      startPoint: splitPoint,
      endPoint: startPoint,
      midPoint: {
        x: (splitPoint.x + startPoint.x) / 2,
        y: (splitPoint.y + startPoint.y) / 2
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
          x: (splitPoint.x + startPoint.x) / 2,
          y: (splitPoint.y + startPoint.y) / 2
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
    // This is a simplified version - in real implementation, you'd need to
    // extract the actual perc and index values from the raw data
    return {
      abs: flow.abs,
      perc: 0, // TODO: Extract from raw data based on flowType
      index: 0 // TODO: Extract from raw data based on flowType
    };
  }

  /**
   * Extract bidirectional flow data
   */
  private extractBidirectionalData(flow: Flow): {
    inAbs: number, inPerc: number, inIndex: number,
    outAbs: number, outPerc: number, outIndex: number
  } {
    // This is a simplified version - in real implementation, you'd need to
    // extract the actual values from the raw data
    return {
      inAbs: flow.abs * 0.4,  // TODO: Extract real values
      inPerc: 0,
      inIndex: 0,
      outAbs: flow.abs * 0.6, // TODO: Extract real values
      outPerc: 0,
      outIndex: 0
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
   * Get flow color based on theme and flow properties
   */
  private getFlowColor(flow: Flow, direction?: 'incoming' | 'outgoing'): string {
    const isDark = this.themeManager.isDark();
    
    // Base colors for different metrics
    const colorMap = {
      churn: isDark ? '#ef4444' : '#dc2626',    // Red
      switching: isDark ? '#3b82f6' : '#2563eb', // Blue
      spend: isDark ? '#10b981' : '#059669'      // Green
    };

    let baseColor = colorMap[flow.metric] || (isDark ? '#6b7280' : '#4b5563');

    // Modify opacity or hue for bidirectional flows
    if (direction === 'incoming') {
      baseColor = this.adjustColorOpacity(baseColor, 0.7);
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
    if (flow.flowType === 'in') return 'start';
    if (flow.flowType === 'out') return 'end';
    if (flow.flowType === 'net') {
      // For net flows, direction depends on value sign
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
}