import { createWorker, Worker } from 'tesseract.js';
import { OCRResult } from '../utils/types';

export class OCRProcessor {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the Tesseract worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.worker = await createWorker('eng');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('OCR initialization failed');
    }
  }

  /**
   * Process an image and extract text using OCR
   */
  async processImage(imageData: string): Promise<OCRResult> {
    try {
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      const { data } = await this.worker.recognize(imageData);
      const extractedText = data.text;
      const confidence = data.confidence;

      // Parse ingredients from the extracted text
      const ingredients = this.parseIngredients(extractedText);

      return {
        text: extractedText,
        confidence,
        ingredients
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      // Re-throw the original error if it's an initialization error
      if (error instanceof Error && error.message === 'OCR initialization failed') {
        throw error;
      }
      throw new Error('Failed to process image with OCR');
    }
  }

  /**
   * Parse ingredient lists from OCR text
   */
  private parseIngredients(text: string): string[] {
    // Clean up the text
    const cleanText = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Look for common ingredient list patterns
    const ingredientPatterns = [
      /contains?\s*:?\s*([^.]+)/i,
      /ingredients?\s*:?\s*([^.]+)/i,
      /made\s+with\s*:?\s*([^.]+)/i
    ];

    let ingredientText = '';
    
    // Try to find ingredient list using patterns
    for (const pattern of ingredientPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        ingredientText = match[1];
        break;
      }
    }

    // If no pattern matched, try to extract from the whole text
    if (!ingredientText) {
      // Look for text that contains commas (likely ingredient lists)
      const sentences = cleanText.split(/[.!?]/);
      for (const sentence of sentences) {
        if (sentence.includes(',') && sentence.length > 20) {
          ingredientText = sentence.trim();
          break;
        }
      }
    }

    if (!ingredientText) {
      return [];
    }

    // First, handle parenthetical content by extracting ingredients from within parentheses
    // and removing the parentheses from the main text
    let processedText = ingredientText;
    const parentheticalIngredients: string[] = [];
    
    // Extract ingredients from parentheses
    const parenthesesMatches = ingredientText.match(/\([^)]+\)/g);
    if (parenthesesMatches) {
      parenthesesMatches.forEach(match => {
        const innerText = match.slice(1, -1); // Remove parentheses
        if (innerText.includes(',')) {
          // Split parenthetical ingredients
          const innerIngredients = innerText.split(',').map(ing => ing.trim());
          parentheticalIngredients.push(...innerIngredients);
        }
      });
    }
    
    // Remove parenthetical content from main text
    processedText = processedText.replace(/\([^)]*\)/g, '');

    // Split ingredients and clean them up
    const ingredients = processedText
      .split(/[,;]/)
      .map(ingredient => ingredient.trim())
      .filter(ingredient => {
        // Filter out empty strings and very short words (likely OCR errors)
        return ingredient.length > 2 && 
               !ingredient.match(/^\d+$/) && // Remove pure numbers
               !ingredient.match(/^[^\w\s]+$/); // Remove strings with only special characters
      })
      .concat(parentheticalIngredients) // Add parenthetical ingredients
      .map(ingredient => {
        // Clean up common OCR artifacts
        let cleaned = ingredient
          .replace(/[[\]{}]/g, '') // Remove brackets
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/^[^a-zA-Z]+/, '') // Remove leading non-letters
          .replace(/[^a-zA-Z\s]+$/, '') // Remove trailing non-letters
          .trim()
          .toLowerCase(); // Convert to lowercase for consistency

        return cleaned;
      })
      .filter(ingredient => ingredient.length > 2); // Final length check

    return ingredients;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get demo images for testing and fallback purposes
   */
  static getDemoImages(): { name: string; path: string; expectedIngredients: string[] }[] {
    return [
      {
        name: 'Cereal Box',
        path: '/demo-images/cereal-label.jpg',
        expectedIngredients: ['whole grain oats', 'sugar', 'salt', 'natural flavor', 'vitamin e']
      },
      {
        name: 'Snack Bar',
        path: '/demo-images/snack-bar-label.jpg', 
        expectedIngredients: ['almonds', 'dates', 'cocoa powder', 'vanilla extract', 'sea salt']
      },
      {
        name: 'Yogurt Cup',
        path: '/demo-images/yogurt-label.jpg',
        expectedIngredients: ['milk', 'live cultures', 'sugar', 'natural strawberry flavor', 'pectin']
      },
      {
        name: 'Crackers',
        path: '/demo-images/crackers-label.jpg',
        expectedIngredients: ['wheat flour', 'vegetable oil', 'salt', 'yeast', 'malted barley flour']
      },
      {
        name: 'Juice Box',
        path: '/demo-images/juice-label.jpg',
        expectedIngredients: ['apple juice concentrate', 'water', 'natural flavor', 'vitamin c']
      }
    ];
  }
}