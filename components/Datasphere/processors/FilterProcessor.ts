import type { Flow } from '../types';
import type { ViewConfiguration } from '../config/ViewConfigurations';
import type { FilterOptions } from '../core/DataProcessor';

/**
 * Handles filtering operations for flows based on various criteria
 * Supports threshold filtering, focus bubble filtering, and deduplication
 */
export class FilterProcessor {

  /**
   * Filter flows based on provided filter options
   */
  filterFlows(flows: Flow[], filters: FilterOptions, config: ViewConfiguration): Flow[] {
    let filteredFlows = [...flows];

    // Apply focus bubble filtering first
    if (filters.focusBubbleId !== null) {
      filteredFlows = this.filterByFocusBubble(filteredFlows, filters.focusBubbleId);
    }

    // Apply threshold filtering
    if (filters.threshold > 0) {
      filteredFlows = this.filterByThreshold(filteredFlows, filters.threshold);
    }

    // Apply deduplication for brand flows
    if (config.dataSource === 'flows_brands') {
      filteredFlows = this.deduplicateFlows(filteredFlows);
    }

    return filteredFlows;
  }

  /**
   * Filter flows based on focus bubble
   */
  private filterByFocusBubble(flows: Flow[], focusBubbleId: number): Flow[] {
    return flows.filter(flow => 
      flow.from === focusBubbleId || flow.to === focusBubbleId
    );
  }

  /**
   * Filter flows based on threshold percentage
   */
  private filterByThreshold(flows: Flow[], threshold: number): Flow[] {
    if (flows.length === 0) {
      return flows;
    }

    // Calculate maximum flow values for percentage calculation
    const maxInFlow = Math.max(...flows.map(f => f.absolute_inFlow));
    const maxOutFlow = Math.max(...flows.map(f => f.absolute_outFlow));
    const maxNetFlow = Math.max(...flows.map(f => f.absolute_netFlow));
    const maxValue = Math.max(maxInFlow, maxOutFlow, maxNetFlow);

    if (maxValue === 0) {
      return flows;
    }

    return flows.filter(flow => {
      // Get the highest flow value for this flow
      const flowValue = Math.max(
        flow.absolute_inFlow,
        flow.absolute_outFlow,
        flow.absolute_netFlow
      );

      const percentage = (flowValue / maxValue) * 100;
      return percentage >= threshold;
    });
  }

  /**
   * Remove duplicate flows between the same bubble pairs
   * Keeps the flow with the highest magnitude
   */
  private deduplicateFlows(flows: Flow[]): Flow[] {
    const flowPairs = new Map<string, Flow[]>();
    
    // Group flows by bubble pairs (bidirectional)
    flows.forEach(flow => {
      const bubblePair = [flow.from, flow.to].sort().join('-');
      if (!flowPairs.has(bubblePair)) {
        flowPairs.set(bubblePair, []);
      }
      flowPairs.get(bubblePair)!.push(flow);
    });

    // For each pair, keep only the best flow
    return Array.from(flowPairs.values()).map(flowsInPair => {
      if (flowsInPair.length === 1) {
        return flowsInPair[0];
      }

      // Choose the flow with the highest magnitude
      return flowsInPair.reduce((bestFlow, currentFlow) => {
        const bestMagnitude = Math.max(
          bestFlow.absolute_inFlow,
          bestFlow.absolute_outFlow,
          bestFlow.absolute_netFlow
        );
        const currentMagnitude = Math.max(
          currentFlow.absolute_inFlow,
          currentFlow.absolute_outFlow,
          currentFlow.absolute_netFlow
        );

        return currentMagnitude > bestMagnitude ? currentFlow : bestFlow;
      });
    });
  }

  /**
   * Filter flows by flow type for specific rendering
   */
  filterByFlowType(flows: Flow[], flowType: string): Flow[] {
    switch (flowType) {
      case 'in':
        return flows.filter(flow => flow.absolute_inFlow > 0);
      case 'out':
        return flows.filter(flow => flow.absolute_outFlow > 0);
      case 'net':
        return flows.filter(flow => flow.absolute_netFlow > 0);
      case 'both':
        return flows.filter(flow => 
          flow.absolute_inFlow > 0 && flow.absolute_outFlow > 0
        );
      default:
        return flows;
    }
  }

  /**
   * Filter flows by minimum magnitude
   */
  filterByMinimumMagnitude(flows: Flow[], minMagnitude: number): Flow[] {
    return flows.filter(flow => {
      const magnitude = Math.max(
        flow.absolute_inFlow,
        flow.absolute_outFlow,
        flow.absolute_netFlow
      );
      return magnitude >= minMagnitude;
    });
  }

  /**
   * Filter flows within a specific bubble set
   */
  filterByBubbleSet(flows: Flow[], bubbleIds: number[]): Flow[] {
    const bubbleSet = new Set(bubbleIds);
    return flows.filter(flow => 
      bubbleSet.has(flow.from) && bubbleSet.has(flow.to)
    );
  }

  /**
   * Sort flows by magnitude (highest first)
   */
  sortByMagnitude(flows: Flow[]): Flow[] {
    return [...flows].sort((a, b) => {
      const aMagnitude = Math.max(a.absolute_inFlow, a.absolute_outFlow, a.absolute_netFlow);
      const bMagnitude = Math.max(b.absolute_inFlow, b.absolute_outFlow, b.absolute_netFlow);
      return bMagnitude - aMagnitude;
    });
  }

  /**
   * Calculate flow statistics for debugging and analysis
   */
  calculateFlowStatistics(flows: Flow[]): {
    totalFlows: number;
    averageInFlow: number;
    averageOutFlow: number;
    averageNetFlow: number;
    maxMagnitude: number;
    minMagnitude: number;
  } {
    if (flows.length === 0) {
      return {
        totalFlows: 0,
        averageInFlow: 0,
        averageOutFlow: 0,
        averageNetFlow: 0,
        maxMagnitude: 0,
        minMagnitude: 0
      };
    }

    const totalInFlow = flows.reduce((sum, flow) => sum + flow.absolute_inFlow, 0);
    const totalOutFlow = flows.reduce((sum, flow) => sum + flow.absolute_outFlow, 0);
    const totalNetFlow = flows.reduce((sum, flow) => sum + flow.absolute_netFlow, 0);

    const magnitudes = flows.map(flow => 
      Math.max(flow.absolute_inFlow, flow.absolute_outFlow, flow.absolute_netFlow)
    );

    return {
      totalFlows: flows.length,
      averageInFlow: totalInFlow / flows.length,
      averageOutFlow: totalOutFlow / flows.length,
      averageNetFlow: totalNetFlow / flows.length,
      maxMagnitude: Math.max(...magnitudes),
      minMagnitude: Math.min(...magnitudes)
    };
  }
}
