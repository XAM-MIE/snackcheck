import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../contexts/AppContext';
import SnackCheckApp from '../components/SnackCheckApp';
import { OCRProcessor } from '../services/OCRProcessor';
import { IngredientLookup } from '../services/IngredientLookup';
import { SnackCheckError } from '../utils/errorHandling';

// Mock services
vi.mock('../services/OCRProcessor');
vi.mock('../services/IngredientLookup');
vi.mock('../services/HealthScoreCalculator');
vi.mock('../services/DemoService');

const MockedOCRProcessor = vi.mocked(OCRProcessor);
const MockedIngredientLookup = vi.mocked(IngredientLookup);

describe('Error Scenarios Integration Tests', () => {
  let mockOCRProcessor: any;
  let mockIngredientLookup: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockOCRProcessor = {
      processImage: vi.fn(),
      cleanup: vi.fn()
    };
    
    mockIngredientLookup = {
      lookupIngredient: vi.fn(),
      lookupIngredients: vi.fn()
    };

    MockedOCRProcessor.mockImplementation(() => mockOCRProcessor);
    MockedIngredientLookup.mockImplementation(() => mockIngredientLookup);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderApp = () => {
    return render(
      <AppProvider>
        <SnackCheckApp />
      </AppProvider>
    );
  };

  describe('OCR Error Scenarios', () => {
    it('should handle OCR failure with retry option', async () => {
      const ocrError = new SnackCheckError(
        'ocr_failure',
        'Failed to read text from image',
        'Low image quality',
        true
      );
      
      mockOCRProcessor.processImage.mockRejectedValue(ocrError);
      
      renderApp();
      
      // Simulate image capture
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      // Should show error with retry option
      await waitFor(() => {
        expect(screen.getByText('Failed to read text from image')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
      
      // Test retry functionality
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockOCRProcessor.processImage).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle low confidence OCR with fallback', async () => {
      const lowConfidenceError = new SnackCheckError(
        'ocr_low_confidence',
        'Image quality is too low',
        'Confidence: 25%',
        true
      );
      
      mockOCRProcessor.processImage.mockRejectedValue(lowConfidenceError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Image quality is too low')).toBeInTheDocument();
        expect(screen.getByText('Ensure good lighting')).toBeInTheDocument();
      });
    });

    it('should show processing timeout error', async () => {
      const timeoutError = new SnackCheckError(
        'processing_timeout',
        'Processing is taking too long',
        'Timeout after 30000ms',
        true
      );
      
      mockOCRProcessor.processImage.mockRejectedValue(timeoutError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Processing is taking too long')).toBeInTheDocument();
        expect(screen.getByText('⏱️')).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new SnackCheckError(
        'network_error',
        'Network connection issue',
        'Failed to fetch',
        true
      );
      
      mockOCRProcessor.processImage.mockResolvedValue({
        text: 'ingredients: sugar, salt',
        confidence: 0.8,
        ingredients: ['sugar', 'salt']
      });
      
      mockIngredientLookup.lookupIngredient.mockRejectedValue(networkError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network connection issue')).toBeInTheDocument();
        expect(screen.getByText('🌐')).toBeInTheDocument();
      });
    });

    it('should handle API unavailable errors', async () => {
      const apiError = new SnackCheckError(
        'api_unavailable',
        'Ingredient database is temporarily unavailable',
        'HTTP 503: Service Unavailable',
        true
      );
      
      mockOCRProcessor.processImage.mockResolvedValue({
        text: 'ingredients: sugar, salt',
        confidence: 0.8,
        ingredients: ['sugar', 'salt']
      });
      
      mockIngredientLookup.lookupIngredient.mockRejectedValue(apiError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Ingredient database is temporarily unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Flows', () => {
    it('should allow multiple retry attempts', async () => {
      const ocrError = new SnackCheckError(
        'ocr_failure',
        'OCR failed',
        'Test error',
        true
      );
      
      mockOCRProcessor.processImage
        .mockRejectedValueOnce(ocrError)
        .mockRejectedValueOnce(ocrError)
        .mockResolvedValue({
          text: 'ingredients: sugar',
          confidence: 0.8,
          ingredients: ['sugar']
        });
      
      mockIngredientLookup.lookupIngredient.mockResolvedValue({
        name: 'sugar',
        source: 'cache',
        nutritionScore: 30,
        explanation: 'Added sweetener'
      });
      
      renderApp();
      
      // First attempt
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('OCR failed')).toBeInTheDocument();
      });
      
      // First retry
      let retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('OCR failed')).toBeInTheDocument();
        expect(screen.getByText('Retry attempt: 1')).toBeInTheDocument();
      });
      
      // Second retry (should succeed)
      retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockOCRProcessor.processImage).toHaveBeenCalledTimes(3);
      });
    });

    it('should dismiss errors and return to camera', async () => {
      const ocrError = new SnackCheckError(
        'ocr_failure',
        'OCR failed',
        'Test error',
        true
      );
      
      mockOCRProcessor.processImage.mockRejectedValue(ocrError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('OCR failed')).toBeInTheDocument();
      });
      
      // Dismiss error
      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);
      
      await waitFor(() => {
        expect(screen.queryByText('OCR failed')).not.toBeInTheDocument();
        expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      });
    });

    it('should show toast notifications for successful recovery', async () => {
      mockOCRProcessor.processImage.mockResolvedValue({
        text: 'ingredients: sugar',
        confidence: 0.8,
        ingredients: ['sugar']
      });
      
      mockIngredientLookup.lookupIngredient.mockResolvedValue({
        name: 'sugar',
        source: 'cache',
        nutritionScore: 30,
        explanation: 'Added sweetener'
      });
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      // Should eventually show success toast
      await waitFor(() => {
        expect(screen.getByText(/Analysis completed in/)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Error Boundary', () => {
    it('should catch and display unexpected errors', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a component that throws an error
      const ThrowError = () => {
        throw new Error('Unexpected error');
      };
      
      const ErrorBoundaryTest = () => (
        <AppProvider>
          <ThrowError />
        </AppProvider>
      );
      
      render(<ErrorBoundaryTest />);
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Error Handling', () => {
    it('should warn about slow processing times', async () => {
      // Mock slow processing
      mockOCRProcessor.processImage.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            text: 'ingredients: sugar',
            confidence: 0.8,
            ingredients: ['sugar']
          }), 6000)
        )
      );
      
      mockIngredientLookup.lookupIngredient.mockResolvedValue({
        name: 'sugar',
        source: 'cache',
        nutritionScore: 30,
        explanation: 'Added sweetener'
      });
      
      vi.useFakeTimers();
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      // Fast-forward time to simulate slow processing
      vi.advanceTimersByTime(6000);
      
      await waitFor(() => {
        expect(screen.getByText(/slower than target/)).toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use demo data when OCR fails completely', async () => {
      const nonRetryableError = new SnackCheckError(
        'ocr_failure',
        'OCR initialization failed',
        'Worker creation failed',
        false
      );
      
      mockOCRProcessor.processImage.mockRejectedValue(nonRetryableError);
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('OCR initialization failed')).toBeInTheDocument();
        expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      });
    });

    it('should provide fallback ingredient data when lookup fails', async () => {
      mockOCRProcessor.processImage.mockResolvedValue({
        text: 'ingredients: unknown_ingredient',
        confidence: 0.8,
        ingredients: ['unknown_ingredient']
      });
      
      mockIngredientLookup.lookupIngredient.mockResolvedValue({
        name: 'unknown_ingredient',
        source: 'cache',
        nutritionScore: 50,
        explanation: 'Unknown ingredient - unable to provide detailed information'
      });
      
      renderApp();
      
      const captureButton = screen.getByRole('button');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Unknown ingredient')).toBeInTheDocument();
      });
    });
  });
});