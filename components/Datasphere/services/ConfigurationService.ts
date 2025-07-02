import { CONFIG } from '../constants/config';
import { getViewConfiguration, ViewConfiguration, ViewId } from '../config/ViewConfigurations';
import { RenderingRuleConfig, DEFAULT_RENDERING_RULES } from '../core/RenderingRules';
import ViewManager from './ViewManager';

/**
 * ConfigurationService
 * Provides centralized access to all configuration values through a unified API
 */
export class ConfigurationService {
  private static instance: ConfigurationService;
  private renderingConfig: RenderingRuleConfig;
  private viewManager: ViewManager;

  /**
   * Get singleton instance of ConfigurationService
   */
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Private constructor to enforce singleton
   */
  private constructor() {
    this.renderingConfig = { ...DEFAULT_RENDERING_RULES };
    this.viewManager = ViewManager.getInstance();
  }
  
  /**
   * Set current view type
   */
  public setViewType(viewId: ViewId): void {
    // Update ViewManager instead of keeping our own state
    this.viewManager.setViewType(viewId);
  }
  
  /**
   * Get current view type
   */
  public getViewType(): ViewId {
    return this.viewManager.getViewType();
  }
  
  /**
   * Get view configuration for current view
   */
  public getViewConfiguration(): ViewConfiguration {
    return getViewConfiguration(this.getViewType());
  }
  
  /**
   * Get specific view configuration
   */
  public getViewConfigurationById(viewId: ViewId): ViewConfiguration {
    return getViewConfiguration(viewId);
  }
  
  /**
   * Check if current view is market view
   */
  public isMarketView(): boolean {
    return this.viewManager.isMarketView();
  }
  
  /**
   * Get data source key for current view
   */
  public getDataSourceKey(): 'flows_markets' | 'flows_brands' {
    return this.isMarketView() ? 'flows_markets' : 'flows_brands';
  }
  
  /**
   * Get flow configuration values
   */
  public getFlowConfig() {
    return CONFIG.flow;
  }
  
  /**
   * Get bubble configuration values
   */
  public getBubbleConfig() {
    return CONFIG.bubble;
  }
  
  /**
   * Get visualization configuration values
   */
  public getVisualizationConfig() {
    return CONFIG.visualization;
  }
  
  /**
   * Get color configuration values
   */
  public getColorConfig() {
    return CONFIG.colors;
  }
  
  /**
   * Get flow colors
   */
  public getFlowColors() {
    return CONFIG.colors.flow;
  }
  
  /**
   * Get bubble colors
   */
  public getBubbleColors() {
    return CONFIG.colors.bubble;
  }
  
  /**
   * Get default flow type for current view
   */
  public getDefaultFlowType() {
    return this.getViewConfiguration().defaultFlowType;
  }
  
  /**
   * Get supported flow types for current view
   */
  public getSupportedFlowTypes() {
    return this.getViewConfiguration().supportedFlowTypes;
  }
  
  /**
   * Check if flow type is supported for current view
   */
  public isFlowTypeSupported(flowType: string): boolean {
    return this.getViewConfiguration().supportedFlowTypes.includes(flowType as any);
  }
  
  /**
   * Get rendering rules configuration
   */
  public getRenderingConfig(): RenderingRuleConfig {
    return this.renderingConfig;
  }
  
  /**
   * Update rendering rules configuration
   */
  public updateRenderingConfig(config: Partial<RenderingRuleConfig>): void {
    this.renderingConfig = { ...this.renderingConfig, ...config };
  }
}

export default ConfigurationService;
