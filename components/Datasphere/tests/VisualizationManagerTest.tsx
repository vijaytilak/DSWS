import React, { useEffect, useRef } from 'react';
import { DependencyContainer } from '../core/DependencyContainer';
import { VisualizationManager } from '../core/VisualizationManager';
import { Bubble } from '../types';
import type { Flow } from '../services/FlowFactory';

// Sample data for testing
const sampleBubbles: Bubble[] = [
  { id: 1, label: 'Center', x: 400, y: 300, radius: 50, angle: 0, textX: 400, textY: 300, itemSizeAbsolute: 1000, sizeRankPercentage: 100, color: '#000000', focus: false, isCentre: true, isSelected: false, fontSize: 14, outerRingRadius: 60, totalBubbles: 6 },
  { id: 2, label: 'Bubble 2', x: 500, y: 200, radius: 30, angle: 45, textX: 500, textY: 200, itemSizeAbsolute: 300, sizeRankPercentage: 60, color: '#ff0000', focus: false, isCentre: false, isSelected: false, fontSize: 12, outerRingRadius: 36, totalBubbles: 6 },
  { id: 3, label: 'Bubble 3', x: 300, y: 200, radius: 25, angle: 135, textX: 300, textY: 200, itemSizeAbsolute: 250, sizeRankPercentage: 50, color: '#00ff00', focus: false, isCentre: false, isSelected: false, fontSize: 12, outerRingRadius: 30, totalBubbles: 6 },
  { id: 4, label: 'Bubble 4', x: 500, y: 400, radius: 35, angle: 315, textX: 500, textY: 400, itemSizeAbsolute: 350, sizeRankPercentage: 70, color: '#0000ff', focus: false, isCentre: false, isSelected: false, fontSize: 12, outerRingRadius: 42, totalBubbles: 6 },
  { id: 5, label: 'Bubble 5', x: 300, y: 400, radius: 40, angle: 225, textX: 300, textY: 400, itemSizeAbsolute: 400, sizeRankPercentage: 80, color: '#ffff00', focus: false, isCentre: false, isSelected: false, fontSize: 12, outerRingRadius: 48, totalBubbles: 6 },
];

const sampleFlows: Flow[] = [
  { id: 'flow-1-2', from: '1', to: '2', type: 'bidirectional', view: 'markets', metric: 'churn', flowType: 'both', flowSegments: [], abs: 150, visible: true, highlighted: false, selected: false, isCentreFlow: true },
  { id: 'flow-1-3', from: '1', to: '3', type: 'bidirectional', view: 'markets', metric: 'churn', flowType: 'both', flowSegments: [], abs: 200, visible: true, highlighted: false, selected: false, isCentreFlow: true },
  { id: 'flow-1-4', from: '1', to: '4', type: 'unidirectional', view: 'markets', metric: 'churn', flowType: 'out', flowSegments: [], abs: 120, visible: true, highlighted: false, selected: false, isCentreFlow: true },
  { id: 'flow-1-5', from: '1', to: '5', type: 'bidirectional', view: 'markets', metric: 'churn', flowType: 'both', flowSegments: [], abs: 350, visible: true, highlighted: false, selected: false, isCentreFlow: true },
];

/**
 * Test component for VisualizationManager with DI
 */
const VisualizationManagerTest: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const visualizationManagerRef = useRef<VisualizationManager | null>(null);

  useEffect(() => {
    if (svgRef.current) {
      // Get VisualizationManager from DependencyContainer
      const container = DependencyContainer.getInstance();
      const visualizationManager = container.resolve<VisualizationManager>('visualizationManager');
      visualizationManagerRef.current = visualizationManager;

      // Initialize visualization
      visualizationManager.initialize({
        svgElement: svgRef.current,
        width: 800,
        height: 600,
        onBubbleClick: (bubble) => console.log('Bubble clicked:', bubble),
        onFlowClick: (flow, source, target) => console.log('Flow clicked:', flow, source, target)
      });

      // Update with sample data
      visualizationManager.update(
        sampleBubbles,
        sampleFlows,
        'net',
        null,
        false,
        true,
        'churn'
      );
    }

    // Cleanup on unmount
    return () => {
      if (visualizationManagerRef.current) {
        visualizationManagerRef.current.cleanup();
      }
    };
  }, []);

  return (
    <div className="visualization-test">
      <h2>VisualizationManager DI Test</h2>
      <div className="visualization-container" style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
        <svg ref={svgRef} width="800" height="600"></svg>
      </div>
    </div>
  );
};

export default VisualizationManagerTest;
