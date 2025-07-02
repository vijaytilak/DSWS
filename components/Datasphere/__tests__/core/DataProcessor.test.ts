import { DataProcessor, FilterOptions } from '../../core/DataProcessor';
import { FlowData, Flow } from '../../types';
import { ViewConfiguration } from '../../config/ViewConfigurations';

// Mock dependencies
jest.mock('../../processors/MetricProcessor', () => {
  return {
    MetricProcessor: jest.fn().mockImplementation(() => {
      return {
        processMetric: jest.fn().mockImplementation((data, metric) => {
          return data.map((item: any) => ({
            ...item,
            processed: true,
            metric
          }));
        })
      };
    })
  };
});

jest.mock('../../processors/FilterProcessor', () => {
  return {
    FilterProcessor: jest.fn().mockImplementation(() => {
      return {
        filterFlows: jest.fn().mockImplementation((flows) => {
          return flows.filter((flow: any) => flow.value > 10);
        })
      };
    })
  };
});

jest.mock('../../processors/FlowProcessor', () => {
  return {
    FlowProcessor: jest.fn().mockImplementation(() => {
      return {
        processFlowValues: jest.fn().mockImplementation((flow) => {
          return {
            ...flow,
            displayValue: flow.value,
            displayDirection: 'from-to'
          };
        }),
        getFlowValueForFocusedBubble: jest.fn().mockReturnValue(100),
        getFlowDirectionForFocusedBubble: jest.fn().mockReturnValue('from-to')
      };
    })
  };
});

describe('DataProcessor', () => {
  let dataProcessor: DataProcessor;
  let mockViewConfig: ViewConfiguration;
  let mockFlowData: FlowData;
  let mockFilterOptions: FilterOptions;

  beforeEach(() => {
    // Setup mock view configuration
    mockViewConfig = {
      id: 'test',
      name: 'Test View',
      dataSource: 'flows_brands',
      supportsCenterFlow: true,
      defaultFlowType: 'net',
      supportedFlowTypes: ['in', 'out', 'net', 'both'],
      defaultMetric: 'churn',
      supportedMetrics: ['churn', 'switching'],
      flowRenderingRules: []
    };

    // Setup mock flow data
    mockFlowData = {
      flows_brands: [
        { id: 1, from: 1, to: 2, value: 20, absolute_inFlow: 20, absolute_outFlow: 15, absolute_netFlow: 5, absolute_netFlowDirection: 'from-to' },
        { id: 2, from: 2, to: 3, value: 5, absolute_inFlow: 5, absolute_outFlow: 10, absolute_netFlow: 5, absolute_netFlowDirection: 'to-from' }
      ],
      flows_markets: [],
      itemIDs: [1, 2, 3]
    };

    // Setup mock filter options
    mockFilterOptions = {
      metric: 'churn',
      threshold: 10,
      focusBubbleId: null,
      centerFlow: false,
      flowType: 'net'
    };

    // Initialize data processor
    dataProcessor = new DataProcessor(mockViewConfig);
  });

  describe('process', () => {
    it('should process flow data and return ProcessedFlowData', async () => {
      const result = await dataProcessor.process(mockFlowData, mockFilterOptions);
      
      // Verify result structure
      expect(result).toBeDefined();
      expect(result.flows).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalFlows).toBeDefined();
      expect(result.metadata.filteredFlows).toBeDefined();
      expect(result.metadata.processedAt).toBeDefined();
      expect(result.metadata.viewConfiguration).toBe(mockViewConfig);
    });
  });

  describe('aggregateFlowsAroundCenter', () => {
    it('should aggregate flows around center', () => {
      const mockFlows: Flow[] = [
        { from: 1, to: 2, absolute_inFlow: 20, absolute_outFlow: 15, absolute_netFlow: 5, absolute_netFlowDirection: 'from-to' },
        { from: 2, to: 3, absolute_inFlow: 5, absolute_outFlow: 10, absolute_netFlow: 5, absolute_netFlowDirection: 'to-from' }
      ];

      const result = dataProcessor.aggregateFlowsAroundCenter(mockFlows, 3);
      
      // Verify result
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
