# DataSphere Component Blueprint

## Overview
This document provides a comprehensive guide to the DataSphere component structure, designed to help AI agents and developers understand the codebase organization. The component uses modern architectural patterns including dependency injection, service layers, and modular design.

## Directory Structure

```
components/Datasphere/
├── Datasphere.tsx            # Main React component (uses DI pattern)
├── types.ts                  # Core type definitions
├── __tests__/                # Test files for all components
├── adapters/                 # Data transformation layer
│   ├── DataAdapter.ts        # Main data loading/transformation
│   └── FlowAdapter.ts        # Flow-specific transformations
├── arrows/                   # Arrow visualization system
│   ├── ArrowBase.ts          # Abstract base class
│   ├── ArrowFactory.ts       # Factory for arrow creation
│   ├── BidirectionalArrow.ts # Two-way arrows
│   └── UnidirectionalArrow.ts# One-way arrows
├── components/               # UI components
│   └── Controls.tsx          # Visualization controls
├── config/                   # Configuration system
│   ├── ArrowTypes.ts         # Arrow type definitions
│   ├── ConfigurationManager.ts # Central config manager
│   ├── FlowTypes.ts          # Flow type definitions
│   └── ViewConfigurations.ts # View-specific configs
├── constants/                # Constants and hardcoded values
│   ├── config.ts             # Global CONFIG object
│   └── flowTypes.ts          # Flow type constants
├── core/                     # Core architecture
│   ├── DataPipeline.ts       # Generic pipeline infrastructure
│   ├── DataProcessor.ts      # Main data processing pipeline
│   ├── DependencyContainer.ts# Dependency injection container
│   ├── FlowRenderer.ts       # Flow visualization logic
│   ├── RenderingRules.ts     # Visual styling rules
│   ├── VisualizationManager.ts # Central coordinator (DI version)
│   └── VisualizationState.ts # State management
├── hooks/                    # React hooks
│   └── useDimensions.ts      # Window/container dimensions
├── processors/               # Specialized data processors
│   ├── FilterProcessor.ts    # Data filtering logic
│   ├── FlowIntegrationProcessor.ts # Flow integration
│   ├── FlowProcessor.ts      # Flow-specific processing
│   └── MetricProcessor.ts    # Metric calculations
├── renderers/                # Rendering components
│   ├── BubbleRenderer.ts     # Bubble visualization
│   ├── FlowRenderer.ts       # Flow line rendering
│   ├── InteractionManager.ts # User interaction handling
│   └── TooltipManager.ts     # Tooltip management
├── services/                 # Service layer
│   ├── ArrowStyleManager.ts  # Arrow styling service
│   ├── ConfigurationService.ts # Config access service
│   ├── DataService.ts        # Data access service
│   ├── EventManager.ts       # Event handling service
│   ├── FlowManager.ts        # Flow data management
│   ├── ThemeManager.ts       # Theme detection/management
│   └── ViewManager.ts        # View state management
├── tests/                    # Integration tests
│   └── VisualizationManagerTest.tsx
└── utils/                    # Utility functions
    ├── bubble-utils.ts       # Bubble calculations
    ├── bubble.ts             # Bubble utilities
    ├── calculations.ts       # Mathematical utilities
    ├── flowTypeUtils.ts      # Flow type helpers
    ├── format.ts             # Data formatting
    ├── time-selector.tsx     # Time selection component
    ├── tooltip.ts            # Tooltip utilities
    └── vis/                  # Visualization utilities
        └── bubbleDrawing.ts  # Bubble drawing utilities
```

## Quick Reference for AI Agents

### When Making Edits, Look Here:

| **Task** | **Primary Files** | **Supporting Files** |
|----------|-------------------|---------------------|
| **View Logic** | `services/ViewManager.ts` | `Datasphere.tsx` (service integration) |
| **Theme Changes** | `services/ThemeManager.ts` | All components (theme integration) |
| **Flow Processing** | `services/FlowManager.ts`, `core/DataProcessor.ts` | `processors/FlowProcessor.ts` |
| **Arrow Styling** | `services/ArrowStyleManager.ts` | `arrows/ArrowBase.ts`, `arrows/ArrowFactory.ts` |
| **Configuration** | `config/ConfigurationManager.ts` | `config/ViewConfigurations.ts`, `core/RenderingRules.ts` |
| **Event Handling** | `services/EventManager.ts` | `renderers/InteractionManager.ts` |
| **Data Loading** | `adapters/DataAdapter.ts` | `services/DataService.ts` |
| **Rendering Rules** | `core/RenderingRules.ts` | `config/ViewConfigurations.ts` |
| **Tooltip Management** | `renderers/TooltipManager.ts` | `utils/tooltip.ts` |
| **DI Configuration** | `core/DependencyContainer.ts` | `Datasphere.tsx` (main setup) |

