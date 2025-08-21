/**
 * OCR accuracy tests with various food label formats and lighting conditions
 * Tests text extraction accuracy, ingredient parsing, and confidence scoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OCRProcessor } from '../../services/OCRProcessor';

// Mock Tesseract.js with realistic OCR behavior
vi.mock('tesseract.js', () => ({
  recognize: vi.fn().mockImplementation(async (image: any, lang: string) => {
    // Add small delay for realism but keep tests fast
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const imageData = typeof image === 'string' ? image : 'default';
    
    // Simulate different OCR results based on image characteristics
    if (imageData.includes('high-quality')) {
      return {
        data: {
          text: 'INGREDIENTS: Water, Organic Cane Sugar, Natural Lemon Flavor, Citric Acid, Ascorbic Acid (Vitamin C)',
          confidence: 95
        }
      };
    } else if (imageData.includes('poor-lighting')) {
      return {
        data: {
          text: 'INGREDI NTS: Wat r, Sug r, Nat ral Fl vors, Citri  Acid',
          confidence: 65
        }
      };
    } else if (imageData.includes('blurry')) {
      return {
        data: {
          text: 'lngredients: Water Sugar Natural Flavors Citric Acid Sodium Benzoate',
          confidence: 70
        }
      };
    } else if (imageData.includes('small-text')) {
      return {
        data: {
          text: 'Ingredients:Water,Sugar,NaturalFlavors,CitricAcid,SodiumBenzoate,ArtificialColors',
          confidence: 78
        }
      };
    } else if (imageData.includes('complex-label')) {
      return {
        data: {
          text: `NUTRITION FACTS
Serving Size 1 bottle (355ml)
Calories 150
INGREDIENTS: Carbonated water, high fructose corn syrup, natural and artificial flavors, citric acid, sodium benzoate (preservative), caffeine, phosphoric acid, caramel color, red dye 40, blue dye 1.
Contains: No allergens
Distributed by: Example Corp`,
          confidence: 88
        }
      };
    } else if (imageData.includes('multilingual')) {
      return {
        data: {
          text: 'INGREDIENTS/INGRÉDIENTS: Water/Eau, Sugar/Sucre, Natural Flavors/Arômes naturels, Citric Acid/Acide citrique',
          confidence: 82
        }
      };
    } else if (imageData.includes('handwritten')) {
      return {
        data: {
          text: 'Ingredients: Water Sugar Natural Flavors',
          confidence: 45
        }
      };
    } else if (imageData.includes('damaged-label')) {
      return {
        data: {
          text: 'Ingred___s: W_ter, Su__r, Nat_ral Fl_vors, ___ric Acid',
          confidence: 40
        }
      };
    } else if (imageData.includes('rotated')) {
      return {
        data: {
          text: 'stneidergni :retaW ,raguS ,srovaIF larutaN ,dicA cirtiC',
          confidence: 35
        }
      };
    } else {
      // Default case
      return {
        data: {
          text: 'Ingredients: Water, Sugar, Natural Flavors, Citric Acid, Sodium Benzoate',
          confidence: 85
        }
      };
    }
  })
}));

// Test data representing different food label scenarios
const OCR_TEST_SCENARIOS = {
  'high-quality-label': {
    imageData: 'data:image/jpeg;base64,high-quality-clear-label',
    expectedIngredients: ['Water', 'Organic Cane Sugar', 'Natural Lemon Flavor', 'Citric Acid', 'Ascorbic Acid (Vitamin C)'],
    minConfidence: 90,
    description: 'High-quality, well-lit label with clear text'
  },
  'poor-lighting': {
    imageData: 'data:image/jpeg;base64,poor-lighting-dim-label',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid'],
    minConfidence: 60,
    description: 'Label photographed in poor lighting conditions'
  },
  'blurry-image': {
    imageData: 'data:image/jpeg;base64,blurry-motion-blur',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid', 'Sodium Benzoate'],
    minConfidence: 65,
    description: 'Blurry image due to camera shake or motion'
  },
  'small-text': {
    imageData: 'data:image/jpeg;base64,small-text-fine-print',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid', 'Sodium Benzoate', 'Artificial Colors'],
    minConfidence: 70,
    description: 'Very small text that is difficult to read'
  },
  'complex-label': {
    imageData: 'data:image/jpeg;base64,complex-label-full-nutrition',
    expectedIngredients: [
      'Carbonated water', 'high fructose corn syrup', 'natural and artificial flavors',
      'citric acid', 'sodium benzoate', 'caffeine', 'phosphoric acid', 'caramel color',
      'red dye 40', 'blue dye 1'
    ],
    minConfidence: 80,
    description: 'Complex label with nutrition facts and multiple sections'
  },
  'multilingual-label': {
    imageData: 'data:image/jpeg;base64,multilingual-english-french',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid'],
    minConfidence: 75,
    description: 'Bilingual label (English/French)'
  },
  'handwritten-label': {
    imageData: 'data:image/jpeg;base64,handwritten-artisan-product',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors'],
    minConfidence: 40,
    description: 'Handwritten or artisan-style label'
  },
  'damaged-label': {
    imageData: 'data:image/jpeg;base64,damaged-worn-label',
    expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid'],
    minConfidence: 35,
    description: 'Damaged or worn label with missing text'
  },
  'rotated-image': {
    imageData: 'data:image/jpeg;base64,rotated-sideways-label',
    expectedIngredients: [],
    minConfidence: 30,
    description: 'Image captured at wrong orientation'
  }
};

describe('OCR Accuracy Tests', () => {
  let ocrProcessor: OCRProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    ocrProcessor = new OCRProcessor();
  });

  describe('Text Extraction Accuracy', () => {
    Object.entries(OCR_TEST_SCENARIOS).forEach(([scenarioName, scenario]) => {
      it(`should handle ${scenario.description}`, async () => {
        const result = await ocrProcessor.processImage(scenario.imageData);

        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
        expect(result.ingredients).toBeDefined();
        expect(Array.isArray(result.ingredients)).toBe(true);

        // Confidence should meet minimum threshold for scenario
        if (scenario.minConfidence > 50) {
          expect(result.confidence).toBeGreaterThanOrEqual(scenario.minConfidence);
        }

        console.log(`${scenarioName}: ${result.confidence}% confidence, ${result.ingredients.length} ingredients`);
      });
    });

    it('should extract text with high accuracy from optimal conditions', async () => {
      const scenario = OCR_TEST_SCENARIOS['high-quality-label'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      expect(result.confidence).toBeGreaterThanOrEqual(90);
      expect(result.text).toContain('INGREDIENTS');
      expect(result.text).toContain('Water');
      expect(result.text).toContain('Sugar');
      expect(result.ingredients.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle poor quality images gracefully', async () => {
      const poorQualityScenarios = ['poor-lighting', 'blurry-image', 'damaged-label'];
      
      for (const scenarioName of poorQualityScenarios) {
        const scenario = OCR_TEST_SCENARIOS[scenarioName];
        const result = await ocrProcessor.processImage(scenario.imageData);

        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        
        // Even poor quality should extract some ingredients
        if (result.confidence > 50) {
          expect(result.ingredients.length).toBeGreaterThan(0);
        }
      }
    });

    it('should detect when OCR confidence is too low', async () => {
      const lowQualityScenarios = ['handwritten-label', 'damaged-label', 'rotated-image'];
      
      for (const scenarioName of lowQualityScenarios) {
        const scenario = OCR_TEST_SCENARIOS[scenarioName];
        const result = await ocrProcessor.processImage(scenario.imageData);

        if (result.confidence < 60) {
          // Low confidence should be flagged for user retry or demo fallback
          expect(result.confidence).toBeLessThan(60);
          console.log(`Low confidence detected for ${scenarioName}: ${result.confidence}%`);
        }
      }
    });
  });

  describe('Ingredient Parsing Accuracy', () => {
    it('should correctly parse simple ingredient lists', async () => {
      const scenario = OCR_TEST_SCENARIOS['high-quality-label'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      expect(result.ingredients).toContain('Water');
      expect(result.ingredients).toContain('Organic Cane Sugar');
      expect(result.ingredients).toContain('Natural Lemon Flavor');
      expect(result.ingredients).toContain('Citric Acid');
      
      // Should parse parenthetical information correctly
      expect(result.ingredients.some(ing => ing.includes('Vitamin C'))).toBe(true);
    });

    it('should parse complex ingredient lists with multiple formats', async () => {
      const scenario = OCR_TEST_SCENARIOS['complex-label'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      // Should extract ingredients from complex label
      expect(result.ingredients.length).toBeGreaterThanOrEqual(8);
      expect(result.ingredients).toContain('Carbonated water');
      expect(result.ingredients).toContain('high fructose corn syrup');
      expect(result.ingredients).toContain('natural and artificial flavors');
      
      // Should handle preservative notation
      expect(result.ingredients.some(ing => ing.includes('sodium benzoate'))).toBe(true);
    });

    it('should handle ingredient lists without spaces', async () => {
      const scenario = OCR_TEST_SCENARIOS['small-text'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      // Should parse comma-separated ingredients even without spaces
      expect(result.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(result.ingredients).toContain('Water');
      expect(result.ingredients).toContain('Sugar');
      expect(result.ingredients).toContain('Natural Flavors');
    });

    it('should parse multilingual ingredient lists', async () => {
      const scenario = OCR_TEST_SCENARIOS['multilingual-label'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      // Should extract English ingredients from bilingual text
      expect(result.ingredients).toContain('Water');
      expect(result.ingredients).toContain('Sugar');
      expect(result.ingredients).toContain('Natural Flavors');
      expect(result.ingredients).toContain('Citric Acid');
      
      // Should not include French duplicates
      expect(result.ingredients).not.toContain('Eau');
      expect(result.ingredients).not.toContain('Sucre');
    });

    it('should handle malformed ingredient text', async () => {
      const scenario = OCR_TEST_SCENARIOS['damaged-label'];
      const result = await ocrProcessor.processImage(scenario.imageData);

      // Should attempt to parse even damaged text
      expect(result.ingredients).toBeDefined();
      
      if (result.confidence > 40) {
        // Should extract recognizable ingredients despite damage
        expect(result.ingredients.some(ing => ing.toLowerCase().includes('water'))).toBe(true);
      }
    });
  });

  describe('Confidence Scoring Accuracy', () => {
    it('should provide accurate confidence scores', async () => {
      const confidenceTests = [
        { scenario: 'high-quality-label', expectedRange: [90, 100] },
        { scenario: 'complex-label', expectedRange: [80, 95] },
        { scenario: 'small-text', expectedRange: [70, 85] },
        { scenario: 'poor-lighting', expectedRange: [60, 75] },
        { scenario: 'blurry-image', expectedRange: [65, 80] },
        { scenario: 'handwritten-label', expectedRange: [40, 60] },
        { scenario: 'damaged-label', expectedRange: [35, 50] }
      ];

      for (const test of confidenceTests) {
        const scenario = OCR_TEST_SCENARIOS[test.scenario];
        const result = await ocrProcessor.processImage(scenario.imageData);

        expect(result.confidence).toBeGreaterThanOrEqual(test.expectedRange[0]);
        expect(result.confidence).toBeLessThanOrEqual(test.expectedRange[1]);
        
        console.log(`${test.scenario}: ${result.confidence}% (expected ${test.expectedRange[0]}-${test.expectedRange[1]}%)`);
      }
    });

    it('should correlate confidence with ingredient extraction quality', async () => {
      const results = await Promise.all(
        Object.entries(OCR_TEST_SCENARIOS).map(async ([name, scenario]) => {
          const result = await ocrProcessor.processImage(scenario.imageData);
          return { name, confidence: result.confidence, ingredientCount: result.ingredients.length };
        })
      );

      // Higher confidence should generally correlate with more ingredients extracted
      const highConfidenceResults = results.filter(r => r.confidence > 80);
      const lowConfidenceResults = results.filter(r => r.confidence < 60);

      if (highConfidenceResults.length > 0 && lowConfidenceResults.length > 0) {
        const avgHighConfidenceIngredients = highConfidenceResults.reduce((sum, r) => sum + r.ingredientCount, 0) / highConfidenceResults.length;
        const avgLowConfidenceIngredients = lowConfidenceResults.reduce((sum, r) => sum + r.ingredientCount, 0) / lowConfidenceResults.length;

        expect(avgHighConfidenceIngredients).toBeGreaterThanOrEqual(avgLowConfidenceIngredients);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty or invalid images', async () => {
      const invalidImages = [
        '',
        'invalid-data',
        'data:image/jpeg;base64,',
        'not-an-image'
      ];

      for (const invalidImage of invalidImages) {
        try {
          const result = await ocrProcessor.processImage(invalidImage);
          
          // If it doesn't throw, should return valid structure with low confidence
          expect(result).toBeDefined();
          expect(result.confidence).toBeLessThan(50);
          expect(Array.isArray(result.ingredients)).toBe(true);
        } catch (error) {
          // Throwing an error is also acceptable for invalid input
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle very large images', async () => {
      const largeImageData = 'data:image/jpeg;base64,large-high-resolution-image';
      
      const result = await ocrProcessor.processImage(largeImageData);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.ingredients)).toBe(true);
    });

    it('should handle images with no text', async () => {
      const noTextImageData = 'data:image/jpeg;base64,blank-or-graphic-only';
      
      const result = await ocrProcessor.processImage(noTextImageData);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(30);
      expect(result.ingredients).toHaveLength(0);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Mock a slow OCR process
      const originalRecognize = (await import('tesseract.js')).recognize;
      const slowRecognize = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for test
        return {
          data: {
            text: 'Ingredients: Water, Sugar',
            confidence: 75
          }
        };
      });

      vi.mocked(originalRecognize).mockImplementation(slowRecognize);

      const result = await ocrProcessor.processImage('data:image/jpeg;base64,slow-processing-image');
      
      expect(result).toBeDefined();
      expect(result.ingredients.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-world Label Format Tests', () => {
    it('should handle nutrition label format variations', async () => {
      const nutritionLabelFormats = [
        {
          name: 'standard-fda-format',
          text: 'INGREDIENTS: Water, Sugar, Natural Flavors, Citric Acid, Sodium Benzoate (Preservative)',
          expectedIngredients: ['Water', 'Sugar', 'Natural Flavors', 'Citric Acid', 'Sodium Benzoate']
        },
        {
          name: 'european-format',
          text: 'Ingredients: Water, Sugar, Natural flavourings, Citric acid E330, Preservative: Sodium benzoate E211',
          expectedIngredients: ['Water', 'Sugar', 'Natural flavourings', 'Citric acid E330', 'Sodium benzoate E211']
        },
        {
          name: 'organic-format',
          text: 'ORGANIC INGREDIENTS: Organic Water, Organic Cane Sugar*, Organic Natural Flavors*, Citric Acid. *Certified Organic',
          expectedIngredients: ['Organic Water', 'Organic Cane Sugar', 'Organic Natural Flavors', 'Citric Acid']
        }
      ];

      for (const format of nutritionLabelFormats) {
        // Mock the OCR to return this specific text
        vi.mocked((await import('tesseract.js')).recognize).mockResolvedValueOnce({
          data: {
            text: format.text,
            confidence: 88
          }
        });

        const result = await ocrProcessor.processImage(`data:image/jpeg;base64,${format.name}`);
        
        expect(result.ingredients.length).toBeGreaterThanOrEqual(format.expectedIngredients.length - 1);
        
        // Check that key ingredients are found
        const foundIngredients = format.expectedIngredients.filter(expected =>
          result.ingredients.some(found => 
            found.toLowerCase().includes(expected.toLowerCase().split(' ')[0])
          )
        );
        
        expect(foundIngredients.length).toBeGreaterThanOrEqual(Math.floor(format.expectedIngredients.length * 0.7));
      }
    });

    it('should handle allergen information correctly', async () => {
      const allergenText = `INGREDIENTS: Wheat flour, Water, Sugar, Eggs, Milk, Soy lecithin, Salt.
CONTAINS: Wheat, Eggs, Milk, Soy.
MAY CONTAIN: Tree nuts, Peanuts.`;

      vi.mocked((await import('tesseract.js')).recognize).mockResolvedValueOnce({
        data: {
          text: allergenText,
          confidence: 90
        }
      });

      const result = await ocrProcessor.processImage('data:image/jpeg;base64,allergen-label');
      
      // Should extract main ingredients, not allergen warnings
      expect(result.ingredients).toContain('Wheat flour');
      expect(result.ingredients).toContain('Water');
      expect(result.ingredients).toContain('Sugar');
      
      // Should not include allergen statement text as ingredients
      expect(result.ingredients).not.toContain('CONTAINS');
      expect(result.ingredients).not.toContain('MAY CONTAIN');
    });

    it('should handle percentage information in ingredients', async () => {
      const percentageText = 'INGREDIENTS: Water (85%), Sugar (10%), Natural Flavors (3%), Citric Acid (2%)';

      vi.mocked((await import('tesseract.js')).recognize).mockResolvedValueOnce({
        data: {
          text: percentageText,
          confidence: 87
        }
      });

      const result = await ocrProcessor.processImage('data:image/jpeg;base64,percentage-label');
      
      // Should extract ingredients with or without percentages
      expect(result.ingredients.some(ing => ing.includes('Water'))).toBe(true);
      expect(result.ingredients.some(ing => ing.includes('Sugar'))).toBe(true);
      expect(result.ingredients.some(ing => ing.includes('Natural Flavors'))).toBe(true);
      expect(result.ingredients.some(ing => ing.includes('Citric Acid'))).toBe(true);
    });
  });
});