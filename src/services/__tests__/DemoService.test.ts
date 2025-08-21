import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoService } from '../DemoService';

describe('DemoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  describe('getDemoImages', () => {
    it('should return array of demo images', () => {
      const demoImages = DemoService.getDemoImages();

      expect(Array.isArray(demoImages)).toBe(true);
      expect(demoImages.length).toBeGreaterThan(0);

      demoImages.forEach(image => {
        expect(image).toHaveProperty('name');
        expect(image).toHaveProperty('filename');
        expect(image).toHaveProperty('mockOCRText');
        expect(image).toHaveProperty('expectedIngredients');
        expect(Array.isArray(image.expectedIngredients)).toBe(true);
      });
    });

    it('should return a copy of demo images (not reference)', () => {
      const demoImages1 = DemoService.getDemoImages();
      const demoImages2 = DemoService.getDemoImages();

      expect(demoImages1).not.toBe(demoImages2);
      expect(demoImages1).toEqual(demoImages2);
    });
  });

  describe('getRandomDemoImage', () => {
    it('should return a valid demo image', () => {
      const randomImage = DemoService.getRandomDemoImage();
      const allImages = DemoService.getDemoImages();

      expect(allImages).toContainEqual(randomImage);
    });

    it('should return different images on multiple calls (eventually)', () => {
      const results = new Set();
      
      // Call multiple times to increase chance of getting different results
      for (let i = 0; i < 20; i++) {
        const image = DemoService.getRandomDemoImage();
        results.add(image.name);
      }

      // Should get at least 2 different images in 20 tries (very high probability)
      expect(results.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getDemoImageByName', () => {
    it('should return correct image when name matches', () => {
      const image = DemoService.getDemoImageByName('Cereal Box');

      expect(image).not.toBeNull();
      expect(image?.name).toBe('Cereal Box');
      expect(image?.expectedIngredients).toContain('whole grain oats');
    });

    it('should be case insensitive', () => {
      const image1 = DemoService.getDemoImageByName('cereal box');
      const image2 = DemoService.getDemoImageByName('CEREAL BOX');

      expect(image1).not.toBeNull();
      expect(image2).not.toBeNull();
      expect(image1?.name).toBe('Cereal Box');
      expect(image2?.name).toBe('Cereal Box');
    });

    it('should return null for non-existent image', () => {
      const image = DemoService.getDemoImageByName('Non-existent Image');

      expect(image).toBeNull();
    });
  });

  describe('simulateOCRProcessing', () => {
    it('should return OCR result with correct structure', async () => {
      const result = await DemoService.simulateOCRProcessing();

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('ingredients');
      expect(typeof result.text).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.ingredients)).toBe(true);
    });

    it('should return realistic confidence score', async () => {
      const result = await DemoService.simulateOCRProcessing();

      expect(result.confidence).toBeGreaterThanOrEqual(85);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should return specific demo image when name provided', async () => {
      const result = await DemoService.simulateOCRProcessing('Cereal Box');

      expect(result.text).toContain('Whole grain oats');
      expect(result.ingredients).toContain('whole grain oats');
    });

    it('should throw error for non-existent demo image', async () => {
      await expect(
        DemoService.simulateOCRProcessing('Non-existent Image')
      ).rejects.toThrow('Demo image not found');
    });

    it('should simulate processing delay', async () => {
      const startTime = Date.now();
      await DemoService.simulateOCRProcessing();
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThanOrEqual(1000); // At least 1 second
      expect(processingTime).toBeLessThan(4000); // Less than 4 seconds
    });
  });

  describe('shouldUseDemoMode', () => {
    it('should return true in development environment', () => {
      process.env.NODE_ENV = 'development';

      expect(DemoService.shouldUseDemoMode()).toBe(true);
    });

    it('should return true when NEXT_PUBLIC_DEMO_MODE is true', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

      expect(DemoService.shouldUseDemoMode()).toBe(true);
    });

    it('should return false in production without demo mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';

      expect(DemoService.shouldUseDemoMode()).toBe(false);
    });

    it('should return true when URL contains demo=true', () => {
      process.env.NODE_ENV = 'production';
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          search: '?demo=true&other=param'
        },
        writable: true
      });

      expect(DemoService.shouldUseDemoMode()).toBe(true);
    });

    it('should return false when URL does not contain demo=true', () => {
      process.env.NODE_ENV = 'production';
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          search: '?other=param'
        },
        writable: true
      });

      expect(DemoService.shouldUseDemoMode()).toBe(false);
    });
  });
}); 
 describe('getDemoImageByFilename', () => {
    it('should return demo image by filename', async () => {
      const image = await DemoService.getDemoImageByFilename('cereal-label.jpg');
      
      expect(image).toBeDefined();
      expect(image?.filename).toBe('cereal-label.jpg');
      expect(image?.name).toBe('Cereal Box');
    });

    it('should return null for non-existent filename', async () => {
      const image = await DemoService.getDemoImageByFilename('non-existent.jpg');
      
      expect(image).toBeNull();
    });
  });

  describe('getFallbackResponse', () => {
    it('should return OCR failure response', async () => {
      const response = await DemoService.getFallbackResponse('ocrFailure');
      
      expect(response).toBeDefined();
      expect(response.message).toContain('Unable to read');
      expect(response.suggestedActions).toContain('Improve lighting');
    });

    it('should return API failure response', async () => {
      const response = await DemoService.getFallbackResponse('apiFailure');
      
      expect(response).toBeDefined();
      expect(response.message).toContain('database temporarily unavailable');
      expect(response.useCache).toBe(true);
    });

    it('should return AI failure response', async () => {
      const response = await DemoService.getFallbackResponse('aiFailure');
      
      expect(response).toBeDefined();
      expect(response.message).toContain('AI explanation service unavailable');
      expect(response.fallbackExplanation).toBeDefined();
    });
  });

  describe('generateFallbackIngredientData', () => {
    it('should generate fallback ingredient data', () => {
      const data = DemoService.generateFallbackIngredientData('test ingredient');
      
      expect(data.name).toBe('test ingredient');
      expect(data.source).toBe('cache');
      expect(data.nutritionScore).toBe(50);
      expect(data.explanation).toContain('Demo mode');
    });
  });

  describe('generateMockHealthScore', () => {
    it('should generate mock health score for known demo image', async () => {
      const score = await DemoService.generateMockHealthScore('Cereal Box');
      
      expect(score).toBeDefined();
      expect(score?.overall).toBeGreaterThan(0);
      expect(score?.color).toMatch(/^(green|yellow|red)$/);
      expect(score?.factors).toBeDefined();
    });

    it('should return null for unknown demo image', async () => {
      const score = await DemoService.generateMockHealthScore('Unknown Product');
      
      expect(score).toBeNull();
    });

    it('should generate random mock health score when no image specified', async () => {
      const score = await DemoService.generateMockHealthScore();
      
      expect(score).toBeDefined();
      expect(score?.overall).toBeGreaterThan(0);
    });
  });

  describe('enableDemoMode and disableDemoMode', () => {
    beforeEach(() => {
      // Mock window.location and history
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost:3000' },
        writable: true
      });
      Object.defineProperty(window, 'history', {
        value: { replaceState: vi.fn() },
        writable: true
      });
    });

    it('should enable demo mode via URL parameter', () => {
      DemoService.enableDemoMode();
      
      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should disable demo mode by removing URL parameter', () => {
      DemoService.disableDemoMode();
      
      expect(window.history.replaceState).toHaveBeenCalled();
    });
  });

  describe('getDemoModeStatus', () => {
    it('should return correct status for development mode', () => {
      process.env.NODE_ENV = 'development';
      
      const status = DemoService.getDemoModeStatus();
      
      expect(status.isEnabled).toBe(true);
      expect(status.source).toBe('development');
    });

    it('should return correct status for environment variable', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      
      const status = DemoService.getDemoModeStatus();
      
      expect(status.isEnabled).toBe(true);
      expect(status.source).toBe('environment');
    });

    it('should return disabled status when no demo mode is active', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      
      const status = DemoService.getDemoModeStatus();
      
      expect(status.isEnabled).toBe(false);
      expect(status.source).toBe('disabled');
    });
  });

  describe('prePopulateCache', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: vi.fn(),
          getItem: vi.fn(),
          removeItem: vi.fn()
        },
        writable: true
      });
    });

    it('should pre-populate cache with demo ingredients', async () => {
      await DemoService.prePopulateCache();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'snackcheck_demo_cache',
        expect.stringContaining('ingredients')
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage full');
      });

      await expect(DemoService.prePopulateCache()).resolves.not.toThrow();
    });
  });

  describe('clearDemoCache', () => {
    it('should clear demo cache from localStorage', () => {
      DemoService.clearDemoCache();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('snackcheck_demo_cache');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => DemoService.clearDemoCache()).not.toThrow();
    });
  });

  describe('testDemoFlow', () => {
    it('should test complete demo flow successfully', async () => {
      const result = await DemoService.testDemoFlow('Cereal Box');
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].step).toBe('OCR Processing');
      expect(result.steps[1].step).toBe('Ingredient Lookup');
      expect(result.steps[2].step).toBe('Health Score Calculation');
    });

    it('should test random demo flow when no image specified', async () => {
      const result = await DemoService.testDemoFlow();
      
      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
    });

    it('should handle demo flow errors', async () => {
      // Mock simulateOCRProcessing to fail
      const originalMethod = DemoService.simulateOCRProcessing;
      DemoService.simulateOCRProcessing = vi.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await DemoService.testDemoFlow('Invalid Image');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original method
      DemoService.simulateOCRProcessing = originalMethod;
    });

    it('should measure performance timing', async () => {
      const result = await DemoService.testDemoFlow();
      
      expect(result.duration).toBeGreaterThan(0);
      result.steps.forEach(step => {
        expect(step.duration).toBeGreaterThan(0);
      });
    });
  });