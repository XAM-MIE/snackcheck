import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IngredientLookup } from '../IngredientLookup';
import { IngredientData } from '../../utils/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('IngredientLookup', () => {
  let ingredientLookup: IngredientLookup;

  beforeEach(() => {
    vi.clearAllMocks();
    ingredientLookup = new IngredientLookup();
  });

  afterEach(() => {
    ingredientLookup.clearCache();
  });

  describe('constructor', () => {
    it('should initialize with common ingredients cache', () => {
      const stats = ingredientLookup.getCacheStats();
      
      expect(stats.commonIngredients).toBe(51); // Top 51 common ingredients
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('lookupIngredient', () => {
    it('should return cached common ingredient', async () => {
      const result = await ingredientLookup.lookupIngredient('water');

      expect(result).toEqual({
        name: 'water',
        source: 'cache',
        nutritionScore: 100,
        explanation: 'Essential for hydration'
      });
    });

    it('should be case insensitive for common ingredients', async () => {
      const result1 = await ingredientLookup.lookupIngredient('WATER');
      const result2 = await ingredientLookup.lookupIngredient('Water');
      const result3 = await ingredientLookup.lookupIngredient('water');

      expect(result1.name).toBe('water');
      expect(result2.name).toBe('water');
      expect(result3.name).toBe('water');
    });

    it('should handle whitespace in ingredient names', async () => {
      const result = await ingredientLookup.lookupIngredient('  sugar  ');

      expect(result.name).toBe('sugar');
      expect(result.source).toBe('cache');
    });

    it('should query OpenFoodFacts for unknown ingredients', async () => {
      const mockResponse = {
        products: [{
          nutrition_grades: 'b',
          additives_tags: [],
        }]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await ingredientLookup.lookupIngredient('unknown-ingredient');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('unknown-ingredient'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'SnackCheck/1.0 (https://snackcheck.app)'
          })
        })
      );
      expect(result.source).toBe('openfoodfacts');
      expect(result.nutritionScore).toBe(75); // Grade B = 75
    });

    it('should correctly parse nutrition grades', async () => {
      const testCases = [
        { grade: 'a', expectedScore: 90 },
        { grade: 'b', expectedScore: 75 },
        { grade: 'c', expectedScore: 60 },
        { grade: 'd', expectedScore: 40 },
        { grade: 'e', expectedScore: 20 }
      ];

      for (const testCase of testCases) {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            products: [{
              nutrition_grades: testCase.grade,
              additives_tags: []
            }]
          })
        });

        const result = await ingredientLookup.lookupIngredient(`test-${testCase.grade}`);
        expect(result.nutritionScore).toBe(testCase.expectedScore);
      }
    });

    it('should identify and cap additives scores', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          products: [{
            nutrition_grades: 'a', // Would normally be 90
            additives_tags: ['en:e100', 'en:e200']
          }]
        })
      });

      const result = await ingredientLookup.lookupIngredient('additive-ingredient');
      expect(result.additiveClass).toBe('additive');
      expect(result.nutritionScore).toBe(60); // Capped at 60 for additives
    });

    it('should fallback to AI when OpenFoodFacts returns no results', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ products: [] })
      });

      const result = await ingredientLookup.lookupIngredient('rare-ingredient');
      expect(result.source).toBe('ai');
    });

    it('should handle OpenFoodFacts API errors gracefully', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await ingredientLookup.lookupIngredient('network-fail-ingredient');
      // Should fallback to AI explanation
      expect(result.source).toBe('ai');
    });

    it('should handle malformed OpenFoodFacts responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      const result = await ingredientLookup.lookupIngredient('malformed-response-test');
      // Should fallback to AI
      expect(result.source).toBe('ai');
    });

    it('should handle JSON parsing errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await ingredientLookup.lookupIngredient('json-error-test');
      // Should fallback to AI
      expect(result.source).toBe('ai');
    });

    it('should handle network timeouts gracefully', async () => {
      (fetch as any).mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      const result = await ingredientLookup.lookupIngredient('timeout-test');
      // Should fallback to AI
      expect(result.source).toBe('ai');
    });

    it('should provide fallback data when all services fail', async () => {
      // Mock fetch to fail
      (fetch as any).mockRejectedValue(new Error('Network error'));
      
      // Mock AI explanation to fail by overriding the private method
      const originalGetAIExplanation = (ingredientLookup as any).getAIExplanation;
      (ingredientLookup as any).getAIExplanation = vi.fn().mockRejectedValue(new Error('AI service down'));

      const result = await ingredientLookup.lookupIngredient('total-fail-ingredient');
      
      expect(result).toEqual({
        name: 'total-fail-ingredient',
        source: 'cache',
        nutritionScore: 50,
        explanation: 'Unknown ingredient - unable to provide detailed information'
      });

      // Restore original method
      (ingredientLookup as any).getAIExplanation = originalGetAIExplanation;
    });
  });

  describe('AI explanation', () => {
    it('should generate explanations for vitamin ingredients', async () => {
      const result = await ingredientLookup.lookupIngredient('vitamin-d-test');
      expect(result.source).toBe('ai');
      expect(result.explanation).toContain('nutritional supplement');
      expect(result.nutritionScore).toBe(85);
    });

    it('should generate explanations for natural extracts', async () => {
      const result = await ingredientLookup.lookupIngredient('natural-extract-test');
      expect(result.source).toBe('ai');
      expect(result.explanation).toContain('natural flavoring');
      expect(result.nutritionScore).toBe(70);
    });

    it('should generate explanations for sweeteners', async () => {
      const result = await ingredientLookup.lookupIngredient('corn-syrup-test');
      expect(result.source).toBe('ai');
      expect(result.explanation).toContain('sweetening agent');
      expect(result.nutritionScore).toBe(35);
    });

    it('should generate explanations for coloring agents', async () => {
      const result = await ingredientLookup.lookupIngredient('red-color-test');
      expect(result.source).toBe('ai');
      expect(result.explanation).toContain('coloring agent');
      expect(result.nutritionScore).toBe(40);
    });

    it('should generate explanations for preservatives', async () => {
      const result = await ingredientLookup.lookupIngredient('citric-acid-test');
      expect(result.source).toBe('ai');
      expect(result.explanation).toContain('preservative');
      expect(result.nutritionScore).toBe(60);
    });
  });

  describe('batch lookup', () => {
    it('should handle mixed known and unknown ingredients', async () => {
      const ingredients = ['water', 'sugar', 'unknown-ingredient'];
      
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ products: [] })
      });

      const results = await ingredientLookup.lookupIngredients(ingredients);
      
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('water');
      expect(results[0].source).toBe('cache'); // water is cached
      expect(results[1].name).toBe('sugar');
      expect(results[1].source).toBe('cache'); // sugar is cached
      expect(results[2].name).toBe('unknown-ingredient');
      // Should fallback to AI since no OpenFoodFacts results
    });

    it('should handle multiple ingredients efficiently', async () => {
      const healthyIngredients = ['water', 'vitamin c', 'blueberry', 'salmon'];
      const unhealthyIngredients = ['corn syrup', 'sugar'];

      const results = await ingredientLookup.lookupIngredients([...healthyIngredients, ...unhealthyIngredients]);

      // Check that healthy ingredients have higher scores
      for (const ingredient of healthyIngredients) {
        const result = results.find(r => r.name === ingredient);
        expect(result?.nutritionScore).toBeGreaterThan(70);
      }

      // Check that unhealthy ingredients have lower scores  
      for (const ingredient of unhealthyIngredients) {
        const result = results.find(r => r.name === ingredient);
        expect(result?.nutritionScore).toBeLessThan(50);
      }
    });

    it('should include all expected common ingredients', async () => {
      const expectedIngredients = [
        'water', 'sugar', 'salt', 'wheat flour', 'vegetable oil',
        'milk', 'eggs', 'natural flavor', 'citric acid', 'vitamin c'
      ];

      for (const ingredient of expectedIngredients) {
        const result = await ingredientLookup.lookupIngredient(ingredient);
        expect(result.source).toBe('cache');
        expect(result.explanation).toBeTruthy();
        expect(typeof result.nutritionScore).toBe('number');
      }
    });
  });

  describe('cache statistics', () => {
    it('should provide accurate cache statistics', () => {
      const stats = ingredientLookup.getCacheStats();
      
      expect(typeof stats.commonIngredients).toBe('number');
      expect(typeof stats.totalEntries).toBe('number');
      expect(stats.commonIngredients).toBe(51);
    });

    it('should clear cache properly', () => {
      const statsBefore = ingredientLookup.getCacheStats();
      expect(statsBefore.commonIngredients).toBe(51);

      ingredientLookup.clearCache();
      
      const statsAfter = ingredientLookup.getCacheStats();
      expect(statsAfter.commonIngredients).toBe(51); // Common ingredients restored
    });

    it('should cache lookup results for reuse', async () => {
      // First lookup should make API call
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          products: [{
            nutrition_grades: 'a',
            additives_tags: []
          }]
        })
      });

      const result1 = await ingredientLookup.lookupIngredient('cache-test-ingredient');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second lookup should use cached result
      const result2 = await ingredientLookup.lookupIngredient('cache-test-ingredient');
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call

      expect(result1).toEqual(result2);
    });
  });
});