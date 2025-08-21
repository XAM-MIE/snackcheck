import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IngredientLookup } from '../IngredientLookup';
import { CacheManager } from '../../utils/cache';

// Mock fetch
global.fetch = vi.fn();

describe('IngredientLookup', () => {
    let ingredientLookup: IngredientLookup;
    let mockFetch: any;

    beforeEach(() => {
        mockFetch = vi.mocked(fetch);
        ingredientLookup = new IngredientLookup();
        // Clear cache before each test
        CacheManager.getInstance().clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('lookupIngredient', () => {
        it('should return cached ingredient data when available', async () => {
            const cachedData = {
                name: 'sugar',
                source: 'cache' as const,
                nutritionScore: 30,
                explanation: 'Refined sweetener that adds calories without nutrients'
            };

            // Pre-populate cache
            CacheManager.getInstance().set('ingredient_sugar', cachedData);

            const result = await ingredientLookup.lookupIngredient('sugar');

            expect(result).toEqual(cachedData);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should return common ingredient data for known ingredients', async () => {
            const result = await ingredientLookup.lookupIngredient('wheat flour');

            expect(result.name).toBe('wheat flour');
            expect(result.source).toBe('cache');
            expect(result.nutritionScore).toBe(60);
            expect(result.explanation).toContain('grain-based ingredient');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should query OpenFoodFacts API for unknown ingredients', async () => {
            const mockApiResponse = {
                products: [{
                    nutrition_grades: 'b',
                    nova_group: 2,
                    additives_tags: ['en:preservative']
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            const result = await ingredientLookup.lookupIngredient('unknown ingredient');

            expect(result.name).toBe('unknown ingredient');
            expect(result.source).toBe('openfoodfacts');
            expect(result.nutritionScore).toBe(75); // Grade 'b' maps to 75
            expect(result.additiveClass).toBe('preservative');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('unknown%20ingredient'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': 'SnackCheck/1.0 (https://snackcheck.app)'
                    })
                })
            );
        });

        it('should handle OpenFoodFacts API errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await ingredientLookup.lookupIngredient('unknown ingredient');

            expect(result.name).toBe('unknown ingredient');
            expect(result.source).toBe('cache');
            expect(result.explanation).toBe('Ingredient information not available in database');
        });

        it('should handle empty OpenFoodFacts response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ products: [] })
            });

            const result = await ingredientLookup.lookupIngredient('unknown ingredient');

            expect(result.name).toBe('unknown ingredient');
            expect(result.source).toBe('cache');
            expect(result.explanation).toBe('Ingredient information not available in database');
        });

        it('should normalize ingredient names consistently', async () => {
            const result1 = await ingredientLookup.lookupIngredient('  WHEAT FLOUR  ');
            const result2 = await ingredientLookup.lookupIngredient('wheat flour');
            const result3 = await ingredientLookup.lookupIngredient('organic wheat flour');

            expect(result1.name).toBe('wheat flour');
            expect(result2.name).toBe('wheat flour');
            expect(result3.name).toBe('wheat flour');

            // All should return the same cached common ingredient
            expect(result1.source).toBe('cache');
            expect(result2.source).toBe('cache');
            expect(result3.source).toBe('cache');
        });

        it('should cache API results for future lookups', async () => {
            const mockApiResponse = {
                products: [{
                    nutrition_grades: 'a',
                    nova_group: 1,
                    additives_tags: []
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            // First lookup should call API
            const result1 = await ingredientLookup.lookupIngredient('test ingredient');
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Second lookup should use cache
            const result2 = await ingredientLookup.lookupIngredient('test ingredient');
            expect(mockFetch).toHaveBeenCalledTimes(1); // No additional calls

            expect(result1).toEqual(result2);
            expect(result2.source).toBe('openfoodfacts');
        });
    });

    describe('parseNutritionGrade', () => {
        it('should correctly map nutrition grades to scores', async () => {
            const testCases = [
                { grade: 'a', expectedScore: 90 },
                { grade: 'b', expectedScore: 75 },
                { grade: 'c', expectedScore: 60 },
                { grade: 'd', expectedScore: 45 },
                { grade: 'e', expectedScore: 30 }
            ];

            for (const testCase of testCases) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        products: [{
                            nutrition_grades: testCase.grade,
                            nova_group: 1,
                            additives_tags: []
                        }]
                    })
                });

                const result = await ingredientLookup.lookupIngredient(`test-${testCase.grade}`);
                expect(result.nutritionScore).toBe(testCase.expectedScore);
            }
        });
    });

    describe('getAdditiveClass', () => {
        it('should correctly identify additive classes', async () => {
            const testCases = [
                { tags: ['en:preservative'], expectedClass: 'preservative' },
                { tags: ['en:colorant'], expectedClass: 'colorant' },
                { tags: ['en:emulsifier'], expectedClass: 'emulsifier' },
                { tags: ['en:sweetener'], expectedClass: 'sweetener' },
                { tags: ['en:antioxidant'], expectedClass: 'antioxidant' },
                { tags: ['en:some-other-additive'], expectedClass: 'additive' }
            ];

            for (const testCase of testCases) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        products: [{
                            nutrition_grades: 'c',
                            nova_group: 3,
                            additives_tags: testCase.tags
                        }]
                    })
                });

                const result = await ingredientLookup.lookupIngredient(`test-${testCase.expectedClass}`);
                expect(result.additiveClass).toBe(testCase.expectedClass);
            }
        });
    });

    describe('lookupIngredients', () => {
        it('should lookup multiple ingredients in parallel', async () => {
            const ingredients = ['sugar', 'salt', 'wheat flour'];

            const results = await ingredientLookup.lookupIngredients(ingredients);

            expect(results).toHaveLength(3);
            expect(results[0].name).toBe('sugar');
            expect(results[1].name).toBe('salt');
            expect(results[2].name).toBe('wheat flour');

            // All should be from common ingredients cache
            results.forEach(result => {
                expect(result.source).toBe('cache');
            });
        });

        it('should handle mixed known and unknown ingredients', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    products: [{
                        nutrition_grades: 'b',
                        nova_group: 2,
                        additives_tags: []
                    }]
                })
            });

            const ingredients = ['sugar', 'unknown ingredient'];
            const results = await ingredientLookup.lookupIngredients(ingredients);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('sugar');
            expect(results[0].source).toBe('cache');
            expect(results[1].name).toBe('unknown ingredient');
            expect(results[1].source).toBe('openfoodfacts');
        });
    });

    describe('getCommonIngredients', () => {
        it('should return array of common ingredients', () => {
            const commonIngredients = ingredientLookup.getCommonIngredients();

            expect(Array.isArray(commonIngredients)).toBe(true);
            expect(commonIngredients.length).toBeGreaterThan(40); // Should have 50+ ingredients

            // Check that all have required properties
            commonIngredients.forEach(ingredient => {
                expect(ingredient).toHaveProperty('name');
                expect(ingredient).toHaveProperty('source', 'cache');
                expect(ingredient).toHaveProperty('nutritionScore');
                expect(ingredient).toHaveProperty('explanation');
                expect(typeof ingredient.name).toBe('string');
                expect(typeof ingredient.nutritionScore).toBe('number');
                expect(typeof ingredient.explanation).toBe('string');
            });
        });

        it('should include expected common ingredients', () => {
            const commonIngredients = ingredientLookup.getCommonIngredients();
            const ingredientNames = commonIngredients.map(ing => ing.name);

            expect(ingredientNames).toContain('sugar');
            expect(ingredientNames).toContain('salt');
            expect(ingredientNames).toContain('wheat flour');
            expect(ingredientNames).toContain('water');
            expect(ingredientNames).toContain('olive oil');
        });
    });

    describe('error handling', () => {
        it('should handle API timeout gracefully', async () => {
            mockFetch.mockImplementationOnce(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            );

            const result = await ingredientLookup.lookupIngredient('timeout test');

            expect(result.name).toBe('timeout test');
            expect(result.source).toBe('cache');
            expect(result.explanation).toBe('Ingredient information not available in database');
        });

        it('should handle malformed API response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ invalid: 'response' })
            });

            const result = await ingredientLookup.lookupIngredient('malformed test');

            expect(result.name).toBe('malformed test');
            expect(result.source).toBe('cache');
            expect(result.explanation).toBe('Ingredient information not available in database');
        });

        it('should handle API returning non-ok status', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await ingredientLookup.lookupIngredient('server error test');

            expect(result.name).toBe('server error test');
            expect(result.source).toBe('cache');
            expect(result.explanation).toBe('Ingredient information not available in database');
        });
    });
});