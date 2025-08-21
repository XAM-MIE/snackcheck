import { AppError, ErrorType, RetryConfig } from './types';

/**
 * Enhanced error handling utilities for SnackCheck
 */

export class SnackCheckError extends Error {
  public readonly type: ErrorType;
  public readonly retryable: boolean;
  public readonly details?: string;
  public readonly timestamp: Date;

  constructor(type: ErrorType, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'SnackCheckError';
    this.type = type;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = new Date();
  }

  toAppError(): AppError {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Create standardized error messages for different error types
 */
export function createErrorMessage(type: ErrorType, details?: string): string {
  const messages: Record<ErrorType, string> = {
    ocr_failure: 'Failed to read text from the image. Please try with a clearer photo.',
    ocr_low_confidence: 'The image quality is too low to read accurately. Please retake with better lighting.',
    api_timeout: 'The request is taking too long. Please check your connection and try again.',
    api_unavailable: 'The ingredient database is temporarily unavailable. Using cached data.',
    network_error: 'Network connection issue. Please check your internet and try again.',
    processing_timeout: 'Processing is taking longer than expected. This may be due to image complexity.',
    camera_permission: 'Camera access is required to scan labels. Please allow camera permission.',
    camera_not_supported: 'Camera is not supported in this browser. Please use a modern browser.',
    unknown_error: 'An unexpected error occurred. Please try again.',
  };

  let message = messages[type] || messages.unknown_error;
  if (details) {
    message += ` Details: ${details}`;
  }
  return message;
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
  errorType: ErrorType = 'unknown_error'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new SnackCheckError(
    errorType,
    createErrorMessage(errorType),
    lastError.message,
    true
  );
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorType: ErrorType = 'processing_timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new SnackCheckError(
        errorType,
        createErrorMessage(errorType),
        `Operation timed out after ${timeoutMs}ms`,
        true
      ));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorType: ErrorType = 'unknown_error'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Safe async operation failed (${errorType}):`, error);
    return fallback;
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  static async recoverFromOCRFailure(): Promise<void> {
    // Clear any cached OCR workers that might be corrupted
    if (typeof window !== 'undefined') {
      // Clear service worker cache if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
    }
  }

  static async recoverFromNetworkError(): Promise<boolean> {
    // Check if network is available
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    
    // Try a simple network test
    try {
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch {
      return false;
    }
  }

  static async recoverFromAPIFailure(apiName: string): Promise<void> {
    console.log(`Attempting recovery from ${apiName} API failure`);
    // Could implement API health checks, fallback endpoints, etc.
  }
}

/**
 * Error reporting and analytics
 */
export class ErrorReporter {
  private static errors: AppError[] = [];

  static reportError(error: AppError): void {
    this.errors.push(error);
    
    // Log to console for development
    console.error('SnackCheck Error:', error);
    
    // Could send to analytics service in production
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
      gtag?.('event', 'exception', {
        description: error.message,
        fatal: false,
        error_type: error.type,
      });
    }
  }

  static getErrorHistory(): AppError[] {
    return [...this.errors];
  }

  static clearErrorHistory(): void {
    this.errors = [];
  }

  static getErrorStats(): Record<ErrorType, number> {
    const stats: Partial<Record<ErrorType, number>> = {};
    this.errors.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });
    return stats as Record<ErrorType, number>;
  }
}