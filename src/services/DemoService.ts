import { OCRResult } from '../utils/types';

interface DemoImage {
  name: string;
  filename: string;
  mockOCRText: string;
  expectedIngredients: string[];
}

export class DemoService {
  private static demoImages: DemoImage[] = [
    {
      name: "Cereal Box",
      filename: "cereal-label.jpg",
      mockOCRText: "INGREDIENTS: Whole grain oats, sugar, salt, natural flavor, vitamin E (mixed tocopherols) added to preserve freshness.",
      expectedIngredients: ["whole grain oats", "sugar", "salt", "natural flavor", "vitamin e"]
    },
    {
      name: "Snack Bar", 
      filename: "snack-bar-label.jpg",
      mockOCRText: "INGREDIENTS: Almonds, dates, cocoa powder, vanilla extract, sea salt.",
      expectedIngredients: ["almonds", "dates", "cocoa powder", "vanilla extract", "sea salt"]
    },
    {
      name: "Yogurt Cup",
      filename: "yogurt-label.jpg", 
      mockOCRText: "INGREDIENTS: Cultured pasteurized grade A milk, live cultures (L. bulgaricus, S. thermophilus), sugar, natural strawberry flavor, pectin.",
      expectedIngredients: ["milk", "live cultures", "sugar", "natural strawberry flavor", "pectin"]
    },
    {
      name: "Crackers",
      filename: "crackers-label.jpg",
      mockOCRText: "INGREDIENTS: Enriched wheat flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), vegetable oil, salt, yeast, malted barley flour.",
      expectedIngredients: ["wheat flour", "vegetable oil", "salt", "yeast", "malted barley flour"]
    },
    {
      name: "Juice Box",
      filename: "juice-label.jpg",
      mockOCRText: "INGREDIENTS: Apple juice from concentrate (water, apple juice concentrate), natural flavor, ascorbic acid (vitamin C).",
      expectedIngredients: ["apple juice concentrate", "water", "natural flavor", "vitamin c"]
    }
  ];

  /**
   * Get all available demo images
   */
  static getDemoImages(): DemoImage[] {
    return [...this.demoImages];
  }

  /**
   * Get a random demo image for fallback testing
   */
  static getRandomDemoImage(): DemoImage {
    const randomIndex = Math.floor(Math.random() * this.demoImages.length);
    return this.demoImages[randomIndex];
  }

  /**
   * Get demo image by name
   */
  static getDemoImageByName(name: string): DemoImage | null {
    return this.demoImages.find(img => img.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Simulate OCR processing for demo purposes
   */
  static async simulateOCRProcessing(demoImageName?: string): Promise<OCRResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const demoImage = demoImageName 
      ? this.getDemoImageByName(demoImageName) 
      : this.getRandomDemoImage();

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
   * Check if we should use demo mode (for testing/fallback)
   */
  static shouldUseDemoMode(): boolean {
    // Use demo mode if explicitly set or in development
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
           typeof window !== 'undefined' && window.location.search.includes('demo=true');
  }
}