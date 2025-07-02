import { ArrowFactory } from '../../arrows/ArrowFactory';
import { UnidirectionalArrow } from '../../arrows/UnidirectionalArrow';
import { BidirectionalArrow } from '../../arrows/BidirectionalArrow';
import { ArrowConfiguration } from '../../config/ArrowTypes';

// Mock the arrow classes
jest.mock('../../arrows/UnidirectionalArrow');
jest.mock('../../arrows/BidirectionalArrow');

describe('ArrowFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    (UnidirectionalArrow as jest.Mock).mockImplementation(function(this: any, config) {
      this.getConfiguration = () => config;
    });
    
    (BidirectionalArrow as jest.Mock).mockImplementation(function(this: any, config) {
      this.getConfiguration = () => config;
    });
  });
  
  describe('createArrow', () => {
    it('should create a unidirectional arrow', () => {
      const config: ArrowConfiguration = {
        type: 'unidirectional',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
        style: {
          strokeWidth: 2,
          strokeColor: '#000',
          markerEnd: 'arrow'
        }
      };
      
      const arrow = ArrowFactory.createArrow(config);
      
      expect(UnidirectionalArrow).toHaveBeenCalledWith(config);
      expect(arrow.getConfiguration()).toEqual(config);
    });
    
    it('should create a bidirectional arrow', () => {
      const config: ArrowConfiguration = {
        type: 'bidirectional',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
        style: {
          strokeWidth: 2,
          strokeColor: '#000',
          markerEnd: 'arrow'
        }
      };
      
      const arrow = ArrowFactory.createArrow(config);
      
      expect(BidirectionalArrow).toHaveBeenCalledWith(config);
      expect(arrow.getConfiguration()).toEqual(config);
    });
    
    it('should use unidirectional arrow for curved type', () => {
      const config: ArrowConfiguration = {
        type: 'curved',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
        style: {
          strokeWidth: 2,
          strokeColor: '#000',
          markerEnd: 'arrow'
        }
      };
      
      const arrow = ArrowFactory.createArrow(config);
      
      expect(UnidirectionalArrow).toHaveBeenCalledWith(config);
    });
    
    it('should use unidirectional arrow with animation for animated type', () => {
      const config: ArrowConfiguration = {
        type: 'animated',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
        style: {
          thickness: 2,
          color: '#000',
          animationDuration: 1,
          opacity: 1
        },
        endMarker: {
          type: 'arrow',
          size: 5,
          color: '#000'
        }
      };
      
      const arrow = ArrowFactory.createArrow(config);
      
      // Should add default animation duration if not provided
      const expectedConfig = {
        ...config,
        style: {
          ...config.style,
          animationDuration: 1 // Already provided in the test
        }
      };
      
      expect(UnidirectionalArrow).toHaveBeenCalledWith(expectedConfig);
    });
    
    it('should default to unidirectional arrow for unknown types', () => {
      const config: any = {
        type: 'unknown',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
        style: {
          strokeWidth: 2,
          strokeColor: '#000',
          markerEnd: 'arrow'
        }
      };
      
      const arrow = ArrowFactory.createArrow(config);
      
      expect(UnidirectionalArrow).toHaveBeenCalledWith(config);
    });
  });
  
  describe('createUnidirectionalArrow', () => {
    it('should create a unidirectional arrow with the specified parameters', () => {
      const startPoint = { x: 0, y: 0 };
      const endPoint = { x: 100, y: 100 };
      const strokeWidth = 3;
      const strokeColor = '#ff0000';
      const markerEnd = 'triangle';
      
      const arrow = ArrowFactory.createUnidirectionalArrow(
        startPoint,
        endPoint,
        thickness,
        color
      );
      
      const expectedConfig = {
        type: 'unidirectional',
        startPoint,
        endPoint,
        style: {
          thickness,
          color,
          opacity: 1
        },
        endMarker: {
          type: 'arrow',
          size: 5,
          color
        }
      };
      
      expect(UnidirectionalArrow).toHaveBeenCalledWith(expectedConfig);
    });
  });
  
  describe('createBidirectionalArrow', () => {
    it('should create a bidirectional arrow with the specified parameters', () => {
      const startPoint = { x: 0, y: 0 };
      const endPoint = { x: 100, y: 100 };
      const thickness = 3;
      const color = '#ff0000';
      
      const arrow = ArrowFactory.createBidirectionalArrow(
        startPoint,
        endPoint,
        thickness,
        color
      );
      
      const expectedConfig = {
        type: 'bidirectional',
        startPoint,
        endPoint,
        style: {
          thickness,
          color,
          opacity: 1
        }
      };
      
      expect(BidirectionalArrow).toHaveBeenCalledWith(expectedConfig);
    });
  });
});
