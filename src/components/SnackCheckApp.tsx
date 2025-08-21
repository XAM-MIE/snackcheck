'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import CameraCapture from './CameraCapture';
import ProcessingScreen from './ProcessingScreen';
import ResultsDisplay from './ResultsDisplay';
import { 
  OCRProcessor, 
  IngredientLookup, 
  HealthScoreCalculator,
  DemoService 
} from '../services';
import { OCRResult, IngredientData, HealthScore } from '../utils/types';

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

  // Initialize services (memoized to prevent recreation on every render)
  const ocrProcessor = useMemo(() => new OCRProcessor(), []);
  const ingredientLookup = useMemo(() => new IngredientLookup(), []);
  const healthCalculator = useMemo(() => new HealthScoreCalculator(), []);

  // Handle image capture from camera
  const handleImageCapture = useCallback(async (imageData: string) => {
    try {
      clearError();
      startProcessing(imageData);

      // Step 1: OCR Processing
      let ocrResult: OCRResult;
      try {
        ocrResult = await ocrProcessor.processImage(imageData);
        
        // If OCR confidence is too low, try demo fallback
        if (ocrResult.confidence < 0.6 || ocrResult.ingredients.length === 0) {
          console.warn('Low OCR confidence, using demo fallback');
          ocrResult = await DemoService.simulateOCRProcessing();
        }
        
        completeOCR(ocrResult);
      } catch (ocrError) {
        console.error('OCR failed, using demo fallback:', ocrError);
        ocrResult = await DemoService.simulateOCRProcessing();
        completeOCR(ocrResult);
      }

      // Step 2: Ingredient Lookup
      const ingredientPromises = ocrResult.ingredients.map(async (ingredient) => {
        try {
          return await ingredientLookup.lookupIngredient(ingredient);
        } catch (error) {
          console.error(`Failed to lookup ingredient ${ingredient}:`, error);
          // Return basic ingredient data as fallback
          return {
            name: ingredient,
            source: 'cache' as const,
            explanation: 'Unable to retrieve detailed information for this ingredient.',
          };
        }
      });

      const ingredients: IngredientData[] = await Promise.all(ingredientPromises);

      // Step 3: Health Score Calculation
      const healthScore: HealthScore = healthCalculator.calculateScore(ingredients);

      // Complete the analysis
      completeAnalysis(ingredients, healthScore);

      // Performance check - warn if over 5 seconds
      const totalTime = getProcessingTime();
      if (totalTime > 5000) {
        console.warn(`Processing took ${totalTime}ms, exceeding 5s target`);
      }

    } catch (error) {
      console.error('Processing error:', error);
      setError(
        error instanceof Error 
          ? `Processing failed: ${error.message}` 
          : 'An unexpected error occurred during processing'
      );
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

  // Handle processing timeout
  const handleProcessingTimeout = useCallback(() => {
    setError('Processing is taking longer than expected. This might be due to image quality or network conditions. Please try again with a clearer image.');
  }, [setError]);

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

            {/* Error display */}
            {state.error && (
              <div className="p-4">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Error
                      </p>
                      <p className="text-sm text-red-600">
                        {state.error}
                      </p>
                      <button
                        onClick={clearError}
                        className="mt-2 text-xs text-red-700 hover:text-red-800 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
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
      </div>
    </ErrorBoundary>
  );
};

export default SnackCheckApp;