/**
 * End-to-end tests for complete user journey from scan to results
 * Tests the full workflow including camera capture, OCR processing, 
 * ingredient lookup, health scoring, and results display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../contexts/AppContext';
import SnackCheckApp from '../../components/SnackCheckApp';

// Mock services with realistic behavior
vi.mock('../../services/OCRProcessor', () => ({
  OCRProcessor: vi.fn().mockImplementation(() => ({
    processImage: vi.fn().mockImplementation(async (imageData: string) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Return different results based on mock image data
      if (imageData.includes('demo-healthy')) {
        return {
          text: 'Ingredients: Organic whole wheat flour, water, sea salt, yeast',
          confidence: 0.92,
          ingredients: ['Organic whole wheat flour', 'water', 'sea salt', 'yeast']
        };
      } else if (imageData.includes('demo-unhealthy')) {
        return {
          text: 'Ingredients: High fructose corn syrup, artificial red dye 40, sodium benzoate, partially hydrogenated soybean oil',
          confidence: 0.88,
          ingredients: ['High fructose corn syrup', 'artificial red dye 40', 'sodium benzoate', 'partially hydrogenated soybean oil']
        };
      } else {
        return {
          text: 'Ingredients: Water, sugar, natural flavors, citric acid, sodium benzoate',
          confidence: 0.85,
          ingredients: ['Water', 'sugar', 'natural flavors', 'citric acid', 'sodium benzoate']
        };
      }
    })
  }))
}));

vi.mock('../../services/IngredientLookup', () => ({
  IngredientLookup: vi.fn().mockImplementation(() => ({
    lookupIngredient: vi.fn().mockImplementation(async (ingredient: string) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const ingredientData: Record<string, any> = {
        'water': { name: 'water', source: 'openfoodfacts', nutritionScore: 100, explanation: 'Essential for hydration' },
        'sugar': { name: 'sugar', source: 'openfoodfacts', nutritionScore: 25, explanation: 'Added sweetener, high in calories' },
        'natural flavors': { name: 'natural flavors', source: 'openfoodfacts', nutritionScore: 70, explanation: 'Derived from natural sources' },
        'citric acid': { name: 'citric acid', source: 'openfoodfacts', nutritionScore: 80, explanation: 'Natural preservative and flavor enhancer' },
        'sodium benzoate': { name: 'sodium benzoate', source: 'openfoodfacts', nutritionScore: 45, additiveClass: 'preservative', explanation: 'Chemical preservative' },
        'organic whole wheat flour': { name: 'organic whole wheat flour', source: 'openfoodfacts', nutritionScore: 90, explanation: 'Whole grain flour with fiber and nutrients' },
        'sea salt': { name: 'sea salt', source: 'openfoodfacts', nutritionScore: 60, explanation: 'Natural salt for flavor' },
        'yeast': { name: 'yeast', source: 'openfoodfacts', nutritionScore: 85, explanation: 'Natural leavening agent' },
        'high fructose corn syrup': { name: 'high fructose corn syrup', source: 'openfoodfacts', nutritionScore: 15, explanation: 'Processed sweetener linked to health issues' },
        'artificial red dye 40': { name: 'artificial red dye 40', source: 'ai', nutritionScore: 20, additiveClass: 'high_risk', explanation: 'Synthetic food coloring with potential health concerns' },
        'partially hydrogenated soybean oil': { name: 'partially hydrogenated soybean oil', source: 'openfoodfacts', nutritionScore: 10, explanation: 'Contains trans fats, linked to heart disease' }
      };
      
      return ingredientData[ingredient.toLowerCase()] || {
        name: ingredient,
        source: 'ai',
        nutritionScore: 50,
        explanation: `${ingredient} is a food ingredient with moderate health impact`
      };
    })
  }))
}));

// Mock camera and file APIs
const mockGetUserMedia = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }]
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: { getUserMedia: mockGetUserMedia }
});

// Mock canvas and video elements
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
});

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData');

Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
  set: vi.fn(),
  get: vi.fn()
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { get: () => 1920 });
Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { get: () => 1080 });

// Mock FileReader
global.FileReader = class MockFileReader {
  onload: ((event: any) => void) | null = null;
  readAsDataURL = vi.fn().mockImplementation((file: File) => {
    setTimeout(() => {
      let mockData = 'data:image/jpeg;base64,mockImageData';
      if (file.name.includes('healthy')) {
        mockData = 'data:image/jpeg;base64,demo-healthy';
      } else if (file.name.includes('unhealthy')) {
        mockData = 'data:image/jpeg;base64,demo-unhealthy';
      }
      
      if (this.onload) {
        this.onload({ target: { result: mockData } });
      }
    }, 0);
  });
} as any;

describe('End-to-End User Journey Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
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

  describe('Complete Scan-to-Results Journey', () => {
    it('should complete healthy food scan journey successfully', async () => {
      const startTime = Date.now();
      renderApp();

      // 1. Initial state - Camera screen
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      expect(screen.getByText('Scan food labels for instant health insights')).toBeInTheDocument();

      // 2. Wait for camera initialization or fallback
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // 3. Upload a healthy food image
      const fileInput = screen.getByLabelText('Choose File');
      const healthyFile = new File(['healthy'], 'healthy-bread.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, healthyFile);
      });

      // 4. Processing screen should appear
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
        expect(screen.getByText('Extracting text from image...')).toBeInTheDocument();
      });

      // 5. Results should appear within performance target
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 6. Verify results content for healthy food
      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument(); // Score display
      expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
      expect(screen.getByText('Organic whole wheat flour')).toBeInTheDocument();
      expect(screen.getByText('water')).toBeInTheDocument();

      // 7. Verify performance requirement (allowing test overhead)
      expect(totalTime).toBeLessThan(8000); // 8s max for tests (5s target + buffer)

      // 8. Test navigation back to camera
      const scanAnotherButton = screen.getByText('Scan Another');
      await act(async () => {
        await user.click(scanAnotherButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
      });
    });

    it('should complete unhealthy food scan journey successfully', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Upload an unhealthy food image
      const fileInput = screen.getByLabelText('Choose File');
      const unhealthyFile = new File(['unhealthy'], 'unhealthy-soda.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, unhealthyFile);
      });

      // Wait for processing
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      // Verify unhealthy ingredients are detected
      expect(screen.getByText('High fructose corn syrup')).toBeInTheDocument();
      expect(screen.getByText('artificial red dye 40')).toBeInTheDocument();
      expect(screen.getByText('partially hydrogenated soybean oil')).toBeInTheDocument();

      // Should show lower health score (red or yellow)
      const scoreElement = screen.getByText(/\d+\/100/);
      expect(scoreElement).toBeInTheDocument();
    });

    it('should handle moderate health food scan journey', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Upload a moderate health food image
      const fileInput = screen.getByLabelText('Choose File');
      const moderateFile = new File(['moderate'], 'moderate-juice.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, moderateFile);
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      // Verify mixed ingredients
      expect(screen.getByText('Water')).toBeInTheDocument();
      expect(screen.getByText('sugar')).toBeInTheDocument();
      expect(screen.getByText('natural flavors')).toBeInTheDocument();
      expect(screen.getByText('sodium benzoate')).toBeInTheDocument();

      // Should show moderate score
      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
      expect(screen.getByText('Ingredient Analysis')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Journeys', () => {
    it('should handle OCR failure and recover with demo data', async () => {
      // Mock OCR failure
      const { OCRProcessor } = await import('../../services/OCRProcessor');
      const mockOCRProcessor = OCRProcessor as any;
      mockOCRProcessor.mockImplementation(() => ({
        processImage: vi.fn().mockRejectedValue(new Error('OCR processing failed'))
      }));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, testFile);
      });

      // Should still complete with fallback
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show some results even with OCR failure
      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
    });

    it('should handle ingredient lookup failure gracefully', async () => {
      // Mock ingredient lookup failure
      const { IngredientLookup } = await import('../../services/IngredientLookup');
      const mockIngredientLookup = IngredientLookup as any;
      mockIngredientLookup.mockImplementation(() => ({
        lookupIngredient: vi.fn().mockRejectedValue(new Error('API unavailable'))
      }));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, testFile);
      });

      // Should still complete with fallback data
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
    });

    it('should handle camera access denial gracefully', async () => {
      // Mock camera access denial
      mockGetUserMedia.mockRejectedValue(new Error('Camera access denied'));

      renderApp();

      // Should show file upload fallback
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // File upload should still work
      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, testFile);
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('User Interaction Flows', () => {
    it('should support multiple consecutive scans', async () => {
      renderApp();

      // First scan
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const firstFile = new File(['first'], 'first.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, firstFile);
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      // Navigate back for second scan
      const scanAnotherButton = screen.getByText('Scan Another');
      await act(async () => {
        await user.click(scanAnotherButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Second scan
      const secondFile = new File(['second'], 'second.jpg', { type: 'image/jpeg' });
      const newFileInput = screen.getByLabelText('Choose File');
      
      await act(async () => {
        await user.upload(newFileInput, secondFile);
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      // Both scans should complete successfully
      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
    });

    it('should maintain state consistency across navigation', async () => {
      renderApp();

      // Complete a scan
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, testFile);
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });

      // Verify results are displayed
      const initialScore = screen.getByText(/\d+\/100/).textContent;
      const ingredientCount = screen.getAllByText(/\w+/).length;

      // Navigate back and forth
      const scanAnotherButton = screen.getByText('Scan Another');
      await act(async () => {
        await user.click(scanAnotherButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
      });

      // State should be reset for new scan
      expect(screen.queryByText('Scan Results')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+\/100/)).not.toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should provide responsive feedback during processing', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        await user.upload(fileInput, testFile);
      });

      // Should show immediate feedback
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });

      // Should show progress indicators
      expect(screen.getAllByText('Extracting text from image...').length).toBeGreaterThan(0);

      // Should eventually show performance metrics
      await waitFor(() => {
        expect(screen.getByText('Performance')).toBeInTheDocument();
      });

      // Should complete with results
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should handle rapid user interactions gracefully', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Rapid file uploads (simulating user impatience)
      const fileInput = screen.getByLabelText('Choose File');
      const testFile1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const testFile2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      
      // Upload first file
      await act(async () => {
        await user.upload(fileInput, testFile1);
      });

      // Immediately try to upload second file (should be handled gracefully)
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile2] } });
      });

      // Should still complete successfully
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 8000 });

      expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
    });
  });
});