import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FallbackService from '../FallbackService';
import { DemoService } from '../DemoService';
import { SnackCheckError } from '../../utils/errorHandling';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock DemoService
vi.mock('../DemoService', () => ({
  DemoService: {
    getFallbackResponse: vi.fn(),
    shouldUseDemoMode: vi.fn(),
    simulateOCRProcessing: vi.fn(),
    clearDemoCache: vi.fn(),
  }
}));

describe('FallbackService', () => {
  let fallbackService: FallbackService;

  beforeEach(() => {
    fallbackService = FallbackService.getInstance();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    fallbackService.clearCache();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = FallbackService.getInstance();
      const instance2 = FallbackService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with demo cache if available', async () => {
      const mockCacheData = {
        ingredients: [
          { name: 'sugar', data: { name: 'sugar', source: 'cache', nutritionScore: 30 } }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      await fallbackService.initialize();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('snackcheck_demo_cache');
    });

    it('should handle initialization errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(fallbackService.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await fallbackService.initialize();
      localStorageMock.getItem.mockClear();
      
      await fallbackService.initialize();
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });
  });

  describe('handleOCRFailure', () => {
    it('should return demo OCR result when demo mode is enabled', async () => {
      const mockOCRResult = {
        text: 'INGREDIENTS: Test ingredients',
        confidence: 90,
        ingredients: ['test', 'ingredients']
      };

      vi.mocked(DemoService.shouldUseDemoMode).mockReturnValue(true);
      vi.mocked(DemoService.simulateOCRProcessing).mockResolvedValue(mockOCRResult);
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'OCR failed',
        suggestedActions: ['Try again']
      });

      const result = await fallbackService.handleOCRFailure(new Error('OCR failed'));
      
      expect(result).toEqual(mockOCRResult);
      expect(DemoService.simulateOCRProcessing).toHaveBeenCalled();
    });

    it('should return basic fallback when demo mode is disabled', async () => {
      vi.mocked(DemoService.shouldUseDemoMode).mockReturnValue(false);
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'OCR failed',
        suggestedActions: ['Try again']
      });

      const result = await fallbackService.handleOCRFailure(new Error('OCR failed'));
      
      expect(result.confidence).toBe(0);
      expect(result.ingredients).toEqual([]);
      expect(result.text).toContain('Unable to read label clearly');
    });

    it('should handle demo OCR failure gracefully', async () => {
      vi.mocked(DemoService.shouldUseDemoMode).mockReturnValue(true);
      vi.mocked(DemoService.simulateOCRProcessing).mockRejectedValue(new Error('Demo failed'));
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'OCR failed',
        suggestedActions: ['Try again']
      });

      const result = await fallbackService.handleOCRFailure(new Error('OCR failed'));
      
      expect(result.confidence).toBe(0);
      expect(result.text).toContain('Unable to read label clearly');
    });
  });

  describe('handleIngredientLookupFailure', () => {
    it('should return cached ingredient if available', async () => {
      await fallbackService.initialize();
      
      const result = await fallbackService.handleIngredientLookupFailure('water', new Error('Lookup failed'));
      
      expect(result.name).toBe('water');
      expect(result.source).toBe('cache');
      expect(result.nutritionScore).toBe(100);
    });

    it('should generate intelligent fallback for unknown ingredients', async () => {
      const result = await fallbackService.handleIngredientLookupFailure('unknown ingredient', new Error('Lookup failed'));
      
      expect(result.name).toBe('unknown ingredient');
      expect(result.source).toBe('cache');
      expect(result.nutritionScore).toBe(50); // Default neutral score
      expect(result.explanation).toContain('Information temporarily unavailable');
    });

    it('should boost score for organic ingredients', async () => {
      const result = await fallbackService.handleIngredientLookupFailure('organic tomatoes', new Error('Lookup failed'));
      
      expect(result.nutritionScore).toBeGreaterThan(50);
      expect(result.explanation).toContain('natural or organic');
    });

    it('should reduce score for artificial ingredients', async () => {
      const result = await fallbackService.handleIngredientLookupFailure('artificial flavor', new Error('Lookup failed'));
      
      expect(result.nutritionScore).toBeLessThan(50);
      expect(result.additiveClass).toBe('artificial');
      expect(result.explanation.toLowerCase()).toContain('artificial ingredient');
    });

    it('should identify preservatives correctly', async () => {
      const result = await fallbackService.handleIngredientLookupFailure('sodium benzoate', new Error('Lookup failed'));
      
      expect(result.nutritionScore).toBeLessThan(50);
      expect(result.additiveClass).toBe('preservative');
      expect(result.explanation).toContain('preservative');
    });

    it('should identify artificial colors correctly', async () => {
      const result = await fallbackService.handleIngredientLookupFailure('red 40', new Error('Lookup failed'));
      
      expect(result.nutritionScore).toBeLessThan(50);
      expect(result.additiveClass).toBe('coloring');
      expect(result.explanation).toContain('coloring agent');
    });
  });

  describe('handleAIFailure', () => {
    it('should return fallback explanation', async () => {
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'AI failed',
        suggestedActions: ['Try again'],
        fallbackExplanation: 'AI service unavailable'
      });

      const result = await fallbackService.handleAIFailure('test ingredient', new Error('AI failed'));
      
      expect(result.name).toBe('test ingredient');
      expect(result.source).toBe('cache');
      expect(result.nutritionScore).toBe(50);
      expect(result.explanation).toBe('AI service unavailable');
    });
  });

  describe('handleAPIFailure', () => {
    it('should return appropriate response for retryable errors', async () => {
      const error = new SnackCheckError('api_timeout', 'Timeout', 'Request timed out', true);
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'API temporarily unavailable',
        suggestedActions: ['Check connection', 'Try again']
      });

      const result = await fallbackService.handleAPIFailure(error);
      
      expect(result.shouldRetry).toBe(true);
      expect(result.fallbackMessage).toBe('API temporarily unavailable');
      expect(result.suggestedActions).toEqual(['Check connection', 'Try again']);
    });

    it('should return appropriate response for non-retryable errors', async () => {
      const error = new SnackCheckError('unknown_error', 'Unknown', 'Unknown error', false);
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'Service unavailable',
        suggestedActions: ['Try later']
      });

      const result = await fallbackService.handleAPIFailure(error);
      
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('generateFallbackHealthScore', () => {
    it('should return neutral score for empty ingredients', () => {
      const result = fallbackService.generateFallbackHealthScore([]);
      
      expect(result.overall).toBe(50);
      expect(result.color).toBe('yellow');
      expect(result.factors).toHaveLength(1);
      expect(result.factors[0].ingredient).toBe('No ingredients detected');
    });

    it('should calculate average score from ingredients', () => {
      const ingredients = [
        { name: 'good', source: 'cache' as const, nutritionScore: 80, explanation: 'Good' },
        { name: 'bad', source: 'cache' as const, nutritionScore: 20, explanation: 'Bad' }
      ];

      const result = fallbackService.generateFallbackHealthScore(ingredients);
      
      expect(result.overall).toBe(50); // Average of 80 and 20
      expect(result.color).toBe('yellow');
      expect(result.factors).toHaveLength(2);
    });

    it('should assign green color for high scores', () => {
      const ingredients = [
        { name: 'excellent', source: 'cache' as const, nutritionScore: 90, explanation: 'Excellent' }
      ];

      const result = fallbackService.generateFallbackHealthScore(ingredients);
      
      expect(result.overall).toBe(90);
      expect(result.color).toBe('green');
    });

    it('should assign red color for low scores', () => {
      const ingredients = [
        { name: 'poor', source: 'cache' as const, nutritionScore: 30, explanation: 'Poor' }
      ];

      const result = fallbackService.generateFallbackHealthScore(ingredients);
      
      expect(result.overall).toBe(30);
      expect(result.color).toBe('red');
    });

    it('should handle ingredients without nutrition scores', () => {
      const ingredients = [
        { name: 'unknown', source: 'cache' as const, explanation: 'Unknown' }
      ];

      const result = fallbackService.generateFallbackHealthScore(ingredients);
      
      expect(result.overall).toBe(50); // Default when no valid scores
      expect(result.factors[0].impact).toBe(0);
    });
  });

  describe('testFallbackSystems', () => {
    it('should test all fallback mechanisms', async () => {
      vi.mocked(DemoService.getFallbackResponse).mockResolvedValue({
        message: 'Test response',
        suggestedActions: ['Test action']
      });

      const results = await fallbackService.testFallbackSystems();
      
      expect(results.ocr).toBe(true);
      expect(results.ingredientLookup).toBe(true);
      expect(results.aiService).toBe(true);
      expect(results.healthScore).toBe(true);
      expect(results.errors).toHaveLength(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all caches and reset initialization', () => {
      fallbackService.clearCache();
      
      expect(DemoService.clearDemoCache).toHaveBeenCalled();
      
      const stats = fallbackService.getStats();
      expect(stats.isInitialized).toBe(false);
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return current service statistics', async () => {
      vi.mocked(DemoService.shouldUseDemoMode).mockReturnValue(true);
      await fallbackService.initialize();
      
      const stats = fallbackService.getStats();
      
      expect(stats.isInitialized).toBe(true);
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.demoModeEnabled).toBe(true);
    });
  });
});