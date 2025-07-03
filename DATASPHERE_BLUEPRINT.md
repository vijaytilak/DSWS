# DataSphere Component Blueprint

## Overview
This document provides a comprehensive guide to the DataSphere component structure, designed for a **data-driven, simplified architecture**. The component uses modern architectural patterns with **Flow/FlowSegment system optimized for D3.js** and clean separation of concerns.

## Current State Analysis

### **Critical Issues Identified:**
1. **Dual Interface System**: Both `LegacyFlow` and modern `Flow/FlowSegment` systems exist
2. **Type Confusion**: `VisualizationManager` imports `Flow` but uses `LegacyFlow` interface
3. **Unused Modern System**: FlowDataService, FlowFactory, ModernFlowRenderer implemented but not integrated
4. **Complex Data Pipeline**: Multiple processors with overlapping responsibilities
5. **Bridge Components**: FlowRenderer adds complexity without benefit

### **Migration Priority:**
🚨 **IMMEDIATE ACTION REQUIRED**: Complete migration to modern Flow/FlowSegment system to eliminate architectural debt.

## Simplified Target Architecture

### **Data Flow (After Migration)**
```
Raw FlowData → FlowFactory → Flow[] → FlowSegmentGenerator → FlowSegment[] → ModernFlowRenderer
```

### **Core Services (Simplified)**
```
Essential Services (8 total):
├── ViewManager (View state management)
├── ConfigurationManager (Configuration access)
├── FlowDataService (Flow coordination)
├── FlowFactory (Flow creation)
├── FlowSegmentGenerator (Segment calculation)
├── ThemeManager (Theme management)
├── EventManager (Event handling)
└── TooltipManager (Tooltip management)

Removed Complexity:
❌ FlowManager (replace with FlowDataService)
❌ DataProcessor/MetricProcessor/FilterProcessor (replace with FlowFactory)
❌ FlowIntegrationProcessor (bridge component)
❌ FlowRenderer (bridge component)
❌ InteractionManager (deprecated, use EventManager)
```

## Directory Structure

```
components/Datasphere/
├── Datasphere.tsx            # Main React component (simplified DI)
├── types.ts                  # Clean type definitions (LegacyFlow removed)
├── __tests__/                # Test files
├── adapters/                 # Data transformation layer
│   └── DataAdapter.ts        # Simple data loading
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
│   └── flowTypes.ts          # Flow type constants (deprecated)
├── core/                     # Core architecture (simplified)
│   ├── DependencyContainer.ts# Dependency injection container
│   ├── RenderingRules.ts     # Visual styling rules
│   └── VisualizationManager.ts # Central coordinator (modernized)
├── hooks/                    # React hooks
│   └── useDimensions.ts      # Window/container dimensions
├── renderers/                # Rendering components (simplified)
│   ├── BubbleRenderer.ts     # Bubble visualization
│   ├── ModernFlowRenderer.ts # Modern D3.js flow renderer
│   └── TooltipManager.ts     # Tooltip management
├── services/                 # Service layer (streamlined)
│   ├── ArrowStyleManager.ts  # Arrow styling service
│   ├── ConfigurationService.ts # Config access service
│   ├── EventManager.ts       # Event handling service
│   ├── FlowDataService.ts    # Modern flow data coordination
│   ├── FlowFactory.ts        # Flow and FlowSegment creation
│   ├── FlowSegmentGenerator.ts # FlowSegment generation service
│   ├── ThemeManager.ts       # Theme detection/management
│   └── ViewManager.ts        # View state management
└── utils/                    # Utility functions (simplified)
    ├── bubble-utils.ts       # Bubble calculations
    ├── calculations.ts       # Mathematical utilities
    ├── flowTypeUtils.ts      # Flow type helpers
    ├── format.ts             # Data formatting
    ├── time-selector.tsx     # Time selection component
    └── vis/                  # Visualization utilities
        └── bubbleDrawing.ts  # Bubble drawing utilities
```

## Modern Flow/FlowSegment System

### **Simple Type Hierarchy**
```typescript
// Core Flow interface (simple and clean)
interface Flow {
  id: string;
  from: string;
  to: string;
  type: 'unidirectional' | 'bidirectional';
  view: 'markets' | 'brands';
  metric: 'churn' | 'switching' | 'spend';
  flowType: 'in' | 'out' | 'net' | 'both' | 'more' | 'less';
  flowSegments: FlowSegment[];  // Pre-calculated visual data
  abs: number;
  visible: boolean;
  highlighted: boolean;
  selected: boolean;
  isCentreFlow: boolean;
}

// FlowSegment interface (optimized for D3.js)
interface FlowSegment {
  id: string;
  parentFlowId: string;
  direction: 'outgoing' | 'incoming' | 'single';
  startPoint: { x: number, y: number };
  endPoint: { x: number, y: number };
  thickness: number;
  color: string;
  labels: Label[];
  marker: MarkerConfig;
  tooltip: TooltipConfig;
  visible: boolean;
  highlighted: boolean;
}
```

### **Data Processing Pipeline (Simplified)**
1. **FlowFactory.createFlows(rawData)**: Convert raw data to Flow objects
2. **FlowSegmentGenerator.generateSegments(flows)**: Pre-calculate visual properties
3. **ModernFlowRenderer.render(flowSegments)**: D3.js optimized rendering

## Migration Roadmap

### **Phase 1: Type System Cleanup** 
**Priority: CRITICAL - Start Immediately**

