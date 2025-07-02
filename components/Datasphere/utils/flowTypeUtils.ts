import { getRenderType, type FlowType, type MetricType } from '../config/ViewConfigurations';

/**
 * Determine if a flow type should be rendered as bidirectional
 * Uses the configuration-driven approach instead of hardcoded logic
 */
export function isBidirectionalFlowType(
  flowType: string, 
  view: string = '', 
  metric: string = ''
): boolean {
  // Convert legacy parameters to new types
  const viewId = view.toLowerCase() === 'brands' ? 'brands' : 
                 view.toLowerCase() === 'markets' ? 'markets' : 'brands';
  const metricType = (metric.toLowerCase() === 'churn' ? 'churn' : 
                     metric.toLowerCase() === 'switching' ? 'switching' : 'churn') as MetricType;
  const flowTypeId = flowType as FlowType;
  
  try {
    const renderType = getRenderType(viewId, flowTypeId, metricType);
    return renderType === 'bidirectional';
  } catch (error) {
    // Fallback to legacy logic if configuration fails
    console.warn('Configuration-based flow type detection failed, using fallback:', error);
    
    // Legacy fallback logic
    if (flowType === 'both') {
      return true;
    }
    
    if (view === 'Brands' && metric === 'Churn' && (flowType === 'in' || flowType === 'out')) {
      return true;
    }
    
    return false;
  }
}
