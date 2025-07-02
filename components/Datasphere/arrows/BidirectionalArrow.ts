import { ArrowBase } from './ArrowBase';
import { ArrowConfiguration, Point } from '../config/ArrowTypes';
import ArrowStyleManager, { StandardizedArrowStyle } from '../services/ArrowStyleManager';

/**
 * Bidirectional arrow implementation
 * Represents an arrow with two segments showing flow in both directions
 */
export class BidirectionalArrow extends ArrowBase {
  private inPathElement: SVGPathElement | null = null;
  private outPathElement: SVGPathElement | null = null;
  private splitPoint: Point | null = null;
  private labelElements: SVGTextElement[] = [];
  private defs: SVGDefsElement | null = null;
  private arrowStyleManager: ArrowStyleManager;
  
  constructor(config: ArrowConfiguration) {
    super(config);
    this.calculateSplitPoint();
    // Get the ArrowStyleManager instance
    this.arrowStyleManager = ArrowStyleManager.getInstance();
  }
  
  /**
   * Calculate the split point for the bidirectional arrow
   * This is the point where the two segments of the arrow meet
   */
  private calculateSplitPoint(): void {
    const { startPoint, endPoint } = this.config;
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    
    // Calculate the perpendicular offset for the split point
    const angle = this.calculateAngle(startPoint, endPoint);
    const perpAngle = angle + Math.PI / 2;
    const offset = 20; // Offset distance from the midpoint
    
    this.splitPoint = {
      x: midX + Math.cos(perpAngle) * offset,
      y: midY + Math.sin(perpAngle) * offset
    };
  }
  
  /**
   * Calculate the paths for the bidirectional arrow
   * Returns an object with inPath and outPath
   */
  protected calculatePath(): { inPath: string; outPath: string } {
    if (!this.splitPoint) {
      this.calculateSplitPoint();
    }
    
    const { startPoint, endPoint } = this.config;
    const sp = this.splitPoint!;
    
    // Path from split point to start point (inflow)
    const inPath = `M ${sp.x} ${sp.y} L ${startPoint.x} ${startPoint.y}`;
    
    // Path from split point to end point (outflow)
    const outPath = `M ${sp.x} ${sp.y} L ${endPoint.x} ${endPoint.y}`;
    
    return { inPath, outPath };
  }
  
  /**
   * Create the SVG element for the bidirectional arrow
   */
  createSvgElement(): SVGElement {
    // Create the main SVG group element
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Create defs for markers
    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    group.appendChild(this.defs);
    
    // Calculate paths
    const { inPath, outPath } = this.calculatePath();
    
    // Create the inflow path element
    this.inPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.inPathElement.setAttribute('d', inPath);
    this.inPathElement.setAttribute('class', 'inflow-path');
    this.applyStyle(this.inPathElement, 'in');
    
    // Create the outflow path element
    this.outPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.outPathElement.setAttribute('d', outPath);
    this.outPathElement.setAttribute('class', 'outflow-path');
    this.applyStyle(this.outPathElement, 'out');
    
    // Add markers if defined
    if (this.config.startMarker || this.config.endMarker) {
      this.addMarkers();
    }
    
    // Add labels if defined
    if (this.config.labels && this.config.labels.length > 0) {
      this.addLabels();
    }
    
    // Add the paths to the group
    group.appendChild(this.inPathElement);
    group.appendChild(this.outPathElement);
    
    // Add the split point indicator (small circle)
    if (this.splitPoint) {
      const splitPointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      splitPointCircle.setAttribute('cx', this.splitPoint.x.toString());
      splitPointCircle.setAttribute('cy', this.splitPoint.y.toString());
      splitPointCircle.setAttribute('r', '3');
      
      // Use ArrowStyleManager to apply the color
      const markerStyle: StandardizedArrowStyle = {
        fill: this.config.style.color,
        stroke: this.config.style.color,
        strokeWidth: 1 // Default stroke width for the split point
      };
      this.arrowStyleManager.applyStyleToElement(splitPointCircle, markerStyle);
      
      group.appendChild(splitPointCircle);
    }
    
    // Store the SVG element
    this.svgElement = group;
    
    return group;
  }
  
  /**
   * Update the arrow's visual representation
   */
  update(): void {
    if (!this.svgElement || !this.inPathElement || !this.outPathElement) {
      return;
    }
    
    // Recalculate the split point
    this.calculateSplitPoint();
    
    // Update the paths
    const { inPath, outPath } = this.calculatePath();
    this.inPathElement.setAttribute('d', inPath);
    this.outPathElement.setAttribute('d', outPath);
    
    // Update styles
    this.applyStyle(this.inPathElement, 'in');
    this.applyStyle(this.outPathElement, 'out');
    
    // Update markers
    if (this.defs) {
      // Clear existing markers
      while (this.defs.firstChild) {
        this.defs.removeChild(this.defs.firstChild);
      }
      
      // Add updated markers
      if (this.config.startMarker || this.config.endMarker) {
        this.addMarkers();
      }
    }
    
    // Update labels
    this.updateLabels();
    
    // Update the split point indicator
    if (this.splitPoint && this.svgElement) {
      const splitPointCircle = this.svgElement.querySelector('circle');
      if (splitPointCircle) {
        splitPointCircle.setAttribute('cx', this.splitPoint.x.toString());
        splitPointCircle.setAttribute('cy', this.splitPoint.y.toString());
      }
    }
  }
  
