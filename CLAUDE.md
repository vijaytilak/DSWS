# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ MANDATORY READING

**Before any refactoring or architectural changes, ALWAYS read `DATASPHERE_BLUEPRINT_V2.md` first.** It contains the complete modernized architecture with the 8-service system and explains the migration from legacy patterns.

## Project Overview

DataSphere is a Next.js 14 data visualization application for interactive network analysis. It visualizes complex relationships between entities (bubbles) and their connections (flows) using D3.js with a modern service-oriented architecture.

**Tech Stack**: Next.js 14, TypeScript, D3.js, Firebase Auth, Tailwind CSS, shadcn/ui

## Essential Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000

# Building & Production  
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run with coverage (70% threshold)

# Code Quality
npm run lint             # Run ESLint
npx tsc --noEmit         # TypeScript type checking
```

## Architecture Overview

### Core Structure
```
app/                    # Next.js 14 app router
├── contexts/          # React contexts (table-data-context)
├── dashboard/         # Main application with layout context
└── login/             # Firebase authentication

components/Datasphere/  # Core visualization component
├── services/          # Business logic services (8 focused services)
├── renderers/         # D3.js rendering (BubbleRenderer, ModernFlowRenderer)
├── core/             # DI container, VisualizationManager
├── adapters/         # Data loading (DataAdapter)
├── config/           # Configuration management
└── utils/            # Utility functions and calculations
```

### Dependency Injection System

**Critical**: The application uses a centralized `DependencyContainer` for ALL service access:

```typescript
// ✅ Always use DI container
const container = DependencyContainer.getInstance();
const flowDataService = container.resolve<FlowDataService>('FlowDataService');
const viewManager = container.resolve<ViewManager>('ViewManager');

// ❌ Never instantiate directly
const flowDataService = new FlowDataService(); // WRONG
```

### Modernized Data Flow Pipeline

**Modern Architecture** (completed migration):
```
Raw FlowData (ds.json)
    ↓
DataAdapter.loadData() → FlowData interface
    ↓
FlowDataService.initialize() → Centralized flow coordination
    ↓
FlowFactory.generateFlows() → Flow[] objects with metadata
    ↓
FlowSegmentGenerator.generateSegments() → Pre-calculated FlowSegments
    ↓
ModernFlowRenderer.render() → Optimized D3.js with data binding
```

### State Management Pattern

**IMPORTANT**: Per DATASPHERE_BLUEPRINT_V2.md, use centralized core services, NOT React Context for business logic.

**React Context** (UI state only):
- `TableDataProvider`: Table data for selected bubbles when clicked
- `CentreFlowContext`: Temporary UI state bridge (should migrate to DI services)

**DI Services** (Business logic - PRIMARY):
- `ViewManager`: View type management (markets/brands)
- `ConfigurationManager`: Flow configuration (flowType, flowOption)
- `FlowDataService`: Flow state and generation coordination
- `ThemeManager`: Theme detection and management
- `EventManager`: Centralized event handling

**Migration Note**: The app is transitioning from React Context to pure DI services for all business logic.

### Critical Flow Types Architecture

**Flow Generation**:
- **Markets View**: Flows between bubbles and center (bubble → center bubble ID)
- **Brands View**: Flows between bubbles directly (bubble → bubble)
- Center bubble ID = data.bubbles.length (e.g., ID 11 for 11 bubbles 0-10)

**Flow Rendering Pipeline**:
```
FlowDataService.getFilteredFlows({...})
    ↓
FlowFactory.generateFlows(data, config) → Flow[] objects
    ↓  
FlowSegmentGenerator.generateSegments(flows, config) → Pre-calculated FlowSegments
    ↓
ModernFlowRenderer.render(flows) → D3.js with data binding
```

**FlowSegment Pre-calculation**:
All visual properties (startPoint, endPoint, color, thickness) are pre-calculated to eliminate runtime D3.js performance overhead.

**Debug Flow Rendering**: See `FLOW_RENDERING_ARCHITECTURE.md` for detailed analysis of the rendering pipeline and debugging strategy.

## Key Development Patterns

### 1. Service Access Pattern
```typescript
// ✅ Use dependency injection (PRIMARY METHOD)
const container = DependencyContainer.getInstance();
const service = container.resolve<ServiceType>('ServiceName');

// ✅ Services are singletons - safe to call getInstance()
const viewManager = ViewManager.getInstance();

// ⚠️ Avoid React Context for business logic - migrate to DI services
// See DATASPHERE_BLUEPRINT_V2.md for the 8-service architecture
```

### 2. Flow Data Processing
```typescript
// ✅ Modern pattern for flow processing
flowDataService.initialize(rawData);
const flows = flowDataService.getFilteredFlows({
  view: 'markets',
  metric: 'churn', 
  flowType: 'out',
  focusBubbleId: 5,
  threshold: 0
});
```

### 3. Bubble Click Integration
Connect bubble interactions to context AND table data:
```typescript
const handleBubbleClick = (bubble: Bubble) => {
  // Update focus state in context
  onFocusBubbleChange(bubble.id);
  
  // Update table data context
  const bubbleData = data.bubbles.find(b => b.bubbleID === bubble.id);
  setTableData(bubbleData.tabledata);
  setSelectedItemLabel(bubbleData.bubbleLabel);
};
```

### 4. Theme and View State
Both bubble and flow renderers automatically respond to:
- Theme changes (dark/light mode detection)
- View changes (markets/brands switching)
- Configuration changes (flowType, flowOption)

## Testing Strategy

- Jest with jsdom environment, ts-jest preset
- 70% coverage threshold enforced on `components/**/*.{ts,tsx}`
- Focus on service layer testing with dependency injection
- Module alias support: `@/` maps to root directory

## Critical Files

### Architecture Documentation
- `DATASPHERE_BLUEPRINT_V2.md`: **REQUIRED READING** - Complete architecture overview and 8-service system
- `types.ts`: Central type definitions (FlowData, Bubble, TableDataItem)

### Core Components  
- `Datasphere.tsx`: Main visualization component with context integration
- `DependencyContainer.ts`: Service registration and resolution
- `FlowDataService.ts`: Modern flow coordination service

### Configuration
- `jest.config.js`: Testing configuration with coverage thresholds
- `data/ds.json`: Sample data structure with bubbles, flow_brands, flow_markets

## Development Guidelines

**⚠️ CRITICAL**: Always consult `DATASPHERE_BLUEPRINT_V2.md` before any refactoring or architectural changes.

1. **Dependency Injection**: Always use DI container for service access
2. **Modern Flow System**: Use Flow/FlowSegment pattern exclusively 
3. **Service-First Architecture**: Use DI services for business logic, minimize React Context
4. **Pre-calculated Rendering**: Compute visual properties before D3.js rendering
5. **Bubble Center ID**: Calculate dynamically as data.bubbles.length
6. **Type Safety**: Strict TypeScript throughout
7. **Service Testing**: Focus tests on service layer with DI patterns
8. **Blueprint Compliance**: Follow the 8-service architecture defined in DATASPHERE_BLUEPRINT_V2.md