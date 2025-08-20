// Application constants

export const HEALTH_SCORE_THRESHOLDS = {
  GREEN: 70,
  YELLOW: 40,
  RED: 0,
} as const;

export const OCR_CONFIG = {
  MIN_CONFIDENCE: 60,
  TIMEOUT_MS: 10000,
} as const;

export const CACHE_CONFIG = {
  INGREDIENT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_ENTRIES: 1000,
} as const;

export const API_ENDPOINTS = {
  OPENFOODFACTS: 'https://world.openfoodfacts.org/api/v0/product',
} as const;

export const PERFORMANCE_TARGETS = {
  SCAN_TO_RESULT_MS: 5000,
} as const;