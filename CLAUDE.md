# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run typecheck        # TypeScript type checking
```

## Architecture Overview

### Core Structure
```
app/                    # Next.js 14 app router
├── api/               # API routes (bubbles, flows)
├── dashboard/         # Main application pages
└── login/             # Authentication

components/Datasphere/  # Core visualization component
├── services/          # Business logic services
├── renderers/         # D3.js rendering components
├── core/             # Core processing classes
└── utils/            # Utility functions
```

### Dependency Injection Pattern

The application uses a centralized `DependencyContainer` for service management:

```typescript
// Access services through DI container
const container = DependencyContainer.getInstance();
const viewManager = container.get<ViewManager>('ViewManager');
const themeManager = container.get<ThemeManager>('ThemeManager');
```

Key registered services:
- `ViewManager`: View state (markets/brands)
- `ThemeManager`: Dark/light theme detection
- `FlowDataService`: Modern flow data management
- `ConfigurationManager`: Unified configuration access
- `EventManager`: Centralized event handling

### Data Processing Pipeline

```
DataAdapter → DataProcessor → FlowFactory → FlowSegmentGenerator → ModernFlowRenderer
```

### Flow/FlowSegment Architecture

**Modern System** (use this for new code):
- `Flow` objects: High-level data structures with metadata
- `FlowSegment` objects: Pre-calculated visual properties for D3.js
- `ModernFlowRenderer`: D3.js with proper data binding patterns

**Legacy System** (being phased out):
- `LegacyFlow` interface: Old flow structure
- Bridge pattern in `FlowRenderer.ts` for compatibility

## DataSphere Component Architecture

The `components/Datasphere/` directory contains the core visualization:

- **Entry Point**: `Datasphere.tsx` - Main React component
- **Type System**: `types.ts` - All core interfaces and types
- **Services**: Domain logic services (FlowManager, ViewManager)
- **Renderers**: D3.js rendering (BubbleRenderer, FlowRenderer, ModernFlowRenderer)
- **Configuration**: Rule-based configuration system
- **State**: `VisualizationState` for centralized state management

## Key Development Patterns

### 1. Service-Oriented Architecture
Always use services through the DI container rather than direct instantiation:

```typescript
// ✅ Good
const container = DependencyContainer.getInstance();
const flowManager = container.get<FlowManager>('FlowManager');

// ❌ Avoid
const flowManager = new FlowManager();
```

### 2. Flow Data Processing
Use the modern Flow/FlowSegment pattern for new flow visualizations:

```typescript
// Create flows with pre-calculated segments
const flows = FlowFactory.createFlows(data);
const segments = FlowSegmentGenerator.generateSegments(flows);
```

### 3. D3.js Rendering
Follow proper D3.js data binding patterns in renderers:

```typescript
// Use enter/update/exit pattern with object constancy
const selection = container.selectAll('.flow-segment')
  .data(segments, d => d.id);
```

### 4. Theme Support
All components must support light/dark themes via CSS variables and theme detection.

## Testing Strategy

- Jest with ts-jest configuration
- 70% coverage threshold enforced
- Tests located in `__tests__/` directories
- Focus on service layer testing with dependency injection

## Important Files

- `DATASPHERE_BLUEPRINT.md`: Comprehensive component architecture
- `INSTRUCTIONS.md`: Recent migration notes and decisions
- `types.ts`: Central type definitions

## Migration Status

The codebase is actively migrating from legacy to modern architecture:
- Legacy `Flow` interface renamed to `LegacyFlow`
- New `Flow` interface with `FlowSegment` arrays
- Bridge pattern maintains compatibility during transition
- Use modern patterns for all new code

## Development Guidelines

1. **Type Safety**: Strict TypeScript - no `any` types
2. **Service Layer**: Use DI container for service access
3. **Modern Flow System**: Use Flow/FlowSegment pattern for new features
4. **Theme Support**: Support both light/dark themes
5. **Performance**: Pre-calculate properties for D3.js rendering
6. **File Organization**: Follow existing modular structure
7. **Testing**: Write tests for service layer and core logic