import { HealthScore, ScoreFactor, IngredientData } from '../utils/types';
import { HEALTH_SCORE_THRESHOLDS } from '../utils/constants';

/**
 * HealthScoreCalculator service for calculating health scores based on ingredient data
 * 
 * Scoring Algorithm:
 * - Base Score: 100 points
 * - Deductions:
 *   - Artificial additives: -5 to -15 points each
 *   - High sodium ingredients: -10 points
 *   - Trans fats: -20 points
 *   - Artificial sweeteners: -8 points
 *   - Preservatives: -5 points
 * - Bonuses:
 *   - Natural ingredients: +2 points each
 *   - Organic certification indicators: +10 points
 *   - Whole grains: +5 points
 * 
 * Color Coding:
 * - Green (🟢): 70-100 points
 * - Yellow (🟡): 40-69 points  
 * - Red (🔴): 0-39 points
 */
export class HealthScoreCalculator {
  private static readonly BASE_SCORE = 100;
  
  // Scoring weights for different ingredient types
  private static readonly SCORING_WEIGHTS = {
    // Negative impacts (deductions)
    ARTIFICIAL_ADDITIVE_MILD: -5,
    ARTIFICIAL_ADDITIVE_MODERATE: -10,
    ARTIFICIAL_ADDITIVE_SEVERE: -15,
    HIGH_SODIUM: -10,
    TRANS_FAT: -20,
    ARTIFICIAL_SWEETENER: -8,
    PRESERVATIVE: -5,
    
    // Positive impacts (bonuses)
    NATURAL_INGREDIENT: 2,
    ORGANIC_INDICATOR: 10,
    WHOLE_GRAIN: 5,
  } as const;

  // Ingredient classification patterns
  private static readonly INGREDIENT_PATTERNS = {
    // Harmful additives
    ARTIFICIAL_ADDITIVES: [
      /artificial/i,
      /synthetic/i,
      /fd&c/i,
      /yellow \d+/i,
      /red \d+/i,
      /blue \d+/i,
      /tartrazine/i,
      /sunset yellow/i,
      /allura red/i,
      /red dye/i,
      /food coloring/i,
      /color added/i,
    ],
    
    HIGH_SODIUM: [
      /sodium/i,
      /\bsalt\b/i,
      /monosodium glutamate/i,
      /\bmsg\b/i,
      /sodium chloride/i,
      /sodium benzoate/i,
    ],
    
    TRANS_FATS: [
      /partially hydrogenated/i,
      /trans fat/i,
      /hydrogenated.*oil/i,
    ],
    
    ARTIFICIAL_SWEETENERS: [
      /aspartame/i,
      /sucralose/i,
      /acesulfame/i,
      /saccharin/i,
      /neotame/i,
    ],
    
    PRESERVATIVES: [
      /\bbht\b/i,
      /\bbha\b/i,
      /sodium nitrite/i,
      /sodium nitrate/i,
      /sodium benzoate/i,
      /potassium sorbate/i,
      /calcium propionate/i,
    ],
    
    // Beneficial ingredients
    NATURAL_INGREDIENTS: [
      /natural/i,
      /\bwhole\b/i,
      /fresh/i,
      /\bpure\b/i,
      /extract/i,
    ],
    
    ORGANIC_INDICATORS: [
      /organic/i,
      /certified organic/i,
    ],
    
    WHOLE_GRAINS: [
      /whole grain/i,
      /whole wheat/i,
      /brown rice/i,
      /quinoa/i,
      /\boats\b/i,
      /barley/i,
    ],
  } as const;

  /**
   * Calculate health score for a list of ingredients
   */
  public calculateScore(ingredients: IngredientData[]): HealthScore {
    let score = HealthScoreCalculator.BASE_SCORE;
    const factors: ScoreFactor[] = [];

    for (const ingredient of ingredients) {
      const ingredientFactors = this.analyzeIngredient(ingredient);
      factors.push(...ingredientFactors);
      
      // Apply score impacts
      for (const factor of ingredientFactors) {
        score += factor.impact;
      }
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      overall: Math.round(score),
      color: this.getColorCode(score),
      factors,
    };
  }

