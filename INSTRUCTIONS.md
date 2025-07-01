Major Issues Identified

1. Scattered Logic & Poor Separation of Concerns
•  View-specific logic (Markets/Brands) hardcoded throughout multiple files
•  Flow processing mixed with rendering logic
•  Conditions spread across 10+ files with no clear hierarchy
•  Arrow drawing tightly coupled with data processing

2. Lack of Abstraction
•  No clear interfaces for different view types
•  Flow types hardcoded rather than configurable
•  Arrow components not reusable
•  Complex conditional logic in rendering functions

3. Maintainability Issues
•  Adding new flow types requires changes in multiple files
•  No configuration-driven approach
•  Duplicate logic between Markets/Brands
•  No clear data transformation pipeline

Recommended Architecture Restructure

Phase 1: Core Architecture Foundation

#### 1.1 Create Configuration-Driven System
// components/Datasphere/config/ViewConfigurations.ts
export interface ViewConfiguration {
  id: string;
  name: string;
  dataSource: 'flows_markets' | 'flows_brands';
  supportsCenterFlow: boolean;
  defaultFlowType: FlowType;
  supportedFlowTypes: FlowType[];
  defaultMetric: MetricType;
  supportedMetrics: MetricType[];
  flowRenderingRules: FlowRenderingRule[];
}

export const VIEW_CONFIGURATIONS: Record<string, ViewConfiguration> = {
  markets: {
    id: 'markets',
    name: 'Markets',
    dataSource: 'flows_markets',
    supportsCenterFlow: true,
    defaultFlowType: 'net',
    supportedFlowTypes: ['out', 'in', 'net', 'both'],
    defaultMetric: 'churn',
    supportedMetrics: ['churn', 'switching'],
    flowRenderingRules: [
      { condition: { metric: 'churn', flowType: 'both' }, renderType: 'bidirectional' },
      // ... more rules
    ]
  },
  brands: {
    id: 'brands',
    name: 'Brands',
    dataSource: 'flows_brands',
    supportsCenterFlow: false,
    defaultFlowType: 'net',
    supportedFlowTypes: ['out', 'in', 'net', 'both'],
    defaultMetric: 'churn',
    supportedMetrics: ['churn', 'switching'],
    flowRenderingRules: [
      { condition: { metric: 'churn', flowType: ['in', 'out'] }, renderType: 'bidirectional' },
      // ... more rules
    ]
  }
};

#### 1.2 Create Generic Data Processing Pipeline
// components/Datasphere/core/DataProcessor.ts
export class DataProcessor {
  constructor(private config: ViewConfiguration) {}
  
  process(rawData: FlowData, filters: FilterOptions): ProcessedFlowData {
    return this.pipeline()
      .extract(rawData, this.config.dataSource)
      .transform(filters.metric)
      .filter(filters)
      .aggregate(filters.centerFlow)
      .sort()
      .execute();
  }
  
  private pipeline() {
    return new DataPipeline();
  }
}

Phase 2: Arrow Component System

#### 2.1 Create Reusable Arrow Components
// components/Datasphere/components/arrows/ArrowFactory.ts
export interface ArrowProps {
  startPoint: Point;
  endPoint: Point;
  thickness: number;
  color: string;
  type: 'unidirectional' | 'bidirectional';
  markerType: 'arrow' | 'circle' | 'diamond';
  labels?: ArrowLabel[];
  interactive?: boolean;
  onClick?: (event: MouseEvent) => void;
  onHover?: (event: MouseEvent) => void;
}

export class ArrowFactory {
  static create(type: ArrowType, props: ArrowProps): ArrowComponent {
    switch (type) {
      case 'unidirectional':
        return new UnidirectionalArrow(props);
      case 'bidirectional':
        return new BidirectionalArrow(props);
      case 'curved':
        return new CurvedArrow(props);
      default:
        throw new Error(`Unknown arrow type: ${type}`);
    }
  }
}

#### 2.2 Individual Arrow Components
// components/Datasphere/components/arrows/UnidirectionalArrow.ts
export class UnidirectionalArrow implements ArrowComponent {
    constructor(private props: ArrowProps) {}
    
    render(svg: d3.Selection): void {
      const line = this.createLine(svg);
      const marker = this.createMarker(svg);
      const labels = this.createLabels(svg);
      
      this.attachEvents(line);
      this.applyStyles(line, marker);
    }
    
    private createLine(svg: d3.Selection): d3.Selection {
      // Pure line creation logic
    }
    
    private createMarker(svg: d3.Selection): d3.Selection {
      // Pure marker creation logic
    }
  }

  Phase 3: Flow Rendering Engine

#### 3.1 Create Flow Renderer
// components/Datasphere/core/FlowRenderer.ts
export class FlowRenderer {
    constructor(
      private config: ViewConfiguration,
      private arrowFactory: ArrowFactory
    ) {}
    
