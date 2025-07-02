import { calculateRelativeSizePercent, calculatePercentRanks } from '../../utils/calculations';

describe('calculations', () => {
  describe('calculateRelativeSizePercent', () => {
    it('should calculate relative size percentages correctly', () => {
      const items = [
        { id: 1, size: 100 },
        { id: 2, size: 50 },
        { id: 3, size: 75 }
      ];
      
      const result = calculateRelativeSizePercent(items, 'size');
      
      expect(result).toEqual([
        { id: 1, size: 100, sizePercent: 100 },
        { id: 2, size: 50, sizePercent: 0 },
        { id: 3, size: 75, sizePercent: 50 }
      ]);
    });
    
    it('should handle empty arrays', () => {
      const result = calculateRelativeSizePercent([], 'size');
      expect(result).toEqual([]);
    });
    
    it('should handle arrays with identical values', () => {
      const items = [
        { id: 1, size: 100 },
        { id: 2, size: 100 }
      ];
      
      const result = calculateRelativeSizePercent(items, 'size');
      
      expect(result).toEqual([
        { id: 1, size: 100, sizePercent: 100 },
        { id: 2, size: 100, sizePercent: 100 }
      ]);
    });
  });
  
  describe('calculatePercentRanks', () => {
    it('should calculate percent ranks correctly', () => {
      const items = [
        { id: 1, sizePercent: 100 },
        { id: 2, sizePercent: 0 },
        { id: 3, sizePercent: 50 }
      ];
      
      const result = calculatePercentRanks(items);
      
      expect(result).toEqual([
        { id: 1, sizePercent: 100, percentRank: 100 },
        { id: 2, sizePercent: 0, percentRank: 0 },
        { id: 3, sizePercent: 50, percentRank: 50 }
      ]);
    });
    
    it('should handle empty arrays', () => {
      const result = calculatePercentRanks([]);
      expect(result).toEqual([]);
    });
    
    it('should handle arrays with a single item', () => {
      const items = [{ id: 1, sizePercent: 50 }];
      
      const result = calculatePercentRanks(items);
      
      expect(result).toEqual([
        { id: 1, sizePercent: 50, percentRank: 100 }
      ]);
    });
  });
});