  /**
   * Apply the arrow style to the path element
   * @param pathElement The path element to style
   * @param pathType 'in' or 'out' to differentiate between inflow and outflow paths
   */
  private applyStyle(pathElement: SVGPathElement, pathType: 'in' | 'out'): void {
    const { style } = this.config;
    
    // Convert to standardized style format
    const standardStyle: StandardizedArrowStyle = this.arrowStyleManager.standardizeArrowStyle(style);
    
    // Always set fill to none for path elements
    standardStyle.fill = 'none';
    
    // Apply different dash patterns for in and out paths
    if (pathType === 'in') {
      standardStyle.strokeDasharray = style.dashArray || '';
    } else {
      // For outflow, use a different dash pattern or none
      standardStyle.strokeDasharray = '';
    }
    
    // Apply standardized style to the element
    this.arrowStyleManager.applyStyleToElement(pathElement, standardStyle);
    
    // Add animation if specified
    if (style.animationDuration) {
      const animateElement = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateElement.setAttribute('attributeName', 'stroke-dashoffset');
      animateElement.setAttribute('from', '0');
      animateElement.setAttribute('to', '100');
      animateElement.setAttribute('dur', `${style.animationDuration}s`);
      animateElement.setAttribute('repeatCount', 'indefinite');
      pathElement.appendChild(animateElement);
    }
  }
  
  /**
   * Add markers to the arrow
   */
  private addMarkers(): void {
    if (!this.defs || !this.inPathElement || !this.outPathElement) {
      return;
    }
    
    // Create markers for inflow path
    if (this.config.startMarker) {
      const inStartMarkerId = `in-start-marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const inStartMarker = this.createMarker(inStartMarkerId, this.config.startMarker);
      this.defs.appendChild(inStartMarker);
      this.inPathElement.setAttribute('marker-end', `url(#${inStartMarkerId})`);
    }
    
    // Create markers for outflow path
    if (this.config.endMarker) {
      const outEndMarkerId = `out-end-marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const outEndMarker = this.createMarker(outEndMarkerId, this.config.endMarker);
      this.defs.appendChild(outEndMarker);
      this.outPathElement.setAttribute('marker-end', `url(#${outEndMarkerId})`);
    }
  }
  
  /**
   * Add labels to the arrow
   */
  private addLabels(): void {
    if (!this.svgElement || !this.config.labels) {
      return;
    }
    
    // Clear existing labels
    this.labelElements.forEach(label => {
      if (this.svgElement && this.svgElement.contains(label)) {
        this.svgElement.removeChild(label);
      }
    });
    this.labelElements = [];
    
    // Add new labels
    this.config.labels.forEach(labelConfig => {
      const { startPoint, endPoint } = this.config;
      const sp = this.splitPoint!;
      
      // Determine which path to place the label on
      let position: Point;
      if (labelConfig.position < 0.5) {
        // Place on inflow path
        position = this.calculatePointAtDistance(
          sp,
          startPoint,
          this.calculateDistance(sp, startPoint) * (labelConfig.position * 2)
        );
      } else {
        // Place on outflow path
        position = this.calculatePointAtDistance(
          sp,
          endPoint,
          this.calculateDistance(sp, endPoint) * ((labelConfig.position - 0.5) * 2)
        );
      }
      
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('x', position.x.toString());
      textElement.setAttribute('y', position.y.toString());
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('dominant-baseline', 'central');
      
      if (labelConfig.fontSize) {
        textElement.setAttribute('font-size', `${labelConfig.fontSize}px`);
      }
      
      if (labelConfig.color) {
        textElement.setAttribute('fill', labelConfig.color);
      }
      
      if (labelConfig.offset) {
        // Calculate the appropriate angle based on which path the label is on
        let angle: number;
        if (labelConfig.position < 0.5) {
          angle = this.calculateAngle(sp, startPoint) + Math.PI / 2;
        } else {
          angle = this.calculateAngle(sp, endPoint) + Math.PI / 2;
        }
        
        const offsetX = Math.cos(angle) * labelConfig.offset;
        const offsetY = Math.sin(angle) * labelConfig.offset;
        
        textElement.setAttribute('x', (position.x + offsetX).toString());
        textElement.setAttribute('y', (position.y + offsetY).toString());
      }
      
      textElement.textContent = labelConfig.text;
      this.svgElement?.appendChild(textElement);
      this.labelElements.push(textElement);
    });
  }
  
  /**
   * Update the labels on the arrow
   */
  private updateLabels(): void {
    if (!this.svgElement) {
      return;
    }
    
    // Remove existing labels
    this.labelElements.forEach(label => {
      if (this.svgElement && this.svgElement.contains(label)) {
        this.svgElement.removeChild(label);
      }
    });
    
    // Add updated labels
    if (this.config.labels && this.config.labels.length > 0) {
      this.addLabels();
    }
  }
}
