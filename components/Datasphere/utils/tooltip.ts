import type { Bubble } from '../types';
import type { Flow } from '../services/FlowFactory';
import { TooltipManager } from '../renderers/TooltipManager';
import { DependencyContainer } from '../core/DependencyContainer';

/**
 * Get TooltipManager from DI container
 */
function getTooltipManager(): TooltipManager {
  const container = DependencyContainer.getInstance();
  return container.resolve<TooltipManager>('tooltipManager');
}

/**
 * Initialize the tooltip system
 * This is just a wrapper around TooltipManager.initialize for backward compatibility
 */
export function createTooltip(): void {
  // Get the SVG container element
  const svgContainer = document.querySelector('svg')?.parentElement || document.body;
  
  // Get TooltipManager from DI container
  const tooltipManager = getTooltipManager();
  
  // Initialize the tooltip manager with the container
  tooltipManager.initialize({
    container: svgContainer,
    config: {
      minWidth: '200px',
      maxWidth: '300px',
      padding: '6px 10px',
      zIndex: '1000',
      fontSize: '12px'
    }
  });
}

/**
 * Update tooltip theme
 * This is just a wrapper around TooltipManager's internal theme handling for backward compatibility
 * @param isDark Optional boolean indicating dark theme (ignored as ThemeManager handles this internally)
 */
export function updateTooltipTheme(_isDark?: boolean): void {
  // Theme updates are handled internally by TooltipManager through ThemeManager subscription
  // isDark parameter is ignored as ThemeManager is the source of truth
}

/**
 * Show tooltip with content at specific position
 * @param event Mouse event
 * @param content Tooltip content HTML
 */
export function showTooltip(event: MouseEvent, content: string): void {
  const tooltipManager = getTooltipManager();
  tooltipManager.showOnEvent(event, content);
}

/**
 * Hide tooltip
 */
export function hideTooltip(): void {
  const tooltipManager = getTooltipManager();
  tooltipManager.hide();
}

export function getBubbleTooltip(bubble: Bubble): string {
  // Center bubble is always the last one in the array
  if (bubble.id === bubble.totalBubbles - 1) {
    return ''; // No tooltip for center bubble
  }
  const tooltipManager = getTooltipManager();
  return tooltipManager.getBubbleTooltip(bubble);
}

/**
 * Generates tooltip content for flow lines
 * Uses the centralized TooltipManager for consistent tooltip generation
 *
 * @param flow - Flow data object
 * @param source - Source bubble
 * @param target - Target bubble
 * @param flowDirection - Direction of the flow ('inFlow', 'outFlow', 'netFlow', 'inbound', 'outbound', 'both')
 * @param centreFlow - Whether the flow is centered
 * @param flowOption - Type of flow metric ('churn', 'switching')
 * @param isMarketView - Whether the view is market view (kept for backward compatibility)
 * @returns Formatted tooltip content string
 */
export function getFlowTooltip(flow: Flow, source: Bubble, target: Bubble, flowDirection: string, centreFlow: boolean = false, flowOption: 'churn' | 'switching' = 'churn', _isMarketView: boolean = false): string {
  const tooltipManager = getTooltipManager();
  return tooltipManager.getFlowTooltip(flow, source, target, flowDirection, centreFlow, flowOption);
}