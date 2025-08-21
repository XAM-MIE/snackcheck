'use client';

import React, { useState, useEffect } from 'react';
import { HealthScore, IngredientData } from '../utils/types';

interface ResultsDisplayProps {
  score: HealthScore;
  ingredients: IngredientData[];
  onNewScan: () => void;
  onShare?: () => void;
  isLoading?: boolean;
}

interface ScoreDisplayProps {
  score: HealthScore;
  isVisible: boolean;
}

interface IngredientBreakdownProps {
  ingredients: IngredientData[];
  factors: HealthScore['factors'];
  isVisible: boolean;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, isVisible }) => {
  const getScoreEmoji = (color: string) => {
    switch (color) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
      default: return '⚪';
    }
  };

  const getScoreText = (color: string) => {
    switch (color) {
      case 'green': return 'Healthy Choice';
      case 'yellow': return 'Moderate Choice';
      case 'red': return 'Consider Alternatives';
      default: return 'Unknown';
    }
  };

  const getScoreColor = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-600 border-green-200 bg-green-50';
      case 'yellow': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'red': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  return (
    <div 
      className={`
        transform transition-all duration-700 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
      `}
    >
      <div className={`
        rounded-2xl border-2 p-6 mb-6 text-center
        ${getScoreColor(score.color)}
        shadow-lg
      `}>
        <div className="text-6xl mb-2">
          {getScoreEmoji(score.color)}
        </div>
        <div className="text-3xl font-bold mb-2">
          {score.overall}/100
        </div>
        <div className="text-lg font-semibold">
          {getScoreText(score.color)}
        </div>
      </div>
    </div>
  );
};

const IngredientBreakdown: React.FC<IngredientBreakdownProps> = ({ 
  ingredients, 
  factors, 
  isVisible 
}) => {
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);

  const getFactorForIngredient = (ingredientName: string) => {
    return factors.find(factor => factor.ingredient === ingredientName);
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600 bg-green-100';
    if (impact < -10) return 'text-red-600 bg-red-100';
    if (impact < 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return '✓';
    if (impact < -10) return '⚠️';
    if (impact < 0) return '⚡';
    return '•';
  };

  return (
    <div 
      className={`
        transform transition-all duration-700 ease-out delay-300
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
    >
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        Ingredient Analysis
      </h3>
      
      <div className="space-y-3">
        {ingredients.map((ingredient, index) => {
          const factor = getFactorForIngredient(ingredient.name);
          const isExpanded = expandedIngredient === ingredient.name;
          
          return (
            <div
              key={`${ingredient.name}-${index}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedIngredient(
                  isExpanded ? null : ingredient.name
                )}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {factor && (
                      <span className={`
                        inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${getImpactColor(factor.impact)}
                      `}>
                        {getImpactIcon(factor.impact)}
                      </span>
                    )}
                    <span className="font-medium text-gray-900 truncate">
                      {ingredient.name}
                    </span>
                    <span className={`
                      text-xs px-2 py-1 rounded-full
                      ${ingredient.source === 'openfoodfacts' ? 'bg-blue-100 text-blue-800' :
                        ingredient.source === 'ai' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {ingredient.source}
                    </span>
                  </div>
                  
                  {factor && (
                    <div className="flex items-center space-x-2">
                      <span className={`
                        text-sm font-semibold
                        ${factor.impact > 0 ? 'text-green-600' : 
                          factor.impact < -10 ? 'text-red-600' : 
                          factor.impact < 0 ? 'text-yellow-600' : 'text-gray-600'}
                      `}>
                        {factor.impact > 0 ? '+' : ''}{factor.impact}
                      </span>
                      <svg 
                        className={`w-4 h-4 transform transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="pt-3 space-y-2">
                    {factor && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Health Impact:</span> {factor.reason}
                      </p>
                    )}
                    
                    {ingredient.explanation && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Explanation:</span> {ingredient.explanation}
                      </p>
                    )}
                    
                    {ingredient.additiveClass && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Additive Class:</span> {ingredient.additiveClass}
                      </p>
                    )}
                    
                    {ingredient.nutritionScore !== undefined && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Nutrition Score:</span> {ingredient.nutritionScore}/5
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl">🔍</span>
      </div>
    </div>
    <p className="mt-4 text-lg font-medium text-gray-700">Analyzing ingredients...</p>
    <p className="mt-2 text-sm text-gray-500">This may take a few seconds</p>
  </div>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  score,
  ingredients,
  onNewScan,
  onShare,
  isLoading = false
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Trigger animation after component mounts
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className={`
          transform transition-all duration-500 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
        `}>
          <div className="flex items-center justify-between mb-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Scan Results
            </h1>
            <button
              onClick={onNewScan}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
              aria-label="New scan"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Score Display */}
        <ScoreDisplay score={score} isVisible={isVisible} />

        {/* Ingredient Breakdown */}
        <IngredientBreakdown 
          ingredients={ingredients} 
          factors={score.factors} 
          isVisible={isVisible} 
        />

        {/* Action Buttons */}
        <div className={`
          transform transition-all duration-700 ease-out delay-500 mt-8
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}>
          <div className="flex space-x-3">
            <button
              onClick={onNewScan}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg"
            >
              Scan Another
            </button>
            
            {onShare && (
              <button
                onClick={onShare}
                className="bg-white text-blue-600 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200 shadow-lg border border-blue-200"
              >
                Share
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className={`
          transform transition-all duration-700 ease-out delay-700 mt-6 mb-8
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {ingredients.length}
                </div>
                <div className="text-xs text-gray-500">
                  Ingredients
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {score.factors.filter(f => f.impact > 0).length}
                </div>
                <div className="text-xs text-gray-500">
                  Positive
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {score.factors.filter(f => f.impact < 0).length}
                </div>
                <div className="text-xs text-gray-500">
                  Concerns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;