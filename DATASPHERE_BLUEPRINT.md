# DataSphere Component Blueprint

## Overview
This document provides a comprehensive guide to the DataSphere component structure, designed to help AI agents and developers understand the codebase organization and identify opportunities for optimization. It documents file structures, key variables, and potential areas for improvement.

## Directory Structure

```
components/Datasphere/
├── Datasphere.tsx            # Main component entry point
├── types.ts                  # Core type definitions
├── __tests__/                # Test files
├── adapters/                 # Data adapter layer
├── arrows/                   # Arrow visualization components
├── components/               # UI components
├── config/                   # Configuration definitions
├── constants/                # Constants and hardcoded values
├── core/                     # Core visualization logic
├── examples/                 # Example implementations
├── hooks/                    # React hooks
├── processors/               # Data processing logic
├── renderers/                # Rendering components
├── utils/                    # Utility functions
```

## Key Components & Purpose

### Entry Point
- **Datasphere.tsx**: Main React component that orchestrates the data visualization, manages state, and connects the various parts of the system.

### Type System
- **types.ts**: Contains all the core type definitions including:
  - `FlowData`: Primary data structure for flows and items
  - `Bubble`: Data structure for bubble visualization elements
  - `Flow`: Data structure for flow connections between bubbles
  - Supporting interfaces for flow types, metrics, and rendering

### Core Classes
- **VisualizationManager.ts**: Central coordinator for the visualization system that manages state, rendering, and interactions.
- **DependencyContainer.ts**: Implements dependency injection for loosely coupled components.
- **RenderingRules.ts**: Contains logic for appearance rules, styles, and visual decisions.
- **DataProcessor.ts**: Processes raw data into visualization-ready format.
- **FlowRenderer.ts**: Handles flow visualization between bubbles.

### Arrow System
- **ArrowBase.ts**: Abstract base class for arrow visualization.
- **ArrowFactory.ts**: Factory pattern implementation for creating different arrow types.
- **UnidirectionalArrow.ts**: Implementation of one-way arrows.
- **BidirectionalArrow.ts**: Implementation of bidirectional arrows.

### Data Pipeline
- **DataAdapter.ts**: Adapter for loading and transforming data from external sources.
- **FlowAdapter.ts**: Specialized adapter for flow data transformations.
- **FlowIntegrationProcessor.ts**: Processes flow data for visualization.

### Renderers
- **BubbleRenderer.ts**: Handles rendering of bubbles in the visualization.
- **FlowRenderer.ts**: Renders flow connections between bubbles.
- **TooltipManager.ts**: Manages tooltip creation and display.
- **InteractionManager.ts**: Manages user interactions with visualization elements.

### Configuration
- **ArrowTypes.ts**: Type definitions for arrows, markers, and related styles.
- **ViewConfigurations.ts**: Configurations for different view types (market, brand).
- **FlowTypes.ts**: Type definitions for different flow types.
- **ConfigurationManager.ts**: Manages configuration loading and application.

### Utilities
- **bubble-utils.ts**: Utilities for bubble calculations and layout.
- **flowTypeUtils.ts**: Helpers for flow type decisions.
- **flow-refactored.ts**: Refactored flow data preparation functions.
- **tooltip.ts**: Functions for tooltip generation and display.

## Key Variables & Configuration Flags

### View Type Controls
- **isMarketView**: Boolean flag that controls whether visualization is in market view or brand view.
- Many files directly access this variable rather than using a centralized getter.

### Theme Controls
- **isDarkTheme**: Boolean flag for dark/light theme.
- **resolvedTheme**: Value from next-themes used to detect current theme.
- Theme detection is duplicated in several places.

### Flow Type & Options
- **flowType**: String that determines flow direction ('in', 'out', 'net', 'both').
- **flowOption**: Enum ('churn', 'switching') that selects the data type to visualize.
- **centreFlow**: Boolean flag that enables/disables center flow visualization.

### Visual Configuration
- **CONFIG**: Global configuration object in constants/config.ts with visualization settings.
- **VIEW_CONFIGURATIONS**: Map of view-specific configurations.

## Generic Opportunities

