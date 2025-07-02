import { ArrowFactory } from '../arrows/ArrowFactory';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { DataAdapter } from '../adapters/DataAdapter';
import { DataProcessor } from './DataProcessor';
import { FlowAdapter } from '../adapters/FlowAdapter';
import { FlowIntegrationProcessor } from '../processors/FlowIntegrationProcessor';
import { FlowProcessor } from '../processors/FlowProcessor';
import { RenderingRules } from './RenderingRules';
import { BubbleRenderer } from '../renderers/BubbleRenderer';
import { FlowRenderer } from '../renderers/FlowRenderer';
import { TooltipManager } from '../renderers/TooltipManager';
import { InteractionManager } from '../renderers/InteractionManager';
import { VisualizationManager } from './VisualizationManager';

/**
 * Interface for dependency registration
 */
export interface DependencyRegistration {
  [key: string]: any;
}

/**
 * DependencyContainer class
 * Provides a simple dependency injection container for the application
 */
export class DependencyContainer {
  private static instance: DependencyContainer;
  private dependencies: DependencyRegistration = {};
  
  private constructor() {
    // Register default dependencies
    this.registerDefaults();
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }
  
  /**
   * Register default dependencies
   */
  private registerDefaults(): void {
    // Core services
    this.register('configManager', ConfigurationManager.getInstance());
    this.register('renderingRules', new RenderingRules());
    
    // Adapters
    this.register('dataAdapter', new DataAdapter());
    this.register('flowAdapter', new FlowAdapter());
    
    // Processors
    const configManager = this.resolve<ConfigurationManager>('configManager');
    const defaultViewConfig = configManager.getViewConfiguration('markets');
    this.register('dataProcessor', new DataProcessor(defaultViewConfig));
    this.register('flowProcessor', new FlowProcessor());
    this.register('flowIntegrationProcessor', new FlowIntegrationProcessor());
    
    // Factories
    this.register('arrowFactory', new ArrowFactory());
    
    // Renderers
    this.register('bubbleRenderer', new BubbleRenderer(this.resolve('renderingRules')));
    this.register('flowRenderer', new FlowRenderer(this.resolve('renderingRules')));
    this.register('tooltipManager', new TooltipManager());
    this.register('interactionManager', new InteractionManager(this.resolve('tooltipManager')));
    
    // Register VisualizationManager with all its dependencies
    const visualizationManager = new VisualizationManager(
      this.resolve('bubbleRenderer'),
      this.resolve('flowRenderer'),
      this.resolve('tooltipManager'),
      this.resolve('interactionManager'),
      this.resolve('configManager'),
      this.resolve('renderingRules')
    );
    this.register('visualizationManager', visualizationManager);
    
    // Set the singleton instance for backward compatibility
    VisualizationManager.setInstance(visualizationManager);
  }
  
  /**
   * Register a dependency
   */
  register(key: string, instance: any): void {
    this.dependencies[key] = instance;
  }
  
  /**
   * Resolve a dependency
   */
  resolve<T>(key: string): T {
    if (!this.dependencies[key]) {
      throw new Error(`Dependency ${key} not registered`);
    }
    return this.dependencies[key] as T;
  }
  
  /**
   * Check if a dependency is registered
   */
  has(key: string): boolean {
    return !!this.dependencies[key];
  }
  
  /**
   * Remove a dependency
   */
  remove(key: string): void {
    delete this.dependencies[key];
  }
  
  /**
   * Clear all dependencies
   */
  clear(): void {
    this.dependencies = {};
  }
}