  /**
   * Analyze a single ingredient and return scoring factors
   */
  private analyzeIngredient(ingredient: IngredientData): ScoreFactor[] {
    const factors: ScoreFactor[] = [];
    const name = ingredient.name.toLowerCase();

    // Check for harmful additives
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.ARTIFICIAL_ADDITIVES)) {
      const severity = this.getAdditiveSeverity(ingredient);
      factors.push({
        ingredient: ingredient.name,
        impact: severity,
        reason: `Artificial additive with potential health concerns`,
      });
    }

    // Check for high sodium content
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.HIGH_SODIUM)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.HIGH_SODIUM,
        reason: `High sodium content may contribute to hypertension`,
      });
    }

    // Check for trans fats
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.TRANS_FATS)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.TRANS_FAT,
        reason: `Trans fats increase risk of heart disease`,
      });
    }

    // Check for artificial sweeteners
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.ARTIFICIAL_SWEETENERS)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_SWEETENER,
        reason: `Artificial sweetener with potential digestive effects`,
      });
    }

    // Check for preservatives
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.PRESERVATIVES)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.PRESERVATIVE,
        reason: `Chemical preservative may cause sensitivities`,
      });
    }

    // Check for beneficial ingredients (organic takes priority over natural)
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.ORGANIC_INDICATORS)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.ORGANIC_INDICATOR,
        reason: `Organic ingredient with reduced chemical exposure`,
      });
    } else if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.NATURAL_INGREDIENTS)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.NATURAL_INGREDIENT,
        reason: `Natural ingredient with minimal processing`,
      });
    }

    // Check for whole grains (separate from organic/natural check)
    if (this.matchesPatterns(name, HealthScoreCalculator.INGREDIENT_PATTERNS.WHOLE_GRAINS)) {
      factors.push({
        ingredient: ingredient.name,
        impact: HealthScoreCalculator.SCORING_WEIGHTS.WHOLE_GRAIN,
        reason: `Whole grain provides fiber and nutrients`,
      });
    }

    // Check for additive class-based penalties (for ingredients that have additive data but don't match artificial patterns)
    if (ingredient.additiveClass && factors.length === 0) {
      const severity = this.getAdditiveSeverity(ingredient);
      factors.push({
        ingredient: ingredient.name,
        impact: severity,
        reason: `Food additive with potential health concerns`,
      });
    }

    return factors;
  }

  /**
   * Determine additive severity based on ingredient data
   */
  private getAdditiveSeverity(ingredient: IngredientData): number {
    // Use OpenFoodFacts additive class if available
    if (ingredient.additiveClass) {
      switch (ingredient.additiveClass.toLowerCase()) {
        case 'high_risk':
          return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_SEVERE;
        case 'moderate_risk':
          return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_MODERATE;
        default:
          return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_MILD;
      }
    }

    // Use nutrition score if available
    if (ingredient.nutritionScore !== undefined) {
      if (ingredient.nutritionScore <= 2) {
        return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_SEVERE;
      } else if (ingredient.nutritionScore <= 4) {
        return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_MODERATE;
      }
    }

    // Default to mild impact
    return HealthScoreCalculator.SCORING_WEIGHTS.ARTIFICIAL_ADDITIVE_MILD;
  }

  /**
   * Check if ingredient name matches any of the given patterns
   */
  private matchesPatterns(name: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(name));
  }

  /**
   * Get color code based on score thresholds
   */
  private getColorCode(score: number): 'green' | 'yellow' | 'red' {
    if (score >= HEALTH_SCORE_THRESHOLDS.GREEN) {
      return 'green';
    } else if (score >= HEALTH_SCORE_THRESHOLDS.YELLOW) {
      return 'yellow';
    } else {
      return 'red';
    }
  }
}