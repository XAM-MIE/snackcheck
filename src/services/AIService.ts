import { AIExplanationRequest, AIExplanationResponse, IngredientData } from '../utils/types';

/**
 * Service for AI-powered ingredient explanations using Kiro LLM
 * Provides plain-English explanations for unknown or complex ingredients
 */
export class AIService {
  private static instance: AIService;
  private readonly timeout: number = 10000; // 10 second timeout
  private readonly maxRetries: number = 2;

  private constructor() {}

  /**
   * Get singleton instance of AIService
   */
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Get AI explanation for an ingredient
   */
  async getIngredientExplanation(ingredient: string, context?: 'food_additive' | 'natural_ingredient'): Promise<IngredientData> {
    const request: AIExplanationRequest = {
      ingredient: ingredient.trim(),
      context: context || this.determineContext(ingredient)
    };

    try {
      const response = await this.callAIService(request);
      return this.convertToIngredientData(ingredient, response);
    } catch (error) {
      console.warn(`AI explanation failed for ${ingredient}:`, error);
      return this.getFallbackExplanation(ingredient);
    }
  }

  /**
   * Batch process multiple ingredients for AI explanations
   */
  async getMultipleExplanations(ingredients: string[]): Promise<IngredientData[]> {
    const promises = ingredients.map(ingredient => 
      this.getIngredientExplanation(ingredient).catch(error => {
        console.warn(`Failed to get AI explanation for ${ingredient}:`, error);
        return this.getFallbackExplanation(ingredient);
      })
    );

    return Promise.all(promises);
  }

  /**
   * Call the AI service with timeout and retry logic
   */
  private async callAIService(request: AIExplanationRequest): Promise<AIExplanationResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await Promise.race([
          this.makeAIRequest(request),
          this.createTimeoutPromise()
        ]);

        if (response && this.isValidResponse(response)) {
          return response;
        } else {
          throw new Error('Invalid AI response received');
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI service attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff: wait 1s, then 2s
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Make the actual AI request using Kiro's LLM capabilities
   */
  private async makeAIRequest(request: AIExplanationRequest): Promise<AIExplanationResponse> {
    // Create a prompt for the AI to explain the ingredient
    const prompt = this.buildPrompt(request);

    try {
      // In a real Kiro environment, this would use the Kiro LLM API
      // For now, we'll simulate the AI response with intelligent heuristics
      // that provide better explanations than the current mock implementation
      
      const response = await this.simulateAIResponse(request);
      return response;
    } catch (error) {
      throw new Error(`AI service request failed: ${error}`);
    }
  }

  /**
   * Build a prompt for the AI service
   */
  private buildPrompt(request: AIExplanationRequest): string {
    const contextInfo = request.context === 'food_additive' 
      ? 'This appears to be a food additive or preservative.'
      : 'This appears to be a natural food ingredient.';

    return `Explain the food ingredient "${request.ingredient}" in plain English. ${contextInfo}

Please provide:
1. What this ingredient is and its primary purpose in food
2. Whether it's generally considered safe for consumption
3. Any potential health benefits or concerns
4. Common uses in food products

Keep the explanation concise, factual, and accessible to consumers. Focus on practical information that would help someone make informed food choices.`;
  }

  /**
   * Simulate AI response with intelligent heuristics
   * In production, this would be replaced with actual Kiro LLM integration
   */
  private async simulateAIResponse(request: AIExplanationRequest): Promise<AIExplanationResponse> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const ingredient = request.ingredient.toLowerCase();
    
    // Enhanced heuristics for better explanations
    let explanation: string;
    let healthImpact: 'positive' | 'neutral' | 'negative';
    let commonUses: string[];

    if (this.isPreservative(ingredient)) {
      explanation = `${request.ingredient} is a preservative used to prevent spoilage and extend shelf life. It helps maintain food safety by inhibiting bacterial growth. Generally recognized as safe when used in approved amounts.`;
      healthImpact = 'neutral';
      commonUses = ['Packaged foods', 'Baked goods', 'Processed meats'];
    } else if (this.isColoringAgent(ingredient)) {
      explanation = `${request.ingredient} is a coloring agent used to enhance or maintain the visual appeal of food products. It provides color but no nutritional value. Most approved food colors are considered safe for consumption.`;
      healthImpact = 'neutral';
      commonUses = ['Candies', 'Beverages', 'Processed foods'];
    } else if (this.isEmulsifier(ingredient)) {
      explanation = `${request.ingredient} is an emulsifier that helps mix ingredients that normally don't combine well, like oil and water. It improves texture and consistency in food products.`;
      healthImpact = 'neutral';
      commonUses = ['Baked goods', 'Chocolate', 'Salad dressings'];
    } else if (this.isVitaminMineral(ingredient)) {
      explanation = `${request.ingredient} is a vitamin or mineral added to enhance the nutritional value of food products. This fortification helps ensure adequate intake of essential nutrients.`;
      healthImpact = 'positive';
      commonUses = ['Cereals', 'Dairy products', 'Nutritional supplements'];
    } else if (this.isSweetener(ingredient)) {
      explanation = `${request.ingredient} is a sweetening agent used to add sweetness to food products. The health impact depends on the specific type and amount consumed.`;
      healthImpact = ingredient.includes('artificial') ? 'neutral' : 'negative';
      commonUses = ['Beverages', 'Desserts', 'Low-calorie products'];
    } else if (this.isNaturalExtract(ingredient)) {
      explanation = `${request.ingredient} is a natural extract used for flavoring. It's derived from natural sources and provides taste without significant nutritional impact.`;
      healthImpact = 'neutral';
      commonUses = ['Flavored products', 'Beverages', 'Desserts'];
    } else if (this.isThickener(ingredient)) {
      explanation = `${request.ingredient} is a thickening agent used to improve texture and consistency in food products. It's typically derived from natural sources and is generally safe.`;
      healthImpact = 'neutral';
      commonUses = ['Sauces', 'Soups', 'Dairy products'];
    } else {
      // Generic explanation for unknown ingredients
      explanation = `${request.ingredient} is a food ingredient whose specific function may vary depending on the product. Without more context, it's difficult to provide detailed information about its purpose or health effects.`;
      healthImpact = 'neutral';
      commonUses = ['Various food products'];
    }

    return {
      explanation,
      healthImpact,
      commonUses
    };
  }

