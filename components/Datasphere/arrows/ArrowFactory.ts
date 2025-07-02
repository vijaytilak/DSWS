import { ArrowBase } from './ArrowBase';
import { UnidirectionalArrow } from './UnidirectionalArrow';
import { BidirectionalArrow } from './BidirectionalArrow';
import { 
  ArrowConfiguration, 
  ArrowType, 
  Point, 
  ArrowStyle, 
  MarkerStyle 
} from '../config/ArrowTypes';

/**
 * Factory class for creating arrow components
 * Provides methods to create different types of arrows based on configuration
 */
export class ArrowFactory {
  /**
   * Create an arrow based on the provided configuration
   */
  static createArrow(config: ArrowConfiguration): ArrowBase {
    switch (config.type) {
      case 'unidirectional':
        return new UnidirectionalArrow(config);
      case 'bidirectional':
        return new BidirectionalArrow(config);
      case 'curved':
        // For now, we'll use the unidirectional arrow for curved arrows
        // This can be extended with a proper CurvedArrow implementation later
        return new UnidirectionalArrow(config);
      case 'animated':
        // For now, we'll use the unidirectional arrow with animation for animated arrows
        // This can be extended with a proper AnimatedArrow implementation later
        const animatedConfig = { 
          ...config, 
          style: { 
            ...config.style, 
            animationDuration: config.style.animationDuration || 2 
          } 
        };
        return new UnidirectionalArrow(animatedConfig);
      default:
        return new UnidirectionalArrow(config);
    }
  }
  
  /**
   * Create a unidirectional arrow
   */
  static createUnidirectionalArrow(
    startPoint: Point,
    endPoint: Point,
    style: ArrowStyle,
    startMarker?: MarkerStyle,
    endMarker?: MarkerStyle
  ): ArrowBase {
    const config: ArrowConfiguration = {
      type: 'unidirectional',
      startPoint,
      endPoint,
      style,
      startMarker,
      endMarker
    };
    
    return new UnidirectionalArrow(config);
  }
  
  /**
   * Create a bidirectional arrow
   */
  static createBidirectionalArrow(
    startPoint: Point,
    endPoint: Point,
    style: ArrowStyle,
    startMarker?: MarkerStyle,
    endMarker?: MarkerStyle
  ): ArrowBase {
    const config: ArrowConfiguration = {
      type: 'bidirectional',
      startPoint,
      endPoint,
      style,
      startMarker,
      endMarker
    };
    
    return new BidirectionalArrow(config);
  }
  
  /**
   * Create a flow arrow based on flow data
   * @param startPoint Start point of the arrow
   * @param endPoint End point of the arrow
   * @param flowValue Flow value to determine arrow thickness
   * @param isBidirectional Whether the arrow should be bidirectional
   * @param color Arrow color
   */
  static createFlowArrow(
    startPoint: Point,
    endPoint: Point,
    flowValue: number,
    isBidirectional: boolean = false,
    color: string = '#3498db'
  ): ArrowBase {
    // Calculate thickness based on flow value
    // This is a simple linear scaling, but can be adjusted as needed
    const minThickness = 1;
    const maxThickness = 10;
    const normalizedValue = Math.min(Math.max(flowValue, 0), 100) / 100;
    const thickness = minThickness + (maxThickness - minThickness) * normalizedValue;
    
    // Create arrow style
    const style: ArrowStyle = {
      thickness,
      color,
      opacity: 0.8
    };
    
    // Create end marker
    const endMarker: MarkerStyle = {
      type: 'arrow',
      size: 5 + thickness / 2, // Scale marker size with arrow thickness
      color
    };
    
    // Create the appropriate arrow type
    if (isBidirectional) {
      return this.createBidirectionalArrow(startPoint, endPoint, style, undefined, endMarker);
    } else {
      return this.createUnidirectionalArrow(startPoint, endPoint, style, undefined, endMarker);
    }
  }
  
  /**
   * Create a flow arrow with a label
   * @param startPoint Start point of the arrow
   * @param endPoint End point of the arrow
   * @param flowValue Flow value to determine arrow thickness
   * @param labelText Text to display on the arrow
   * @param isBidirectional Whether the arrow should be bidirectional
   * @param color Arrow color
   */
  static createLabeledFlowArrow(
    startPoint: Point,
    endPoint: Point,
    flowValue: number,
    labelText: string,
    isBidirectional: boolean = false,
    color: string = '#3498db'
  ): ArrowBase {
    // Create the base arrow
    const arrow = this.createFlowArrow(startPoint, endPoint, flowValue, isBidirectional, color);
    
    // Add label
    const config = arrow.getConfiguration();
    config.labels = [{
      text: labelText,
      position: 0.5, // Middle of the arrow
      offset: 10, // Offset from the line
      fontSize: 12,
      color: '#333333'
    }];
    
    // Update the arrow with the new configuration
    arrow.updateConfiguration(config);
    
    return arrow;
  }
}
