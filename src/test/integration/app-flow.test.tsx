/**
 * Integration tests for the complete SnackCheck application flow
 * Tests the scan-to-results workflow and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppProvider } from '../../contexts/AppContext';
import SnackCheckApp from '../../components/SnackCheckApp';

// Mock the services
vi.mock('../../services/OCRProcessor', () => ({
  OCRProcessor: vi.fn().mockImplementation(() => ({
    processImage: vi.fn().mockResolvedValue({
      text: 'Ingredients: Water, Sugar, Natural Flavors, Citric Acid',
      confidence: 0.85,
      ingredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid']
    })
  }))
}));

vi.mock('../../services/IngredientLookup', () => ({
  IngredientLookup: vi.fn().mockImplementation(() => ({
    lookupIngredient: vi.fn().mockImplementation((ingredient: string) => 
      Promise.resolve({
        name: ingredient,
        source: 'openfoodfacts' as const,
        nutritionScore: ingredient === 'Sugar' ? 1 : 4,
        explanation: `${ingredient} is commonly used in food products.`
      })
    )
  }))
}));

vi.mock('../../services/HealthScoreCalculator', () => ({
  HealthScoreCalculator: vi.fn().mockImplementation(() => ({
    calculateScore: vi.fn().mockReturnValue({
      overall: 65,
      color: 'yellow' as const,
      factors: [
        { ingredient: 'Sugar', impact: -15, reason: 'High sugar content may contribute to health issues' },
        { ingredient: 'Water', impact: 2, reason: 'Natural hydration source' },
        { ingredient: 'Natural Flavors', impact: 0, reason: 'Generally recognized as safe' },
        { ingredient: 'Citric Acid', impact: -2, reason: 'Preservative, minimal health impact' }
      ]
    })
  }))
}));

vi.mock('../../services/DemoService', () => ({
  DemoService: vi.fn().mockImplementation(() => ({
    getDemoOCRResult: vi.fn().mockResolvedValue({
      text: 'Demo ingredients text',
      confidence: 0.9,
      ingredients: ['Demo Ingredient 1', 'Demo Ingredient 2']
    })
  }))
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }]
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
});

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
  set: vi.fn(),
  get: vi.fn()
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: () => 1920
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: () => 1080
});

// Mock canvas and video elements
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
});

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData');

// Mock FileReader
global.FileReader = class MockFileReader {
  onload: ((event: any) => void) | null = null;
  readAsDataURL = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/jpeg;base64,mockImageData' } });
      }
    }, 0);
  });
} as any;

describe('SnackCheck App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful camera access
    mockGetUserMedia.mockResolvedValue(mockStream);
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

  describe('Initial App State', () => {
    it('should render the camera screen initially', async () => {
      renderApp();
      
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      expect(screen.getByText('Scan food labels for instant health insights')).toBeInTheDocument();
      expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
    });

    it('should show camera interface when supported', async () => {
      renderApp();
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        });
      });
      
      // Should show file upload as fallback in test environment
      expect(screen.getByText('Choose File')).toBeInTheDocument();
    });
  });

  describe('Complete Scan Flow', () => {
    it('should complete the full scan-to-results workflow', async () => {
      renderApp();

      // Wait for app to initialize and show file upload
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Simulate file upload
      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should show processing screen
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
        expect(screen.getByText('Extracting text from image...')).toBeInTheDocument();
      });

      // Should eventually show results
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
        expect(screen.getByText('65/100')).toBeInTheDocument();
        expect(screen.getByText('Moderate Choice')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show ingredient breakdown
      expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
      expect(screen.getByText('Water')).toBeInTheDocument();
    });

    it('should handle file upload as camera fallback', async () => {
      // Mock camera failure
      mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
      
      renderApp();

      // Should show file upload option
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Simulate file upload
      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should proceed to processing
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete processing within performance targets', async () => {
      const startTime = Date.now();
      
      renderApp();

      // Wait for file upload option
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 }); // Allow 6s for the 5s target + buffer

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (allowing for test overhead)
      expect(processingTime).toBeLessThan(8000); // 8s max for tests
    });

    it('should show performance indicators during processing', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should show processing indicators
      await waitFor(() => {
        expect(screen.getByText('Performance')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle OCR processing errors gracefully', async () => {
      // Mock OCR failure
      const { OCRProcessor } = await import('../../services/OCRProcessor');
      const mockOCRProcessor = OCRProcessor as any;
      mockOCRProcessor.mockImplementation(() => ({
        processImage: vi.fn().mockRejectedValue(new Error('OCR failed'))
      }));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should still complete with demo fallback
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle ingredient lookup failures', async () => {
      // Mock ingredient lookup failure
      const { IngredientLookup } = await import('../../services/IngredientLookup');
      const mockIngredientLookup = IngredientLookup as any;
      mockIngredientLookup.mockImplementation(() => ({
        lookupIngredient: vi.fn().mockRejectedValue(new Error('API failed'))
      }));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should still complete with fallback data
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Navigation and State Management', () => {
    it('should allow navigation back to camera from results', async () => {
      renderApp();

      // Complete a scan
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Click "Scan Another" button
      const scanAnotherButton = screen.getByText('Scan Another');
      
      await act(async () => {
        fireEvent.click(scanAnotherButton);
      });

      // Should return to camera screen
      await waitFor(() => {
        expect(screen.getByText('SnackCheck')).toBeInTheDocument();
        expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
      });
    });

    it('should maintain state consistency throughout the flow', async () => {
      renderApp();

      // Initial state should be camera
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();

      // Start processing
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Processing state
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });

      // Results state
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });

      // State should include all expected data
      expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Ingredient count
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render properly on mobile viewport', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderApp();

      // Should render mobile-optimized layout
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      
      // Should show file upload option
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });
    });
  });
});