/**
 * ArrowStyleManager service
 * Provides centralized arrow styling functionality and standardization
 * Handles the conversion between different style formats and ensures consistency
 */

import { ArrowStyle, MarkerStyle } from '../config/ArrowTypes';
import ThemeManager from './ThemeManager';
import ViewManager from './ViewManager';

export interface StandardizedArrowStyle {
  // SVG standard attributes
  stroke: string;        // Line color
  strokeWidth: number;   // Line thickness
  strokeOpacity?: number; // Line opacity
  strokeDasharray?: string; // Line dash pattern
  fill?: string;         // Fill color for markers
  animationDuration?: number; // Duration for animations
}

export class ArrowStyleManager {
  private static instance: ArrowStyleManager;
  private themeManager: ThemeManager;
  private viewManager: ViewManager;
  
  /**
   * Get singleton instance of ArrowStyleManager
   */
  public static getInstance(): ArrowStyleManager {
    if (!ArrowStyleManager.instance) {
      ArrowStyleManager.instance = new ArrowStyleManager();
    }
    return ArrowStyleManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton
   */
  private constructor() {
    this.themeManager = ThemeManager.getInstance();
    this.viewManager = ViewManager.getInstance();
  }
  
  /**
   * Convert ArrowStyle to StandardizedArrowStyle
   * Normalizes the "thickness" property to "strokeWidth"
   */
  public standardizeArrowStyle(style: ArrowStyle): StandardizedArrowStyle {
    return {
      stroke: style.color,
      strokeWidth: style.thickness,
      strokeOpacity: style.opacity,
      strokeDasharray: style.dashArray,
      animationDuration: style.animationDuration
    };
  }
  
  /**
   * Convert StandardizedArrowStyle back to ArrowStyle
   * For compatibility with existing code
   */
  public toArrowStyle(style: StandardizedArrowStyle): ArrowStyle {
    return {
      color: style.stroke,
      thickness: style.strokeWidth,
      opacity: style.strokeOpacity,
      dashArray: style.strokeDasharray,
      animationDuration: style.animationDuration
    };
  }
  
  /**
   * Convert MarkerStyle to StandardizedArrowStyle
   */
  public standardizeMarkerStyle(style: MarkerStyle): StandardizedArrowStyle {
    return {
      fill: style.color,
      stroke: style.color,
      strokeWidth: style.strokeWidth || 0
    };
  }
  
  /**
   * Get theme-aware color for arrows based on flow value
   * @param value Flow value 
   * @param viewType Current view type
   * @param flowType Current flow type
   */
  public getColorForFlowValue(value: number, viewType?: string, flowType?: string): string {
    // Get current view and theme information
    const isDark = this.themeManager.isDark();
    const currentViewType = viewType || this.viewManager.getViewType();
    
    // Base default colors
    const positiveColor = isDark ? '#4CAF50' : '#2E7D32'; // Green shades
    const negativeColor = isDark ? '#F44336' : '#C62828'; // Red shades
    const neutralColor = isDark ? '#90CAF9' : '#1976D2';  // Blue shades
    
    // Determine color based on value and potentially view/flow type
    // This can be expanded with more sophisticated color logic
    if (flowType === 'net') {
      return value > 0 ? positiveColor : (value < 0 ? negativeColor : neutralColor);
    }
    
    // Default color based on theme
    return isDark ? '#90CAF9' : '#1976D2'; // Default blue
  }
  
  /**
   * Calculate appropriate arrow thickness based on flow value
   * @param value Flow value
   * @param normalizedValue Value normalized to 0-1 range
   * @param maxThickness Maximum thickness
   */
  public calculateThickness(value: number, normalizedValue?: number, maxThickness: number = 10): number {
    const minThickness = 1;
    
    // If normalized value not provided, use absolute value with simple scaling
    const normValue = normalizedValue !== undefined ? normalizedValue : Math.min(Math.abs(value) / 100, 1);
    
    // Calculate thickness with minimum threshold
    return minThickness + (maxThickness - minThickness) * normValue;
  }
  
  /**
   * Apply standardized style to an SVG path element
   */
  public applyStyleToElement(element: SVGElement, style: StandardizedArrowStyle): void {
    // Apply standard stroke attributes
    if (style.stroke) element.setAttribute('stroke', style.stroke);
    if (style.strokeWidth) element.setAttribute('stroke-width', style.strokeWidth.toString());
    if (style.strokeOpacity !== undefined) element.setAttribute('stroke-opacity', style.strokeOpacity.toString());
    if (style.strokeDasharray) element.setAttribute('stroke-dasharray', style.strokeDasharray);
    
    // Apply fill if specified (often for markers)
    if (style.fill) element.setAttribute('fill', style.fill);
  }
}

export default ArrowStyleManager;