**Files to Update:**
- `types.ts`: Remove LegacyFlow interface, clean up type exports
- `VisualizationManager.ts`: Import Flow from FlowFactory instead of types
- `Datasphere.tsx`: Update callback signatures to use modern Flow
- All imports: Make Flow imports explicit (from FlowFactory)

**Expected Outcome:** Clear type hierarchy without ambiguity

### **Phase 2: Core Component Migration**
**Dependencies:** Complete Phase 1

**Files to Update:**
- `Datasphere.tsx`: Replace FlowManager with FlowDataService
- `VisualizationManager.ts`: Use ModernFlowRenderer directly
- `DependencyContainer.ts`: Remove legacy service registrations

**Expected Outcome:** Modern flow system actively used

### **Phase 3: Data Pipeline Simplification**
**Dependencies:** Complete Phase 2

**Files to Remove:**
- `DataProcessor.ts`: Replace with FlowFactory direct usage
- `MetricProcessor.ts`: Logic moved to FlowFactory
- `FilterProcessor.ts`: Logic moved to FlowFactory
- `FlowIntegrationProcessor.ts`: Bridge component removed
- `FlowRenderer.ts`: Bridge component removed

**Expected Outcome:** Single, clean data transformation pipeline

### **Phase 4: Service Consolidation**
**Dependencies:** Complete Phase 3

**Files to Remove:**
- `FlowManager.ts`: Functionality in FlowDataService
- `InteractionManager.ts`: Use EventManager instead

**Expected Outcome:** 8 focused services instead of 12+ overlapping ones

### **Phase 5: Legacy Cleanup**
**Dependencies:** Complete all phases above

**Final Cleanup:**
- Remove all LegacyFlow references
- Update all tests to use modern interfaces
- Remove deprecated utilities

## Quick Reference for AI Agents

### **When Making Edits After Migration:**

| **Task** | **Primary Files** | **Pattern** |
|----------|-------------------|-------------|
| **Flow Processing** | `FlowDataService.ts`, `FlowFactory.ts` | Use FlowDataService.getCurrentFlows() |
| **Rendering** | `ModernFlowRenderer.ts` | Direct D3.js with proper data binding |
| **View Logic** | `ViewManager.ts` | Centralized view state |
| **Configuration** | `ConfigurationManager.ts` | Unified config access |
| **Events** | `EventManager.ts` | Centralized event handling |
| **Data Input** | `FlowFactory.ts` | Direct transformation from raw data |

### **Simplified Data Flow Patterns**

**Data Input:**
```typescript
// Simple pattern
const flows = FlowFactory.createFlows(rawData, config);
const segments = FlowSegmentGenerator.generateSegments(flows);
modernRenderer.render(segments);
```

**State Management:**
```typescript
// Use services through DI
const container = DependencyContainer.getInstance();
const viewManager = container.get<ViewManager>('ViewManager');
const flowDataService = container.get<FlowDataService>('FlowDataService');
```

## Performance Benefits After Migration

### **Eliminated Complexities:**
- ❌ Dual interface system overhead
- ❌ Complex bridge components
- ❌ Multiple data transformation steps
- ❌ Redundant service layers
- ❌ Type confusion and casting

### **Improved Performance:**
- ✅ Single data transformation path
- ✅ Pre-calculated FlowSegments
- ✅ Proper D3.js data binding with object constancy
- ✅ Reduced service instantiation overhead
- ✅ Clear dependency graph

## Flow Visualization Rules

### **Unidirectional Flows:**
- Single FlowSegment from 'from' bubble to 'to' bubble
- Arrow marker points toward destination
- Uses `direction: 'single'`

### **Bidirectional Flows:**
- Two FlowSegments: 'outgoing' and 'incoming'
- Split point calculated based on percentage values
- Outgoing: split point → 'to' bubble
- Incoming: split point → 'from' bubble

### **Filtering Logic:**
- Focus bubble: Show only flows connected to focused bubble
- Threshold: Filter flows by absolute value
- View/Metric/FlowType: Use FlowDataService filtering methods

## Development Guidelines

### **Data-Driven Principles:**
1. **Pre-calculate Everything**: All visual properties calculated once in FlowSegments
2. **Single Source of Truth**: FlowDataService coordinates all flow data
3. **Immutable Transformations**: Each stage produces new data, doesn't mutate
4. **Service Layer**: Use DI container for all service access
5. **Type Safety**: Strict TypeScript with no any types

### **Performance Guidelines:**
1. **D3.js Best Practices**: Use enter/update/exit pattern with object constancy
2. **Minimal Re-renders**: Update only changed elements
3. **Pre-calculated Properties**: No runtime calculations during render
4. **Event Delegation**: Use EventManager for centralized event handling
5. **Theme Support**: All components support light/dark themes

### **Architecture Principles:**
1. **Separation of Concerns**: Clear boundaries between data/rendering/interaction
2. **Dependency Injection**: Loose coupling through DI container
3. **Service-Oriented**: Business logic in focused services
4. **Configuration-Driven**: Behavior controlled through configuration
5. **Testable Design**: Pure functions and dependency injection for easy testing

## Migration Implementation Priority

**Week 1: Foundation**
- Complete type system cleanup
- Update core component interfaces

**Week 2: Integration** 
- Migrate main components to modern system
- Remove bridge components

**Week 3: Simplification**
- Consolidate data pipeline
- Remove redundant services

**Week 4: Polish**
- Clean up legacy code
- Update tests and documentation

**Expected Benefits:**
- 40% reduction in codebase complexity
- 60% fewer type-related errors
- 30% improved rendering performance
- 90% reduction in architectural debt