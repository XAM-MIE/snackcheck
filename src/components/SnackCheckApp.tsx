'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import CameraCapture from './CameraCapture';
import ProcessingScreen from './ProcessingScreen';
import ResultsDisplay from './ResultsDisplay';
import { ErrorDisplay, ToastNotification } from './UserFeedback';
import { 
  OCRProcessor, 
  IngredientLookup, 
  HealthScoreCalculator,
  DemoService 
} from '../services';
import { OCRResult, IngredientData, HealthScore, ProcessingProgress } from '../utils/types';
import { SnackCheckError, ErrorReporter } from '../utils/errorHandling';
import { PerformanceMonitor, MemoryManager } from '../utils/performance';

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SnackCheck Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-red-600 mb-4">
              We encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main app component
const SnackCheckApp: React.FC = () => {
  const {
    state,
    startProcessing,
    completeOCR,
    completeAnalysis,
    setError,
    resetSession,
    clearError,
    getProcessingTime,
  } = useApp();

  // Enhanced state for error handling and progress tracking
  const [currentError, setCurrentError] = useState<SnackCheckError | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Initialize services (memoized to prevent recreation on every render)
  const ocrProcessor = useMemo(() => new OCRProcessor(), []);
  const ingredientLookup = useMemo(() => new IngredientLookup(), []);
  const healthCalculator = useMemo(() => new HealthScoreCalculator(), []);

  // Enhanced image capture handler with comprehensive error handling
  const handleImageCapture = useCallback(async (imageData: string) => {
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.startTiming('scanToResult');
    
    try {
      clearError();
      setCurrentError(null);
      setRetryCount(0);
      startProcessing(imageData);

      // Step 1: OCR Processing
      setProcessingProgress({
        stage: 'ocr',
        progress: 10,
        message: 'Extracting text from image...',
        timeElapsed: getProcessingTime()
      });

      let ocrResult: OCRResult;
      try {
        ocrResult = await ocrProcessor.processImage(imageData);
        
        setProcessingProgress({
          stage: 'ocr',
          progress: 30,
          message: 'Text extraction complete',
          timeElapsed: getProcessingTime()
        });
        
        completeOCR(ocrResult);
      } catch (ocrError) {
        console.error('OCR failed:', ocrError);
        
        if (ocrError instanceof SnackCheckError) {
          // For retryable OCR errors, try demo fallback
          if (ocrError.retryable) {
            console.warn('OCR failed, using demo fallback');
            setToastMessage({
              message: 'Using demo data due to image processing issues',
              type: 'warning'
            });
            ocrResult = await DemoService.simulateOCRProcessing();
            completeOCR(ocrResult);
          } else {
            throw ocrError;
          }
        } else {
          // Unexpected error, use demo fallback
          console.warn('Unexpected OCR error, using demo fallback');
          ocrResult = await DemoService.simulateOCRProcessing();
          completeOCR(ocrResult);
        }
      }

      // Step 2: Ingredient Lookup
      setProcessingProgress({
        stage: 'ingredient_lookup',
        progress: 50,
        message: 'Looking up ingredient information...',
        timeElapsed: getProcessingTime()
      });

      performanceMonitor.startTiming('ingredientLookupBatch');
      const ingredientPromises = ocrResult.ingredients.map(async (ingredient, index) => {
        try {
          const result = await ingredientLookup.lookupIngredient(ingredient);
          
          // Update progress for each ingredient
          const progressIncrement = 30 / ocrResult.ingredients.length;
          setProcessingProgress(prev => prev ? {
            ...prev,
            progress: Math.min(50 + (index + 1) * progressIncrement, 80),
            message: `Analyzed ${index + 1}/${ocrResult.ingredients.length} ingredients`
          } : null);
          
          return result;
        } catch (error) {
          console.error(`Failed to lookup ingredient ${ingredient}:`, error);
          
          // Return fallback ingredient data
          return {
            name: ingredient,
            source: 'cache' as const,
            nutritionScore: 50,
            explanation: 'Unable to retrieve detailed information for this ingredient due to lookup failure.',
          };
        }
      });

      const ingredients: IngredientData[] = await Promise.all(ingredientPromises);
      performanceMonitor.endTiming('ingredientLookupBatch');

      // Step 3: Health Score Calculation
      setProcessingProgress({
        stage: 'health_calculation',
        progress: 90,
        message: 'Calculating health score...',
        timeElapsed: getProcessingTime()
      });

      const healthScore: HealthScore = healthCalculator.calculateScore(ingredients);

      // Complete the analysis
      setProcessingProgress({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete!',
        timeElapsed: getProcessingTime()
      });

      completeAnalysis(ingredients, healthScore);

      // Performance check and feedback
      const totalTime = performanceMonitor.endTiming('scanToResult');
      const memoryUsage = performanceMonitor.getMemoryUsage();
      
      if (totalTime > 5000) {
        console.warn(`Processing took ${totalTime.toFixed(2)}ms, exceeding 5s target`);
        setToastMessage({
          message: `Analysis completed in ${(totalTime / 1000).toFixed(1)}s (slower than target)`,
          type: 'warning'
        });
      } else {
        setToastMessage({
          message: `Analysis completed in ${(totalTime / 1000).toFixed(1)}s`,
          type: 'success'
        });
      }

      // Log performance metrics
      console.log('Performance Report:', performanceMonitor.generateReport());
      
      if (memoryUsage && memoryUsage.percentage > 80) {
        console.warn('High memory usage detected:', memoryUsage);
        MemoryManager.cleanup();
      }

      setProcessingProgress(null);

    } catch (error) {
      console.error('Processing error:', error);
      
      let snackCheckError: SnackCheckError;
      
      if (error instanceof SnackCheckError) {
        snackCheckError = error;
      } else {
        snackCheckError = new SnackCheckError(
          'unknown_error',
          'An unexpected error occurred during processing',
          error instanceof Error ? error.message : String(error),
          true
        );
      }
      
      // Report error for analytics
      ErrorReporter.reportError(snackCheckError.toAppError());
      
      setCurrentError(snackCheckError);
      setError(snackCheckError.message);
      setProcessingProgress(null);
    }
  }, [
    clearError,
    startProcessing,
    completeOCR,
    completeAnalysis,
    setError,
    getProcessingTime,
    ocrProcessor,
    ingredientLookup,
    healthCalculator,
  ]);

  // Handle processing timeout with retry logic
  const handleProcessingTimeout = useCallback(() => {
    const timeoutError = new SnackCheckError(
      'processing_timeout',
      'Processing is taking longer than expected. This might be due to image quality or network conditions.',
      `Timeout after ${getProcessingTime()}ms`,
      true
    );
    
    setCurrentError(timeoutError);
    setError(timeoutError.message);
    ErrorReporter.reportError(timeoutError.toAppError());
  }, [setError, getProcessingTime]);

  // Retry functionality
  const handleRetry = useCallback(() => {
    if (!state.currentSession?.imageData) {
      resetSession();
      return;
    }

    setRetryCount(prev => prev + 1);
    setCurrentError(null);
    clearError();
    
    // Add a small delay before retry to prevent rapid retries
    setTimeout(() => {
      handleImageCapture(state.currentSession!.imageData);
    }, 1000);
  }, [state.currentSession?.imageData, resetSession, clearError, handleImageCapture]);

  // Enhanced error dismissal
  const handleErrorDismiss = useCallback(() => {
    setCurrentError(null);
    clearError();
  }, [clearError]);

  // Handle sharing results
  const handleShare = useCallback(async () => {
    if (!state.currentSession) return;

    const { healthScore, ingredients } = state.currentSession;
    const shareText = `SnackCheck Results: ${healthScore.overall}/100 (${healthScore.color.toUpperCase()}) - Analyzed ${ingredients.length} ingredients`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SnackCheck Results',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing or sharing failed
        console.log('Sharing cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        // Could show a toast notification here
        console.log('Results copied to clipboard');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }, [state.currentSession]);

  // Performance monitoring
  useEffect(() => {
    if (state.currentSession?.processingTime) {
      const time = state.currentSession.processingTime;
      
      // Log performance metrics
      console.log(`Scan completed in ${time}ms`);
      
      // Track performance for analytics (if implemented)
      if (typeof window !== 'undefined' && 'gtag' in window) {
        const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
        gtag?.('event', 'scan_completed', {
          processing_time: time,
          performance_category: time < 3000 ? 'excellent' : time < 5000 ? 'good' : 'slow',
        });
      }
    }
  }, [state.currentSession?.processingTime]);

  // Error handling for app-level errors
  const handleAppError = useCallback((error: Error) => {
    setError(`Application error: ${error.message}`);
  }, [setError]);

  // Render current screen based on app state
  const renderCurrentScreen = () => {
    switch (state.currentScreen) {
      case 'camera':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            {/* Header */}
            <div className="p-4 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                SnackCheck
              </h1>
              <p className="text-gray-600">
                Scan food labels for instant health insights
              </p>
            </div>

            {/* Camera section */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <CameraCapture
                  onImageCapture={handleImageCapture}
                  isProcessing={state.isProcessing}
                />
                
                {/* Instructions */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    📱 Position the ingredient list in the frame
                  </p>
                  <p className="text-xs text-gray-500">
                    Make sure the text is clear and well-lit for best results
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced error display */}
            {currentError && (
              <div className="p-4">
                <div className="max-w-md mx-auto">
                  <ErrorDisplay
                    error={currentError.toAppError()}
                    onRetry={currentError.retryable ? handleRetry : undefined}
                    onDismiss={handleErrorDismiss}
                  />
                  
                  {retryCount > 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500">
                        Retry attempt: {retryCount}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <ProcessingScreen
            processingTime={getProcessingTime()}
            onTimeout={handleProcessingTimeout}
            progress={processingProgress}
          />
        );

      case 'results':
        if (!state.currentSession) {
          // Fallback if no session data
          resetSession();
          return null;
        }

        return (
          <ResultsDisplay
            score={state.currentSession.healthScore}
            ingredients={state.currentSession.ingredients}
            onNewScan={resetSession}
            onShare={handleShare}
            isLoading={state.isProcessing}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary onError={handleAppError}>
      <div className="min-h-screen">
        {renderCurrentScreen()}
        
        {/* Toast notifications */}
        {toastMessage && (
          <ToastNotification
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SnackCheckApp;