import React from 'react';
import dynamic from 'next/dynamic';

// Import the test component with dynamic import to avoid SSR issues with D3
const VisualizationManagerTest = dynamic(
  () => import('../components/Datasphere/tests/VisualizationManagerTest'),
  { ssr: false }
);

/**
 * Test page for VisualizationManager with DI
 */
const DITestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dependency Injection Test</h1>
      <p className="mb-4">
        This page tests the integration of the VisualizationManager with the DI system.
      </p>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <VisualizationManagerTest />
      </div>
    </div>
  );
};

export default DITestPage;