## Architectural Patterns

### Dependency Injection Pattern
- **DependencyContainer.ts**: Full DI container with automatic dependency resolution
- **Service registration**: All services registered in container during initialization
- **Constructor injection**: Components receive dependencies through constructors
- **Service location**: Clean separation of concerns through service layer

### Service Layer Architecture
- **ViewManager**: Centralized view state management (market/brand views)
- **ThemeManager**: Automatic theme detection with MutationObserver
- **FlowManager**: Flow data processing and filtering logic
- **EventManager**: Centralized event handling and delegation
- **ConfigurationManager**: Unified configuration access

### Factory Pattern
- **ArrowFactory**: Creates different arrow types based on configuration
- **ArrowBase**: Abstract base class with proper inheritance hierarchy
- **Type-safe creation**: Proper typing for bidirectional/unidirectional arrows

### Pipeline Pattern
- **DataPipeline**: Generic chainable pipeline infrastructure
- **DataProcessor**: Main processing pipeline with async support
- **Modular processing**: Separate processors for different data types

## Key Components & Purpose

### Entry Point
- **Datasphere.tsx**: Main React component using dependency injection
  - Uses `DependencyContainer.getInstance()` for service management
  - Manages React state and coordinates visualization lifecycle
  - Integrates with service layer for view state and configuration

### Core Infrastructure
- **DependencyContainer.ts**: Complete DI implementation with singleton registry
- **VisualizationManager.ts**: Central coordinator with proper DI (328 lines)
- **DataProcessor.ts**: Pipeline-based data processing with async support
- **DataPipeline.ts**: Generic chainable pipeline infrastructure
- **RenderingRules.ts**: Centralized rendering configuration

### Type System
- **types.ts**: Core type definitions including:
  - `FlowData`: Primary data structure for flows and items
  - `Bubble`: Data structure for bubble visualization elements
  - `Flow`: Data structure for flow connections between bubbles
  - `ViewId`, `FlowType`, `MetricType`: Proper typing for configuration system
  - Supporting interfaces for rendering and interaction

### Arrow System
- **ArrowBase.ts**: Abstract base class with standardized interface
- **ArrowFactory.ts**: Factory pattern for type-safe arrow creation
- **UnidirectionalArrow.ts**: One-way arrow implementation
- **BidirectionalArrow.ts**: Two-way arrow implementation
- **ArrowStyleManager.ts**: Centralized styling service with theme integration

### Data Pipeline
- **DataAdapter.ts**: Main data loading and transformation
- **FlowAdapter.ts**: Flow-specific data transformations
- **DataProcessor.ts**: Pipeline-based processing with async support
- **FlowIntegrationProcessor.ts**: Flow integration logic
- **FilterProcessor.ts**: Data filtering operations
- **MetricProcessor.ts**: Metric calculations and aggregations

### Rendering System
- **BubbleRenderer.ts**: Bubble visualization with theme-aware styling
- **FlowRenderer.ts**: Flow line rendering with optimization
- **TooltipManager.ts**: Tooltip creation and lifecycle management
- **InteractionManager.ts**: User interaction handling and event delegation
- **RenderingRules.ts**: Centralized visual styling rules

### Service Layer
- **ViewManager.ts**: View state management (market/brand)
- **ThemeManager.ts**: Theme detection with MutationObserver
- **FlowManager.ts**: Flow data processing and filtering
- **EventManager.ts**: Centralized event handling
- **DataService.ts**: Unified data access layer
- **ConfigurationService.ts**: Configuration access abstraction

### Configuration System
- **ConfigurationManager.ts**: Central configuration coordination
- **ViewConfigurations.ts**: Rule-based view-specific configurations
- **ArrowTypes.ts**: Arrow styling and behavior definitions
- **FlowTypes.ts**: Flow type definitions and mappings
- **RenderingRules.ts**: Visual appearance rules with priority system

