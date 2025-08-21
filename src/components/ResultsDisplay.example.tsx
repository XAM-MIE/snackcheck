import React from 'react';
import ResultsDisplay from './ResultsDisplay';
import { HealthScore, IngredientData } from '../utils/types';

// Example usage of the ResultsDisplay component
// This file demonstrates how to use the component with different score types

// Example data for a healthy product
const healthyScore: HealthScore = {
  overall: 85,
  color: 'green',
  factors: [
    {
      ingredient: 'Organic Wheat Flour',
      impact: 10,
      reason: 'Organic ingredient with reduced chemical exposure'
    },
    {
      ingredient: 'Whole Grain Oats',
      impact: 5,
      reason: 'Whole grain provides fiber and nutrients'
    }
  ]
};

const healthyIngredients: IngredientData[] = [
  {
    name: 'Organic Wheat Flour',
    source: 'openfoodfacts',
    nutritionScore: 4,
    explanation: 'Flour made from organically grown wheat without synthetic pesticides'
  },
  {
    name: 'Whole Grain Oats',
    source: 'openfoodfacts',
    nutritionScore: 5,
    explanation: 'Whole grain cereal providing fiber, protein, and essential nutrients'
  },
  {
    name: 'Natural Vanilla Extract',
    source: 'ai',
    explanation: 'Natural flavoring extracted from vanilla beans'
  }
];

// Example data for a moderate product
const moderateScore: HealthScore = {
  overall: 55,
  color: 'yellow',
  factors: [
    {
      ingredient: 'Natural Vanilla Extract',
      impact: 2,
      reason: 'Natural ingredient with minimal processing'
    },
    {
      ingredient: 'Sodium Benzoate',
      impact: -5,
      reason: 'Chemical preservative may cause sensitivities'
    }
  ]
};

const moderateIngredients: IngredientData[] = [
  {
    name: 'Wheat Flour',
    source: 'openfoodfacts',
    nutritionScore: 3,
    explanation: 'Refined wheat flour with some nutrients removed during processing'
  },
  {
    name: 'Natural Vanilla Extract',
    source: 'ai',
    explanation: 'Natural flavoring extracted from vanilla beans'
  },
  {
    name: 'Sodium Benzoate',
    source: 'cache',
    additiveClass: 'moderate_risk',
    explanation: 'Preservative used to prevent bacterial growth in food products'
  }
];

// Example data for an unhealthy product
const unhealthyScore: HealthScore = {
  overall: 25,
  color: 'red',
  factors: [
    {
      ingredient: 'Artificial Red Dye #40',
      impact: -15,
      reason: 'Artificial additive with potential health concerns'
    },
    {
      ingredient: 'Partially Hydrogenated Oil',
      impact: -20,
      reason: 'Trans fats increase risk of heart disease'
    }
  ]
};

const unhealthyIngredients: IngredientData[] = [
  {
    name: 'Artificial Red Dye #40',
    source: 'openfoodfacts',
    additiveClass: 'high_risk',
    explanation: 'Synthetic food coloring that may cause hyperactivity in children'
  },
  {
    name: 'Partially Hydrogenated Oil',
    source: 'openfoodfacts',
    nutritionScore: 1,
    explanation: 'Trans fat that raises bad cholesterol and lowers good cholesterol'
  },
  {
    name: 'High Fructose Corn Syrup',
    source: 'cache',
    nutritionScore: 2,
    explanation: 'Sweetener linked to obesity and metabolic issues'
  }
];

// Example component showing different states
export const ResultsDisplayExamples: React.FC = () => {
  const [currentExample, setCurrentExample] = React.useState<'healthy' | 'moderate' | 'unhealthy' | 'loading'>('healthy');

  const handleNewScan = () => {
    console.log('New scan requested');
  };

  const handleShare = () => {
    console.log('Share requested');
  };

  const getExampleData = () => {
    switch (currentExample) {
      case 'healthy':
        return { score: healthyScore, ingredients: healthyIngredients };
      case 'moderate':
        return { score: moderateScore, ingredients: moderateIngredients };
      case 'unhealthy':
        return { score: unhealthyScore, ingredients: unhealthyIngredients };
      default:
        return { score: healthyScore, ingredients: healthyIngredients };
    }
  };

  const { score, ingredients } = getExampleData();

  return (
    <div>
      {/* Example Controls */}
      <div className="fixed top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg">
        <h3 className="font-bold mb-2">Examples:</h3>
        <div className="space-y-2">
          <button
            onClick={() => setCurrentExample('loading')}
            className="block w-full text-left px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          >
            Loading State
          </button>
          <button
            onClick={() => setCurrentExample('healthy')}
            className="block w-full text-left px-3 py-1 rounded bg-green-100 hover:bg-green-200"
          >
            Healthy (85/100)
          </button>
          <button
            onClick={() => setCurrentExample('moderate')}
            className="block w-full text-left px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200"
          >
            Moderate (55/100)
          </button>
          <button
            onClick={() => setCurrentExample('unhealthy')}
            className="block w-full text-left px-3 py-1 rounded bg-red-100 hover:bg-red-200"
          >
            Unhealthy (25/100)
          </button>
        </div>
      </div>

      {/* Results Display */}
      <ResultsDisplay
        score={score}
        ingredients={ingredients}
        onNewScan={handleNewScan}
        onShare={handleShare}
        isLoading={currentExample === 'loading'}
      />
    </div>
  );
};

export default ResultsDisplayExamples;