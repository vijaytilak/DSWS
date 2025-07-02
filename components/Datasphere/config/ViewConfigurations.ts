export type ViewId = 'markets' | 'brands' | 'legacy';
export type FlowType = 'out' | 'in' | 'net' | 'both';
export type MetricType = 'churn' | 'switching';
export type RenderType = 'unidirectional' | 'bidirectional';

export interface FlowRenderingCondition {
  metric?: MetricType | MetricType[];
  flowType?: FlowType | FlowType[];
  view?: string;
}

export interface FlowRenderingRule {
  condition: FlowRenderingCondition;
  renderType: RenderType;
  priority?: number; // Higher priority rules are checked first
}

export interface ViewConfiguration {
  id: string;
  name: string;
  dataSource: 'flows_markets' | 'flows_brands';
  supportsCenterFlow: boolean;
  defaultFlowType: FlowType;
  supportedFlowTypes: FlowType[];
  defaultMetric: MetricType;
  supportedMetrics: MetricType[];
  flowRenderingRules: FlowRenderingRule[];
}

export const VIEW_CONFIGURATIONS: Record<string, ViewConfiguration> = {
  markets: {
    id: 'markets',
    name: 'Markets',
    dataSource: 'flows_markets',
    supportsCenterFlow: true,
    defaultFlowType: 'net',
    supportedFlowTypes: ['out', 'in', 'net', 'both'],
    defaultMetric: 'churn',
    supportedMetrics: ['churn', 'switching'],
    flowRenderingRules: [
      { 
        condition: { metric: 'churn', flowType: 'both' }, 
        renderType: 'bidirectional',
        priority: 10
      },
      { 
        condition: { metric: 'switching', flowType: 'both' }, 
        renderType: 'bidirectional',
        priority: 10
      },
      { 
        condition: { flowType: ['out', 'in', 'net'] }, 
        renderType: 'unidirectional',
        priority: 5
      }
    ]
  },
  brands: {
    id: 'brands',
    name: 'Brands',
    dataSource: 'flows_brands',
    supportsCenterFlow: false,
    defaultFlowType: 'net',
    supportedFlowTypes: ['out', 'in', 'net', 'both'],
    defaultMetric: 'churn',
    supportedMetrics: ['churn', 'switching'],
    flowRenderingRules: [
      { 
        condition: { metric: 'churn', flowType: ['in', 'out'] }, 
        renderType: 'bidirectional',
        priority: 15
      },
      { 
        condition: { metric: 'switching', flowType: ['in', 'out'] }, 
        renderType: 'bidirectional',
        priority: 15
      },
      { 
        condition: { flowType: 'both' }, 
        renderType: 'bidirectional',
        priority: 10
      },
      { 
        condition: { flowType: 'net' }, 
        renderType: 'unidirectional',
        priority: 5
      }
    ]
  }
};

/**
 * Get configuration for a specific view
 */
export function getViewConfiguration(viewId: string): ViewConfiguration {
  const config = VIEW_CONFIGURATIONS[viewId];
  if (!config) {
    throw new Error(`Unknown view configuration: ${viewId}`);
  }
  return config;
}

/**
 * Check if a flow type is supported for a given view
 */
export function isFlowTypeSupported(viewId: string, flowType: FlowType): boolean {
  const config = getViewConfiguration(viewId);
  return config.supportedFlowTypes.includes(flowType);
}

/**
 * Check if a metric is supported for a given view
 */
export function isMetricSupported(viewId: string, metric: MetricType): boolean {
  const config = getViewConfiguration(viewId);
  return config.supportedMetrics.includes(metric);
}

/**
 * Get the appropriate render type for a flow based on view configuration
 */
export function getRenderType(
  viewId: string, 
  flowType: FlowType, 
  metric: MetricType
): RenderType {
  const config = getViewConfiguration(viewId);
  
  // Sort rules by priority (highest first)
  const sortedRules = [...config.flowRenderingRules].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );
  
  for (const rule of sortedRules) {
    if (matchesCondition(rule.condition, { flowType, metric, view: viewId })) {
      return rule.renderType;
    }
  }
  
  // Default fallback
  return 'unidirectional';
}

/**
 * Check if a condition matches the current flow parameters
 */
function matchesCondition(
  condition: FlowRenderingCondition, 
  params: { flowType: FlowType; metric: MetricType; view: string }
): boolean {
  // Check metric condition
  if (condition.metric) {
    const metrics = Array.isArray(condition.metric) ? condition.metric : [condition.metric];
    if (!metrics.includes(params.metric)) {
      return false;
    }
  }
  
  // Check flow type condition
  if (condition.flowType) {
    const flowTypes = Array.isArray(condition.flowType) ? condition.flowType : [condition.flowType];
    if (!flowTypes.includes(params.flowType)) {
      return false;
    }
  }
  
  // Check view condition
  if (condition.view && condition.view !== params.view) {
    return false;
  }
  
  return true;
}

/**
 * Get available flow options for a specific view
 */
export function getAvailableFlowOptions(viewId: string): { id: string; label: string; description?: string }[] {
  const config = getViewConfiguration(viewId);
  return config.supportedMetrics.map(metricId => ({
    id: metricId,
    label: metricId.charAt(0).toUpperCase() + metricId.slice(1),
    description: `${metricId === 'churn' ? 'Customer churn' : 'Customer switching'} data`
  }));
}
