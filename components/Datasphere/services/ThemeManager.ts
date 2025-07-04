/**
 * ThemeManager service
 * Provides centralized theme state management and utilities
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private isDarkTheme: boolean = false;
  private themeChangeListeners: ((isDark: boolean) => void)[] = [];
  
  /**
   * Get singleton instance of ThemeManager
   */
  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton
   */
  private constructor() {
    // Initialize theme based on system preference or saved setting
    this.detectSystemTheme();
    
    // Set up theme change observer
    this.setupThemeChangeObserver();
  }
  
  /**
   * Detect system theme preference
   */
  private detectSystemTheme(): void {
    if (typeof window !== 'undefined') {
      // Check for theme class on document
      this.isDarkTheme = document.documentElement.classList.contains('dark');
      
      // Or use system preference as fallback
      if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
        this.isDarkTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
      }
    }
  }
  
  /**
   * Set up observer for theme changes
   */
  private setupThemeChangeObserver(): void {
    if (typeof window !== 'undefined' && 'MutationObserver' in window) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const newIsDarkTheme = document.documentElement.classList.contains('dark');
            if (newIsDarkTheme !== this.isDarkTheme) {
              this.isDarkTheme = newIsDarkTheme;
              this.notifyThemeChangeListeners();
            }
          }
        });
      });
      
      // Start observing theme changes
      observer.observe(document.documentElement, { 
        attributes: true,
        attributeFilter: ['class'] 
      });
    }
  }
  
  /**
   * Check if dark theme is active
   */
  public isDark(): boolean {
    return this.isDarkTheme;
  }
  
  /**
   * Set theme explicitly
   */
  public setTheme(isDark: boolean): void {
    if (this.isDarkTheme === isDark) return;
    
    this.isDarkTheme = isDark;
    
    // Update DOM to reflect theme change
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
    
    this.notifyThemeChangeListeners();
  }
  
  /**
   * Toggle between light and dark theme
   */
  public toggleTheme(): void {
    this.setTheme(!this.isDarkTheme);
  }
  
  /**
   * Get color value based on current theme
   */
  public getThemedColor(lightColor: string, darkColor: string): string {
    return this.isDarkTheme ? darkColor : lightColor;
  }
  
  /**
   * Subscribe to theme changes
   */
  public onThemeChange(listener: (isDark: boolean) => void): () => void {
    this.themeChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.themeChangeListeners = this.themeChangeListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all theme change listeners
   */
  private notifyThemeChangeListeners(): void {
    this.themeChangeListeners.forEach(listener => {
      try {
        listener(this.isDarkTheme);
      } catch (error) {
        console.error('Error in theme change listener:', error);
      }
    });
  }
}

export default ThemeManager;
