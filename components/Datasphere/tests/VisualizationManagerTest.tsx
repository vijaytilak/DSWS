import React, { useEffect, useRef } from 'react';
import { DependencyContainer } from '../core/DependencyContainer';
import { VisualizationManager } from '../core/VisualizationManager';
import { Bubble, Flow } from '../types';

// Sample data for testing
const sampleBubbles: Bubble[] = [
  { id: 1, label: 'Center', x: 400, y: 300, radius: 50, angle: 0, textX: 400, textY: 300 },
  { id: 2, label: 'Bubble 2', x: 500, y: 200, radius: 30, angle: 45, textX: 500, textY: 200 },
  { id: 3, label: 'Bubble 3', x: 300, y: 200, radius: 25, angle: 135, textX: 300, textY: 200 },
  { id: 4, label: 'Bubble 4', x: 500, y: 400, radius: 35, angle: 315, textX: 500, textY: 400 },
  { id: 5, label: 'Bubble 5', x: 300, y: 400, radius: 40, angle: 225, textX: 300, textY: 400 },
];

const sampleFlows: Flow[] = [
  { from: 1, to: 2, inFlow: 100, outFlow: 50, netFlow: 50, isBidirectional: true },
  { from: 1, to: 3, inFlow: 80, outFlow: 120, netFlow: -40, isBidirectional: true },
  { from: 1, to: 4, inFlow: 60, outFlow: 60, netFlow: 0, isBidirectional: true },
  { from: 1, to: 5, inFlow: 90, outFlow: 30, netFlow: 60, isBidirectional: true },
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
