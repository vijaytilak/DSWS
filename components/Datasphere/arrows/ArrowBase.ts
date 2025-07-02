import { ArrowConfiguration, ArrowStyle, MarkerStyle, Point, ArrowLabel } from '../config/ArrowTypes';

/**
 * Base class for all arrow components
 * Provides common functionality and properties for different arrow types
 */
export abstract class ArrowBase {
  protected config: ArrowConfiguration;
  protected svgElement: SVGElement | null = null;
  
  constructor(config: ArrowConfiguration) {
    this.config = config;
  }
  
  /**
   * Get the current arrow configuration
   */
  getConfiguration(): ArrowConfiguration {
    return this.config;
  }
  
  /**
   * Update the arrow configuration
   */
  updateConfiguration(config: Partial<ArrowConfiguration>): void {
    this.config = { ...this.config, ...config };
    this.update();
  }
  
  /**
   * Update the arrow's start point
   */
  setStartPoint(point: Point): void {
    this.config.startPoint = point;
    this.update();
  }
  
  /**
   * Update the arrow's end point
   */
  setEndPoint(point: Point): void {
    this.config.endPoint = point;
    this.update();
  }
  
  /**
   * Update the arrow's style
   */
  setStyle(style: Partial<ArrowStyle>): void {
    this.config.style = { ...this.config.style, ...style };
    this.update();
  }
  
  /**
   * Set the start marker
   */
  setStartMarker(marker: MarkerStyle | undefined): void {
    this.config.startMarker = marker;
    this.update();
  }
  
  /**
   * Set the end marker
   */
  setEndMarker(marker: MarkerStyle | undefined): void {
    this.config.endMarker = marker;
    this.update();
  }
  
  /**
   * Set the arrow labels
   */
  setLabels(labels: ArrowLabel[]): void {
    this.config.labels = labels;
    this.update();
  }
  
  /**
   * Calculate the path for the arrow
   * This method should be implemented by subclasses
   * Can return either a string path or an object with path components
   */
  protected abstract calculatePath(): string | { [key: string]: string };
  
  /**
   * Create the SVG element for the arrow
   * This method should be implemented by subclasses
   */
  abstract createSvgElement(): SVGElement;
  
  /**
   * Update the arrow's visual representation
   * This method should be implemented by subclasses
   */
  abstract update(): void;
  
  /**
   * Calculate the angle between two points in radians
   */
  protected calculateAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }
  
  /**
   * Calculate the distance between two points
   */
  protected calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Calculate a point at a specific distance along the line
   */
  protected calculatePointAtDistance(start: Point, end: Point, distance: number): Point {
    const totalDistance = this.calculateDistance(start, end);
    const ratio = distance / totalDistance;
    
    return {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    };
  }
  
  /**
   * Create a marker element for the arrow
   */
  protected createMarker(id: string, marker: MarkerStyle): SVGMarkerElement {
    const markerElement = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerElement.setAttribute('id', id);
    markerElement.setAttribute('viewBox', '0 0 10 10');
    markerElement.setAttribute('refX', '5');
    markerElement.setAttribute('refY', '5');
    markerElement.setAttribute('markerWidth', marker.size.toString());
    markerElement.setAttribute('markerHeight', marker.size.toString());
    markerElement.setAttribute('orient', 'auto');
    
    // Create the marker shape based on the type
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    switch (marker.type) {
      case 'arrow':
        shape.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        break;
      case 'circle':
        shape.setAttribute('d', 'M 5 5 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0');
        break;
      case 'diamond':
        shape.setAttribute('d', 'M 5 0 L 10 5 L 5 10 L 0 5 z');
        break;
      case 'square':
        shape.setAttribute('d', 'M 0 0 L 10 0 L 10 10 L 0 10 z');
        break;
    }
    
    shape.setAttribute('fill', marker.color);
    
    if (marker.strokeWidth) {
      shape.setAttribute('stroke', marker.color);
      shape.setAttribute('stroke-width', marker.strokeWidth.toString());
    }
    
    markerElement.appendChild(shape);
    return markerElement;
  }
}
