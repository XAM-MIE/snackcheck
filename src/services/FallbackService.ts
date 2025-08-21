import { IngredientData, HealthScore, OCRResult } from '../utils/types';
import { DemoService } from './DemoService';
import { SnackCheckError } from '../utils/errorHandling';

/**
 * Fallback Service for handling API failures and providing reliable demo functionality
 */
export class FallbackService {
  private static instance: FallbackService;
  private fallbackIngredientCache: Map<string, IngredientData> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }

  /**
   * Initialize fallback service with cached data
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load demo cache if available
      const demoCache = localStorage.getItem('snackcheck_demo_cache');
      if (demoCache) {
        const cacheData = JSON.parse(demoCache);
        cacheData.ingredients?.forEach((item: any) => {
          this.fallbackIngredientCache.set(item.name, item.data);
        });
      }

      // Pre-populate with essential fallback ingredients
      this.initializeEssentialIngredients();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize fallback service:', error);
      this.initializeEssentialIngredients();
      this.isInitialized = true;
    }
  }

  /**
   * Initialize essential ingredients for fallback scenarios
   */
  private initializeEssentialIngredients(): void {
    const essentialIngredients: Array<[string, IngredientData]> = [
      ['water', { 
        name: 'water', 
        source: 'cache', 
        nutritionScore: 100, 
        explanation: 'Essential for hydration and bodily functions. No calories or additives.' 
      }],
      ['sugar', { 
        name: 'sugar', 
        source: 'cache', 
        nutritionScore: 30, 
        explanation: 'Added sweetener that provides quick energy but can contribute to tooth decay and blood sugar spikes when consumed in excess.' 
      }],
      ['salt', { 
        name: 'salt', 
        source: 'cache', 
        nutritionScore: 40, 
        explanation: 'Sodium chloride used for flavor and preservation. Essential in small amounts but excessive intake can raise blood pressure.' 
      }],
      ['wheat flour', { 
        name: 'wheat flour', 
        source: 'cache', 
        nutritionScore: 60, 
        explanation: 'Refined grain that provides carbohydrates and some protein. Whole wheat versions are more nutritious.' 
      }],
      ['natural flavor', { 
        name: 'natural flavor', 
        source: 'cache', 
        nutritionScore: 70, 
        explanation: 'Flavoring compounds derived from natural sources like fruits, vegetables, or spices.' 
      }],
      ['artificial flavor', { 
        name: 'artificial flavor', 
        source: 'cache', 
        nutritionScore: 45, 
        additiveClass: 'artificial',
        explanation: 'Artificial ingredient - synthetic compounds created to mimic natural flavors. Generally safe but less desirable than natural alternatives.' 
      }],
      ['high fructose corn syrup', { 
        name: 'high fructose corn syrup', 
        source: 'cache', 
        nutritionScore: 20, 
        additiveClass: 'sweetener',
        explanation: 'Highly processed sweetener linked to obesity and metabolic issues when consumed regularly.' 
      }],
      ['monosodium glutamate', { 
        name: 'monosodium glutamate', 
        source: 'cache', 
        nutritionScore: 35, 
        additiveClass: 'flavor enhancer',
        explanation: 'Flavor enhancer that adds umami taste. Generally safe but some people may experience sensitivity.' 
      }],
      ['citric acid', { 
        name: 'citric acid', 
        source: 'cache', 
        nutritionScore: 80, 
        additiveClass: 'preservative',
        explanation: 'Natural preservative and flavor enhancer derived from citrus fruits. Generally safe and beneficial.' 
      }],
      ['vitamin c', { 
        name: 'vitamin c', 
        source: 'cache', 
        nutritionScore: 95, 
        explanation: 'Essential vitamin and antioxidant that supports immune function and collagen production.' 
      }]
    ];

    essentialIngredients.forEach(([name, data]) => {
      this.fallbackIngredientCache.set(name.toLowerCase(), data);
    });
  }

  /**
   * Handle OCR failure with fallback options
   */
  async handleOCRFailure(error: Error): Promise<OCRResult> {
    console.warn('OCR processing failed, using fallback:', error.message);

    const fallbackResponse = await DemoService.getFallbackResponse('ocrFailure');
    
    // If demo mode is enabled, use demo OCR
    if (DemoService.shouldUseDemoMode()) {
      try {
        return await DemoService.simulateOCRProcessing();
      } catch (demoError) {
        console.error('Demo OCR also failed:', demoError);
      }
    }

    // Return a basic fallback result
    return {
      text: 'INGREDIENTS: Unable to read label clearly. Please try again with better lighting.',
      confidence: 0,
      ingredients: []
    };
  }

  /**
   * Handle ingredient lookup failure with cached data
   */
  async handleIngredientLookupFailure(ingredientName: string, error: Error): Promise<IngredientData> {
    await this.initialize();
    
    const normalizedName = ingredientName.toLowerCase().trim();
    
    // Check fallback cache first
    const cached = this.fallbackIngredientCache.get(normalizedName);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // Generate intelligent fallback based on ingredient name patterns
    return this.generateIntelligentFallback(ingredientName);
  }

  /**
   * Generate intelligent fallback data based on ingredient name patterns
   */
  private generateIntelligentFallback(ingredientName: string): IngredientData {
    const name = ingredientName.toLowerCase();
    let score = 50; // Default neutral score
    let additiveClass: string | undefined;
    let explanation = `${ingredientName} - Information temporarily unavailable. `;

    // Pattern-based scoring
    if (name.includes('organic') || name.includes('natural')) {
      score += 20;
      explanation += 'Appears to be a natural or organic ingredient.';
    }

    if (name.includes('artificial') || name.includes('synthetic')) {
      score -= 15;
      additiveClass = 'artificial';
      explanation += 'Appears to be an artificial ingredient.';
    } else if (name.includes('flavor') && !name.includes('natural')) {
      score -= 8;
      additiveClass = 'flavoring';
      explanation += 'Appears to be a flavoring agent.';
    }

    if (name.includes('preservative') || name.includes('benzoate') || name.includes('sorbate')) {
      score -= 10;
      additiveClass = 'preservative';
      explanation += 'Likely a preservative used to extend shelf life.';
    }

    if (name.includes('color') || name.includes('dye') || /red \d+|yellow \d+|blue \d+/.test(name)) {
      score -= 12;
      additiveClass = 'coloring';
      explanation += 'Appears to be an artificial coloring agent.';
    }

    if (name.includes('vitamin') || name.includes('mineral') || name.includes('acid') && name.includes('ascorbic')) {
      score += 15;
      explanation += 'Appears to be a beneficial nutrient or vitamin.';
    }

    if (name.includes('sugar') || name.includes('syrup') || name.includes('sweetener')) {
      score -= 8;
      explanation += 'Appears to be a sweetening agent.';
    }

    if (name.includes('oil') && (name.includes('palm') || name.includes('hydrogenated'))) {
      score -= 10;
      explanation += 'May contain less healthy fats.';
    }

    if (name.includes('whole grain') || name.includes('fiber')) {
      score += 10;
      explanation += 'Appears to be a beneficial whole grain ingredient.';
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      name: ingredientName,
      source: 'cache',
      nutritionScore: score,
      additiveClass,
      explanation: explanation + ' This analysis is based on ingredient name patterns and may not be fully accurate.'
    };
  }

  /**
   * Handle AI service failure with basic explanations
   */
  async handleAIFailure(ingredientName: string, error: Error): Promise<IngredientData> {
    const fallbackResponse = await DemoService.getFallbackResponse('aiFailure');
    
    return {
      name: ingredientName,
      source: 'cache',
      nutritionScore: 50,
      explanation: fallbackResponse.fallbackExplanation || 
        `${ingredientName} - AI explanation service is temporarily unavailable. This ingredient could not be analyzed at this time.`
    };
  }

  /**
   * Handle API failure with cached responses
   */
  async handleAPIFailure(error: SnackCheckError): Promise<{
    shouldRetry: boolean;
    fallbackMessage: string;
    suggestedActions: string[];
  }> {
    const fallbackResponse = await DemoService.getFallbackResponse('apiFailure');
    
    return {
      shouldRetry: error.retryable,
      fallbackMessage: fallbackResponse.message,
      suggestedActions: fallbackResponse.suggestedActions
    };
  }

  /**
   * Generate fallback health score when calculation fails
   */
  generateFallbackHealthScore(ingredients: IngredientData[]): HealthScore {
    if (ingredients.length === 0) {
      return {
        overall: 50,
        color: 'yellow',
        factors: [{
          ingredient: 'No ingredients detected',
          impact: 0,
          reason: 'Unable to analyze ingredients'
        }]
      };
    }

    // Calculate average score from available ingredient data
    const validScores = ingredients
      .map(ing => ing.nutritionScore)
      .filter((score): score is number => typeof score === 'number');

    const averageScore = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
      : 50;

    // Determine color based on score
    let color: 'green' | 'yellow' | 'red' = 'yellow';
    if (averageScore >= 70) color = 'green';
    else if (averageScore < 40) color = 'red';

    // Generate factors
    const factors = ingredients.map(ingredient => ({
      ingredient: ingredient.name,
      impact: ingredient.nutritionScore ? ingredient.nutritionScore - 50 : 0,
      reason: ingredient.explanation || 'No detailed information available'
    }));

    return {
      overall: averageScore,
      color,
      factors
    };
  }

  /**
   * Test all fallback mechanisms
   */
  async testFallbackSystems(): Promise<{
    ocr: boolean;
    ingredientLookup: boolean;
    aiService: boolean;
    healthScore: boolean;
    errors: string[];
  }> {
    const results = {
      ocr: false,
      ingredientLookup: false,
      aiService: false,
      healthScore: false,
      errors: [] as string[]
    };

    try {
      // Test OCR fallback
      await this.handleOCRFailure(new Error('Test OCR failure'));
      results.ocr = true;
    } catch (error) {
      results.errors.push(`OCR fallback failed: ${error}`);
    }

    try {
      // Test ingredient lookup fallback
      await this.handleIngredientLookupFailure('test ingredient', new Error('Test lookup failure'));
      results.ingredientLookup = true;
    } catch (error) {
      results.errors.push(`Ingredient lookup fallback failed: ${error}`);
    }

    try {
      // Test AI service fallback
      await this.handleAIFailure('test ingredient', new Error('Test AI failure'));
      results.aiService = true;
    } catch (error) {
      results.errors.push(`AI service fallback failed: ${error}`);
    }

    try {
      // Test health score fallback
      const testIngredients: IngredientData[] = [
        { name: 'test', source: 'cache', nutritionScore: 75, explanation: 'Test ingredient' }
      ];
      this.generateFallbackHealthScore(testIngredients);
      results.healthScore = true;
    } catch (error) {
      results.errors.push(`Health score fallback failed: ${error}`);
    }

    return results;
  }

  /**
   * Clear all fallback caches
   */
  clearCache(): void {
    this.fallbackIngredientCache.clear();
    this.isInitialized = false;
    DemoService.clearDemoCache();
  }

  /**
   * Get fallback service statistics
   */
  getStats(): {
    cacheSize: number;
    isInitialized: boolean;
    demoModeEnabled: boolean;
  } {
    return {
      cacheSize: this.fallbackIngredientCache.size,
      isInitialized: this.isInitialized,
      demoModeEnabled: DemoService.shouldUseDemoMode()
    };
  }
}

export default FallbackService;