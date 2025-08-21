// Core type definitions for SnackCheck

export interface OCRResult {
  text: string;
  confidence: number;
  ingredients: string[];
}

export interface IngredientData {
  name: string;
  source: 'openfoodfacts' | 'ai' | 'cache';
  nutritionScore?: number;
  additiveClass?: string;
  explanation?: string;
}

export interface HealthScore {
  overall: number; // 0-100
  color: 'green' | 'yellow' | 'red';
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  ingredient: string;
  impact: number;
  reason: string;
}

export interface ScanSession {
  id: string;
  timestamp: Date;
  imageData: string;
  ocrResult: OCRResult;
  ingredients: IngredientData[];
  healthScore: HealthScore;
  processingTime: number;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

export interface OpenFoodFactsResponse {
  product: {
    ingredients_text: string;
    additives_tags: string[];
    nutrition_grades: string;
    nova_group: number;
  };
}

export interface AIExplanationRequest {
  ingredient: string;
  context: 'food_additive' | 'natural_ingredient';
}

export interface AIExplanationResponse {
  explanation: string;
  healthImpact: 'positive' | 'neutral' | 'negative';
  commonUses: string[];
}

// Error handling types
export type ErrorType = 
  | 'ocr_failure'
  | 'ocr_low_confidence'
  | 'api_timeout'
  | 'api_unavailable'
  | 'network_error'
  | 'processing_timeout'
  | 'camera_permission'
  | 'camera_not_supported'
  | 'unknown_error';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  retryable: boolean;
  timestamp: Date;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export interface ProcessingProgress {
  stage: 'ocr' | 'ingredient_lookup' | 'health_calculation' | 'complete';
  progress: number; // 0-100
  message: string;
  timeElapsed: number;
}