import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIService } from '../AIService';
import { AIExplanationRequest, IngredientData } from '../../utils/types';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = AIService.getInstance();
    // Clear any previous timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getIngredientExplanation', () => {
    it('should return explanation for preservative ingredients', async () => {
      const result = await aiService.getIngredientExplanation('citric acid');
      
      expect(result).toMatchObject({
        name: 'citric acid',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('preservative')
      });
      expect(result.nutritionScore).toBeGreaterThan(0);
      expect(result.nutritionScore).toBeLessThanOrEqual(100);
    });

    it('should return explanation for coloring agents', async () => {
      const result = await aiService.getIngredientExplanation('red dye 40');
      
      expect(result).toMatchObject({
        name: 'red dye 40',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('coloring')
      });
    });

    it('should return explanation for vitamins and minerals', async () => {
      const result = await aiService.getIngredientExplanation('vitamin c');
      
      expect(result).toMatchObject({
        name: 'vitamin c',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('vitamin')
      });
      expect(result.nutritionScore).toBeGreaterThan(70); // Should be high for vitamins
    });

    it('should return explanation for sweeteners', async () => {
      const result = await aiService.getIngredientExplanation('high fructose corn syrup');
      
      expect(result).toMatchObject({
        name: 'high fructose corn syrup',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('sweetening')
      });
      expect(result.nutritionScore).toBeLessThan(50); // Should be low for sweeteners
    });

    it('should return explanation for emulsifiers', async () => {
      const result = await aiService.getIngredientExplanation('soy lecithin');
      
      expect(result).toMatchObject({
        name: 'soy lecithin',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('emulsifier')
      });
    });

    it('should return explanation for natural extracts', async () => {
      const result = await aiService.getIngredientExplanation('vanilla extract');
      
      expect(result).toMatchObject({
        name: 'vanilla extract',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('extract')
      });
    });

    it('should return explanation for thickening agents', async () => {
      const result = await aiService.getIngredientExplanation('xanthan gum');
      
      expect(result).toMatchObject({
        name: 'xanthan gum',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('thickening')
      });
    });

    it('should return generic explanation for unknown ingredients', async () => {
      const result = await aiService.getIngredientExplanation('random unknown substance');
      
      expect(result).toMatchObject({
        name: 'random unknown substance',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.stringContaining('food ingredient')
      });
    });

    it('should handle context parameter correctly', async () => {
      const result = await aiService.getIngredientExplanation('test ingredient', 'food_additive');
      
      expect(result).toMatchObject({
        name: 'test ingredient',
        source: 'ai',
        nutritionScore: expect.any(Number),
        explanation: expect.any(String)
      });
    });

    it('should return fallback explanation on service failure', async () => {
      // Mock the private method to throw an error
      const originalMakeRequest = (aiService as any).makeAIRequest;
      (aiService as any).makeAIRequest = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const result = await aiService.getIngredientExplanation('test ingredient');
      
      expect(result).toMatchObject({
        name: 'test ingredient',
        source: 'ai',
        nutritionScore: 50,
        explanation: expect.stringContaining('Unable to provide detailed information')
      });

      // Restore original method
      (aiService as any).makeAIRequest = originalMakeRequest;
    });
  });

  describe('getMultipleExplanations', () => {
    it('should process multiple ingredients successfully', async () => {
      const ingredients = ['salt', 'sugar', 'vitamin c'];
      const results = await aiService.getMultipleExplanations(ingredients);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toMatchObject({
          name: ingredients[index],
          source: 'ai',
          nutritionScore: expect.any(Number),
          explanation: expect.any(String)
        });
      });
    });

    it('should handle failures gracefully in batch processing', async () => {
      // Mock one ingredient to fail
      const originalGetExplanation = aiService.getIngredientExplanation;
      aiService.getIngredientExplanation = vi.fn()
        .mockResolvedValueOnce({
          name: 'salt',
          source: 'ai',
          nutritionScore: 50,
          explanation: 'Salt explanation'
        })
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce({
          name: 'sugar',
          source: 'ai',
          nutritionScore: 30,
          explanation: 'Sugar explanation'
        });

      const ingredients = ['salt', 'failing ingredient', 'sugar'];
      const results = await aiService.getMultipleExplanations(ingredients);
      
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('salt');
      expect(results[1].explanation).toContain('Unable to provide detailed information');
      expect(results[2].name).toBe('sugar');

      // Restore original method
      aiService.getIngredientExplanation = originalGetExplanation;
    });

    it('should handle empty ingredient list', async () => {
      const results = await aiService.getMultipleExplanations([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when service is available', async () => {
      const isAvailable = await aiService.isServiceAvailable();
      expect(typeof isAvailable).toBe('boolean');
      // Since we're using simulation, it should generally be available
      expect(isAvailable).toBe(true);
    });

    it('should return false when service fails', async () => {
      // Mock the service to fail
      const originalMakeRequest = (aiService as any).makeAIRequest;
      (aiService as any).makeAIRequest = vi.fn().mockRejectedValue(new Error('Service down'));

      const isAvailable = await aiService.isServiceAvailable();
      expect(isAvailable).toBe(false);

      // Restore original method
      (aiService as any).makeAIRequest = originalMakeRequest;
    });
  });

  describe('timeout handling', () => {
    it('should handle timeout correctly', async () => {
      // Mock a slow response that exceeds timeout
      const originalCallAIService = (aiService as any).callAIService;
      (aiService as any).callAIService = vi.fn().mockRejectedValue(new Error('AI service timeout after 10000ms'));

      const result = await aiService.getIngredientExplanation('slow ingredient');
      
      // Should return fallback due to timeout
      expect(result).toMatchObject({
        name: 'slow ingredient',
        source: 'ai',
        nutritionScore: 50,
        explanation: expect.stringContaining('Unable to provide detailed information')
      });

      // Restore original method
      (aiService as any).callAIService = originalCallAIService;
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      let attemptCount = 0;
      const originalMakeRequest = (aiService as any).makeAIRequest;
      
      (aiService as any).makeAIRequest = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          explanation: 'Success after retry',
          healthImpact: 'neutral',
          commonUses: ['test']
        });
      });

      const result = await aiService.getIngredientExplanation('retry test');
      
      expect(attemptCount).toBe(2); // Should have retried once
      expect(result.explanation).toBe('Success after retry');

      // Restore original method
      (aiService as any).makeAIRequest = originalMakeRequest;
    });

    it('should give up after max retries', async () => {
      const originalMakeRequest = (aiService as any).makeAIRequest;
      (aiService as any).makeAIRequest = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const result = await aiService.getIngredientExplanation('persistent failure');
      
      // Should return fallback after all retries fail
      expect(result).toMatchObject({
        name: 'persistent failure',
        source: 'ai',
        nutritionScore: 50,
        explanation: expect.stringContaining('Unable to provide detailed information')
      });

      // Should have been called 2 times (initial + 1 retry)
      expect((aiService as any).makeAIRequest).toHaveBeenCalledTimes(2);

      // Restore original method
      (aiService as any).makeAIRequest = originalMakeRequest;
    });
  });

  describe('ingredient type detection', () => {
    it('should correctly identify preservatives', () => {
      const testCases = [
        'citric acid',
        'sodium benzoate',
        'potassium sorbate',
        'calcium sulfite',
        'sodium nitrite',
        'bht',
        'bha',
        'tbhq'
      ];

      testCases.forEach(ingredient => {
        const isPreservative = (aiService as any).isPreservative(ingredient);
        expect(isPreservative).toBe(true);
      });
    });

    it('should correctly identify coloring agents', () => {
      const testCases = [
        'red dye 40',
        'blue 1',
        'yellow 5',
        'caramel color',
        'annatto extract',
        'carmine'
      ];

      testCases.forEach(ingredient => {
        const isColoring = (aiService as any).isColoringAgent(ingredient);
        expect(isColoring).toBe(true);
      });
    });

    it('should correctly identify emulsifiers', () => {
      const testCases = [
        'soy lecithin',
        'mono and diglycerides',
        'polysorbate 80',
        'lecithin'
      ];

      testCases.forEach(ingredient => {
        const isEmulsifier = (aiService as any).isEmulsifier(ingredient);
        expect(isEmulsifier).toBe(true);
      });
    });

    it('should correctly identify vitamins and minerals', () => {
      const testCases = [
        'vitamin c',
        'vitamin d',
        'iron',
        'calcium carbonate',
        'zinc oxide',
        'folate',
        'thiamine',
        'riboflavin',
        'niacin'
      ];

      testCases.forEach(ingredient => {
        const isVitaminMineral = (aiService as any).isVitaminMineral(ingredient);
        expect(isVitaminMineral).toBe(true);
      });
    });

    it('should correctly identify sweeteners', () => {
      const testCases = [
        'high fructose corn syrup',
        'artificial sweetener',
        'aspartame',
        'sucralose',
        'stevia extract',
        'glucose syrup'
      ];

      testCases.forEach(ingredient => {
        const isSweetener = (aiService as any).isSweetener(ingredient);
        expect(isSweetener).toBe(true);
      });
    });

    it('should correctly identify natural extracts', () => {
      const testCases = [
        'vanilla extract',
        'natural flavor',
        'lemon oil',
        'mint essence'
      ];

      testCases.forEach(ingredient => {
        const isNaturalExtract = (aiService as any).isNaturalExtract(ingredient);
        expect(isNaturalExtract).toBe(true);
      });
    });

    it('should correctly identify thickeners', () => {
      const testCases = [
        'xanthan gum',
        'guar gum',
        'corn starch',
        'modified cellulose',
        'pectin',
        'agar',
        'carrageenan'
      ];

      testCases.forEach(ingredient => {
        const isThickener = (aiService as any).isThickener(ingredient);
        expect(isThickener).toBe(true);
      });
    });
  });

  describe('context determination', () => {
    it('should identify food additives correctly', () => {
      const additiveIngredients = [
        'citric acid',
        'red dye 40',
        'artificial flavor',
        'sodium benzoate preservative',
        'stabilizer'
      ];

      additiveIngredients.forEach(ingredient => {
        const context = (aiService as any).determineContext(ingredient);
        expect(context).toBe('food_additive');
      });
    });

    it('should identify natural ingredients correctly', () => {
      const naturalIngredients = [
        'salt',
        'sugar',
        'water',
        'milk',
        'eggs'
      ];

      naturalIngredients.forEach(ingredient => {
        const context = (aiService as any).determineContext(ingredient);
        expect(context).toBe('natural_ingredient');
      });
    });
  });

  describe('response validation', () => {
    it('should validate correct AI responses', () => {
      const validResponse = {
        explanation: 'This is a valid explanation',
        healthImpact: 'neutral' as const,
        commonUses: ['use1', 'use2']
      };

      const isValid = (aiService as any).isValidResponse(validResponse);
      expect(isValid).toBe(true);
    });

    it('should reject invalid AI responses', () => {
      const invalidResponses = [
        null,
        undefined,
        {},
        { explanation: 'test' }, // missing fields
        { explanation: 'test', healthImpact: 'invalid', commonUses: [] }, // invalid healthImpact
        { explanation: 'test', healthImpact: 'neutral', commonUses: 'not array' }, // invalid commonUses
        { explanation: 123, healthImpact: 'neutral', commonUses: [] } // invalid explanation type
      ];

      invalidResponses.forEach(response => {
        const isValid = (aiService as any).isValidResponse(response);
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('nutrition score calculation', () => {
    it('should assign high scores to positive health impact ingredients', () => {
      const response = {
        explanation: 'Test explanation',
        healthImpact: 'positive' as const,
        commonUses: ['test']
      };

      const result = (aiService as any).convertToIngredientData('test', response);
      expect(result.nutritionScore).toBeGreaterThanOrEqual(80);
      expect(result.nutritionScore).toBeLessThanOrEqual(95);
    });

    it('should assign low scores to negative health impact ingredients', () => {
      const response = {
        explanation: 'Test explanation',
        healthImpact: 'negative' as const,
        commonUses: ['test']
      };

      const result = (aiService as any).convertToIngredientData('test', response);
      expect(result.nutritionScore).toBeGreaterThanOrEqual(20);
      expect(result.nutritionScore).toBeLessThanOrEqual(45);
    });

    it('should assign moderate scores to neutral health impact ingredients', () => {
      const response = {
        explanation: 'Test explanation',
        healthImpact: 'neutral' as const,
        commonUses: ['test']
      };

      const result = (aiService as any).convertToIngredientData('test', response);
      expect(result.nutritionScore).toBeGreaterThanOrEqual(45);
      expect(result.nutritionScore).toBeLessThanOrEqual(70);
    });
  });
});