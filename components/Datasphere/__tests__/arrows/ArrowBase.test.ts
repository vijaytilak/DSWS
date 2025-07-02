import { ArrowBase } from '../../arrows/ArrowBase';
import { ArrowConfiguration, Point } from '../../config/ArrowTypes';

// Create a concrete implementation of the abstract ArrowBase class for testing
class TestArrow extends ArrowBase {
  createSvgElement(): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    return svg;
  }
  
  protected calculatePath(): string {
    return 'M0,0 L100,100';
  }
  
  update(): void {
    // Implementation for testing
  }
  
  // Additional helper methods for testing
  getLength(): number {
    return this.calculateDistance(this.config.startPoint, this.config.endPoint);
  }
  
  getMidpoint(): Point {
    return this.calculatePointAtDistance(this.config.startPoint, this.config.endPoint, this.getLength() / 2);
  }
}

describe('ArrowBase', () => {
  let arrow: TestArrow;
  let config: ArrowConfiguration;
  
  beforeEach(() => {
    // Mock document.createElementNS
    document.createElementNS = jest.fn().mockImplementation((namespaceURI, qualifiedName) => {
      return document.createElement(qualifiedName);
    });
    
    config = {
      type: 'unidirectional',
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 100, y: 100 },
      style: {
        thickness: 2,
        color: '#000',
        opacity: 1
      }
    };
    
    arrow = new TestArrow(config);
  });
  
  describe('getConfiguration', () => {
    it('should return the current configuration', () => {
      const result = arrow.getConfiguration();
      expect(result).toEqual(config);
    });
  });
  
  describe('updateConfiguration', () => {
    it('should update the configuration and call update', () => {
      const spy = jest.spyOn(arrow, 'update');
      const newConfig = {
        startPoint: { x: 50, y: 50 },
        style: {
          thickness: 2,
          color: '#ff0000'
        }
      };
      
      arrow.updateConfiguration(newConfig);
      
      expect(arrow.getConfiguration()).toEqual({
        ...config,
        ...newConfig,
        style: {
          ...config.style,
          ...newConfig.style
        }
      });
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('setStartPoint', () => {
    it('should update the start point and call update', () => {
      const spy = jest.spyOn(arrow, 'update');
      const newPoint = { x: 25, y: 25 };
      
      arrow.setStartPoint(newPoint);
      
      expect(arrow.getConfiguration().startPoint).toEqual(newPoint);
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('setEndPoint', () => {
    it('should update the end point and call update', () => {
      const spy = jest.spyOn(arrow, 'update');
      const newPoint = { x: 75, y: 75 };
      
      arrow.setEndPoint(newPoint);
      
      expect(arrow.getConfiguration().endPoint).toEqual(newPoint);
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('setStyle', () => {
    it('should update the style and call update', () => {
      const spy = jest.spyOn(arrow, 'update');
      const newStyle = {
        thickness: 3,
        color: '#ff0000'
      };
      
      arrow.setStyle(newStyle);
      
      expect(arrow.getConfiguration().style).toEqual({
        ...config.style,
        ...newStyle
      });
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('getLength', () => {
    it('should calculate the length between start and end points', () => {
      // For points (0,0) and (100,100), the length should be sqrt(20000) = 141.42...
      const length = arrow.getLength();
      expect(length).toBeCloseTo(141.42, 2);
    });
  });
  
  describe('getMidpoint', () => {
    it('should calculate the midpoint between start and end points', () => {
      const midpoint = arrow.getMidpoint();
      expect(midpoint).toEqual({ x: 50, y: 50 });
    });
  });
});
