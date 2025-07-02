import { FlowAdapter } from '../../adapters/FlowAdapter';
import { FlowData, Flow, BrandFlow } from '../../types';
import { DataProcessor } from '../../core/DataProcessor';

// Mock dependencies
jest.mock('../../core/DataProcessor', () => {
  return {
    DataProcessor: jest.fn().mockImplementation(() => {
      return {
        process: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            flows: [
              { 
                from: 1, 
                to: 2, 
                absolute_inFlow: 20,
                absolute_outFlow: 15,
                absolute_netFlow: 5,
                absolute_netFlowDirection: "inFlow",
                displayValue: 100, 
                displayDirection: 'from-to' 
              },
              { 
                from: 2, 
                to: 3, 
                absolute_inFlow: 5,
                absolute_outFlow: 10,
                absolute_netFlow: 5,
                absolute_netFlowDirection: "outFlow",
                displayValue: 50, 
                displayDirection: 'to-from' 
              }
            ],
            metadata: {
              totalFlows: 2,
              filteredFlows: 2,
              processedAt: new Date(),
              viewConfiguration: {}
            }
          });
        }),
        aggregateFlowsAroundCenter: jest.fn().mockImplementation((flows: Flow[]) => {
          return flows.map(flow => ({
            ...flow,
            aggregated: true
          }));
        })
      };
    })
  };
});

describe('FlowAdapter', () => {
  let mockFlowData: FlowData;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock flow data
    mockFlowData = {
      flows_brands: [
        { from: 1, to: 2, tabledata: [] },
        { from: 2, to: 3, tabledata: [] }
      ],
      flows_markets: [],
      itemIDs: [
        {
          itemID: 1,
          itemLabel: "Item 1",
          itemSize_absolute: 100,
          itemSize_relative: 0.5,
          tabledata: []
        },
        {
          itemID: 2,
          itemLabel: "Item 2",
          itemSize_absolute: 80,
          itemSize_relative: 0.4,
          tabledata: []
        },
        {
          itemID: 3,
          itemLabel: "Item 3",
          itemSize_absolute: 60,
          itemSize_relative: 0.3,
          tabledata: []
        }
      ]
    };
  });

  describe('prepareFlowData', () => {
    it('should process flow data with default parameters', async () => {
      const result = await FlowAdapter.prepareFlowData(
        mockFlowData,
        'net',
        false,
        0,
        null
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(DataProcessor).toHaveBeenCalled();
    });

    it('should process flow data with market view', async () => {
      const result = await FlowAdapter.prepareFlowData(
        mockFlowData,
        'in',
        true,
        10,
        1,
        true, // isMarketView = true
        'switching'
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(DataProcessor).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock implementation to throw an error
      (DataProcessor as jest.Mock).mockImplementationOnce(() => {
        return {
          process: jest.fn().mockImplementation(() => {
            throw new Error('Test error');
          })
        };
      });

      const result = await FlowAdapter.prepareFlowData(
        mockFlowData,
        'net',
        false,
        0,
        null
      );
      
      expect(result).toEqual([]);
    });
  });

  describe('prepareCentreFlowData', () => {
    it('should process flow data using legacy method', () => {
      const mockFlows: Flow[] = [
        { 
          from: 1, 
          to: 2, 
          absolute_inFlow: 20, 
          absolute_outFlow: 15, 
          absolute_netFlow: 5, 
          absolute_netFlowDirection: "inFlow" 
        },
        { 
          from: 2, 
          to: 3, 
          absolute_inFlow: 5, 
          absolute_outFlow: 10, 
          absolute_netFlow: 5, 
          absolute_netFlowDirection: "outFlow" 
        }
      ];
      
      const result = FlowAdapter.prepareCentreFlowData(
        mockFlows,
        10
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(DataProcessor).toHaveBeenCalled();
    });
  });
});
