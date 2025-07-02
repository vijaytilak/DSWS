import { isBidirectionalFlowType } from '../../utils/flowTypeUtils';
import { getRenderType } from '../../config/ViewConfigurations';

// Mock dependencies
jest.mock('../../config/ViewConfigurations', () => ({
  getRenderType: jest.fn()
}));

describe('flowTypeUtils', () => {
  describe('isBidirectionalFlowType', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should return true when render type is bidirectional', () => {
      (getRenderType as jest.Mock).mockReturnValue('bidirectional');
      
      const result = isBidirectionalFlowType('net', 'Brands', 'churn');
      
      expect(result).toBe(true);
      expect(getRenderType).toHaveBeenCalledWith('brands', 'net', 'churn');
    });
    
    it('should return false when render type is not bidirectional', () => {
      (getRenderType as jest.Mock).mockReturnValue('unidirectional');
      
      const result = isBidirectionalFlowType('in', 'Markets', 'switching');
      
      expect(result).toBe(false);
      expect(getRenderType).toHaveBeenCalledWith('markets', 'in', 'switching');
    });
    
    it('should use fallback logic when configuration fails', () => {
      (getRenderType as jest.Mock).mockImplementation(() => {
        throw new Error('Configuration error');
      });
      
      // Test fallback for 'both' flow type
      expect(isBidirectionalFlowType('both', 'Markets', 'churn')).toBe(true);
      
      // Test fallback for Brands/Churn with 'in' flow type
      expect(isBidirectionalFlowType('in', 'Brands', 'Churn')).toBe(true);
      
      // Test fallback for other combinations
      expect(isBidirectionalFlowType('in', 'Markets', 'Churn')).toBe(false);
    });
  });
});
