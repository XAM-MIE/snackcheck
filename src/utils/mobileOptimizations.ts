/**
 * Mobile-specific performance optimizations
 */

export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  supportsWebP: boolean;
  supportsServiceWorker: boolean;
  memoryLimit: number;
  connectionType: string;
}

export class MobileOptimizer {
  private static deviceCapabilities: DeviceCapabilities | null = null;

  /**
   * Detect device capabilities for optimization decisions
   */
  static getDeviceCapabilities(): DeviceCapabilities {
    if (this.deviceCapabilities) {
      return this.deviceCapabilities;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Detect low-end devices
    const isLowEnd = this.detectLowEndDevice();

    // Check WebP support
    const supportsWebP = this.checkWebPSupport();

    // Check Service Worker support
    const supportsServiceWorker = 'serviceWorker' in navigator;

    // Estimate memory limit
    const memoryLimit = this.estimateMemoryLimit();

    // Get connection type
    const connectionType = this.getConnectionType();

    this.deviceCapabilities = {
      isMobile,
      isLowEnd,
      supportsWebP,
      supportsServiceWorker,
      memoryLimit,
      connectionType,
    };

    return this.deviceCapabilities;
  }

  /**
   * Detect low-end devices based on various factors
   */
  private static detectLowEndDevice(): boolean {
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 1;
    if (cores <= 2) return true;

    // Check memory if available
    if ('memory' in navigator) {
      const memory = (navigator as { memory?: number }).memory;
      if (memory && memory < 2) return true; // Less than 2GB RAM
    }

    // Check device pixel ratio (high DPR can indicate performance issues)
    if (window.devicePixelRatio > 2) return true;

    // Check user agent for known low-end devices
    const lowEndPatterns = [
      /Android.*4\.[0-4]/i, // Old Android versions
      /iPhone.*OS [5-9]_/i, // Old iOS versions
      /Windows Phone/i,
    ];

    return lowEndPatterns.some(pattern => pattern.test(navigator.userAgent));
  }

  /**
   * Check WebP support
   */
  private static checkWebPSupport(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Estimate device memory limit
   */
  private static estimateMemoryLimit(): number {
    if ('memory' in navigator) {
      return (navigator as { memory?: number }).memory || 4;
    }

    // Fallback estimation based on device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    return isMobile ? 2 : 4; // Conservative estimates
  }

  /**
   * Get connection type for optimization decisions
   */
  private static getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as { connection?: { effectiveType?: string } }).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get optimized image settings based on device capabilities
   */
  static getOptimizedImageSettings(): {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'jpeg' | 'webp';
  } {
    const capabilities = this.getDeviceCapabilities();

    if (capabilities.isLowEnd) {
      return {
        maxWidth: 800,
        maxHeight: 1000,
        quality: 0.7,
        format: capabilities.supportsWebP ? 'webp' : 'jpeg',
      };
    }

    return {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.85,
      format: capabilities.supportsWebP ? 'webp' : 'jpeg',
    };
  }

  /**
   * Get optimized processing settings
   */
  static getOptimizedProcessingSettings(): {
    ocrTimeout: number;
    apiTimeout: number;
    maxConcurrentRequests: number;
    enableImagePreprocessing: boolean;
  } {
    const capabilities = this.getDeviceCapabilities();

    if (capabilities.isLowEnd) {
      return {
        ocrTimeout: 30000, // Longer timeout for slower devices
        apiTimeout: 8000,
        maxConcurrentRequests: 2,
        enableImagePreprocessing: false, // Skip preprocessing on low-end devices
      };
    }

    return {
      ocrTimeout: 20000,
      apiTimeout: 5000,
      maxConcurrentRequests: 5,
      enableImagePreprocessing: true,
    };
  }

  /**
   * Optimize for battery life
   */
  static optimizeForBattery(): {
    reduceAnimations: boolean;
    lowerFrameRate: boolean;
    disableBackgroundProcessing: boolean;
  } {
    // Check battery API if available
    if ('getBattery' in navigator) {
      (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean }> })
        .getBattery?.()
        .then(battery => {
          if (battery.level < 0.2 && !battery.charging) {
            return {
              reduceAnimations: true,
              lowerFrameRate: true,
              disableBackgroundProcessing: true,
            };
          }
        });
    }