### Utilities
- **bubble-utils.ts**: Bubble calculations and layout algorithms
- **flowTypeUtils.ts**: Flow type decision helpers
- **tooltip.ts**: Tooltip generation and display functions
- **calculations.ts**: Mathematical utilities and helpers
- **format.ts**: Data formatting utilities

## State Variables & Configuration

### View State Management
- **ViewManager.getViewType()**: Returns `ViewId` ('market' | 'brands')
- **ViewManager.isMarketView()**: Boolean getter for view type
- **ConfigurationManager.getFlowOption()**: Flow option ('churn' | 'switching')
- **ConfigurationManager.getFlowType()**: Flow direction type

### Flow Configuration
- **flowType**: Flow direction ('in', 'out', 'net', 'both')
- **flowOption**: Data type selection ('churn' | 'switching')
- **focusBubbleId**: Currently selected bubble (number | null)
- **focusedFlow**: Currently selected flow data
- **threshold**: Flow filtering threshold value
- **centreFlow**: Center flow visualization toggle

### Theme Management
- **ThemeManager.isDark()**: Centralized theme detection using MutationObserver
- **ThemeManager.getThemedColor(light, dark)**: Theme-aware color selection
- **ThemeManager.onThemeChange(callback)**: Theme change observer pattern

### Configuration Hierarchy
1. **ConfigurationManager**: Top-level coordination
2. **ViewConfigurations**: View-specific rendering rules with priorities
3. **RenderingRules**: Visual styling rules (321 lines of configuration)
4. **CONFIG**: Global configuration constants
5. **ArrowTypes**: Arrow-specific styling and behavior

## Data Flow

### Component Initialization
1. **Datasphere.tsx** initializes and gets services from DI container
2. **DependencyContainer** resolves all service dependencies
3. **Services** are injected into renderers and processors
4. **VisualizationManager** coordinates the visualization pipeline

### Data Processing Pipeline
1. **DataAdapter** loads and transforms raw data
2. **FlowAdapter** processes flow-specific transformations
3. **DataProcessor** runs pipeline with specialized processors
4. **FlowManager** filters and processes flow data
5. **Renderers** visualize the processed data

### Event Flow
1. **EventManager** centralizes all event handling
2. **InteractionManager** processes user interactions
3. **Services** update state based on events
4. **VisualizationManager** triggers re-renders as needed

### Configuration Access
1. **ConfigurationManager** provides unified configuration access
2. **ViewConfigurations** supplies view-specific settings
3. **RenderingRules** defines visual styling rules
4. **Services** use configuration for behavior customization

## Performance Considerations

### Optimized Patterns
- **Pipeline-based data processing** with async support
- **Event delegation** through EventManager
- **Theme-aware rendering** with observer pattern
- **Configuration-driven** rendering rules
- **Memoized calculations** in utility functions

### Memory Management
- **Service singletons** reduce object creation
- **Event cleanup** in component unmount
- **Observer disconnection** in theme manager
- **Pipeline reuse** for data processing

---

### Bubble Drawing Rules
implemented the optimized bubble positioning logic with these key improvements:

  ✅ What Changed:

  1. Ratio-Based Constants: All sizing now uses meaningful percentages of the positioning circle
  2. Optimal Positioning Circle: Automatically calculates the perfect radius for any number of bubbles (1-11)
  3. Collision Prevention: Guarantees no overlapping bubbles with proper spacing
  4. Adaptive Sizing: Bubbles scale appropriately regardless of count
  5. Simplified Logic: Removed complex calculations in favor of ratio-based approach

  ✅ Key Benefits:

  - Consistent Appearance: DataSphere looks balanced with 3, 7, or 11 bubbles
  - Maximum Space Utilization: Uses 85% of canvas while keeping everything visible
  - Data-Driven Sizing: Bubble size reflects data values within optimal constraints
  - Collision-Free: Mathematical guarantee of proper spacing
  - Performance: Simpler calculations, faster rendering

  ✅ New Logic Flow:

  1. Calculate optimal positioning circle
  2. Set bubble size constraints (4-12% of positioning radius)
  3. Verify no collisions with available arc length
  4. Scale bubble sizes based on data within constraints
  5. Position labels at 25% of positioning radius from center