    render(flows: ProcessedFlow[], bubbles: Bubble[], options: RenderOptions): void {
      flows.forEach(flow => {
        const renderRule = this.getRenderRule(flow, options);
        const arrowProps = this.calculateArrowProps(flow, bubbles, renderRule);
        const arrow = this.arrowFactory.create(renderRule.renderType, arrowProps);
        
        arrow.render(options.svg);
      });
    }
    
    private getRenderRule(flow: ProcessedFlow, options: RenderOptions): FlowRenderingRule {
      return this.config.flowRenderingRules.find(rule => 
        this.matchesCondition(flow, options, rule.condition)
      ) || this.getDefaultRule();
    }
  }

  Phase 4: State Management

#### 4.1 Create Centralized State Manager
// components/Datasphere/core/VisualizationState.ts
export class VisualizationState {
    private state: VisualizationStateData;
    private subscribers: Array<(state: VisualizationStateData) => void> = [];
    
    constructor(initialConfig: ViewConfiguration) {
      this.state = this.createInitialState(initialConfig);
    }
    
    updateView(viewId: string): void {
      const config = VIEW_CONFIGURATIONS[viewId];
      this.setState({
        ...this.state,
        currentView: config,
        flowType: config.defaultFlowType,
        metric: config.defaultMetric,
        focusBubbleId: null
      });
    }
    
    updateFlowType(flowType: FlowType): void {
      if (this.state.currentView.supportedFlowTypes.includes(flowType)) {
        this.setState({ ...this.state, flowType });
      }
    }
    
    private setState(newState: VisualizationStateData): void {
      this.state = newState;
      this.notifySubscribers();
    }
  }




  

Detailed Restructuring Tasks

Task 1: Configuration System Setup
Priority: High
Files to Create:
•  components/Datasphere/config/ViewConfigurations.ts
•  components/Datasphere/config/FlowTypes.ts
•  components/Datasphere/config/ArrowTypes.ts

Files to Refactor:
•  components/Datasphere/constants/flowTypes.ts → Merge into configuration
•  components/Datasphere/utils/flowTypeUtils.ts → Simplify using configuration

Task 2: Data Processing Pipeline
Priority: High
Files to Create:
•  components/Datasphere/core/DataProcessor.ts
•  components/Datasphere/core/DataPipeline.ts
•  components/Datasphere/processors/MetricProcessor.ts
•  components/Datasphere/processors/FilterProcessor.ts

Files to Refactor:
•  components/Datasphere/utils/flow.ts → Break into pipeline stages
•  utils/data-adapter.ts → Integrate into pipeline

Task 3: Arrow Component System
Priority: High
Files to Create:
•  components/Datasphere/components/arrows/ArrowFactory.ts
•  components/Datasphere/components/arrows/UnidirectionalArrow.ts
•  components/Datasphere/components/arrows/BidirectionalArrow.ts
•  components/Datasphere/components/arrows/ArrowBase.ts

Files to Refactor:
•  components/Datasphere/utils/vis/flowDrawing.ts → Extract into arrow components

Task 4: Flow Rendering Engine
Priority: Medium
Files to Create:
•  components/Datasphere/core/FlowRenderer.ts
•  components/Datasphere/core/RenderingRules.ts

Files to Refactor:
•  components/Datasphere/utils/visualization.ts → Integrate with new renderer

Task 5: State Management
Priority: Medium
Files to Create:
•  components/Datasphere/core/VisualizationState.ts
•  components/Datasphere/hooks/useVisualizationState.ts

Files to Refactor:
•  app/dashboard/layout.tsx → Use new state manager
•  components/Datasphere/Datasphere.tsx → Connect to state manager

Task 6: UI Controls Refactoring
Priority: Low
Files to Refactor:
•  components/layout/sidebar/nav-flowtypes.tsx → Use configuration for options
•  components/layout/sidebar/nav-options.tsx → Dynamic based on view config

Implementation Benefits

1. Maintainability
•  Add new views by creating configuration entries
•  Add new flow types without touching existing code
•  Clear separation of concerns

2. Extensibility
•  Easy to add new arrow types (curved, animated, etc.)
•  Support for new metrics without code changes
•  Plugin-like architecture for custom rendering rules

3. Testability
•  Each component can be unit tested independently
•  Data processing pipeline is easily testable
•  Arrow components can be tested in isolation

4. Performance
•  Lazy loading of arrow components
•  Efficient rendering through optimized pipeline
•  Better memory management with proper cleanup

Migration Strategy

Week 1: Configuration & Core Setup
1. Create configuration system
2. Set up data processing pipeline
3. Create basic state manager

Week 2: Arrow Component System
1. Create arrow factory and base classes
2. Implement unidirectional arrows
3. Implement bidirectional arrows

Week 3: Integration & Rendering
1. Create flow renderer
2. Integrate with existing Datasphere component
3. Update UI controls to use configurations

Week 4: Testing & Optimization
1. Add comprehensive tests
2. Performance optimization
3. Documentation and cleanup

This restructure will transform your codebase from a tightly-coupled, condition-heavy system into a modular, configuration-driven architecture that's easy to maintain and extend.