import type { FlowType, RenderType } from './ViewConfigurations';

// Re-export FlowType for components that import from this file
export type { FlowType } from './ViewConfigurations';

export interface FlowTypeDefinition {
  id: FlowType;
  label: string;
  description: string;
  requiresDirection: boolean;
  supportsBidirectional: boolean;
  defaultRenderType: RenderType;
}

export interface FlowTypeOption {
  id: FlowType;
  label: string;
  icon?: string;
}

export const FLOW_TYPE_DEFINITIONS: Record<FlowType, FlowTypeDefinition> = {
  out: {
    id: 'out',
    label: 'Out Flow',
    description: 'Shows flows going out from selected bubble or all outgoing flows',
    requiresDirection: true,
    supportsBidirectional: true,
    defaultRenderType: 'unidirectional'
  },
  in: {
    id: 'in',
    label: 'In Flow',
    description: 'Shows flows coming into selected bubble or all incoming flows',
    requiresDirection: true,
    supportsBidirectional: true,
    defaultRenderType: 'unidirectional'
  },
  net: {
    id: 'net',
    label: 'Net Flow',
    description: 'Shows net flow direction and magnitude between bubbles',
    requiresDirection: true,
    supportsBidirectional: false,
    defaultRenderType: 'unidirectional'
  },
  both: {
    id: 'both',
    label: 'Bi-directional',
    description: 'Shows both inflow and outflow between bubbles simultaneously',
    requiresDirection: false,
    supportsBidirectional: true,
    defaultRenderType: 'bidirectional'
  },
  more: {
    id: 'more',
    label: 'More Spend',
    description: 'Shows flows where spending is increasing',
    requiresDirection: true,
    supportsBidirectional: false,
    defaultRenderType: 'unidirectional'
  },
  less: {
    id: 'less',
    label: 'Less Spend',
    description: 'Shows flows where spending is decreasing',
    requiresDirection: true,
    supportsBidirectional: false,
    defaultRenderType: 'unidirectional'
  }
};

export const FLOW_TYPE_OPTIONS: FlowTypeOption[] = [
  { id: 'out', label: 'Out Flow', icon: 'ArrowUpRight' },
  { id: 'in', label: 'In Flow', icon: 'ArrowDownRight' },
  { id: 'net', label: 'Net Flow', icon: 'ArrowRightLeft' },
  { id: 'both', label: 'Bi-directional', icon: 'ArrowLeftRight' },
  { id: 'more', label: 'More Spend', icon: 'TrendingUp' },
  { id: 'less', label: 'Less Spend', icon: 'TrendingDown' }
];

/**
 * Get flow type definition
 */
export function getFlowTypeDefinition(flowType: FlowType): FlowTypeDefinition {
  const definition = FLOW_TYPE_DEFINITIONS[flowType];
  if (!definition) {
    throw new Error(`Unknown flow type: ${flowType}`);
  }
  return definition;
}

/**
 * Get available flow type options for a view
 */
export function getFlowTypeOptions(supportedFlowTypes: FlowType[]): FlowTypeOption[] {
  return FLOW_TYPE_OPTIONS.filter(option => 
    supportedFlowTypes.includes(option.id)
  );
}

/**
 * Check if a flow type supports bidirectional rendering
 */
export function supportsBidirectionalRendering(flowType: FlowType): boolean {
  const definition = getFlowTypeDefinition(flowType);
  return definition.supportsBidirectional;
}

/**
 * Get the default render type for a flow type
 */
export function getDefaultRenderType(flowType: FlowType): RenderType {
  const definition = getFlowTypeDefinition(flowType);
  return definition.defaultRenderType;
}

/**
 * Determine if flow type requires directional information
 */
export function requiresDirection(flowType: FlowType): boolean {
  const definition = getFlowTypeDefinition(flowType);
  return definition ? definition.requiresDirection : false;
}

/**
 * Check if a flow type is bidirectional (shows both in and out flows)
 * @param flowType The flow type to check
 * @returns True if the flow type is bidirectional
 */
export function isBidirectionalFlowType(flowType: FlowType): boolean {
  return flowType === 'both';
}
