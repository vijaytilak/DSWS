import * as d3 from 'd3';
import type { Flow, FlowSegment } from '../services/FlowFactory';
import type { Bubble } from '../types';
import ThemeManager from '../services/ThemeManager';
import EventManager from '../services/EventManager';

/**
 * Interface for modern flow renderer configuration
 */
export interface ModernFlowRendererConfig {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  width: number;
  height: number;
  onFlowClick?: (flow: Flow, segment: FlowSegment) => void;
  onFlowHover?: (flow: Flow, segment: FlowSegment) => void;
}

/**
 * ModernFlowRenderer - D3.js Best Practice Implementation
 * Uses proper data binding with enter/update/exit patterns
 * Renders FlowSegment objects with pre-calculated visual properties
 */
export class ModernFlowRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private flowContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
  private segmentSelection: d3.Selection<SVGPathElement, FlowSegment, SVGGElement, unknown> | null = null;
  private labelSelection: d3.Selection<SVGTextElement, FlowSegment['labels'][0], SVGGElement, unknown> | null = null;
  private markerDefs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  
  private themeManager: ThemeManager;
  private eventManager: EventManager;
  private onFlowClick?: (flow: Flow, segment: FlowSegment) => void;
  private onFlowHover?: (flow: Flow, segment: FlowSegment) => void;

  constructor(config: ModernFlowRendererConfig) {
    this.svg = config.svg;
    this.width = config.width;
    this.height = config.height;
    this.onFlowClick = config.onFlowClick;
    this.onFlowHover = config.onFlowHover;
    
    this.themeManager = ThemeManager.getInstance();
    this.eventManager = EventManager.getInstance();
    
    this.initializeContainers();
  }

  /**
   * Initialize SVG containers with proper layering
   */
  private initializeContainers(): void {
    // Create markers definition container
    this.markerDefs = this.svg.append('defs');
    
    // Create main flow container
    this.flowContainer = this.svg
      .append('g')
      .attr('class', 'modern-flow-container');
  }

  /**
   * Main render method using D3.js best practices
   */
  public render(flows: Flow[]): void {
    // Extract all segments from flows for flat data binding
    const allSegments = this.extractAllSegments(flows);
    
    // Update markers first
    this.updateMarkers(allSegments);
    
    // Render segments using data binding
    this.renderSegments(allSegments);
    
    // Render labels separately for proper layering
    this.renderLabels(allSegments);
  }

  /**
   * Extract all segments from flows for flat data structure
   */
  private extractAllSegments(flows: Flow[]): FlowSegment[] {
    return flows.flatMap(flow => flow.flowSegments);
  }

  /**
   * Update marker definitions using data binding
   */
  private updateMarkers(segments: FlowSegment[]): void {
    // Get unique marker definitions needed
    const markerData = this.getUniqueMarkers(segments);
    
    const markers = this.markerDefs
      .selectAll<SVGMarkerElement, typeof markerData[0]>('marker')
      .data(markerData, d => d.id);

    // Enter: Create new markers
    const markersEnter = markers
      .enter()
      .append('marker')
      .attr('id', d => d.id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', '5')
      .attr('refY', '5')
      .attr('markerWidth', '4')
      .attr('markerHeight', '4')
      .attr('orient', 'auto');

    markersEnter
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z');

    // Update: Update existing markers
    markers.merge(markersEnter)
      .select('path')
      .attr('fill', d => d.color);

    // Exit: Remove unused markers
    markers.exit().remove();
  }

  /**
   * Render segments using D3.js data binding best practices
   */
  private renderSegments(segments: FlowSegment[]): void {
    // Data binding with object constancy
    this.segmentSelection = this.flowContainer
      .selectAll<SVGPathElement, FlowSegment>('path.flow-segment')
      .data(segments, d => d.id);

    // Enter: Create new segments
    const segmentsEnter = this.segmentSelection
      .enter()
      .append('path')
      .attr('class', 'flow-segment')
      .style('opacity', 0)
      .attr('fill', 'none')
      .attr('cursor', 'pointer');

    // Setup event handlers for new segments
    segmentsEnter
      .on('click', (event, d) => this.handleSegmentClick(event, d))
      .on('mouseenter', (event, d) => this.handleSegmentMouseEnter(event, d))
      .on('mouseleave', (event, d) => this.handleSegmentMouseLeave(event, d));

    // Update: Merge enter and update selections
    const segmentsMerged = this.segmentSelection.merge(segmentsEnter);

    // Apply transitions for smooth updates
    segmentsMerged
      .transition('segment-update')
      .duration(300)
      .ease(d3.easeQuadInOut)
      .attr('d', d => this.generatePath(d))
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.thickness)
      .style('opacity', d => d.visible ? d.opacity : 0)
      .attr('stroke-dasharray', d => d.strokeDasharray || 'none')
      .attr('marker-end', d => this.getMarkerUrl(d));

    // Exit: Remove old segments
    this.segmentSelection
      .exit()
      .transition('segment-exit')
      .duration(200)
      .style('opacity', 0)
      .remove();

    // Update selection reference
    this.segmentSelection = segmentsMerged;
  }

  /**
   * Render labels using data binding
   */
  private renderLabels(segments: FlowSegment[]): void {
    // Extract all labels from segments
    const allLabels = segments.flatMap(segment => 
      segment.labels.map(label => ({
        ...label,
        segmentId: segment.id,
        segmentVisible: segment.visible
      }))
    );

    // Data binding for labels
    this.labelSelection = this.flowContainer
      .selectAll<SVGTextElement, typeof allLabels[0]>('text.flow-label')
      .data(allLabels, d => `${d.segmentId}-${d.type}`);

    // Enter: Create new labels
    const labelsEnter = this.labelSelection
      .enter()
      .append('text')
      .attr('class', 'flow-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // Update: Merge and apply properties
    const labelsMerged = this.labelSelection.merge(labelsEnter);

    labelsMerged
      .transition('label-update')
      .duration(300)
      .attr('x', d => d.position.x + (d.offset?.x || 0))
      .attr('y', d => d.position.y + (d.offset?.y || 0))
      .style('fill', d => d.color)
      .style('font-size', d => d.fontSize)
      .style('font-weight', d => d.fontWeight)
      .style('opacity', d => d.visible && d.segmentVisible ? 1 : 0)
      .text(d => d.value);

    // Exit: Remove old labels
    this.labelSelection
      .exit()
      .transition('label-exit')
      .duration(200)
      .style('opacity', 0)
      .remove();

    // Update selection reference
    this.labelSelection = labelsMerged;
  }

  /**
   * Generate SVG path for a segment
   */
  private generatePath(segment: FlowSegment): string {
    const { startPoint, endPoint } = segment;
    
    // For now, simple straight line - can be enhanced with curves
    return `M ${startPoint.x},${startPoint.y} L ${endPoint.x},${endPoint.y}`;
  }

  /**
   * Get unique markers needed for segments
   */
  private getUniqueMarkers(segments: FlowSegment[]): Array<{id: string, color: string}> {
    const markerMap = new Map<string, string>();
    
    segments.forEach(segment => {
      if (segment.marker.type === 'arrow' && segment.marker.position !== 'none') {
        const markerId = `arrow-${segment.color.replace('#', '')}`;
        markerMap.set(markerId, segment.marker.color || segment.color);
      }
    });
    
    return Array.from(markerMap.entries()).map(([id, color]) => ({ id, color }));
  }

  /**
   * Get marker URL for segment
   */
  private getMarkerUrl(segment: FlowSegment): string {
    if (segment.marker.type === 'arrow' && segment.marker.position === 'end') {
      const markerId = `arrow-${segment.color.replace('#', '')}`;
      return `url(#${markerId})`;
    }
    return '';
  }

  /**
   * Handle segment click events
   */
  private handleSegmentClick(event: MouseEvent, segment: FlowSegment): void {
    if (this.onFlowClick) {
      // Find the parent flow for this segment
      const parentFlow = this.findParentFlow(segment);
      if (parentFlow) {
        this.onFlowClick(parentFlow, segment);
      }
    }
  }

  /**
   * Handle segment mouse enter
   */
  private handleSegmentMouseEnter(event: MouseEvent, segment: FlowSegment): void {
    // Highlight segment
    d3.select(event.currentTarget as SVGPathElement)
      .transition('hover-in')
      .duration(150)
      .attr('stroke-width', segment.thickness * 1.5)
      .style('opacity', Math.min(1, segment.opacity * 1.2));

    if (this.onFlowHover) {
      const parentFlow = this.findParentFlow(segment);
      if (parentFlow) {
        this.onFlowHover(parentFlow, segment);
      }
    }
  }

  /**
   * Handle segment mouse leave
   */
  private handleSegmentMouseLeave(event: MouseEvent, segment: FlowSegment): void {
    // Reset segment appearance
    d3.select(event.currentTarget as SVGPathElement)
      .transition('hover-out')
      .duration(150)
      .attr('stroke-width', segment.thickness)
      .style('opacity', segment.opacity);
  }

  /**
   * Find parent flow for a segment (helper method)
   */
  private findParentFlow(segment: FlowSegment): Flow | null {
    // This would need to be provided via data or stored reference
    // For now, return null - in real implementation, maintain flow reference
    return null;
  }

  /**
   * Highlight specific flows
   */
  public highlightFlows(flowIds: string[]): void {
    if (this.segmentSelection) {
      this.segmentSelection
        .classed('highlighted', d => flowIds.includes(d.parentFlowId))
        .transition('highlight')
        .duration(200)
        .style('opacity', d => {
          const isHighlighted = flowIds.includes(d.parentFlowId);
          return isHighlighted ? 1 : 0.3;
        });
    }
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    if (this.segmentSelection) {
      this.segmentSelection
        .classed('highlighted', false)
        .transition('clear-highlight')
        .duration(200)
        .style('opacity', d => d.opacity);
    }
  }

  /**
   * Update renderer size
   */
  public updateSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.flowContainer) {
      this.flowContainer.remove();
    }
    this.segmentSelection = null;
    this.labelSelection = null;
  }
}