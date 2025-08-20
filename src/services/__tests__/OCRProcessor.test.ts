import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OCRProcessor } from '../OCRProcessor';

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(() => Promise.resolve({
    recognize: vi.fn(),
    terminate: vi.fn()
  }))
}));

describe('OCRProcessor', () => {
  let ocrProcessor: OCRProcessor;
  let mockWorker: any;

  beforeEach(async () => {
    const { createWorker } = await import('tesseract.js');
    mockWorker = {
      recognize: vi.fn(),
      terminate: vi.fn()
    };
    vi.mocked(createWorker).mockResolvedValue(mockWorker);
    ocrProcessor = new OCRProcessor();
  });

  afterEach(async () => {
    await ocrProcessor.cleanup();
    vi.clearAllMocks();
  });

  describe('processImage', () => {
    it('should successfully process an image and extract ingredients', async () => {
      const mockOCRData = {
        text: 'INGREDIENTS: Whole grain oats, sugar, salt, natural flavor, vitamin E',
        confidence: 92
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      expect(result.text).toBe(mockOCRData.text);
      expect(result.confidence).toBe(92);
      expect(result.ingredients).toEqual([
        'whole grain oats',
        'sugar', 
        'salt',
        'natural flavor',
        'vitamin e'
      ]);
    });

    it('should handle OCR text with different ingredient patterns', async () => {
      const mockOCRData = {
        text: 'Contains: Almonds, dates, cocoa powder, vanilla extract.',
        confidence: 88
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      expect(result.ingredients).toEqual([
        'almonds',
        'dates',
        'cocoa powder', 
        'vanilla extract'
      ]);
    });

    it('should handle complex ingredient lists with parentheses', async () => {
      const mockOCRData = {
        text: 'INGREDIENTS: Enriched wheat flour (wheat flour, niacin, reduced iron), vegetable oil, salt',
        confidence: 85
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      expect(result.ingredients).toContain('enriched wheat flour');
      expect(result.ingredients).toContain('vegetable oil');
      expect(result.ingredients).toContain('salt');
      expect(result.ingredients).toContain('niacin');
      expect(result.ingredients).toContain('reduced iron');
    });

    it('should filter out OCR artifacts and short words', async () => {
      const mockOCRData = {
        text: 'INGREDIENTS: Sugar, 123, @@, a, salt, natural flavor',
        confidence: 75
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      expect(result.ingredients).toEqual([
        'sugar',
        'salt',
        'natural flavor'
      ]);
      expect(result.ingredients).not.toContain('123');
      expect(result.ingredients).not.toContain('@@');
      expect(result.ingredients).not.toContain('a');
    });

    it('should handle text without clear ingredient patterns', async () => {
      const mockOCRData = {
        text: 'This product contains wheat, milk, and soy ingredients for your enjoyment.',
        confidence: 80
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      // The parser should find the sentence with commas and extract ingredients
      expect(result.ingredients).toEqual([
        'wheat',
        'milk',
        'and soy ingredients for your enjoyment'
      ]);
    });

    it('should return empty ingredients array for text without commas', async () => {
      const mockOCRData = {
        text: 'This is just some random text without ingredients',
        confidence: 90
      };

      mockWorker.recognize.mockResolvedValue({ data: mockOCRData });

      const result = await ocrProcessor.processImage('mock-image-data');

      expect(result.ingredients).toEqual([]);
    });

    it('should handle OCR errors gracefully', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('OCR failed'));

      await expect(ocrProcessor.processImage('invalid-image')).rejects.toThrow('Failed to process image with OCR');
    });

    it('should handle worker initialization failure', async () => {
      const { createWorker } = await import('tesseract.js');
      vi.mocked(createWorker).mockRejectedValue(new Error('Worker init failed'));

      const newProcessor = new OCRProcessor();
      await expect(newProcessor.processImage('test-image')).rejects.toThrow('OCR initialization failed');
    });
  });

  describe('cleanup', () => {
    it('should terminate the worker when cleanup is called', async () => {
      // Initialize by processing an image
      mockWorker.recognize.mockResolvedValue({ 
        data: { text: 'test', confidence: 90 } 
      });
      await ocrProcessor.processImage('test-image');

      await ocrProcessor.cleanup();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle cleanup when worker is not initialized', async () => {
      // Should not throw error
      await expect(ocrProcessor.cleanup()).resolves.not.toThrow();
    });
  });

  describe('getDemoImages', () => {
    it('should return array of demo images with expected structure', () => {
      const demoImages = OCRProcessor.getDemoImages();

      expect(Array.isArray(demoImages)).toBe(true);
      expect(demoImages.length).toBeGreaterThan(0);

      demoImages.forEach(image => {
        expect(image).toHaveProperty('name');
        expect(image).toHaveProperty('path');
        expect(image).toHaveProperty('expectedIngredients');
        expect(Array.isArray(image.expectedIngredients)).toBe(true);
        expect(typeof image.name).toBe('string');
        expect(typeof image.path).toBe('string');
      });
    });

    it('should include expected demo images', () => {
      const demoImages = OCRProcessor.getDemoImages();
      const imageNames = demoImages.map(img => img.name);

      expect(imageNames).toContain('Cereal Box');
      expect(imageNames).toContain('Snack Bar');
      expect(imageNames).toContain('Yogurt Cup');
    });
  });
});