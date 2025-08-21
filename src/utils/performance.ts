/**
 * Performance monitoring and optimization utilities
 */

export interface PerformanceMetrics {
  scanToResultTime: number;
  ocrProcessingTime: number;
  ingredientLookupTime: number;
  healthCalculationTime: number;
  totalMemoryUsage?: number;
  imageSize?: number;
  cacheHitRate?: number;
}

export interface PerformanceThresholds {
  scanToResult: number; // 5000ms target
  ocrProcessing: number; // 3000ms target
  ingredientLookup: number; // 2000ms target
  healthCalculation: number; // 100ms target
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private thresholds: PerformanceThresholds = {
    scanToResult: 5000,
    ocrProcessing: 3000,
    ingredientLookup: 2000,
    healthCalculation: 100,
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a performance metric
   */
  startTiming(key: string): void {
    this.metrics.set(`${key}_start`, performance.now());
  }

  /**
   * End timing and return duration
   */
  endTiming(key: string): number {
    const startTime = this.metrics.get(`${key}_start`);
    if (!startTime) {
      console.warn(`Performance: No start time found for ${key}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.set(key, duration);
    this.metrics.delete(`${key}_start`);

    // Check against thresholds
    this.checkThreshold(key, duration);

    return duration;
  }

  /**
   * Get a recorded metric
   */
  getMetric(key: string): number | undefined {
    return this.metrics.get(key);
  }

  /**
   * Get all current metrics
   */
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      if (!key.endsWith('_start')) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Check if a metric exceeds its threshold
   */
  private checkThreshold(key: string, duration: number): void {
    const thresholdKey = key as keyof PerformanceThresholds;
    const threshold = this.thresholds[thresholdKey];

    if (threshold && duration > threshold) {
      console.warn(
        `Performance: ${key} took ${duration.toFixed(2)}ms, exceeding threshold of ${threshold}ms`
      );

      // Report to analytics if available
      this.reportPerformanceIssue(key, duration, threshold);
    }
  }

  /**
   * Report performance issues for monitoring
   */
  private reportPerformanceIssue(metric: string, actual: number, threshold: number): void {
    // Log to console for development
    console.log(`Performance Issue: ${metric}`, {
      actual: `${actual.toFixed(2)}ms`,
      threshold: `${threshold}ms`,
      overage: `${(actual - threshold).toFixed(2)}ms`,
    });

    // Send to analytics service if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
      gtag?.('event', 'performance_issue', {
        metric_name: metric,
        actual_time: Math.round(actual),
        threshold_time: threshold,
        overage_time: Math.round(actual - threshold),
      });
    }
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        };
      }
    }
    return null;
  }

  /**
   * Monitor frame rate for smooth UI performance
   */
  monitorFrameRate(callback: (fps: number) => void, duration: number = 1000): () => void {
    let frames = 0;
    let lastTime = performance.now();
    let animationId: number;

    const countFrame = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= duration) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        callback(fps);
        frames = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(countFrame);
    };

    animationId = requestAnimationFrame(countFrame);

    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    metrics: Record<string, number>;
    memory: {
      used: number;
      total: number;
      percentage: number;
    } | null;
    summary: {
      totalScanTime: number;
      meetsTarget: boolean;
      bottlenecks: string[];
    };
  } {
    const metrics = this.getAllMetrics();
    const memory = this.getMemoryUsage();
    
    const totalScanTime = metrics.scanToResult || 0;
    const meetsTarget = totalScanTime <= this.thresholds.scanToResult;
    
    const bottlenecks: string[] = [];
    Object.entries(this.thresholds).forEach(([key, threshold]) => {
      const actual = metrics[key];
      if (actual && actual > threshold) {
        bottlenecks.push(`${key}: ${actual.toFixed(2)}ms (>${threshold}ms)`);
      }
    });

    return {
      metrics,
      memory,
      summary: {
        totalScanTime,
        meetsTarget,
        bottlenecks,
      },
    };
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy loading utility for heavy components
 */
export function createLazyComponent<T extends React.ComponentType>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc);
}

/**
 * Memory cleanup utility
 */
export class MemoryManager {
  private static cleanupTasks: (() => void)[] = [];

  static addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  static cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }

  static forceGarbageCollection(): void {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window) {
      (window as { gc?: () => void }).gc?.();
    }
  }
}

// React import for lazy loading
import React from 'react';