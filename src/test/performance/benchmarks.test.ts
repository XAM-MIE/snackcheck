/**
 * Performance benchmarks and automated testing
 * Validates the 5-second scan-to-result requirement and other performance metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../utils/performance';
import { HealthScoreCalculator } from '../../services/HealthScoreCalculator';
import { OCRProcessor } from '../../services/OCRProcessor';
import { IngredientLookup } from '../../services/IngredientLookup';

// Mock browser performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn().mockReturnValue([]),
    memory: {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 20000000,
      jsHeapSizeLimit: 100000000
    }
  }
});

// Mock Tesseract.js for OCR testing
vi.mock('tesseract.js', () => ({
  recognize: vi.fn().mockImplementation(async (image: any, lang: string) => {
    // Simulate fast OCR processing for tests
    const processingTime = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    return {
      data: {
        text: 'Ingredients: Water, Sugar, Natural Flavors, Citric Acid, Sodium Benzoate',
        confidence: 85 + Math.random() * 10 // 85-95% confidence
      }
    };
  })
}));

// Performance test data sets
const PERFORMANCE_TEST_DATASETS = {
  simple: {
    ingredients: ['water', 'sugar', 'salt'],
    expectedProcessingTime: 100, // ms
    description: 'Simple 3-ingredient product'
  },
  moderate: {
    ingredients: ['water', 'sugar', 'natural flavors', 'citric acid', 'sodium benzoate', 'artificial colors', 'preservatives'],
    expectedProcessingTime: 200, // ms
    description: 'Moderate 7-ingredient product'
  },
  complex: {
    ingredients: [
      'water', 'high fructose corn syrup', 'natural and artificial flavors', 
      'citric acid', 'sodium benzoate', 'potassium sorbate', 'red dye 40',
      'blue dye 1', 'yellow dye 6', 'caramel color', 'phosphoric acid',
      'caffeine', 'natural caffeine', 'gum arabic', 'glycerol ester of rosin'
    ],
    expectedProcessingTime: 300, // ms
    description: 'Complex 15-ingredient product'
  },
  extreme: {
    ingredients: Array.from({ length: 50 }, (_, i) => `ingredient_${i + 1}`),
    expectedProcessingTime: 500, // ms
    description: 'Extreme 50-ingredient product'
  }
};

describe('Performance Benchmarks', () => {
  let performanceMonitor: PerformanceMonitor;
  let healthCalculator: HealthScoreCalculator;
  let ocrProcessor: OCRProcessor;
  let ingredientLookup: IngredientLookup;

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.clear();
    healthCalculator = new HealthScoreCalculator();
    ocrProcessor = new OCRProcessor();
    ingredientLookup = new IngredientLookup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Overall Scan-to-Result Performance', () => {
    it('should meet 5-second scan-to-result requirement for simple products', async () => {
      const testData = PERFORMANCE_TEST_DATASETS.simple;
      
      performanceMonitor.startTiming('fullScanFlow');
      
      // 1. OCR Processing (simulated)
      performanceMonitor.startTiming('ocrProcessing');
      const mockImageData = 'data:image/jpeg;base64,mockSimpleImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      performanceMonitor.endTiming('ocrProcessing');
      
      // 2. Ingredient Lookup (simulated parallel processing)
      performanceMonitor.startTiming('ingredientLookup');
      const ingredientPromises = testData.ingredients.map(ingredient => 
        ingredientLookup.lookupIngredient(ingredient)
      );
      const ingredientData = await Promise.all(ingredientPromises);
      performanceMonitor.endTiming('ingredientLookup');
      
      // 3. Health Score Calculation
      performanceMonitor.startTiming('healthScoring');
      const healthScore = healthCalculator.calculateScore(ingredientData);
      performanceMonitor.endTiming('healthScoring');
      
      const totalTime = performanceMonitor.endTiming('fullScanFlow');
      
      // Verify results
      expect(ocrResult).toBeDefined();
      expect(ingredientData).toHaveLength(testData.ingredients.length);
      expect(healthScore).toBeDefined();
      expect(healthScore.overall).toBeGreaterThanOrEqual(0);
      expect(healthScore.overall).toBeLessThanOrEqual(100);
      
      // Performance requirement: 5 seconds (5000ms)
      expect(totalTime).toBeLessThan(5000);
      
      console.log(`Simple product scan completed in ${totalTime}ms`);
    });

    it('should meet 5-second requirement for moderate complexity products', async () => {
      const testData = PERFORMANCE_TEST_DATASETS.moderate;
      
      performanceMonitor.startTiming('fullScanFlow');
      
      const mockImageData = 'data:image/jpeg;base64,mockModerateImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      
      const ingredientPromises = testData.ingredients.map(ingredient => 
        ingredientLookup.lookupIngredient(ingredient)
      );
      const ingredientData = await Promise.all(ingredientPromises);
      
      const healthScore = healthCalculator.calculateScore(ingredientData);
      const totalTime = performanceMonitor.endTiming('fullScanFlow');
      
      expect(totalTime).toBeLessThan(5000);
      expect(healthScore.factors.length).toBeGreaterThan(0);
      
      console.log(`Moderate product scan completed in ${totalTime}ms`);
    });

    it('should handle complex products within performance bounds', async () => {
      const testData = PERFORMANCE_TEST_DATASETS.complex;
      
      performanceMonitor.startTiming('fullScanFlow');
      
      const mockImageData = 'data:image/jpeg;base64,mockComplexImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      
      const ingredientPromises = testData.ingredients.map(ingredient => 
        ingredientLookup.lookupIngredient(ingredient)
      );
      const ingredientData = await Promise.all(ingredientPromises);
      
      const healthScore = healthCalculator.calculateScore(ingredientData);
      const totalTime = performanceMonitor.endTiming('fullScanFlow');
      
      // Complex products may take slightly longer but should still be reasonable
      expect(totalTime).toBeLessThan(7000); // 7 second allowance for complex products
      expect(healthScore.factors.length).toBeGreaterThan(0);
      
      console.log(`Complex product scan completed in ${totalTime}ms`);
    });

    it('should handle extreme cases gracefully', async () => {
      const testData = PERFORMANCE_TEST_DATASETS.extreme;
      
      performanceMonitor.startTiming('fullScanFlow');
      
      const mockImageData = 'data:image/jpeg;base64,mockExtremeImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      
      // Process in batches for extreme cases
      const batchSize = 10;
      const ingredientData = [];
      
      for (let i = 0; i < testData.ingredients.length; i += batchSize) {
        const batch = testData.ingredients.slice(i, i + batchSize);
        const batchPromises = batch.map(ingredient => 
          ingredientLookup.lookupIngredient(ingredient)
        );
        const batchResults = await Promise.all(batchPromises);
        ingredientData.push(...batchResults);
      }
      
      const healthScore = healthCalculator.calculateScore(ingredientData);
      const totalTime = performanceMonitor.endTiming('fullScanFlow');
      
      // Extreme cases may take longer but should not timeout
      expect(totalTime).toBeLessThan(10000); // 10 second maximum
      expect(ingredientData).toHaveLength(testData.ingredients.length);
      
      console.log(`Extreme product scan completed in ${totalTime}ms`);
    });
  });

  describe('Individual Component Performance', () => {
    it('should benchmark OCR processing performance', async () => {
      const testImages = [
        'data:image/jpeg;base64,mockImage1',
        'data:image/jpeg;base64,mockImage2',
        'data:image/jpeg;base64,mockImage3',
        'data:image/jpeg;base64,mockImage4',
        'data:image/jpeg;base64,mockImage5'
      ];

      const processingTimes: number[] = [];

      for (const imageData of testImages) {
        performanceMonitor.startTiming('ocrTest');
        const result = await ocrProcessor.processImage(imageData);
        const duration = performanceMonitor.endTiming('ocrTest');
        
        processingTimes.push(duration);
        
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.ingredients).toBeDefined();
      }

      const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxProcessingTime = Math.max(...processingTimes);
      
      // OCR should complete within 3 seconds on average
      expect(avgProcessingTime).toBeLessThan(3000);
      expect(maxProcessingTime).toBeLessThan(5000);
      
      console.log(`OCR average: ${avgProcessingTime}ms, max: ${maxProcessingTime}ms`);
    });

    it('should benchmark ingredient lookup performance', async () => {
      const testIngredients = [
        'water', 'sugar', 'salt', 'natural flavors', 'citric acid',
        'sodium benzoate', 'artificial colors', 'high fructose corn syrup',
        'partially hydrogenated oil', 'monosodium glutamate'
      ];

      performanceMonitor.startTiming('ingredientLookupBatch');
      
      const lookupPromises = testIngredients.map(ingredient => {
        performanceMonitor.startTiming(`lookup_${ingredient}`);
        return ingredientLookup.lookupIngredient(ingredient).then(result => {
          performanceMonitor.endTiming(`lookup_${ingredient}`);
          return result;
        });
      });

      const results = await Promise.all(lookupPromises);
      const totalTime = performanceMonitor.endTiming('ingredientLookupBatch');

      expect(results).toHaveLength(testIngredients.length);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.source).toBeDefined();
      });

      // Parallel lookup should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      
      console.log(`Ingredient lookup batch completed in ${totalTime}ms`);
    });

    it('should benchmark health score calculation performance', async () => {
      Object.values(PERFORMANCE_TEST_DATASETS).forEach(testData => {
        const mockIngredients = testData.ingredients.map(name => ({
          name,
          source: 'cache' as const,
          nutritionScore: Math.floor(Math.random() * 100),
          explanation: `Mock explanation for ${name}`
        }));

        performanceMonitor.startTiming(`healthCalc_${testData.description}`);
        const result = healthCalculator.calculateScore(mockIngredients);
        const duration = performanceMonitor.endTiming(`healthCalc_${testData.description}`);

        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(result.color).toMatch(/^(green|yellow|red)$/);
        
        // Health calculation should be very fast
        expect(duration).toBeLessThan(testData.expectedProcessingTime);
        
        console.log(`${testData.description} health calc: ${duration}ms`);
      });
    });
  });

  describe('Memory Performance', () => {
    it('should monitor memory usage during processing', async () => {
      const initialMemory = performanceMonitor.getMemoryUsage();
      
      // Perform multiple scans to test memory accumulation
      for (let i = 0; i < 10; i++) {
        const mockImageData = `data:image/jpeg;base64,mockImage${i}`;
        const ocrResult = await ocrProcessor.processImage(mockImageData);
        
        const ingredientData = await Promise.all([
          ingredientLookup.lookupIngredient('water'),
          ingredientLookup.lookupIngredient('sugar'),
          ingredientLookup.lookupIngredient('salt')
        ]);
        
        const healthScore = healthCalculator.calculateScore(ingredientData);
        
        expect(healthScore).toBeDefined();
      }

      const finalMemory = performanceMonitor.getMemoryUsage();
      
      if (initialMemory && finalMemory) {
        // Memory usage should not grow excessively
        const memoryGrowth = finalMemory.used - initialMemory.used;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
        
        console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
      }
    });

    it('should handle memory pressure gracefully', async () => {
      // Mock high memory usage scenario
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 80000000, // 80MB
          totalJSHeapSize: 90000000, // 90MB
          jsHeapSizeLimit: 100000000 // 100MB limit (90% usage)
        }
      });

      const testData = PERFORMANCE_TEST_DATASETS.moderate;
      
      performanceMonitor.startTiming('memoryPressureTest');
      
      const mockImageData = 'data:image/jpeg;base64,mockImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      
      const ingredientData = await Promise.all(
        testData.ingredients.map(ingredient => 
          ingredientLookup.lookupIngredient(ingredient)
        )
      );
      
      const healthScore = healthCalculator.calculateScore(ingredientData);
      const totalTime = performanceMonitor.endTiming('memoryPressureTest');
      
      // Should still complete successfully under memory pressure
      expect(healthScore).toBeDefined();
      expect(totalTime).toBeLessThan(8000); // May be slower under pressure
      
      console.log(`Memory pressure test completed in ${totalTime}ms`);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle multiple concurrent scans efficiently', async () => {
      const concurrentScans = 5;
      const scanPromises: Promise<any>[] = [];

      performanceMonitor.startTiming('concurrentScans');

      for (let i = 0; i < concurrentScans; i++) {
        const scanPromise = (async () => {
          const mockImageData = `data:image/jpeg;base64,mockImage${i}`;
          const ocrResult = await ocrProcessor.processImage(mockImageData);
          
          const ingredientData = await Promise.all([
            ingredientLookup.lookupIngredient('water'),
            ingredientLookup.lookupIngredient('sugar'),
            ingredientLookup.lookupIngredient(`ingredient${i}`)
          ]);
          
          return healthCalculator.calculateScore(ingredientData);
        })();
        
        scanPromises.push(scanPromise);
      }

      const results = await Promise.all(scanPromises);
      const totalTime = performanceMonitor.endTiming('concurrentScans');

      expect(results).toHaveLength(concurrentScans);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
      });

      // Concurrent processing should not be dramatically slower than sequential
      const expectedSequentialTime = concurrentScans * 2000; // 2s per scan
      expect(totalTime).toBeLessThan(expectedSequentialTime);
      
      console.log(`${concurrentScans} concurrent scans completed in ${totalTime}ms`);
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const completedScans: number[] = [];

      performanceMonitor.startTiming('loadTest');

      while (Date.now() - startTime < loadTestDuration) {
        const scanStart = Date.now();
        
        const mockImageData = 'data:image/jpeg;base64,loadTestImage';
        const ocrResult = await ocrProcessor.processImage(mockImageData);
        
        const ingredientData = await Promise.all([
          ingredientLookup.lookupIngredient('water'),
          ingredientLookup.lookupIngredient('sugar')
        ]);
        
        const healthScore = healthCalculator.calculateScore(ingredientData);
        
        const scanDuration = Date.now() - scanStart;
        completedScans.push(scanDuration);
        
        expect(healthScore).toBeDefined();
      }

      const totalTime = performanceMonitor.endTiming('loadTest');
      const avgScanTime = completedScans.reduce((a, b) => a + b, 0) / completedScans.length;
      const scansPerSecond = completedScans.length / (totalTime / 1000);

      expect(completedScans.length).toBeGreaterThan(0);
      expect(avgScanTime).toBeLessThan(5000); // Average scan under 5s
      
      console.log(`Load test: ${completedScans.length} scans, ${avgScanTime.toFixed(0)}ms avg, ${scansPerSecond.toFixed(1)} scans/sec`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in OCR processing', async () => {
      const baselineTime = 2000; // 2 second baseline
      const regressionThreshold = 1.5; // 50% slower is a regression

      const testRuns = 5;
      const processingTimes: number[] = [];

      for (let i = 0; i < testRuns; i++) {
        performanceMonitor.startTiming(`ocrRegression_${i}`);
        const mockImageData = `data:image/jpeg;base64,regressionTest${i}`;
        const result = await ocrProcessor.processImage(mockImageData);
        const duration = performanceMonitor.endTiming(`ocrRegression_${i}`);
        
        processingTimes.push(duration);
        expect(result).toBeDefined();
      }

      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const regressionRatio = avgTime / baselineTime;

      expect(regressionRatio).toBeLessThan(regressionThreshold);
      
      console.log(`OCR regression test: ${avgTime.toFixed(0)}ms avg (${regressionRatio.toFixed(2)}x baseline)`);
    });

    it('should detect performance regressions in health scoring', async () => {
      const baselineTime = 50; // 50ms baseline
      const regressionThreshold = 2.0; // 100% slower is a regression

      const testIngredients = PERFORMANCE_TEST_DATASETS.moderate.ingredients.map(name => ({
        name,
        source: 'cache' as const,
        nutritionScore: Math.floor(Math.random() * 100)
      }));

      const testRuns = 10;
      const processingTimes: number[] = [];

      for (let i = 0; i < testRuns; i++) {
        performanceMonitor.startTiming(`healthRegression_${i}`);
        const result = healthCalculator.calculateScore(testIngredients);
        const duration = performanceMonitor.endTiming(`healthRegression_${i}`);
        
        processingTimes.push(duration);
        expect(result).toBeDefined();
      }

      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const regressionRatio = avgTime / baselineTime;

      expect(regressionRatio).toBeLessThan(regressionThreshold);
      
      console.log(`Health scoring regression test: ${avgTime.toFixed(1)}ms avg (${regressionRatio.toFixed(2)}x baseline)`);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance report', async () => {
      // Run a complete scan to generate metrics
      performanceMonitor.startTiming('reportTest');
      
      const mockImageData = 'data:image/jpeg;base64,reportTestImage';
      const ocrResult = await ocrProcessor.processImage(mockImageData);
      
      const ingredientData = await Promise.all([
        ingredientLookup.lookupIngredient('water'),
        ingredientLookup.lookupIngredient('sugar'),
        ingredientLookup.lookupIngredient('salt')
      ]);
      
      const healthScore = healthCalculator.calculateScore(ingredientData);
      performanceMonitor.endTiming('reportTest');

      const report = performanceMonitor.generateReport();

      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalScanTime).toBeGreaterThan(0);
      expect(typeof report.summary.meetsTarget).toBe('boolean');
      expect(Array.isArray(report.summary.bottlenecks)).toBe(true);

      // Report should identify if performance targets are met
      expect(report.summary.totalScanTime).toBeLessThan(5000);
      expect(report.summary.meetsTarget).toBe(true);

      console.log('Performance Report:', JSON.stringify(report.summary, null, 2));
    });
  });
});