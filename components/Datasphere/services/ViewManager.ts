import { ViewId } from '../config/ViewConfigurations';

/**
 * ViewManager service
 * Provides centralized management for view state and type
 */
export class ViewManager {
  private static instance: ViewManager;
  private viewType: ViewId = 'brands';
  
  /**
   * Get singleton instance of ViewManager
   */
  public static getInstance(): ViewManager {
    if (!ViewManager.instance) {
      ViewManager.instance = new ViewManager();
    }
    return ViewManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton
   */
  private constructor() {}
  
  /**
   * Get the current view type
   * @returns The current view type (markets or brands)
   */
  public getViewType(): ViewId {
    return this.viewType;
  }
  
  /**
   * Set the current view type
   * @param viewType The view type to set
   */
  public setViewType(viewType: ViewId): void {
    this.viewType = viewType;
  }
  
  /**
   * Check if the current view is market view
   * @returns True if the current view is market view, false otherwise
   */
  public isMarketView(): boolean {
    return this.viewType === 'markets';
  }
  
  /**
   * Check if the current view is brand view
   * @returns True if the current view is brand view, false otherwise
   */
  public isBrandView(): boolean {
    return this.viewType === 'brands';
  }
  
  /**
   * Get the data source key for the current view
   * @returns The data source key (flows_markets or flows_brands)
   */
  public getDataSourceKey(): 'flows_markets' | 'flows_brands' {
    return this.isMarketView() ? 'flows_markets' : 'flows_brands';
  }
}

export default ViewManager;
