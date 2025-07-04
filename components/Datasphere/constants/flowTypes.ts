import { getFlowTypeOptions, FLOW_TYPE_OPTIONS } from '../config/FlowTypes';
import type { FlowType } from '../config/ViewConfigurations';

/**
 * @deprecated Use getFlowTypeOptions from config/FlowTypes.ts instead
 * Legacy export for backward compatibility
 */
export const flowTypeOptions = FLOW_TYPE_OPTIONS.map(option => ({
  id: option.id,
  label: option.label
}));

/**
 * Get flow type options for a specific view
 * @param supportedFlowTypes Array of supported flow types for the view
 */
export function getFlowTypeOptionsForView(supportedFlowTypes: FlowType[]) {
  return getFlowTypeOptions(supportedFlowTypes);
}