  /**
   * Helper methods to identify ingredient types
   */
  private isPreservative(ingredient: string): boolean {
    const preservativeKeywords = ['acid', 'preservative', 'benzoate', 'sorbate', 'sulfite', 'nitrite', 'nitrate', 'bht', 'bha', 'tbhq'];
    return preservativeKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isColoringAgent(ingredient: string): boolean {
    const colorKeywords = ['color', 'dye', 'red', 'blue', 'yellow', 'green', 'caramel color', 'annatto', 'carmine'];
    return colorKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isEmulsifier(ingredient: string): boolean {
    const emulsifierKeywords = ['lecithin', 'mono', 'diglyceride', 'polysorbate', 'emulsifier'];
    return emulsifierKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isVitaminMineral(ingredient: string): boolean {
    const vitaminKeywords = ['vitamin', 'mineral', 'iron', 'calcium', 'zinc', 'folate', 'thiamine', 'riboflavin', 'niacin'];
    return vitaminKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isSweetener(ingredient: string): boolean {
    const sweetenerKeywords = ['sweetener', 'syrup', 'sugar', 'fructose', 'glucose', 'sucrose', 'aspartame', 'sucralose', 'stevia'];
    return sweetenerKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isNaturalExtract(ingredient: string): boolean {
    const extractKeywords = ['extract', 'natural flavor', 'essence', 'oil'];
    return extractKeywords.some(keyword => ingredient.includes(keyword));
  }

  private isThickener(ingredient: string): boolean {
    const thickenerKeywords = ['gum', 'starch', 'cellulose', 'pectin', 'agar', 'carrageenan', 'xanthan'];
    return thickenerKeywords.some(keyword => ingredient.includes(keyword));
  }

  /**
   * Determine context based on ingredient name
   */
  private determineContext(ingredient: string): 'food_additive' | 'natural_ingredient' {
    const additiveKeywords = ['acid', 'preservative', 'color', 'dye', 'emulsifier', 'stabilizer', 'artificial'];
    const hasAdditiveKeywords = additiveKeywords.some(keyword => 
      ingredient.toLowerCase().includes(keyword)
    );
    
    return hasAdditiveKeywords ? 'food_additive' : 'natural_ingredient';
  }

  /**
   * Convert AI response to IngredientData format
   */
  private convertToIngredientData(ingredient: string, response: AIExplanationResponse): IngredientData {
    // Calculate nutrition score based on health impact
    let nutritionScore: number;
    switch (response.healthImpact) {
      case 'positive':
        nutritionScore = 80 + Math.random() * 15; // 80-95
        break;
      case 'negative':
        nutritionScore = 20 + Math.random() * 25; // 20-45
        break;
      default:
        nutritionScore = 45 + Math.random() * 25; // 45-70
    }

    return {
      name: ingredient,
      source: 'ai',
      nutritionScore: Math.round(nutritionScore),
      explanation: response.explanation
    };
  }

  /**
   * Create a timeout promise for AI requests
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI service timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  /**
   * Validate AI response structure
   */
  private isValidResponse(response: any): response is AIExplanationResponse {
    return response &&
           typeof response.explanation === 'string' &&
           ['positive', 'neutral', 'negative'].includes(response.healthImpact) &&
           Array.isArray(response.commonUses);
  }

  /**
   * Get fallback explanation when AI service fails
   */
  private getFallbackExplanation(ingredient: string): IngredientData {
    return {
      name: ingredient,
      source: 'ai',
      nutritionScore: 50, // Neutral score
      explanation: `${ingredient} is a food ingredient. Unable to provide detailed information at this time due to service unavailability. Please consult food labels and trusted sources for more information.`
    };
  }

  /**
   * Check if AI service is available (for health checks)
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const testResponse = await Promise.race([
        this.makeAIRequest({ ingredient: 'test', context: 'natural_ingredient' }),
        this.createTimeoutPromise()
      ]);
      return this.isValidResponse(testResponse);
    } catch {
      return false;
    }
  }
}