### View Management ✅
- ✅ Implemented `ViewManager` service (in `services/ViewManager.ts`)
- ✅ Provides centralized `getViewType()` and `isMarketView()` methods
- ✅ Abstracts view-specific logic into a singleton service
- ✅ Replaces direct boolean checks with proper type-safe accessors

### Theme Management ✅
- ✅ Implemented `ThemeManager` service (in `services/ThemeManager.ts`)
- ✅ Provides centralized theme state management
- ✅ Includes theme change detection and notification system
- ✅ Offers helper methods like `getThemedColor(light, dark)` for theme-aware styling

### Configuration Access ✅
- ✅ Implemented `ConfigurationService` (in `services/ConfigurationService.ts`)
- ✅ Provides unified access to all configuration settings
- ✅ Centralizes view-specific config access
- ✅ Organizes configs by domain (flow, bubble, visualization)

### Data Access ✅
- ✅ Implemented `DataService` (in `services/DataService.ts`)
- ✅ Provides consistent access to processed flow data
- ✅ Abstracts data source specifics behind a unified API
- ✅ Consolidates flow data processing logic in one place

## Redundant Logic

### Tooltip Creation ✅
- ✅ Consolidated tooltip logic into a singleton `TooltipManager` service
- ✅ Refactored `tooltip.ts` to use `TooltipManager` for all tooltip operations
- ✅ Implemented theme-aware styling through `ThemeManager` integration
- ✅ Added configuration options and robust fallback handling

### Flow Data Processing ✅
- ✅ Implemented `FlowManager` service (in `services/FlowManager.ts`)
- ✅ Centralized flow data processing logic in one place
- ✅ Standardized flow direction and value calculation
- ✅ Provides consistent filtering for focus bubble and threshold

### Theme Handling ✅
- ✅ Unified theme handling through ThemeManager service
- ✅ Replaced direct DOM class inspection with ThemeManager.isDark()
- ✅ Implemented theme change observer pattern via ThemeManager.onThemeChange()
- ✅ Consolidated theme-dependent styling with ThemeManager.getThemedColor()

### Arrow Style Handling ✅
- ✅ Implemented `ArrowStyleManager` service (in `services/ArrowStyleManager.ts`)
- ✅ Standardized stroke/strokeWidth conventions across all arrow components
- ✅ Centralized style conversion and application
- ✅ Integrated with ThemeManager for theme-aware arrow styling

### Event Handling
- Mouse event handling follows similar patterns across components but with minor inconsistencies.
- Event delegation is not consistently implemented.

## Improvement Suggestions

1. **Unified View System**
   - Create a `ViewManager` class that provides centralized view state.
   - Replace all direct `isMarketView` checks with `viewManager.getViewType()`.

2. **Theme Service**
   - Implement a `ThemeService` that handles all theme-related logic.
   - Use theme context instead of direct theme checks.

3. **Configuration Management**
   - Consolidate all config constants into a hierarchical configuration system.
   - Implement a central `ConfigService` for accessing configuration values.

4. **Data Pipeline Standardization**
   - Standardize data access patterns through consistent services.
   - Implement clear data transformation pipeline with defined stages.

5. **Consistent Type Usage**
   - Enforce strict typing throughout the codebase.
   - Refactor interfaces to eliminate redundancy.

6. **Component Composition**
   - Break large components into smaller, focused components.
   - Use composition over inheritance where applicable.

7. **Arrow System Refactoring** ✅
   - ✅ Standardized arrow property naming with `StandardizedArrowStyle` interface
   - ✅ Created clear interfaces for arrow configurations
   - ✅ Implemented centralized `ArrowStyleManager` service

8. **Service Locator Pattern**
   - Extend the dependency injection system to support more flexible service location.
   - Register services with a service container accessible throughout the app.

9. **Event Delegation**
   - Implement a consistent event delegation model.
   - Centralize event handling logic.

10. **Documentation Improvements**
    - Add JSDoc comments to all public methods and properties.
    - Include examples in documentation.

## Future Considerations

- Consider moving to a more reactive data flow pattern (RxJS, etc.).
- Evaluate performance optimizations for large data sets.
- Explore WebGL rendering for improved performance with complex visualizations.
- Consider extracting reusable visualization components into a separate library.
