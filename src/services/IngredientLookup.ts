import { IngredientData, OpenFoodFactsResponse, AIExplanationResponse } from '../utils/types';
import { API_ENDPOINTS, CACHE_CONFIG } from '../utils/constants';
import { CacheManager } from '../utils/cache';
import { AIService } from './AIService';
import { SnackCheckError, withRetry, withTimeout, safeAsync } from '../utils/errorHandling';
import { PerformanceMonitor } from '../utils/performance';

/**
 * Service for looking up ingredient information from OpenFoodFacts API
 * and AI services, with caching support for offline functionality
 */
export class IngredientLookup {
  private cache: CacheManager;
  private commonIngredients: Map<string, IngredientData>;
  private aiService: AIService;

  constructor() {
    this.cache = CacheManager.getInstance();
    this.commonIngredients = new Map();
    this.aiService = AIService.getInstance();
    this.initializeCommonIngredients();
  }

  /**
   * Initialize cache with top 50 common ingredients for offline functionality
   */
  private initializeCommonIngredients(): void {
    const commonIngredientsData: Array<[string, IngredientData]> = [
      ['water', { name: 'water', source: 'cache', nutritionScore: 100, explanation: 'Essential for hydration' }],
      ['sugar', { name: 'sugar', source: 'cache', nutritionScore: 30, explanation: 'Added sweetener, high in calories' }],
      ['salt', { name: 'salt', source: 'cache', nutritionScore: 40, explanation: 'Sodium chloride, essential in moderation' }],
      ['wheat flour', { name: 'wheat flour', source: 'cache', nutritionScore: 60, explanation: 'Refined grain, source of carbohydrates' }],
      ['vegetable oil', { name: 'vegetable oil', source: 'cache', nutritionScore: 50, explanation: 'Source of fats, varies by type' }],
      ['milk', { name: 'milk', source: 'cache', nutritionScore: 75, explanation: 'Dairy product, source of protein and calcium' }],
      ['eggs', { name: 'eggs', source: 'cache', nutritionScore: 85, explanation: 'High-quality protein source' }],
      ['natural flavor', { name: 'natural flavor', source: 'cache', nutritionScore: 70, explanation: 'Flavoring derived from natural sources' }],
      ['citric acid', { name: 'citric acid', source: 'cache', nutritionScore: 80, additiveClass: 'preservative', explanation: 'Natural preservative and flavor enhancer' }],
      ['vitamin c', { name: 'vitamin c', source: 'cache', nutritionScore: 95, explanation: 'Essential vitamin, antioxidant' }],
      ['corn syrup', { name: 'corn syrup', source: 'cache', nutritionScore: 25, explanation: 'High-fructose sweetener' }],
      ['soy lecithin', { name: 'soy lecithin', source: 'cache', nutritionScore: 65, additiveClass: 'emulsifier', explanation: 'Emulsifier derived from soybeans' }],
      ['baking soda', { name: 'baking soda', source: 'cache', nutritionScore: 80, explanation: 'Leavening agent, sodium bicarbonate' }],
      ['vanilla extract', { name: 'vanilla extract', source: 'cache', nutritionScore: 85, explanation: 'Natural flavoring from vanilla beans' }],
      ['cocoa powder', { name: 'cocoa powder', source: 'cache', nutritionScore: 80, explanation: 'Processed cocoa beans, source of antioxidants' }],
      ['almonds', { name: 'almonds', source: 'cache', nutritionScore: 90, explanation: 'Tree nuts, high in healthy fats and protein' }],
      ['oats', { name: 'oats', source: 'cache', nutritionScore: 85, explanation: 'Whole grain, high in fiber' }],
      ['rice', { name: 'rice', source: 'cache', nutritionScore: 70, explanation: 'Grain, source of carbohydrates' }],
      ['tomatoes', { name: 'tomatoes', source: 'cache', nutritionScore: 90, explanation: 'Vegetable, high in lycopene and vitamins' }],
      ['onions', { name: 'onions', source: 'cache', nutritionScore: 85, explanation: 'Vegetable, source of antioxidants' }],
      ['garlic', { name: 'garlic', source: 'cache', nutritionScore: 90, explanation: 'Aromatic vegetable with health benefits' }],
      ['olive oil', { name: 'olive oil', source: 'cache', nutritionScore: 85, explanation: 'Healthy monounsaturated fat source' }],
      ['cheese', { name: 'cheese', source: 'cache', nutritionScore: 65, explanation: 'Dairy product, source of protein and calcium' }],
      ['chicken', { name: 'chicken', source: 'cache', nutritionScore: 85, explanation: 'Lean protein source' }],
      ['beef', { name: 'beef', source: 'cache', nutritionScore: 70, explanation: 'Red meat, source of protein and iron' }],
      ['carrots', { name: 'carrots', source: 'cache', nutritionScore: 90, explanation: 'Root vegetable, high in beta-carotene' }],
      ['potatoes', { name: 'potatoes', source: 'cache', nutritionScore: 75, explanation: 'Starchy vegetable, source of potassium' }],
      ['lemon juice', { name: 'lemon juice', source: 'cache', nutritionScore: 85, explanation: 'Citrus juice, source of vitamin C' }],
      ['honey', { name: 'honey', source: 'cache', nutritionScore: 60, explanation: 'Natural sweetener with trace nutrients' }],
      ['yeast', { name: 'yeast', source: 'cache', nutritionScore: 80, explanation: 'Leavening agent, source of B vitamins' }],
      ['vinegar', { name: 'vinegar', source: 'cache', nutritionScore: 75, explanation: 'Acidic condiment, may aid digestion' }],
      ['paprika', { name: 'paprika', source: 'cache', nutritionScore: 85, explanation: 'Spice from peppers, source of antioxidants' }],
      ['black pepper', { name: 'black pepper', source: 'cache', nutritionScore: 85, explanation: 'Spice with potential health benefits' }],
      ['cinnamon', { name: 'cinnamon', source: 'cache', nutritionScore: 90, explanation: 'Spice with antioxidant properties' }],
      ['ginger', { name: 'ginger', source: 'cache', nutritionScore: 90, explanation: 'Root spice with anti-inflammatory properties' }],
      ['turmeric', { name: 'turmeric', source: 'cache', nutritionScore: 95, explanation: 'Spice with strong anti-inflammatory compounds' }],
      ['basil', { name: 'basil', source: 'cache', nutritionScore: 90, explanation: 'Herb with antioxidant properties' }],
      ['oregano', { name: 'oregano', source: 'cache', nutritionScore: 90, explanation: 'Herb with antimicrobial properties' }],
      ['thyme', { name: 'thyme', source: 'cache', nutritionScore: 90, explanation: 'Herb with antioxidant compounds' }],
      ['rosemary', { name: 'rosemary', source: 'cache', nutritionScore: 90, explanation: 'Herb with memory-enhancing compounds' }],
      ['spinach', { name: 'spinach', source: 'cache', nutritionScore: 95, explanation: 'Leafy green, high in iron and vitamins' }],
      ['broccoli', { name: 'broccoli', source: 'cache', nutritionScore: 95, explanation: 'Cruciferous vegetable, high in nutrients' }],
      ['apple', { name: 'apple', source: 'cache', nutritionScore: 85, explanation: 'Fruit, source of fiber and antioxidants' }],
      ['banana', { name: 'banana', source: 'cache', nutritionScore: 80, explanation: 'Fruit, source of potassium and energy' }],
      ['orange', { name: 'orange', source: 'cache', nutritionScore: 85, explanation: 'Citrus fruit, high in vitamin C' }],
      ['strawberry', { name: 'strawberry', source: 'cache', nutritionScore: 90, explanation: 'Berry, high in vitamin C and antioxidants' }],
      ['blueberry', { name: 'blueberry', source: 'cache', nutritionScore: 95, explanation: 'Berry, extremely high in antioxidants' }],
      ['avocado', { name: 'avocado', source: 'cache', nutritionScore: 90, explanation: 'Fruit, high in healthy monounsaturated fats' }],
      ['salmon', { name: 'salmon', source: 'cache', nutritionScore: 95, explanation: 'Fish, high in omega-3 fatty acids' }],
      ['tuna', { name: 'tuna', source: 'cache', nutritionScore: 85, explanation: 'Fish, lean protein source' }],
      ['quinoa', { name: 'quinoa', source: 'cache', nutritionScore: 90, explanation: 'Seed grain, complete protein source' }]
    ];

    commonIngredientsData.forEach(([key, data]) => {
      this.commonIngredients.set(key.toLowerCase(), data);
      // Also cache in the main cache for consistency
      this.cache.set(`ingredient:${key.toLowerCase()}`, data);
    });
  }

