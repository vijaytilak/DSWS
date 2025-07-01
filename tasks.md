# DataSphere Restructuring Tasks

This document outlines the detailed tasks required for restructuring the DataSphere visualization component to improve maintainability, extensibility, and performance.

## Phase 1: Configuration System Setup (High Priority)

### New Files to Create
- [ ] `components/Datasphere/config/ViewConfigurations.ts`
  - Define interfaces for view configurations
  - Create configuration objects for Markets and Brands views
  - Support dynamic flow types and metrics

- [ ] `components/Datasphere/config/FlowTypes.ts`
  - Define flow type interfaces and enums
  - Create configuration for flow type rendering rules
  - Support dynamic flow type options based on view

- [ ] `components/Datasphere/config/ArrowTypes.ts`
  - Define arrow type interfaces and enums
  - Create configuration for arrow rendering options
  - Support different arrow styles based on flow types

### Files to Refactor
- [ ] `components/Datasphere/constants/flowTypes.ts`
  - Merge into configuration system
  - Remove hardcoded flow type options

- [ ] `components/Datasphere/utils/flowTypeUtils.ts`
  - Simplify using configuration-based approach
  - Make bidirectional flow type detection data-driven

## Phase 2: Data Processing Pipeline (High Priority)

### New Files to Create
- [ ] `components/Datasphere/core/DataProcessor.ts`
  - Create main data processing class
  - Implement pipeline orchestration
  - Support dynamic data structure handling

- [ ] `components/Datasphere/core/DataPipeline.ts`
  - Implement pipeline pattern for data processing
  - Create stages for extraction, transformation, filtering
  - Support chainable operations

- [ ] `components/Datasphere/processors/MetricProcessor.ts`
  - Implement metric-specific data processing
  - Support dynamic metric calculations
  - Handle churn and switching metrics

- [ ] `components/Datasphere/processors/FilterProcessor.ts`
  - Implement filtering logic for flows
  - Support threshold-based filtering
  - Handle focus bubble filtering

### Files to Refactor
- [ ] `components/Datasphere/utils/flow.ts`
  - Break monolithic function into pipeline stages
  - Remove hardcoded data structure assumptions
  - Update to handle new ds.json structure dynamically

- [ ] `utils/data-adapter.ts`
  - Integrate into pipeline architecture
  - Make data loading configurable
  - Support dynamic data structure detection

## Phase 3: Arrow Component System (High Priority)

### New Files to Create
- [ ] `components/Datasphere/components/arrows/ArrowFactory.ts`
  - Implement factory pattern for arrow creation
  - Support dynamic arrow type selection
  - Handle arrow configuration

- [ ] `components/Datasphere/components/arrows/ArrowBase.ts`
  - Create base class/interface for arrows
  - Define common arrow properties and methods
  - Support consistent rendering API

- [ ] `components/Datasphere/components/arrows/UnidirectionalArrow.ts`
  - Implement unidirectional arrow rendering
  - Support customizable styling
  - Handle direction based on flow data

- [ ] `components/Datasphere/components/arrows/BidirectionalArrow.ts`
  - Implement bidirectional arrow rendering
  - Support split point calculation
  - Handle balanced rendering of in/out flows

### Files to Refactor
- [ ] `components/Datasphere/utils/vis/flowDrawing.ts`
  - Extract arrow drawing logic into arrow components
  - Remove hardcoded rendering decisions
  - Use arrow factory for arrow creation

## Phase 4: Flow Rendering Engine (Medium Priority)

### New Files to Create
- [ ] `components/Datasphere/core/FlowRenderer.ts`
  - Create main rendering orchestration
  - Implement rule-based rendering decisions
  - Support dynamic flow visualization

- [ ] `components/Datasphere/core/RenderingRules.ts`
  - Define interfaces for rendering rules
  - Create rule matching system
  - Support configuration-driven rendering

### Files to Refactor
- [ ] `components/Datasphere/utils/visualization.ts`
  - Integrate with new renderer
  - Remove hardcoded visualization logic
  - Use configuration for rendering decisions

## Phase 5: State Management (Medium Priority)

### New Files to Create
- [ ] `components/Datasphere/core/VisualizationState.ts`
  - Implement centralized state management
  - Create subscriber pattern for updates
  - Support view switching and configuration

- [ ] `components/Datasphere/hooks/useVisualizationState.ts`
  - Create React hook for state access
  - Support component-level state subscriptions
  - Handle state updates efficiently

### Files to Refactor
- [ ] `app/dashboard/layout.tsx`
  - Use new state manager
  - Remove hardcoded state management
  - Support configuration-driven layout

- [ ] `components/Datasphere/Datasphere.tsx`
  - Connect to state manager
  - Remove local state management
  - Use hooks for state access

## Phase 6: UI Controls Refactoring (Low Priority)

### Files to Refactor
- [ ] `components/layout/sidebar/nav-flowtypes.tsx`
  - Use configuration for options
  - Make flow type selection dynamic
  - Support view-specific options

- [ ] `components/layout/sidebar/nav-options.tsx`
  - Make options dynamic based on view config
  - Support metric selection
  - Handle view-specific options

## Data Structure Adaptation

### Key Tasks
- [ ] Update interfaces in `types.ts` to match new ds.json structure
- [ ] Create dynamic data mapping functions in DataProcessor
- [ ] Ensure backward compatibility with existing visualizations
- [ ] Add validation for data structure integrity
- [ ] Support graceful handling of missing or malformed data

## Testing and Validation

### Key Tasks
- [ ] Create unit tests for configuration system
- [ ] Test data processing pipeline with sample data
- [ ] Validate arrow rendering with different flow types
- [ ] Test state management with component interactions
- [ ] Perform end-to-end testing of the visualization

## Documentation

### Key Tasks
- [ ] Document configuration system usage
- [ ] Create pipeline extension documentation
- [ ] Document arrow component system
- [ ] Create state management usage guide
- [ ] Document UI control integration

Make sure all the debug logs are removed from the browser console.
After the refactoring is done, make sure that old unwanted code is removed.