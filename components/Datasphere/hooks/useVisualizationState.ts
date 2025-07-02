import { useState, useEffect, useCallback, useMemo } from 'react';
import { VisualizationState, VisualizationStateOptions } from '../core/VisualizationState';
import { DataAdapter } from '../adapters/DataAdapter';
import { Flow, Bubble } from '../types';

/**
 * Custom hook for using the visualization state in React components
 * Provides state and methods to update it
 */
export function useVisualizationState(
  dataAdapter: DataAdapter,
  initialOptions: Partial<VisualizationStateOptions> = {}
) {
  // Create a memoized instance of VisualizationState
  const visualizationState = useMemo(() => {
    return new VisualizationState(dataAdapter, initialOptions);
  }, [dataAdapter]);
  
  // State for bubbles, flows, and options
  const [bubbles, setBubbles] = useState<Bubble[]>(visualizationState.getBubbles());
  const [flows, setFlows] = useState<Flow[]>(visualizationState.getFlows());
  const [options, setOptions] = useState<VisualizationStateOptions>(visualizationState.getOptions());
  
  // Update local state when visualization state changes
  useEffect(() => {
    const unsubscribe = visualizationState.addListener(() => {
      setBubbles(visualizationState.getBubbles());
      setFlows(visualizationState.getFlows());
      setOptions(visualizationState.getOptions());
    });
    
    return unsubscribe;
  }, [visualizationState]);
  
  // Callback functions to update state
  const updateOptions = useCallback(
    async (newOptions: Partial<VisualizationStateOptions>) => {
      await visualizationState.updateOptions(newOptions);
    },
    [visualizationState]
  );
  
  const setFlowType = useCallback(
    async (flowType: string) => {
      await visualizationState.setFlowType(flowType);
    },
    [visualizationState]
  );
  
  const setFlowOption = useCallback(
    async (flowOption: 'churn' | 'switching') => {
      await visualizationState.setFlowOption(flowOption);
    },
    [visualizationState]
  );
  
  const setIsMarketView = useCallback(
    async (isMarketView: boolean) => {
      await visualizationState.setIsMarketView(isMarketView);
    },
    [visualizationState]
  );
  
  const setFocusBubbleId = useCallback(
    async (focusBubbleId: number | null) => {
      await visualizationState.setFocusBubbleId(focusBubbleId);
    },
    [visualizationState]
  );
  
  const setCentreFlow = useCallback(
    async (centreFlow: boolean) => {
      await visualizationState.setCentreFlow(centreFlow);
    },
    [visualizationState]
  );
  
  const setThreshold = useCallback(
    async (threshold: number) => {
      await visualizationState.setThreshold(threshold);
    },
    [visualizationState]
  );
  
  const setFocusedFlow = useCallback(
    async (focusedFlow: { from: number; to: number } | null) => {
      await visualizationState.setFocusedFlow(focusedFlow);
    },
    [visualizationState]
  );
  
  const reset = useCallback(
    async () => {
      await visualizationState.reset();
    },
    [visualizationState]
  );
  
  // Helper functions
  const getBubbleById = useCallback(
    (id: number) => visualizationState.getBubbleById(id),
    [visualizationState]
  );
  
  const getFlowByIds = useCallback(
    (fromId: number, toId: number) => visualizationState.getFlowByIds(fromId, toId),
    [visualizationState]
  );
  
  const getFlowsForBubble = useCallback(
    (bubbleId: number) => visualizationState.getFlowsForBubble(bubbleId),
    [visualizationState]
  );
  
  return {
    // State
    bubbles,
    flows,
    options,
    
    // Update functions
    updateOptions,
    setFlowType,
    setFlowOption,
    setIsMarketView,
    setFocusBubbleId,
    setCentreFlow,
    setThreshold,
    setFocusedFlow,
    reset,
    
    // Helper functions
    getBubbleById,
    getFlowByIds,
    getFlowsForBubble
  };
}
