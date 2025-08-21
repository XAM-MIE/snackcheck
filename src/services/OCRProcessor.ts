import { createWorker, Worker } from 'tesseract.js';
import { OCRResult } from '../utils/types';
import { SnackCheckError, withRetry, withTimeout, ErrorRecovery } from '../utils/errorHandling';
import { ImageOptimizer } from '../utils/imageOptimization';
import { PerformanceMonitor } from '../utils/performance';

export class OCRProcessor {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the Tesseract worker with retry logic
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      // Use retry mechanism for worker initialization
      this.worker = await withRetry(
        async () => {
          const worker = await createWorker('eng');
          // Test the worker with a simple operation
          await worker.recognize('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
          return worker;
        },
        { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
        'ocr_failure'
      );
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      await ErrorRecovery.recoverFromOCRFailure();
      throw new SnackCheckError(
        'ocr_failure',
        'Failed to initialize text recognition. Please refresh the page and try again.',
        error instanceof Error ? error.message : String(error),
        true
      );
    }
  }

  /**
   * Process an image and extract text using OCR with comprehensive error handling
   */
  async processImage(imageData: string): Promise<OCRResult> {
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.startTiming('ocrProcessing');
    
    try {
      // Validate input
      if (!imageData || !imageData.startsWith('data:image/')) {
        throw new SnackCheckError(
          'ocr_failure',
          'Invalid image data provided',
          'Image data must be a valid data URL',
          false
        );
      }

      // Optimize image for better OCR performance
      performanceMonitor.startTiming('imageOptimization');
      const optimizedImage = await ImageOptimizer.optimizeForOCR(imageData, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.9,
        enablePreprocessing: true,
      });
      performanceMonitor.endTiming('imageOptimization');

      await this.initializeWorker();
      
      if (!this.worker) {
        throw new SnackCheckError(
          'ocr_failure',
          'OCR worker not available',
          'Worker initialization succeeded but worker is null',
          true
        );
      }

      // Process with timeout (reduced to 20 seconds due to optimization)
      const { data } = await withTimeout(
        this.worker.recognize(optimizedImage),
        20000,
        'processing_timeout'
      );

      const extractedText = data.text?.trim() || '';
      const confidence = data.confidence / 100; // Normalize to 0-1

      // Validate OCR results
      if (!extractedText) {
        throw new SnackCheckError(
          'ocr_failure',
          'No text could be extracted from the image',
          'OCR returned empty text',
          true
        );
      }

      if (confidence < 0.3) {
        throw new SnackCheckError(
          'ocr_low_confidence',
          'Image quality is too low for accurate text recognition',
          `Confidence: ${(confidence * 100).toFixed(1)}%`,
          true
        );
      }

      // Parse ingredients from the extracted text
      const ingredients = this.parseIngredients(extractedText);

      if (ingredients.length === 0) {
        throw new SnackCheckError(
          'ocr_failure',
          'No ingredients could be identified in the text',
          `Extracted text: "${extractedText.substring(0, 100)}..."`,
          true
        );
      }

      const result = {
        text: extractedText,
        confidence,
        ingredients
      };

      performanceMonitor.endTiming('ocrProcessing');
      return result;
    } catch (error) {
      performanceMonitor.endTiming('ocrProcessing');
      console.error('OCR processing failed:', error);
      
      // Re-throw SnackCheckError instances
      if (error instanceof SnackCheckError) {
        throw error;
      }
      
      // Handle other errors
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new SnackCheckError(
            'processing_timeout',
            'Text recognition is taking too long',
            error.message,
            true
          );
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new SnackCheckError(
            'network_error',
            'Network error during text recognition',
            error.message,
            true
          );
        }
      }
      
      // Generic OCR failure
      throw new SnackCheckError(
        'ocr_failure',
        'Failed to process image with text recognition',
        error instanceof Error ? error.message : String(error),
        true
      );
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
        const cleaned = ingredient
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