    const capabilities = this.getDeviceCapabilities();
    
    return {
      reduceAnimations: capabilities.isLowEnd,
      lowerFrameRate: capabilities.isLowEnd,
      disableBackgroundProcessing: capabilities.connectionType === 'slow-2g',
    };
  }

  /**
   * Preload critical resources based on device capabilities
   */
  static preloadCriticalResources(): void {
    const capabilities = this.getDeviceCapabilities();

    if (!capabilities.isLowEnd && capabilities.connectionType !== 'slow-2g') {
      // Preload Tesseract.js worker on capable devices
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/node_modules/tesseract.js/dist/worker.min.js';
      document.head.appendChild(link);

      // Preload common ingredient data
      if (capabilities.supportsServiceWorker) {
        navigator.serviceWorker.ready.then(registration => {
          registration.active?.postMessage({
            type: 'PRELOAD_INGREDIENTS',
            ingredients: [
              'water', 'sugar', 'salt', 'wheat flour', 'vegetable oil',
              'milk', 'eggs', 'natural flavor', 'citric acid', 'vitamin c'
            ]
          });
        });
      }
    }
  }

  /**
   * Monitor performance and adjust settings dynamically
   */
  static startPerformanceMonitoring(): () => void {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const monitorFrame = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Adjust settings based on FPS
        if (fps < 30) {
          console.warn('Low FPS detected, reducing visual effects');
          document.body.classList.add('low-performance');
        } else if (fps > 50) {
          document.body.classList.remove('low-performance');
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(monitorFrame);
    };

    animationId = requestAnimationFrame(monitorFrame);

    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Handle memory pressure
   */
  static handleMemoryPressure(): void {
    // Clear caches if memory usage is high
    if ('memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (memory) {
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        
        if (usage > 0.8) {
          console.warn('High memory usage detected, clearing caches');
          
          // Clear image caches
          const images = document.querySelectorAll('img');
          images.forEach(img => {
            if (img.src.startsWith('data:')) {
              img.src = '';
            }
          });

          // Clear service worker caches
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.active?.postMessage({ type: 'CLEAR_CACHE' });
            });
          }

          // Force garbage collection if available
          if ('gc' in window) {
            (window as { gc?: () => void }).gc?.();
          }
        }
      }
    }
  }

  /**
   * Optimize touch interactions for mobile
   */
  static optimizeTouchInteractions(): void {
    // Add touch-action CSS for better scrolling performance
    const style = document.createElement('style');
    style.textContent = `
      .touch-optimized {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      
      .scroll-optimized {
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
      }
      
      .low-performance * {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(style);

    // Apply optimizations to interactive elements
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, [role="button"]');
    interactiveElements.forEach(element => {
      element.classList.add('touch-optimized');
    });

    const scrollableElements = document.querySelectorAll('[style*="overflow"], .overflow-auto, .overflow-scroll');
    scrollableElements.forEach(element => {
      element.classList.add('scroll-optimized');
    });
  }
}

/**
 * Initialize mobile optimizations
 */
export function initializeMobileOptimizations(): () => void {
  const capabilities = MobileOptimizer.getDeviceCapabilities();
  
  console.log('Device capabilities:', capabilities);

  // Apply optimizations
  MobileOptimizer.preloadCriticalResources();
  MobileOptimizer.optimizeTouchInteractions();

  // Start performance monitoring
  const stopMonitoring = MobileOptimizer.startPerformanceMonitoring();

  // Handle memory pressure periodically
  const memoryCheckInterval = setInterval(() => {
    MobileOptimizer.handleMemoryPressure();
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => {
    stopMonitoring();
    clearInterval(memoryCheckInterval);
  };
}