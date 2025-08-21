'use client';

import React, { useState, useEffect } from 'react';
import { AppError, ProcessingProgress } from '../utils/types';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface LoadingIndicatorProps {
  progress?: ProcessingProgress;
  message?: string;
  showProgress?: boolean;
  className?: string;
}

interface ToastNotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

/**
 * Enhanced error display component with retry functionality
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'camera_permission':
      case 'camera_not_supported':
        return '📷';
      case 'network_error':
      case 'api_unavailable':
        return '🌐';
      case 'ocr_failure':
      case 'ocr_low_confidence':
        return '👁️';
      case 'processing_timeout':
        return '⏱️';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = (retryable: boolean) => {
    return retryable 
      ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
      : 'border-red-200 bg-red-50 text-red-800';
  };

  const getSuggestions = (type: string): string[] => {
    switch (type) {
      case 'ocr_failure':
      case 'ocr_low_confidence':
        return [
          'Ensure good lighting',
          'Hold camera steady',
          'Get closer to the label',
          'Clean camera lens'
        ];
      case 'camera_permission':
        return [
          'Click "Allow" when prompted',
          'Check browser settings',
          'Try refreshing the page'
        ];
      case 'network_error':
        return [
          'Check internet connection',
          'Try again in a moment',
          'Switch to mobile data'
        ];
      case 'api_unavailable':
        return [
          'Service will resume shortly',
          'Using cached data when possible',
          'Try again later'
        ];
      default:
        return ['Try again', 'Refresh the page if issue persists'];
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getErrorColor(error.retryable)} ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">
          {getErrorIcon(error.type)}
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              {error.retryable ? 'Temporary Issue' : 'Error'}
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <p className="text-sm mb-3">
            {error.message}
          </p>
          
          {error.details && (
            <details className="mb-3">
              <summary className="text-xs cursor-pointer hover:underline">
                Technical details
              </summary>
              <p className="text-xs mt-1 font-mono bg-white bg-opacity-50 p-2 rounded">
                {error.details}
              </p>
            </details>
          )}
          
          <div className="mb-3">
            <p className="text-xs font-medium mb-1">Suggestions:</p>
            <ul className="text-xs space-y-1">
              {getSuggestions(error.type).map((suggestion, index) => (
                <li key={index} className="flex items-center space-x-1">
                  <span className="text-gray-400">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex space-x-2">
            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded text-xs font-medium transition-all duration-200 shadow-sm"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-white bg-opacity-60 hover:bg-opacity-80 rounded text-xs font-medium transition-all duration-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced loading indicator with progress tracking
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  progress,
  message = 'Loading...',
  showProgress = true,
  className = ''
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const getStageIcon = (stage?: string) => {
    switch (stage) {
      case 'ocr': return '🔍';
      case 'ingredient_lookup': return '📚';
      case 'health_calculation': return '⚖️';
      case 'complete': return '✅';
      default: return '⏳';
    }
  };

  const getStageMessage = (stage?: string) => {
    switch (stage) {
      case 'ocr': return 'Reading label text';
      case 'ingredient_lookup': return 'Looking up ingredients';
      case 'health_calculation': return 'Calculating health score';
      case 'complete': return 'Analysis complete';
      default: return message;
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Main spinner */}
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg">
            {getStageIcon(progress?.stage)}
          </span>
        </div>
      </div>
      
      {/* Progress message */}
      <div className="text-center">
        <p className="font-medium text-gray-800">
          {getStageMessage(progress?.stage)}{dots}
        </p>
        
        {progress?.timeElapsed && (
          <p className="text-sm text-gray-500 mt-1">
            {(progress.timeElapsed / 1000).toFixed(1)}s elapsed
          </p>
        )}
      </div>
      
      {/* Progress bar */}
      {showProgress && progress && (
        <div className="w-full max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress.progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{Math.round(progress.progress)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Toast notification component
 */
export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  duration = 4000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className={`
        rounded-lg border p-4 shadow-lg
        ${getToastStyles(type)}
      `}>
        <div className="flex items-start space-x-3">
          <span className="flex-shrink-0 text-lg">
            {getToastIcon(type)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Retry button component with countdown
 */
interface RetryButtonProps {
  onRetry: () => void;
  disabled?: boolean;
  cooldownSeconds?: number;
  className?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  disabled = false,
  cooldownSeconds = 0,
  className = ''
}) => {
  const [countdown, setCountdown] = useState(cooldownSeconds);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isDisabled = disabled || countdown > 0;

  return (
    <button
      onClick={onRetry}
      disabled={isDisabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
        }
        ${className}
      `}
    >
      {countdown > 0 ? `Retry in ${countdown}s` : 'Try Again'}
    </button>
  );
};