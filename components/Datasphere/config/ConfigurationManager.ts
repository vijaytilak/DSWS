import { CONFIG } from '../constants/config';
import { DEFAULT_RENDERING_RULES, RenderingRuleConfig } from '../core/RenderingRules';
import { getViewConfiguration, ViewConfiguration } from './ViewConfigurations';

/**
 * Interface for application configuration
 */
export interface ApplicationConfig {
  rendering: RenderingRuleConfig;
  views: {
    [key: string]: ViewConfiguration;
  };
  bubble: {
    outerRing: {
      show: boolean;
      strokeWidth: number;
      strokeDasharray: string;
      opacity: number;
    };
    centerBubble: {
      radiusRatio: number;
    };
  };
  layout: {
    positionCircleRadius: number;
    centerX: number;
    centerY: number;
  };
  flow: {
    defaultOption: 'churn' | 'switching' | 'spend';
    defaultType: string;
  };
  colors: string[];
}

/**
 * ConfigurationManager class
 * Provides a unified interface for accessing and modifying configuration
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ApplicationConfig;
  private changeListeners: Array<(config: ApplicationConfig) => void> = [];
  
  private constructor() {
    // Initialize with default configuration
    this.config = {
      rendering: { ...DEFAULT_RENDERING_RULES },
      views: {
        markets: getViewConfiguration('markets'),
        brands: getViewConfiguration('brands')
      },
      bubble: {
        ...CONFIG.bubble,
        centerBubble: {
          radiusRatio: 0.5 // Default value if not in CONFIG
        }
      },
      layout: {
        positionCircleRadius: 300, // Default value
        centerX: 400, // Default value
        centerY: 300  // Default value
      },
      flow: {
        defaultOption: 'churn',
        defaultType: 'net'
      },
      colors: CONFIG.colors
    };
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }
  
  /**
   * Get the full configuration
   */
  getConfig(): ApplicationConfig {
    return this.config;
  }
  
  /**
   * Get rendering configuration
   */
  getRenderingConfig(): RenderingRuleConfig {
    return this.config.rendering;
  }
  
  /**
   * Update rendering configuration
   */
  updateRenderingConfig(config: Partial<RenderingRuleConfig>): void {
    this.config.rendering = { ...this.config.rendering, ...config };
  }
  
  /**
   * Get view configuration
   */
  getViewConfiguration(viewId: string): ViewConfiguration {
    return this.config.views[viewId];
  }
  
  /**
   * Get bubble configuration
   */
  getBubbleConfig(): Record<string, unknown> {
    return this.config.bubble;
  }
  
  /**
   * Update bubble configuration
   */
  updateBubbleConfig(config: Partial<Record<string, unknown>>): void {
    this.config.bubble = { ...this.config.bubble, ...config };
  }
  
  /**
   * Get layout configuration
   */
  getLayoutConfig(): Record<string, unknown> {
    return this.config.layout;
  }
  
  /**
   * Update layout configuration
   */
  updateLayoutConfig(config: Partial<Record<string, unknown>>): void {
    this.config.layout = { ...this.config.layout, ...config };
  }
  
  /**
   * Get color palette
   */
  getColors(): string[] {
    return this.config.colors;
  }
  
  /**
   * Update color palette
   */
  updateColors(colors: string[]): void {
    this.config.colors = [...colors];
  }
  
  /**
   * Get default flow option
   */
  getFlowOption(): 'churn' | 'switching' | 'spend' {
    return this.config.flow.defaultOption;
  }
  
  /**
   * Get default flow type
   */
  getFlowType(): string {
    return this.config.flow.defaultType;
  }
  
  /**
   * Update flow configuration
   */
  updateFlowConfig(option?: 'churn' | 'switching' | 'spend', type?: string): void {
    let hasChanges = false;
    if (option && this.config.flow.defaultOption !== option) {
      this.config.flow.defaultOption = option;
      hasChanges = true;
    }
    if (type && this.config.flow.defaultType !== type) {
      this.config.flow.defaultType = type;
      hasChanges = true;
    }
    if (hasChanges) {
      this.notifyListeners();
    }
  }
  
  /**
   * Get theme-specific configuration
   */
  getThemeConfig(isDarkTheme: boolean): Partial<ApplicationConfig> {
    return {
      rendering: {
        ...this.config.rendering,
        theme: isDarkTheme ? 'dark' : 'light',
        flowColors: {
          inflow: isDarkTheme ? '#4CAF50' : '#2E7D32',
          outflow: isDarkTheme ? '#F44336' : '#C62828',
          positive: isDarkTheme ? '#4CAF50' : '#2E7D32',
          negative: isDarkTheme ? '#F44336' : '#C62828',
          neutral: isDarkTheme ? '#9E9E9E' : '#616161'
        },
        bubbleColors: {
          default: isDarkTheme ? '#424242' : '#E0E0E0',
          focused: isDarkTheme ? '#2196F3' : '#1976D2',
          related: isDarkTheme ? '#90CAF9' : '#64B5F6'
        },
        labelConfig: {
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          color: isDarkTheme ? '#FFFFFF' : '#000000',
          focusedColor: isDarkTheme ? '#FFFFFF' : '#000000'
        }
      }
    };
  }
  
  /**
   * Apply theme-specific configuration
   */
  applyTheme(isDarkTheme: boolean): void {
    const themeConfig = this.getThemeConfig(isDarkTheme);
    this.updateRenderingConfig(themeConfig.rendering || {});
  }

  /**
   * Add a listener for configuration changes
   * @param listener Callback function to call when configuration changes
   */
  public onConfigChange(listener: (config: ApplicationConfig) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a listener for configuration changes
   * @param listener Callback function to remove
   */
  public removeConfigChangeListener(listener: (config: ApplicationConfig) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Clear all configuration change listeners
   */
  public clearConfigChangeListeners(): void {
    this.changeListeners = [];
  }

  /**
   * Notify all listeners of configuration change
   */
  private notifyListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error in configuration change listener:', error);
      }
    });
  }
}
