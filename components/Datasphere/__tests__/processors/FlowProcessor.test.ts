import { FlowProcessor } from '../../processors/FlowProcessor';
import { Flow } from '../../types';
import { ViewConfiguration, FlowType, MetricType } from '../../config/ViewConfigurations';

describe('FlowProcessor', () => {
  let flowProcessor: FlowProcessor;
  let mockViewConfig: ViewConfiguration;
  let mockFlow: Flow;

  beforeEach(() => {
    // Initialize FlowProcessor
    flowProcessor = new FlowProcessor();
    
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
    
    // Setup mock flow
    mockFlow = {
      from: 1,
      to: 2,
      absolute_inFlow: 20,
      absolute_outFlow: 15,
      absolute_netFlow: 5,
      absolute_netFlowDirection: 'inFlow'
    };
  });

  describe('processFlowValues', () => {
    it('should process flow values for net flow type', () => {
      const flowType: FlowType = 'net';
      const metricType: MetricType = 'churn';
      
      const result = flowProcessor.processFlowValues(mockFlow, flowType, metricType, mockViewConfig);
      
      expect(result).toBeDefined();
      expect(result.displayValue).toBe(mockFlow.absolute_netFlow);
      expect(result.displayDirection).toBe('to-from'); // inFlow maps to to-from
    });

    it('should process flow values for in flow type', () => {
      const flowType: FlowType = 'in';
      const metricType: MetricType = 'churn';
      
      const result = flowProcessor.processFlowValues(mockFlow, flowType, metricType, mockViewConfig);
      
      expect(result).toBeDefined();
      expect(result.displayValue).toBe(mockFlow.absolute_inFlow);
      expect(result.displayDirection).toBe('to-from');
    });

    it('should process flow values for out flow type', () => {
      const flowType: FlowType = 'out';
      const metricType: MetricType = 'churn';
      
      const result = flowProcessor.processFlowValues(mockFlow, flowType, metricType, mockViewConfig);
      
      expect(result).toBeDefined();
      expect(result.displayValue).toBe(mockFlow.absolute_outFlow);
      expect(result.displayDirection).toBe('from-to');
    });

    it('should process flow values for both flow type with inFlow > outFlow', () => {
      const flowType: FlowType = 'both';
      const metricType: MetricType = 'churn';
      
      // Modify mock flow to ensure inFlow > outFlow
      const modifiedFlow = {
        ...mockFlow,
        absolute_inFlow: 25,
        absolute_outFlow: 15
      };
      
      const result = flowProcessor.processFlowValues(modifiedFlow, flowType, metricType, mockViewConfig);
      
      expect(result).toBeDefined();
      expect(result.displayValue).toBe(modifiedFlow.absolute_inFlow);
      expect(result.displayDirection).toBe('to-from');
    });

    it('should process flow values for both flow type with outFlow > inFlow', () => {
      const flowType: FlowType = 'both';
      const metricType: MetricType = 'churn';
      
      // Modify mock flow to ensure outFlow > inFlow
      const modifiedFlow = {
        ...mockFlow,
        absolute_inFlow: 10,
        absolute_outFlow: 20
      };
      
      const result = flowProcessor.processFlowValues(modifiedFlow, flowType, metricType, mockViewConfig);
      
      expect(result).toBeDefined();
      expect(result.displayValue).toBe(modifiedFlow.absolute_outFlow);
      expect(result.displayDirection).toBe('from-to');
    });
  });

  describe('getFlowValueForFocusedBubble', () => {
    it('should return correct flow value when focus bubble is source', () => {
      const flowType: FlowType = 'in';
      const focusBubbleId = mockFlow.from;
      
      const result = flowProcessor.getFlowValueForFocusedBubble(mockFlow, flowType, focusBubbleId);
      
      expect(result).toBeDefined();
      // For 'in' flow type when focus bubble is source, should use inFlow
      expect(result).toBe(mockFlow.absolute_inFlow);
    });

    it('should return correct flow value when focus bubble is destination', () => {
      const flowType: FlowType = 'in';
      const focusBubbleId = mockFlow.to;
      
      const result = flowProcessor.getFlowValueForFocusedBubble(mockFlow, flowType, focusBubbleId);
      
      expect(result).toBeDefined();
      // For 'in' flow type when focus bubble is destination, should use outFlow
      expect(result).toBe(mockFlow.absolute_outFlow);
    });
  });

  describe('getFlowDirectionForFocusedBubble', () => {
    it('should return correct direction for in flow when focus bubble is source', () => {
      const flowType: FlowType = 'in';
      const focusBubbleId = mockFlow.from;
      
      const result = flowProcessor.getFlowDirectionForFocusedBubble(mockFlow, flowType, focusBubbleId);
      
      expect(result).toBeDefined();
      expect(result).toBe('to-from');
    });

    it('should return correct direction for out flow when focus bubble is destination', () => {
      const flowType: FlowType = 'out';
      const focusBubbleId = mockFlow.to;
      
      const result = flowProcessor.getFlowDirectionForFocusedBubble(mockFlow, flowType, focusBubbleId);
      
      expect(result).toBeDefined();
      expect(result).toBe('from-to');
    });
  });
});
