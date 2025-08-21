import { OCRResult, IngredientData, HealthScore } from '../utils/types';

interface DemoImage {
  name: string;
  filename: string;
  mockOCRText: string;
  expectedIngredients: string[];
  expectedScore?: number;
  expectedColor?: 'green' | 'yellow' | 'red';
}

interface FallbackResponse {
  message: string;
  suggestedActions: string[];
  fallbackImage?: string;
  useCache?: boolean;
  fallbackExplanation?: string;
}

interface DemoData {
  demoImages: DemoImage[];
  fallbackResponses: {
    ocrFailure: FallbackResponse;
    apiFailure: FallbackResponse;
    aiFailure: FallbackResponse;
  };
}

export class DemoService {
  private static demoData: DemoData | null = null;
  private static isInitialized = false;

  /**
   * Initialize demo service with data from JSON file
   */
  private static async initializeDemoData(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const response = await fetch('/demo-images/demo-data.json');
      if (response.ok) {
        this.demoData = await response.json();
      } else {
        // Fallback to hardcoded data if JSON file is not available
        this.demoData = this.getHardcodedDemoData();
      }
    } catch (error) {
      console.warn('Failed to load demo data from JSON, using hardcoded fallback:', error);
      this.demoData = this.getHardcodedDemoData();
    }

