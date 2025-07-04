import { ArrowFactory } from '../arrows/ArrowFactory';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { DataAdapter } from '../adapters/DataAdapter';
// DataProcessor and FlowIntegrationProcessor removed - using FlowDataService directly
import { RenderingRules } from './RenderingRules';
import { BubbleRenderer } from '../renderers/BubbleRenderer';
import { ModernFlowRenderer } from '../renderers/ModernFlowRenderer';
import { TooltipManager } from '../renderers/TooltipManager';
// InteractionManager removed - using EventManager directly
import { VisualizationManager } from './VisualizationManager';
import ThemeManager from '../services/ThemeManager';
import EventManager from '../services/EventManager';
import ViewManager from '../services/ViewManager';
// FlowManager removed - using FlowDataService instead
import FlowFactory from '../services/FlowFactory';
import FlowSegmentGenerator from '../services/FlowSegmentGenerator';
import FlowDataService from '../services/FlowDataService';

/**
 * Interface for dependency registration
 */
export interface DependencyRegistration {
  [key: string]: unknown;
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
    
    // Service singletons for DI compatibility
    this.register('ThemeManager', ThemeManager.getInstance());
    this.register('EventManager', EventManager.getInstance());
    this.register('ViewManager', ViewManager.getInstance());
    // FlowManager removed - using FlowDataService instead
    
    // New Flow system services
    this.register('FlowFactory', FlowFactory.getInstance());
    this.register('FlowSegmentGenerator', FlowSegmentGenerator.getInstance());
    this.register('FlowDataService', FlowDataService.getInstance());
    
    // Alternative registrations with consistent naming
    this.register('ConfigurationManager', ConfigurationManager.getInstance());
    
    // Adapters
    this.register('dataAdapter', new DataAdapter());
    
    // Processors
    const configManager = this.resolve<ConfigurationManager>('configManager');
    const defaultViewConfig = configManager.getViewConfiguration('markets');
    // dataProcessor removed - using FlowDataService directly
    // flowIntegrationProcessor removed - using FlowDataService directly
    
    // Factories
    this.register('arrowFactory', new ArrowFactory());
    
    // Renderers with full DI
    this.register('bubbleRenderer', new BubbleRenderer(
      this.resolve('renderingRules'),
      this.resolve('ThemeManager'),
      this.resolve('EventManager'), 
      this.resolve('ViewManager')
    ));
    // flowRenderer removed - ModernFlowRenderer instantiated at runtime with SVG
    this.register('tooltipManager', new TooltipManager(
      this.resolve('ThemeManager'),
      this.resolve('ViewManager')
    ));
    // interactionManager removed - using EventManager directly
    
    // Register VisualizationManager with all its dependencies
    const visualizationManager = new VisualizationManager(
      this.resolve('bubbleRenderer'),
      this.resolve('tooltipManager'),
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
  register(key: string, instance: unknown): void {
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
