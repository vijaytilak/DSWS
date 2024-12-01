import { useState, useEffect } from 'react';
import { Bubble, Flow, DatasphereConfig } from './DatasphereTypes';
import { prepareBubbleData, prepareFlowData } from './DatasphereUtils';

export const useDatasphere = (config: DatasphereConfig) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowType, setFlowType] = useState<string>("bidirectional");
  const [centreFlow, setCentreFlow] = useState<boolean>(false);
  const [netFlowFilterThreshold, setNetFlowFilterThreshold] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBubbleData = async () => {
    try {
      setLoading(true);
      const postData = {
        "strVariableName": "HD_MERCHANT",
        "byAggregating": "IDs"
      };
      const response = await fetch('/api/bubbles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed API request to load Bubble Data: ' + response.statusText);
      }

      const data = await response.json();
      return prepareBubbleData(data, config);
    } catch (error) {
      console.error("Error loading bubble data:", error);
      setError("Failed to load bubble data. Please check your network connection and try again.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadFlowData = async () => {
    try {
      setLoading(true);
      const postData = {
        "strVariableName": "HD_MERCHANT",
        "flowCountingUnit": "records",
        "aggregateVariable": "SPEND",
        "aggregatingMethod": "sum"
      };

      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed API request to load Flow Data: ' + response.statusText);
      }

      const data = await response.json();
      return prepareFlowData(data.flows_absolute, flowType, centreFlow, netFlowFilterThreshold);
    } catch (error) {
      console.error("Error loading flow data:", error);
      setError("Failed to load flow data. Please check your network connection and try again.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const bubbleData = await loadBubbleData();
      setBubbles(bubbleData);
      const flowData = await loadFlowData();
      setFlows(flowData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const updateFlows = async () => {
      const flowData = await loadFlowData();
      setFlows(flowData);
    };
    updateFlows();
  }, [flowType, centreFlow, netFlowFilterThreshold]);

  return {
    bubbles,
    flows,
    flowType,
    setFlowType,
    centreFlow,
    setCentreFlow,
    netFlowFilterThreshold,
    setNetFlowFilterThreshold,
    error,
    loading,
  };
};