  /**
   * Look up ingredient information from various sources with enhanced error handling
   */
  async lookupIngredient(name: string): Promise<IngredientData> {
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.startTiming('ingredientLookup');
    
    const normalizedName = name.toLowerCase().trim();
    
    if (!normalizedName) {
      performanceMonitor.endTiming('ingredientLookup');
      throw new SnackCheckError(
        'unknown_error',
        'Invalid ingredient name provided',
        'Ingredient name is empty or invalid',
        false
      );
    }
    
    // Check cache first
    const cached = this.cache.get(`ingredient:${normalizedName}`) as IngredientData;
    if (cached) {
      performanceMonitor.endTiming('ingredientLookup');
      return cached;
    }

    // Check common ingredients
    const common = this.commonIngredients.get(normalizedName);
    if (common) {
      performanceMonitor.endTiming('ingredientLookup');
      return common;
    }

    try {
      // Try OpenFoodFacts API with error handling
      const openFoodFactsData = await safeAsync(
        () => withTimeout(
          this.queryOpenFoodFacts(normalizedName),
          8000, // Reduced timeout for better performance
          'api_timeout'
        ),
        null,
        'api_unavailable'
      );

      if (openFoodFactsData) {
        this.cache.set(`ingredient:${normalizedName}`, openFoodFactsData);
        performanceMonitor.endTiming('ingredientLookup');
        return openFoodFactsData;
      }

      // Fallback to AI explanation with error handling
      const aiData = await safeAsync(
        () => withTimeout(
          this.aiService.getIngredientExplanation(normalizedName),
          10000, // Reduced timeout for AI
          'api_timeout'
        ),
        null,
        'api_unavailable'
      );

      if (aiData) {
        this.cache.set(`ingredient:${normalizedName}`, aiData);
        performanceMonitor.endTiming('ingredientLookup');
        return aiData;
      }

      // Final fallback - unknown ingredient
      const fallbackData: IngredientData = {
        name: normalizedName,
        source: 'cache',
        nutritionScore: 50, // Neutral score
        explanation: 'Unknown ingredient - unable to retrieve detailed information. This may be due to network issues or the ingredient not being in our database.'
      };

      this.cache.set(`ingredient:${normalizedName}`, fallbackData);
      performanceMonitor.endTiming('ingredientLookup');
      return fallbackData;
    } catch (error) {
      performanceMonitor.endTiming('ingredientLookup');
      throw error;
    }
  }

