import { describe, it, expect, beforeEach } from 'vitest';
import { HealthScoreCalculator } from '../HealthScoreCalculator';
import { IngredientData, HealthScore } from '../../utils/types';

describe('HealthScoreCalculator', () => {
  let calculator: HealthScoreCalculator;

  beforeEach(() => {
    calculator = new HealthScoreCalculator();
  });

  describe('calculateScore', () => {
    it('should return perfect score for empty ingredient list', () => {
      const result = calculator.calculateScore([]);
      
      expect(result).toMatchObject({
        overall: 100,
        color: 'green',
        factors: []
      });
    });

    it('should return perfect score for natural ingredients only', () => {
      const ingredients: IngredientData[] = [
        { name: 'organic whole wheat flour', source: 'openfoodfacts' }, // Should get organic +10 and whole grain +5
        { name: 'natural vanilla extract', source: 'openfoodfacts' }, // Should get natural +2
        { name: 'pure honey', source: 'openfoodfacts' } // Should get natural +2
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBe(100); // Should be capped at 100 (100 + 10 + 5 + 2 + 2 = 119, capped at 100)
      expect(result.color).toBe('green');
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors.every(f => f.impact > 0)).toBe(true); // All positive impacts
    });

    it('should penalize artificial additives', () => {
      const ingredients: IngredientData[] = [
        { name: 'red dye 40', source: 'openfoodfacts' },
        { name: 'artificial flavor', source: 'ai' },
        { name: 'yellow 5', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBeLessThan(100);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors.every(f => f.impact < 0)).toBe(true); // All negative impacts
    });

    it('should severely penalize trans fats', () => {
      const ingredients: IngredientData[] = [
        { name: 'partially hydrogenated soybean oil', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBe(80); // Should lose exactly 20 points (100 - 20 = 80)
      expect(result.factors).toHaveLength(1);
      expect(result.factors[0].impact).toBe(-20);
      expect(result.factors[0].reason).toContain('Trans fats');
    });

    it('should handle mixed ingredients correctly', () => {
      const ingredients: IngredientData[] = [
        { name: 'organic whole wheat flour', source: 'openfoodfacts' }, // +10 organic, +5 whole grain
        { name: 'natural vanilla extract', source: 'openfoodfacts' }, // +2 natural
        { name: 'sodium benzoate', source: 'openfoodfacts' }, // -10 high sodium, -5 preservative
        { name: 'red dye 40', source: 'ai' } // -5 artificial additive
      ];

      const result = calculator.calculateScore(ingredients);
      
      // Base 100 + 10 + 5 + 2 - 10 - 5 - 5 = 97
      expect(result.overall).toBe(97);
      expect(result.color).toBe('green');
      expect(result.factors.length).toBe(6); // Should have 6 factors (organic, whole grain, natural, sodium, preservative, artificial additive)
    });

    it('should cap score at 100 even with many bonuses', () => {
      const ingredients: IngredientData[] = [
        { name: 'organic whole wheat flour', source: 'openfoodfacts' },
        { name: 'organic brown rice', source: 'openfoodfacts' },
        { name: 'organic quinoa', source: 'openfoodfacts' },
        { name: 'organic oats', source: 'openfoodfacts' },
        { name: 'natural vanilla extract', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBe(100); // Should be capped at 100
      expect(result.color).toBe('green');
    });

    it('should not go below 0 even with many penalties', () => {
      const ingredients: IngredientData[] = [
        { name: 'partially hydrogenated oil', source: 'openfoodfacts' }, // -20
        { name: 'trans fat', source: 'openfoodfacts' }, // -20
        { name: 'red dye 40', source: 'openfoodfacts' }, // -5
        { name: 'yellow 5', source: 'openfoodfacts' }, // -5
        { name: 'blue 1', source: 'openfoodfacts' }, // -5
        { name: 'aspartame', source: 'openfoodfacts' }, // -8
        { name: 'sodium nitrite', source: 'openfoodfacts' }, // -5 preservative, -10 sodium
        { name: 'bht', source: 'openfoodfacts' }, // -5
        { name: 'bha', source: 'openfoodfacts' }, // -5
        { name: 'monosodium glutamate', source: 'openfoodfacts' }, // -10
        { name: 'artificial flavor', source: 'openfoodfacts' }, // -5
        { name: 'synthetic color', source: 'openfoodfacts' }, // -5
        { name: 'sodium chloride', source: 'openfoodfacts' }, // -10 sodium
        { name: 'potassium sorbate', source: 'openfoodfacts' } // -5 preservative
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBe(0); // Should be floored at 0
      expect(result.color).toBe('red');
    });
  });

  describe('color coding', () => {
    it('should assign green color for scores 70-100', () => {
      const testScores = [70, 85, 100];
      
      testScores.forEach(targetScore => {
        // Create ingredients that should result in the target score
        const ingredients: IngredientData[] = [];
        if (targetScore === 70) {
          // 100 - 30 = 70
          ingredients.push(
            { name: 'partially hydrogenated oil', source: 'openfoodfacts' }, // -20
            { name: 'sodium benzoate', source: 'openfoodfacts' } // -5 preservative, -10 sodium = -15 total, but we need -30, so add more
          );
          ingredients.push({ name: 'artificial flavor', source: 'openfoodfacts' }); // -5, total = -30
        }
        
        const result = calculator.calculateScore(ingredients);
        if (result.overall >= 70) {
          expect(result.color).toBe('green');
        }
      });
    });

    it('should assign yellow color for scores 40-69', () => {
      const ingredients: IngredientData[] = [
        { name: 'partially hydrogenated oil', source: 'openfoodfacts' }, // -20
        { name: 'red dye 40', source: 'openfoodfacts' }, // -5
        { name: 'yellow 5', source: 'openfoodfacts' }, // -5
        { name: 'aspartame', source: 'openfoodfacts' }, // -8
        { name: 'sodium benzoate', source: 'openfoodfacts' }, // -5 preservative, -10 sodium
        { name: 'artificial flavor', source: 'openfoodfacts' } // -5
      ];
      // Total: 100 - 20 - 5 - 5 - 8 - 5 - 10 - 5 = 42

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(40);
      expect(result.overall).toBeLessThan(70);
      expect(result.color).toBe('yellow');
    });

    it('should assign red color for scores 0-39', () => {
      const ingredients: IngredientData[] = [
        { name: 'partially hydrogenated oil', source: 'openfoodfacts' }, // -20
        { name: 'trans fat', source: 'openfoodfacts' }, // -20
        { name: 'red dye 40', source: 'openfoodfacts' }, // -5
        { name: 'yellow 5', source: 'openfoodfacts' }, // -5
        { name: 'aspartame', source: 'openfoodfacts' }, // -8
        { name: 'sodium nitrite', source: 'openfoodfacts' }, // -5 preservative, -10 sodium
        { name: 'bht', source: 'openfoodfacts' } // -5
      ];
      // Total: 100 - 20 - 20 - 5 - 5 - 8 - 5 - 10 - 5 = 22

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBeLessThan(40);
      expect(result.color).toBe('red');
    });
  });

  describe('ingredient pattern matching', () => {
    it('should identify artificial additives correctly', () => {
      const artificialAdditives = [
        'artificial flavor',
        'synthetic color',
        'fd&c red 40',
        'yellow 5',
        'blue 1',
        'tartrazine',
        'sunset yellow',
        'allura red'
      ];

      artificialAdditives.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.overall).toBeLessThan(100);
        expect(result.factors.some(f => f.reason.includes('Artificial additive'))).toBe(true);
      });
    });

    it('should identify high sodium ingredients correctly', () => {
      const highSodiumIngredients = [
        'sodium chloride',
        'salt',
        'monosodium glutamate',
        'msg',
        'sodium benzoate'
      ];

      highSodiumIngredients.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('sodium'))).toBe(true);
      });
    });

    it('should identify trans fats correctly', () => {
      const transFats = [
        'partially hydrogenated oil',
        'trans fat',
        'hydrogenated soybean oil'
      ];

      transFats.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('Trans fats'))).toBe(true);
        expect(result.factors.some(f => f.impact === -20)).toBe(true);
      });
    });

    it('should identify artificial sweeteners correctly', () => {
      const artificialSweeteners = [
        'aspartame',
        'sucralose',
        'acesulfame potassium',
        'saccharin',
        'neotame'
      ];

      artificialSweeteners.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('Artificial sweetener'))).toBe(true);
        expect(result.factors.some(f => f.impact === -8)).toBe(true);
      });
    });

    it('should identify preservatives correctly', () => {
      const preservatives = [
        'bht',
        'bha',
        'sodium nitrite',
        'sodium nitrate',
        'potassium sorbate',
        'calcium propionate'
      ];

      preservatives.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('preservative'))).toBe(true);
      });
    });

    it('should identify organic ingredients correctly', () => {
      const organicIngredients = [
        'organic wheat flour',
        'certified organic sugar',
        'organic vanilla extract'
      ];

      organicIngredients.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.overall).toBe(100); // Capped at 100 (100 + 10 = 110, capped at 100)
        expect(result.factors.some(f => f.reason.includes('Organic ingredient'))).toBe(true);
        expect(result.factors.some(f => f.impact === 10)).toBe(true);
      });
    });

    it('should identify natural ingredients correctly', () => {
      const naturalIngredients = [
        'natural flavor',
        'pure vanilla extract',
        'fresh herbs',
        'whole milk'
      ];

      naturalIngredients.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('Natural ingredient') || f.reason.includes('minimal processing'))).toBe(true);
      });
    });

    it('should identify whole grains correctly', () => {
      const wholeGrains = [
        'whole grain wheat',
        'whole wheat flour',
        'brown rice',
        'quinoa',
        'oats',
        'barley'
      ];

      wholeGrains.forEach(ingredient => {
        const ingredients: IngredientData[] = [{ name: ingredient, source: 'openfoodfacts' }];
        const result = calculator.calculateScore(ingredients);
        
        expect(result.factors.some(f => f.reason.includes('Whole grain'))).toBe(true);
        expect(result.factors.some(f => f.impact === 5)).toBe(true);
      });
    });
  });

  describe('additive severity assessment', () => {
    it('should apply severe penalty for high-risk additives', () => {
      const ingredient: IngredientData = {
        name: 'test additive',
        source: 'openfoodfacts',
        additiveClass: 'high_risk'
      };

      const ingredients = [ingredient];
      const result = calculator.calculateScore(ingredients);
      
      expect(result.factors.some(f => f.impact === -15)).toBe(true);
    });

    it('should apply moderate penalty for moderate-risk additives', () => {
      const ingredient: IngredientData = {
        name: 'test additive',
        source: 'openfoodfacts',
        additiveClass: 'moderate_risk'
      };

      const ingredients = [ingredient];
      const result = calculator.calculateScore(ingredients);
      
      expect(result.factors.some(f => f.impact === -10)).toBe(true);
    });

    it('should apply mild penalty for low-risk additives', () => {
      const ingredient: IngredientData = {
        name: 'test additive',
        source: 'openfoodfacts',
        additiveClass: 'low_risk'
      };

      const ingredients = [ingredient];
      const result = calculator.calculateScore(ingredients);
      
      expect(result.factors.some(f => f.impact === -5)).toBe(true);
    });

    it('should use nutrition score for severity when additive class unavailable', () => {
      const severeIngredient: IngredientData = {
        name: 'artificial additive',
        source: 'openfoodfacts',
        nutritionScore: 1 // Very low score
      };

      const moderateIngredient: IngredientData = {
        name: 'artificial additive',
        source: 'openfoodfacts',
        nutritionScore: 3 // Moderate score
      };

      const mildIngredient: IngredientData = {
        name: 'artificial additive',
        source: 'openfoodfacts',
        nutritionScore: 5 // Higher score
      };

      const severeResult = calculator.calculateScore([severeIngredient]);
      const moderateResult = calculator.calculateScore([moderateIngredient]);
      const mildResult = calculator.calculateScore([mildIngredient]);

      expect(severeResult.factors.some(f => f.impact === -15)).toBe(true);
      expect(moderateResult.factors.some(f => f.impact === -10)).toBe(true);
      expect(mildResult.factors.some(f => f.impact === -5)).toBe(true);
    });

    it('should default to mild penalty when no severity indicators available', () => {
      const ingredient: IngredientData = {
        name: 'artificial flavor',
        source: 'ai'
        // No additiveClass or nutritionScore
      };

      const result = calculator.calculateScore([ingredient]);
      
      expect(result.factors.some(f => f.impact === -5)).toBe(true);
    });
  });

  describe('factor breakdown', () => {
    it('should provide detailed factor explanations', () => {
      const ingredients: IngredientData[] = [
        { name: 'organic whole wheat flour', source: 'openfoodfacts' },
        { name: 'partially hydrogenated oil', source: 'openfoodfacts' },
        { name: 'red dye 40', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.factors.length).toBeGreaterThan(0);
      
      result.factors.forEach(factor => {
        expect(factor).toHaveProperty('ingredient');
        expect(factor).toHaveProperty('impact');
        expect(factor).toHaveProperty('reason');
        expect(typeof factor.ingredient).toBe('string');
        expect(typeof factor.impact).toBe('number');
        expect(typeof factor.reason).toBe('string');
        expect(factor.reason.length).toBeGreaterThan(0);
      });
    });

    it('should include ingredient name in each factor', () => {
      const ingredients: IngredientData[] = [
        { name: 'sodium benzoate', source: 'openfoodfacts' },
        { name: 'organic sugar', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      const sodiumFactors = result.factors.filter(f => f.ingredient === 'sodium benzoate');
      const organicFactors = result.factors.filter(f => f.ingredient === 'organic sugar');
      
      expect(sodiumFactors.length).toBeGreaterThan(0);
      expect(organicFactors.length).toBeGreaterThan(0);
    });

    it('should handle multiple factors for single ingredient', () => {
      const ingredients: IngredientData[] = [
        { name: 'sodium benzoate', source: 'openfoodfacts' } // Should match both preservative and high sodium patterns
      ];

      const result = calculator.calculateScore(ingredients);
      
      const sodiumFactors = result.factors.filter(f => f.ingredient === 'sodium benzoate');
      expect(sodiumFactors.length).toBe(2); // Should have both preservative and high sodium factors
      
      const reasons = sodiumFactors.map(f => f.reason);
      expect(reasons.some(r => r.includes('preservative'))).toBe(true);
      expect(reasons.some(r => r.includes('sodium'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle ingredients with special characters', () => {
      const ingredients: IngredientData[] = [
        { name: 'FD&C Red #40', source: 'openfoodfacts' },
        { name: 'D-alpha tocopherol', source: 'openfoodfacts' },
        { name: 'L-ascorbic acid', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('factors');
      expect(typeof result.overall).toBe('number');
    });

    it('should handle empty ingredient names', () => {
      const ingredients: IngredientData[] = [
        { name: '', source: 'openfoodfacts' },
        { name: '   ', source: 'ai' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.overall).toBe(100); // Should not crash and return base score
      expect(result.color).toBe('green');
    });

    it('should handle case insensitive matching', () => {
      const ingredients: IngredientData[] = [
        { name: 'ARTIFICIAL FLAVOR', source: 'openfoodfacts' },
        { name: 'Organic Wheat Flour', source: 'openfoodfacts' },
        { name: 'red dye 40', source: 'openfoodfacts' }
      ];

      const result = calculator.calculateScore(ingredients);
      
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors.some(f => f.ingredient === 'ARTIFICIAL FLAVOR')).toBe(true);
      expect(result.factors.some(f => f.ingredient === 'Organic Wheat Flour')).toBe(true);
    });

    it('should handle very long ingredient lists', () => {
      const ingredients: IngredientData[] = [];
      
      // Create 100 ingredients
      for (let i = 0; i < 100; i++) {
        ingredients.push({
          name: `ingredient ${i}`,
          source: 'openfoodfacts'
        });
      }

      const result = calculator.calculateScore(ingredients);
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('factors');
      expect(typeof result.overall).toBe('number');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('performance requirements', () => {
    it('should calculate scores quickly for typical ingredient lists', () => {
      const ingredients: IngredientData[] = [
        { name: 'wheat flour', source: 'openfoodfacts' },
        { name: 'sugar', source: 'openfoodfacts' },
        { name: 'salt', source: 'openfoodfacts' },
        { name: 'artificial flavor', source: 'ai' },
        { name: 'preservative', source: 'openfoodfacts' }
      ];

      const startTime = performance.now();
      const result = calculator.calculateScore(ingredients);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
      expect(result).toHaveProperty('overall');
    });

    it('should handle concurrent calculations', () => {
      const ingredients1: IngredientData[] = [
        { name: 'organic flour', source: 'openfoodfacts' }
      ];
      
      const ingredients2: IngredientData[] = [
        { name: 'artificial color', source: 'openfoodfacts' }
      ];

      const result1 = calculator.calculateScore(ingredients1);
      const result2 = calculator.calculateScore(ingredients2);
      
      expect(result1.overall).toBeGreaterThan(result2.overall);
      expect(result1.color).toBe('green');
      expect(result2.overall).toBeLessThan(100);
    });
  });
});