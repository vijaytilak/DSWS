export function isBidirectionalFlowType(
  flowType: string, 
  view: string = '', 
  metric: string = ''
): boolean {
  // Only 'both' flow type or specific combinations should be bidirectional
  if (flowType === 'both') {
    return true;
  }
  
  // Special case for Brands view with Churn metric
  if (view === 'Brands' && metric === 'Churn' && (flowType === 'in' || flowType === 'out')) {
    return true;
  }
  
  // All other flow types (including 'net') are not bidirectional
  return false;
}