  /**
   * Query OpenFoodFacts API for ingredient information with enhanced error handling
   */
  private async queryOpenFoodFacts(ingredient: string): Promise<IngredientData | null> {
    try {
      // OpenFoodFacts doesn't have a direct ingredient lookup, so we'll simulate
      // a search for products containing this ingredient and extract data
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ingredient)}&search_simple=1&action=process&json=1`;
      
      const response = await withRetry(
        async () => {
          const res = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'SnackCheck/1.0 (https://snackcheck.app)',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(8000) // 8 second timeout per request
          });

          if (!res.ok) {
            if (res.status >= 500) {
              throw new SnackCheckError(
                'api_unavailable',
                'OpenFoodFacts service is temporarily unavailable',
                `HTTP ${res.status}: ${res.statusText}`,
                true
              );
            } else if (res.status === 429) {
              throw new SnackCheckError(
                'api_timeout',
                'Too many requests to OpenFoodFacts API',
                'Rate limit exceeded',
                true
              );
            } else {
              throw new SnackCheckError(
                'api_unavailable',
                'OpenFoodFacts API request failed',
                `HTTP ${res.status}: ${res.statusText}`,
                false
              );
            }
          }

          return res;
        },
        { maxAttempts: 2, delayMs: 1000, backoffMultiplier: 2 },
        'api_unavailable'
      );

      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        // Analyze the first few products to determine ingredient characteristics
        const product = data.products[0];
        
        let nutritionScore = 50; // Default neutral score
        let additiveClass: string | undefined;
        
        // Determine nutrition score based on product data
        if (product.nutrition_grades) {
          const grade = product.nutrition_grades.toLowerCase();
          switch (grade) {
            case 'a': nutritionScore = 90; break;
            case 'b': nutritionScore = 75; break;
            case 'c': nutritionScore = 60; break;
            case 'd': nutritionScore = 40; break;
            case 'e': nutritionScore = 20; break;
          }
        }

        // Check if it's an additive
        if (product.additives_tags && product.additives_tags.length > 0) {
          additiveClass = 'additive';
          nutritionScore = Math.min(nutritionScore, 60); // Cap additive scores
        }

        const ingredientData: IngredientData = {
          name: ingredient,
          source: 'openfoodfacts',
          nutritionScore,
          additiveClass,
          explanation: `Information from OpenFoodFacts database based on products containing ${ingredient}`
        };

        return ingredientData;
      }

      return null;
    } catch (error) {
      console.error('OpenFoodFacts query error:', error);
      
      if (error instanceof SnackCheckError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new SnackCheckError(
          'network_error',
          'Network error while accessing ingredient database',
          error.message,
          true
        );
      }
      
      // Generic API error
      throw new SnackCheckError(
        'api_unavailable',
        'Failed to query OpenFoodFacts database',
        error instanceof Error ? error.message : String(error),
        true
      );
    }
  }



  /**
   * Batch lookup multiple ingredients
   */
  async lookupIngredients(ingredients: string[]): Promise<IngredientData[]> {
    const promises = ingredients.map(ingredient => this.lookupIngredient(ingredient));
    return Promise.all(promises);
  }

  /**
   * Clear all cached ingredient data
   */
  clearCache(): void {
    this.cache.clear();
    this.initializeCommonIngredients(); // Reinitialize common ingredients
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; commonIngredients: number } {
    return {
      totalEntries: this.cache['cache']?.size || 0,
      commonIngredients: this.commonIngredients.size
    };
  }
}