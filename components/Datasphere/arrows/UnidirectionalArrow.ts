import { ArrowBase } from './ArrowBase';
import { ArrowConfiguration } from '../config/ArrowTypes';
import ArrowStyleManager, { StandardizedArrowStyle } from '../services/ArrowStyleManager';

/**
 * Unidirectional arrow implementation
 * Represents a straight arrow pointing from start to end
 */
export class UnidirectionalArrow extends ArrowBase {
  private pathElement: SVGPathElement | null = null;
  private labelElements: SVGTextElement[] = [];
  private defs: SVGDefsElement | null = null;
  private arrowStyleManager: ArrowStyleManager;
  
  constructor(config: ArrowConfiguration) {
    super(config);
    // Get the ArrowStyleManager instance
    this.arrowStyleManager = ArrowStyleManager.getInstance();
  }
  
  /**
   * Calculate the path for the unidirectional arrow
   */
  protected calculatePath(): string {
    const { startPoint, endPoint } = this.config;
    return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
  
  /**
   * Create the SVG element for the unidirectional arrow
   */
  createSvgElement(): SVGElement {
    // Create the main SVG group element
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Create defs for markers
    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    group.appendChild(this.defs);
    
    // Create the path element
    this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pathElement.setAttribute('d', this.calculatePath());
    this.applyStyle(this.pathElement);
    
    // Add markers if defined
    if (this.config.startMarker || this.config.endMarker) {
      this.addMarkers();
    }
    
    // Add labels if defined
    if (this.config.labels && this.config.labels.length > 0) {
      this.addLabels();
    }
    
    // Add the path to the group
    group.appendChild(this.pathElement);
    
    // Store the SVG element
    this.svgElement = group;
    
    return group;
  }
  
  /**
   * Update the arrow's visual representation
   */
  update(): void {
    if (!this.svgElement || !this.pathElement) {
      return;
    }
    
    // Update the path
    this.pathElement.setAttribute('d', this.calculatePath());
    this.applyStyle(this.pathElement);
    
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
  }
  
  /**
   * Apply the arrow style to the path element
   */
  private applyStyle(pathElement: SVGPathElement): void {
    const { style } = this.config;
    
    // Convert to standardized style format
    const standardStyle: StandardizedArrowStyle = this.arrowStyleManager.standardizeArrowStyle(style);
    
    // Always set fill to none for path elements
    standardStyle.fill = 'none';
    
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
    if (!this.defs || !this.pathElement) {
      return;
    }
    
    // Add start marker if defined
    if (this.config.startMarker) {
      const startMarkerId = `start-marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startMarker = this.createMarker(startMarkerId, this.config.startMarker);
      this.defs.appendChild(startMarker);
      this.pathElement.setAttribute('marker-start', `url(#${startMarkerId})`);
    }
    
    // Add end marker if defined
    if (this.config.endMarker) {
      const endMarkerId = `end-marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const endMarker = this.createMarker(endMarkerId, this.config.endMarker);
      this.defs.appendChild(endMarker);
      this.pathElement.setAttribute('marker-end', `url(#${endMarkerId})`);
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
      const position = this.calculatePointAtDistance(
        startPoint,
        endPoint,
        this.calculateDistance(startPoint, endPoint) * labelConfig.position
      );
      
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
        const angle = this.calculateAngle(startPoint, endPoint) + Math.PI / 2;
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
