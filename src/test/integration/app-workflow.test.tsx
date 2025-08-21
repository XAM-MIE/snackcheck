/**
 * Simplified integration tests for SnackCheck app workflow
 * Focuses on core functionality and state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppProvider } from '../../contexts/AppContext';
import SnackCheckApp from '../../components/SnackCheckApp';

// Mock the services with delayed responses to test processing states
vi.mock('../../services/OCRProcessor', () => ({
  OCRProcessor: vi.fn().mockImplementation(() => ({
    processImage: vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        text: 'Ingredients: Water, Sugar, Natural Flavors, Citric Acid',
        confidence: 0.85,
        ingredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid']
      }), 100))
    )
  }))
}));

vi.mock('../../services/IngredientLookup', () => ({
  IngredientLookup: vi.fn().mockImplementation(() => ({
    lookupIngredient: vi.fn().mockImplementation((ingredient: string) => 
      new Promise(resolve => setTimeout(() => resolve({
        name: ingredient,
        source: 'openfoodfacts' as const,
        nutritionScore: ingredient === 'Sugar' ? 1 : 4,
        explanation: `${ingredient} is commonly used in food products.`
      }), 50))
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

// Mock navigator.mediaDevices to simulate camera failure (fallback to file upload)
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
});

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

describe('SnackCheck App Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock camera failure to force file upload fallback
    mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
  });

  const renderApp = () => {
    return render(
      <AppProvider>
        <SnackCheckApp />
      </AppProvider>
    );
  };

  describe('App Initialization', () => {
    it('should render initial camera screen with file upload fallback', async () => {
      renderApp();
      
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      expect(screen.getByText('Scan food labels for instant health insights')).toBeInTheDocument();
      
      // Should show file upload fallback when camera fails
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Workflow', () => {
    it('should complete scan-to-results workflow via file upload', async () => {
      renderApp();

      // Wait for file upload option
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Simulate file upload
      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should eventually show results (may skip processing screen due to speed)
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify results content
      expect(screen.getByText('65/100')).toBeInTheDocument();
      expect(screen.getByText('Moderate Choice')).toBeInTheDocument();
      expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
    });

    it('should allow navigation back to camera from results', async () => {
      renderApp();

      // Complete a scan first
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
      }, { timeout: 5000 });

      // Click "Scan Another" button
      const scanAnotherButton = screen.getByText('Scan Another');
      
      await act(async () => {
        fireEvent.click(scanAnotherButton);
      });

      // Should return to camera screen
      await waitFor(() => {
        expect(screen.getByText('SnackCheck')).toBeInTheDocument();
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      // Mock service failure
      const { OCRProcessor } = await import('../../services/OCRProcessor');
      const mockOCRProcessor = OCRProcessor as any;
      mockOCRProcessor.mockImplementation(() => ({
        processImage: vi.fn().mockRejectedValue(new Error('Service failed'))
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

      // Should still complete with fallback (demo service)
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Performance', () => {
    it('should complete processing in reasonable time', async () => {
      const startTime = Date.now();
      
      renderApp();

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
      }, { timeout: 5000 });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time for tests
      expect(processingTime).toBeLessThan(5000);
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state throughout workflow', async () => {
      renderApp();

      // Initial state
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();

      // Trigger processing
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Final state
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
        expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify ingredient data is displayed
      expect(screen.getByText('Ingredients')).toBeInTheDocument(); // Ingredients section exists
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

      renderApp();

      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });
    });
  });
});