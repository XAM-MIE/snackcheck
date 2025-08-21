import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  SnackCheckError, 
  createErrorMessage, 
  withRetry, 
  withTimeout, 
  safeAsync,
  ErrorRecovery,
  ErrorReporter 
} from '../utils/errorHandling';
import { ErrorType } from '../utils/types';

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ErrorReporter.clearErrorHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SnackCheckError', () => {
    it('should create error with correct properties', () => {
      const error = new SnackCheckError(
        'ocr_failure',
        'Test error message',
        'Test details',
        true
      );

      expect(error.type).toBe('ocr_failure');
      expect(error.message).toBe('Test error message');
      expect(error.details).toBe('Test details');
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should convert to AppError correctly', () => {
      const error = new SnackCheckError('network_error', 'Network failed');
      const appError = error.toAppError();

      expect(appError.type).toBe('network_error');
      expect(appError.message).toBe('Network failed');
      expect(appError.retryable).toBe(false);
      expect(appError.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createErrorMessage', () => {
    it('should return correct message for each error type', () => {
      const testCases: Array<[ErrorType, string]> = [
        ['ocr_failure', 'Failed to read text from the image. Please try with a clearer photo.'],
        ['network_error', 'Network connection issue. Please check your internet and try again.'],
        ['api_timeout', 'The request is taking too long. Please check your connection and try again.'],
        ['camera_permission', 'Camera access is required to scan labels. Please allow camera permission.'],
      ];

      testCases.forEach(([type, expectedMessage]) => {
        expect(createErrorMessage(type)).toBe(expectedMessage);
      });
    });

    it('should append details when provided', () => {
      const message = createErrorMessage('ocr_failure', 'Low confidence: 25%');
      expect(message).toContain('Details: Low confidence: 25%');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockOperation, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 1
      });
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw SnackCheckError after max attempts', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        withRetry(mockOperation, {
          maxAttempts: 2,
          delayMs: 10,
          backoffMultiplier: 1
        }, 'api_timeout')
      ).rejects.toThrow(SnackCheckError);
    });

    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      await withRetry(mockOperation, {
        maxAttempts: 3,
        delayMs: 100,
        backoffMultiplier: 2
      });

      expect(delays).toEqual([100, 200]);
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes within timeout', async () => {
      const mockOperation = Promise.resolve('success');
      
      const result = await withTimeout(mockOperation, 1000);
      
      expect(result).toBe('success');
    });

    it('should reject with SnackCheckError if operation times out', async () => {
      const mockOperation = new Promise(resolve => {
        setTimeout(() => resolve('too late'), 2000);
      });
      
      await expect(
        withTimeout(mockOperation, 100, 'processing_timeout')
      ).rejects.toThrow(SnackCheckError);
    });
  });

  describe('safeAsync', () => {
    it('should return operation result on success', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await safeAsync(mockOperation, 'fallback');
      
      expect(result).toBe('success');
    });

    it('should return fallback on error', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await safeAsync(mockOperation, 'fallback');
      
      expect(result).toBe('fallback');
    });

    it('should log error to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      await safeAsync(mockOperation, 'fallback', 'network_error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Safe async operation failed (network_error):',
        expect.any(Error)
      );
    });
  });

  describe('ErrorRecovery', () => {
    beforeEach(() => {
      // Mock window and caches
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: vi.fn().mockResolvedValue(true)
      };
      
      Object.defineProperty(global, 'window', {
        value: { caches: mockCaches },
        writable: true
      });
      
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true
      });
    });

    it('should clear caches on OCR failure recovery', async () => {
      const mockCaches = global.caches;
      
      await ErrorRecovery.recoverFromOCRFailure();
      
      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
    });

    it('should check network connectivity', async () => {
      // Mock navigator.onLine
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true
      });
      
      const isOnline = await ErrorRecovery.recoverFromNetworkError();
      
      expect(isOnline).toBe(true);
    });

    it('should test network with fetch fallback', async () => {
      // Mock navigator without onLine
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });
      
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue(new Response());
      
      const isOnline = await ErrorRecovery.recoverFromNetworkError();
      
      expect(isOnline).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://www.google.com/favicon.ico',
        { mode: 'no-cors', cache: 'no-cache' }
      );
    });
  });

  describe('ErrorReporter', () => {
    it('should report and store errors', () => {
      const error = new SnackCheckError('ocr_failure', 'Test error').toAppError();
      
      ErrorReporter.reportError(error);
      
      const history = ErrorReporter.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(error);
    });

    it('should generate error statistics', () => {
      const error1 = new SnackCheckError('ocr_failure', 'Error 1').toAppError();
      const error2 = new SnackCheckError('ocr_failure', 'Error 2').toAppError();
      const error3 = new SnackCheckError('network_error', 'Error 3').toAppError();
      
      ErrorReporter.reportError(error1);
      ErrorReporter.reportError(error2);
      ErrorReporter.reportError(error3);
      
      const stats = ErrorReporter.getErrorStats();
      expect(stats.ocr_failure).toBe(2);
      expect(stats.network_error).toBe(1);
    });

    it('should clear error history', () => {
      const error = new SnackCheckError('ocr_failure', 'Test error').toAppError();
      ErrorReporter.reportError(error);
      
      expect(ErrorReporter.getErrorHistory()).toHaveLength(1);
      
      ErrorReporter.clearErrorHistory();
      
      expect(ErrorReporter.getErrorHistory()).toHaveLength(0);
    });

    it('should log errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new SnackCheckError('ocr_failure', 'Test error').toAppError();
      
      ErrorReporter.reportError(error);
      
      expect(consoleSpy).toHaveBeenCalledWith('SnackCheck Error:', error);
    });
  });
});