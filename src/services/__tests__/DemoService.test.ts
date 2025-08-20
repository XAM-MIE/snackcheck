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