    this.isInitialized = true;
  }

  /**
   * Hardcoded fallback demo data
   */
  private static getHardcodedDemoData(): DemoData {
    return {
      demoImages: [
        {
          name: "Cereal Box",
          filename: "cereal-label.jpg",
          mockOCRText: "INGREDIENTS: Whole grain oats, sugar, salt, natural flavor, vitamin E (mixed tocopherols) added to preserve freshness.",
          expectedIngredients: ["whole grain oats", "sugar", "salt", "natural flavor", "vitamin e"],
          expectedScore: 72,
          expectedColor: "yellow"
        },
        {
          name: "Snack Bar", 
          filename: "snack-bar-label.jpg",
          mockOCRText: "INGREDIENTS: Almonds, dates, cocoa powder, vanilla extract, sea salt.",
          expectedIngredients: ["almonds", "dates", "cocoa powder", "vanilla extract", "sea salt"],
          expectedScore: 88,
          expectedColor: "green"
        },
        {
          name: "Yogurt Cup",
          filename: "yogurt-label.jpg", 
          mockOCRText: "INGREDIENTS: Cultured pasteurized grade A milk, live cultures (L. bulgaricus, S. thermophilus), sugar, natural strawberry flavor, pectin.",
          expectedIngredients: ["milk", "live cultures", "sugar", "natural strawberry flavor", "pectin"],
          expectedScore: 68,
          expectedColor: "yellow"
        },
        {
          name: "Crackers",
          filename: "crackers-label.jpg",
          mockOCRText: "INGREDIENTS: Enriched wheat flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), vegetable oil, salt, yeast, malted barley flour.",
          expectedIngredients: ["wheat flour", "vegetable oil", "salt", "yeast", "malted barley flour"],
          expectedScore: 58,
          expectedColor: "yellow"
        },
        {
          name: "Juice Box",
          filename: "juice-label.jpg",
          mockOCRText: "INGREDIENTS: Apple juice from concentrate (water, apple juice concentrate), natural flavor, ascorbic acid (vitamin C).",
          expectedIngredients: ["apple juice concentrate", "water", "natural flavor", "vitamin c"],
          expectedScore: 65,
          expectedColor: "yellow"
        }
      ],
      fallbackResponses: {
        ocrFailure: {
          message: "Unable to read the label clearly. Please try again with better lighting or use one of our demo images.",
          suggestedActions: ["Improve lighting", "Hold camera steady", "Try demo mode"],
          fallbackImage: "cereal-label.jpg"
        },
        apiFailure: {
          message: "Ingredient database temporarily unavailable. Using cached data for analysis.",
          suggestedActions: ["Check internet connection", "Try again later"],
          useCache: true
        },
        aiFailure: {
          message: "AI explanation service unavailable. Showing basic ingredient information.",
          suggestedActions: ["Try again later"],
          fallbackExplanation: "This ingredient could not be analyzed at this time due to service unavailability."
        }
      }
    };
  }

  /**
   * Get all available demo images
   */
  static async getDemoImages(): Promise<DemoImage[]> {
    await this.initializeDemoData();
    return [...(this.demoData?.demoImages || [])];
  }

  /**
   * Get a random demo image for fallback testing
   */
  static async getRandomDemoImage(): Promise<DemoImage> {
    await this.initializeDemoData();
    const images = this.demoData?.demoImages || [];
    if (images.length === 0) {
      throw new Error('No demo images available');
    }
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }

  /**
   * Get demo image by name
   */
  static async getDemoImageByName(name: string): Promise<DemoImage | null> {
    await this.initializeDemoData();
    const images = this.demoData?.demoImages || [];
    return images.find(img => img.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get demo image by filename
   */
  static async getDemoImageByFilename(filename: string): Promise<DemoImage | null> {
    await this.initializeDemoData();
    const images = this.demoData?.demoImages || [];
    return images.find(img => img.filename === filename) || null;
  }

  /**
   * Simulate OCR processing for demo purposes
   */
  static async simulateOCRProcessing(demoImageName?: string): Promise<OCRResult> {
    await this.initializeDemoData();
    
    // Simulate processing delay (shorter for demo)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const demoImage = demoImageName 
      ? await this.getDemoImageByName(demoImageName) 
      : await this.getRandomDemoImage();

    if (!demoImage) {
      throw new Error('Demo image not found');
    }

    // Simulate realistic confidence score
    const confidence = 85 + Math.random() * 10; // 85-95% confidence

    return {
      text: demoImage.mockOCRText,
      confidence,
      ingredients: [...demoImage.expectedIngredients]
    };
  }

  /**
   * Get fallback response for different failure scenarios
   */
  static async getFallbackResponse(type: 'ocrFailure' | 'apiFailure' | 'aiFailure'): Promise<FallbackResponse> {
    await this.initializeDemoData();
    return this.demoData?.fallbackResponses[type] || {
      message: 'Service temporarily unavailable',
      suggestedActions: ['Try again later']
    };
  }

  /**
   * Generate fallback ingredient data for demo purposes
   */
  static generateFallbackIngredientData(ingredientName: string): IngredientData {
    return {
      name: ingredientName,
      source: 'cache',
      nutritionScore: 50, // Neutral score
      explanation: `Demo mode: ${ingredientName} - This is a fallback explanation for demonstration purposes.`
    };
  }

  /**
   * Generate mock health score for demo purposes
   */
  static async generateMockHealthScore(demoImageName?: string): Promise<HealthScore | null> {
    await this.initializeDemoData();
    
    const demoImage = demoImageName 
      ? await this.getDemoImageByName(demoImageName) 
      : await this.getRandomDemoImage();

    if (!demoImage || !demoImage.expectedScore || !demoImage.expectedColor) {
      return null;
    }

    return {
      overall: demoImage.expectedScore,
      color: demoImage.expectedColor,
      factors: demoImage.expectedIngredients.map((ingredient, index) => ({
        ingredient,
        impact: index === 0 ? 10 : Math.floor(Math.random() * 15) - 5, // First ingredient has positive impact
        reason: `Demo explanation for ${ingredient}`
      }))
    };
  }

  /**
   * Check if we should use demo mode (for testing/fallback)
   */
  static shouldUseDemoMode(): boolean {
    // Use demo mode if explicitly set or in development
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
           typeof window !== 'undefined' && window.location.search.includes('demo=true');
  }

  /**
   * Enable demo mode programmatically
   */
  static enableDemoMode(): void {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('demo', 'true');
      window.history.replaceState({}, '', url.toString());
    }
  }

  /**
   * Disable demo mode programmatically
   */
  static disableDemoMode(): void {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      window.history.replaceState({}, '', url.toString());
    }
  }

  /**
   * Get demo mode status and configuration
   */
  static getDemoModeStatus(): {
    isEnabled: boolean;
    source: 'development' | 'environment' | 'url' | 'disabled';
    availableImages: number;
  } {
    let source: 'development' | 'environment' | 'url' | 'disabled' = 'disabled';
    let isEnabled = false;

    if (process.env.NODE_ENV === 'development') {
      isEnabled = true;
      source = 'development';
    } else if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      isEnabled = true;
      source = 'environment';
    } else if (typeof window !== 'undefined' && window.location.search.includes('demo=true')) {
      isEnabled = true;
      source = 'url';
    }

    return {
      isEnabled,
      source,
      availableImages: this.demoData?.demoImages?.length || 0
    };
  }

  /**
   * Pre-populate cache with demo ingredient data for offline functionality
   */
  static async prePopulateCache(): Promise<void> {
    await this.initializeDemoData();
    
    if (!this.demoData) return;

    // Get all unique ingredients from demo images
    const allIngredients = new Set<string>();
    this.demoData.demoImages.forEach(image => {
      image.expectedIngredients.forEach(ingredient => {
        allIngredients.add(ingredient.toLowerCase());
      });
    });

    // Store in localStorage for offline access
    const cacheData = {
      timestamp: Date.now(),
      ingredients: Array.from(allIngredients).map(ingredient => ({
        name: ingredient,
        data: this.generateFallbackIngredientData(ingredient)
      }))
    };

    try {
      localStorage.setItem('snackcheck_demo_cache', JSON.stringify(cacheData));
      console.log(`Pre-populated cache with ${allIngredients.size} demo ingredients`);
    } catch (error) {
      console.warn('Failed to pre-populate demo cache:', error);
    }
  }

  /**
   * Clear demo cache
   */
  static clearDemoCache(): void {
    try {
      localStorage.removeItem('snackcheck_demo_cache');
      console.log('Demo cache cleared');
    } catch (error) {
      console.warn('Failed to clear demo cache:', error);
    }
  }

  /**
   * Test complete scan-to-result flow with demo data
   */
  static async testDemoFlow(imageName?: string): Promise<{
    success: boolean;
    duration: number;
    steps: Array<{ step: string; duration: number; success: boolean }>;
    error?: string;
  }> {
    const startTime = Date.now();
    const steps: Array<{ step: string; duration: number; success: boolean }> = [];

    try {
      // Step 1: OCR Processing
      const ocrStart = Date.now();
      const ocrResult = await this.simulateOCRProcessing(imageName);
      steps.push({
        step: 'OCR Processing',
        duration: Date.now() - ocrStart,
        success: true
      });

      // Step 2: Ingredient Lookup (simulated)
      const lookupStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate lookup
      steps.push({
        step: 'Ingredient Lookup',
        duration: Date.now() - lookupStart,
        success: true
      });

      // Step 3: Health Score Calculation
      const scoreStart = Date.now();
      const healthScore = await this.generateMockHealthScore(imageName);
      steps.push({
        step: 'Health Score Calculation',
        duration: Date.now() - scoreStart,
        success: !!healthScore
      });

      const totalDuration = Date.now() - startTime;

      return {
        success: true,
        duration: totalDuration,
        steps
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        steps,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}