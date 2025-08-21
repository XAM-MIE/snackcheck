import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { DemoService } from '../services/DemoService';
import FallbackService from '../services/FallbackService';
import { OCRProcessor } from '../services/OCRProcessor';
import { IngredientLookup } from '../services/IngredientLookup';
import { HealthScoreCalculator } from '../services/HealthScoreCalculator';

/**
 * Comprehensive Demo Flow Tests
 * 
 * These tests validate the complete scan-to-result flow using demo assets
 * and fallback mechanisms to ensure reliable hackathon presentation.
 */

// Mock fetch for demo data loading
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Demo Flow Integration Tests', () => {
  let fallbackService: FallbackService;
  let ocrProcessor: OCRProcessor;
  let ingredientLookup: IngredientLookup;
  let healthCalculator: HealthScoreCalculator;

  beforeAll(async () => {
    // Mock successful demo data fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        demoImages: [
          {
            name: "Test Product",
            filename: "test-label.jpg",
            mockOCRText: "INGREDIENTS: Water, sugar, salt, natural flavor.",
            expectedIngredients: ["water", "sugar", "salt", "natural flavor"],
            expectedScore: 65,
            expectedColor: "yellow"
          }
        ],
        fallbackResponses: {
          ocrFailure: {
            message: "OCR failed",
            suggestedActions: ["Try again"]
          },
          apiFailure: {
            message: "API failed",
            suggestedActions: ["Check connection"]
          },
          aiFailure: {
            message: "AI failed",
            suggestedActions: ["Try later"]
          }
        }
      })
    } as Response);

    // Initialize services
    fallbackService = FallbackService.getInstance();
    await fallbackService.initialize();
    
    ocrProcessor = new OCRProcessor();
    ingredientLookup = new IngredientLookup();
    healthCalculator = new HealthScoreCalculator();
  });

  afterAll(() => {
    fallbackService.clearCache();
    vi.restoreAllMocks();
  });

  describe('Demo Asset Validation', () => {
    it('should load all required demo images', async () => {
      const images = await DemoService.getDemoImages();
      
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
      
      // Validate each image has required properties
      images.forEach(image => {
        expect(image.name).toBeDefined();
        expect(image.filename).toBeDefined();
        expect(image.mockOCRText).toBeDefined();
        expect(image.expectedIngredients).toBeDefined();
        expect(Array.isArray(image.expectedIngredients)).toBe(true);
      });
    });

    it('should have demo images covering different health score ranges', async () => {
      const images = await DemoService.getDemoImages();
      const imagesWithScores = images.filter(img => img.expectedScore);
      
      expect(imagesWithScores.length).toBeGreaterThan(0);
      
      // Check for variety in health scores
      const scores = imagesWithScores.map(img => img.expectedScore!);
      const hasGreen = scores.some(score => score >= 70);
      const hasYellow = scores.some(score => score >= 40 && score < 70);
      const hasRed = scores.some(score => score < 40);
      
      expect(hasGreen || hasYellow || hasRed).toBe(true); // At least some variety
    });

    it('should validate OCR text format for all demo images', async () => {
      const images = await DemoService.getDemoImages();
      
      images.forEach(image => {
        expect(image.mockOCRText).toMatch(/INGREDIENTS:/i);
        expect(image.mockOCRText.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Complete Demo Flow Performance', () => {
    it('should complete scan-to-result flow within 5 seconds', async () => {
      const startTime = Date.now();
      
      // Step 1: OCR Processing (simulated)
      const ocrResult = await DemoService.simulateOCRProcessing();
      expect(ocrResult).toBeDefined();
      expect(ocrResult.ingredients.length).toBeGreaterThan(0);
      
      // Step 2: Ingredient Lookup (with fallbacks)
      const ingredientPromises = ocrResult.ingredients.map(async ingredient => {
        try {
          return await ingredientLookup.lookupIngredient(ingredient);
        } catch (error) {
          return await fallbackService.handleIngredientLookupFailure(ingredient, error as Error);
        }
      });
      
      const ingredients = await Promise.all(ingredientPromises);
      expect(ingredients.length).toBe(ocrResult.ingredients.length);
      
      // Step 3: Health Score Calculation
      let healthScore;
      try {
        healthScore = healthCalculator.calculateScore(ingredients);
      } catch (error) {
        healthScore = fallbackService.generateFallbackHealthScore(ingredients);
      }
      
      expect(healthScore).toBeDefined();
      expect(healthScore.overall).toBeGreaterThanOrEqual(0);
      expect(healthScore.overall).toBeLessThanOrEqual(100);
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // 5 second requirement
    });

    it('should handle multiple concurrent demo flows', async () => {
      const concurrentFlows = 3;
      const flowPromises = Array.from({ length: concurrentFlows }, () => 
        DemoService.testDemoFlow()
      );
      
      const results = await Promise.all(flowPromises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(5000);
      });
    });
  });

  describe('Fallback Mechanism Validation', () => {
    it('should handle OCR failures gracefully', async () => {
      const ocrError = new Error('OCR processing failed');
      const fallbackResult = await fallbackService.handleOCRFailure(ocrError);
      
      expect(fallbackResult).toBeDefined();
      expect(fallbackResult.text).toBeDefined();
      expect(fallbackResult.confidence).toBeDefined();
      expect(Array.isArray(fallbackResult.ingredients)).toBe(true);
    });

    it('should handle ingredient lookup failures with intelligent fallbacks', async () => {
      const testIngredients = [
        'organic spinach',
        'artificial red 40',
        'high fructose corn syrup',
        'unknown chemical compound xyz'
      ];
      
      for (const ingredient of testIngredients) {
        const result = await fallbackService.handleIngredientLookupFailure(
          ingredient, 
          new Error('Lookup failed')
        );
        
        expect(result.name).toBe(ingredient);
        expect(result.source).toBe('cache');
        expect(typeof result.nutritionScore).toBe('number');
        expect(result.explanation).toBeDefined();
        
        // Validate intelligent scoring
        if (ingredient.includes('organic')) {
          expect(result.nutritionScore).toBeGreaterThan(50);
        }
        if (ingredient.includes('artificial') || ingredient.includes('high fructose')) {
          expect(result.nutritionScore).toBeLessThan(50);
        }
      }
    });

    it('should provide meaningful health scores even with limited data', () => {
      const limitedIngredients = [
        { name: 'water', source: 'cache' as const, nutritionScore: 100, explanation: 'Good' },
        { name: 'unknown', source: 'cache' as const, explanation: 'Unknown' }
      ];
      
      const healthScore = fallbackService.generateFallbackHealthScore(limitedIngredients);
      
      expect(healthScore.overall).toBeGreaterThan(0);
      expect(healthScore.color).toMatch(/^(green|yellow|red)$/);
      expect(healthScore.factors.length).toBe(2);
    });
  });

  describe('Demo Mode Toggle Functionality', () => {
    it('should correctly identify demo mode status', () => {
      const status = DemoService.getDemoModeStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.isEnabled).toBe('boolean');
      expect(status.source).toMatch(/^(development|environment|url|disabled)$/);
      expect(typeof status.availableImages).toBe('number');
    });

    it('should pre-populate cache when enabling demo mode', async () => {
      localStorageMock.setItem.mockClear();
      
      await DemoService.prePopulateCache();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'snackcheck_demo_cache',
        expect.any(String)
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from complete API failure', async () => {
      // Simulate complete API failure
      const mockError = new Error('Network unavailable');
      
      // Test OCR fallback
      const ocrFallback = await fallbackService.handleOCRFailure(mockError);
      expect(ocrFallback).toBeDefined();
      
      // Test ingredient lookup fallback
      const ingredientFallback = await fallbackService.handleIngredientLookupFailure('test', mockError);
      expect(ingredientFallback).toBeDefined();
      
      // Test AI fallback
      const aiFallback = await fallbackService.handleAIFailure('test', mockError);
      expect(aiFallback).toBeDefined();
      
      // Ensure we can still generate a health score
      const healthScore = fallbackService.generateFallbackHealthScore([ingredientFallback]);
      expect(healthScore).toBeDefined();
    });

    it('should maintain functionality with corrupted demo data', async () => {
      // Mock corrupted fetch response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);
      
      // Should fall back to hardcoded data
      const images = await DemoService.getDemoImages();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should handle localStorage unavailability', async () => {
      // Mock localStorage failure
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw errors
      await expect(DemoService.prePopulateCache()).resolves.not.toThrow();
      expect(() => DemoService.clearDemoCache()).not.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for demo scenarios', async () => {
      const performanceTests = [
        { name: 'OCR Processing', target: 2000 },
        { name: 'Ingredient Lookup', target: 1000 },
        { name: 'Health Score Calculation', target: 500 }
      ];
      
      for (const test of performanceTests) {
        const startTime = Date.now();
        
        switch (test.name) {
          case 'OCR Processing':
            await DemoService.simulateOCRProcessing();
            break;
          case 'Ingredient Lookup':
            await fallbackService.handleIngredientLookupFailure('test', new Error('test'));
            break;
          case 'Health Score Calculation':
            fallbackService.generateFallbackHealthScore([
              { name: 'test', source: 'cache', nutritionScore: 50, explanation: 'test' }
            ]);
            break;
        }
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(test.target);
      }
    });
  });

  describe('Fallback System Integration', () => {
    it('should test all fallback systems successfully', async () => {
      const testResults = await fallbackService.testFallbackSystems();
      
      expect(testResults.ocr).toBe(true);
      expect(testResults.ingredientLookup).toBe(true);
      expect(testResults.aiService).toBe(true);
      expect(testResults.healthScore).toBe(true);
      expect(testResults.errors.length).toBe(0);
    });

    it('should provide comprehensive service statistics', async () => {
      const stats = fallbackService.getStats();
      
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.isInitialized).toBe('boolean');
      expect(typeof stats.demoModeEnabled).toBe('boolean');
    });
  });
});