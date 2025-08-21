import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResultsDisplay from '../ResultsDisplay';
import { HealthScore, IngredientData } from '../../utils/types';

// Mock data for testing
const mockHealthyScore: HealthScore = {
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

const mockModerateScore: HealthScore = {
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

const mockUnhealthyScore: HealthScore = {
  overall: 25,
  color: 'red',
  factors: [
    {
      ingredient: 'Artificial Red Dye #40',
      impact: -15,
      reason: 'Artificial additive with potential health concerns'
    },
    {
      ingredient: 'Trans Fat',
      impact: -20,
      reason: 'Trans fats increase risk of heart disease'
    }
  ]
};

const mockIngredients: IngredientData[] = [
  {
    name: 'Organic Wheat Flour',
    source: 'openfoodfacts',
    nutritionScore: 4,
    explanation: 'Flour made from organically grown wheat'
  },
  {
    name: 'Whole Grain Oats',
    source: 'openfoodfacts',
    nutritionScore: 5,
    explanation: 'Whole grain cereal providing fiber and nutrients'
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
    explanation: 'Preservative used to prevent bacterial growth'
  }
];

const mockModerateIngredients: IngredientData[] = [
  {
    name: 'Natural Vanilla Extract',
    source: 'ai',
    explanation: 'Natural flavoring extracted from vanilla beans'
  },
  {
    name: 'Sodium Benzoate',
    source: 'cache',
    additiveClass: 'moderate_risk',
    explanation: 'Preservative used to prevent bacterial growth'
  }
];

const mockUnhealthyIngredients: IngredientData[] = [
  {
    name: 'Artificial Red Dye #40',
    source: 'openfoodfacts',
    additiveClass: 'high_risk',
    explanation: 'Synthetic food coloring linked to hyperactivity'
  },
  {
    name: 'Trans Fat',
    source: 'openfoodfacts',
    nutritionScore: 1,
    explanation: 'Partially hydrogenated oil that raises bad cholesterol'
  }
];

describe('ResultsDisplay', () => {
  const mockOnNewScan = vi.fn();
  const mockOnShare = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading state when isLoading is true', () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
          isLoading={true}
        />
      );

      expect(screen.getByText('Analyzing ingredients...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few seconds')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should show spinning animation in loading state', () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
          isLoading={true}
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('should display healthy score with green color and correct emoji', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🟢')).toBeInTheDocument();
        expect(screen.getByText('85/100')).toBeInTheDocument();
        expect(screen.getByText('Healthy Choice')).toBeInTheDocument();
      });
    });

    it('should display moderate score with yellow color and correct emoji', async () => {
      render(
        <ResultsDisplay
          score={mockModerateScore}
          ingredients={mockModerateIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🟡')).toBeInTheDocument();
        expect(screen.getByText('55/100')).toBeInTheDocument();
        expect(screen.getByText('Moderate Choice')).toBeInTheDocument();
      });
    });

    it('should display unhealthy score with red color and correct emoji', async () => {
      render(
        <ResultsDisplay
          score={mockUnhealthyScore}
          ingredients={mockUnhealthyIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🔴')).toBeInTheDocument();
        expect(screen.getByText('25/100')).toBeInTheDocument();
        expect(screen.getByText('Consider Alternatives')).toBeInTheDocument();
      });
    });
  });

  describe('Ingredient Breakdown', () => {
    it('should display all ingredients with correct information', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Organic Wheat Flour')).toBeInTheDocument();
        expect(screen.getByText('Whole Grain Oats')).toBeInTheDocument();
        expect(screen.getByText('Natural Vanilla Extract')).toBeInTheDocument();
        expect(screen.getByText('Sodium Benzoate')).toBeInTheDocument();
      });
    });

    it('should show ingredient source badges', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('openfoodfacts')).toHaveLength(2);
        expect(screen.getByText('ai')).toBeInTheDocument();
        expect(screen.getByText('cache')).toBeInTheDocument();
      });
    });

    it('should display impact scores for ingredients with factors', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+10')).toBeInTheDocument();
        expect(screen.getByText('+5')).toBeInTheDocument();
      });
    });

    it('should expand ingredient details when clicked', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button');
        expect(organicFlourButton).toBeInTheDocument();
      });

      const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button')!;
      fireEvent.click(organicFlourButton);

      await waitFor(() => {
        expect(screen.getByText('Health Impact:')).toBeInTheDocument();
        expect(screen.getByText('Organic ingredient with reduced chemical exposure')).toBeInTheDocument();
        expect(screen.getByText('Explanation:')).toBeInTheDocument();
        expect(screen.getByText('Flour made from organically grown wheat')).toBeInTheDocument();
      });
    });

    it('should collapse ingredient details when clicked again', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button');
        expect(organicFlourButton).toBeInTheDocument();
      });

      const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button')!;
      
      // Expand
      fireEvent.click(organicFlourButton);
      await waitFor(() => {
        expect(screen.getByText('Health Impact:')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(organicFlourButton);
      await waitFor(() => {
        expect(screen.queryByText('Health Impact:')).not.toBeInTheDocument();
      });
    });

    it('should show additive class when available', async () => {
      render(
        <ResultsDisplay
          score={mockModerateScore}
          ingredients={mockModerateIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const sodiumBenzoateButton = screen.getByText('Sodium Benzoate').closest('button');
        expect(sodiumBenzoateButton).toBeInTheDocument();
      });

      const sodiumBenzoateButton = screen.getByText('Sodium Benzoate').closest('button')!;
      fireEvent.click(sodiumBenzoateButton);

      await waitFor(() => {
        expect(screen.getByText('Additive Class:')).toBeInTheDocument();
        expect(screen.getByText('moderate_risk')).toBeInTheDocument();
      });
    });

    it('should show nutrition score when available', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button');
        expect(organicFlourButton).toBeInTheDocument();
      });

      const organicFlourButton = screen.getByText('Organic Wheat Flour').closest('button')!;
      fireEvent.click(organicFlourButton);

      await waitFor(() => {
        expect(screen.getByText('Nutrition Score:')).toBeInTheDocument();
        expect(screen.getByText('4/5')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should call onNewScan when "Scan Another" button is clicked', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const scanButton = screen.getByText('Scan Another');
        expect(scanButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Scan Another'));
      expect(mockOnNewScan).toHaveBeenCalledTimes(1);
    });

    it('should call onNewScan when camera icon is clicked', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const cameraButton = screen.getByLabelText('New scan');
        expect(cameraButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('New scan'));
      expect(mockOnNewScan).toHaveBeenCalledTimes(1);
    });

    it('should display share button when onShare is provided', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
          onShare={mockOnShare}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Share')).toBeInTheDocument();
      });
    });

    it('should call onShare when share button is clicked', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
          onShare={mockOnShare}
        />
      );

      await waitFor(() => {
        const shareButton = screen.getByText('Share');
        expect(shareButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Share'));
      expect(mockOnShare).toHaveBeenCalledTimes(1);
    });

    it('should not display share button when onShare is not provided', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Share')).not.toBeInTheDocument();
      });
    });
  });

  describe('Summary Stats', () => {
    it('should display correct ingredient count', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('Ingredients')).toBeInTheDocument();
      });
    });

    it('should display correct positive factors count', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Positive')).toBeInTheDocument();
      });
    });

    it('should display correct concerns count', async () => {
      render(
        <ResultsDisplay
          score={mockUnhealthyScore}
          ingredients={mockUnhealthyIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const concernsSection = screen.getByText('Concerns').previousElementSibling;
        expect(concernsSection).toHaveTextContent('2');
        expect(screen.getByText('Concerns')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should apply correct color classes for healthy score', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const scoreContainer = screen.getByText('85/100').closest('div')?.parentElement;
        expect(scoreContainer).toHaveClass('text-green-600');
      });
    });

    it('should apply correct color classes for moderate score', async () => {
      render(
        <ResultsDisplay
          score={mockModerateScore}
          ingredients={mockModerateIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const scoreContainer = screen.getByText('55/100').closest('div')?.parentElement;
        expect(scoreContainer).toHaveClass('text-yellow-600');
      });
    });

    it('should apply correct color classes for unhealthy score', async () => {
      render(
        <ResultsDisplay
          score={mockUnhealthyScore}
          ingredients={mockUnhealthyIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        const scoreContainer = screen.getByText('25/100').closest('div')?.parentElement;
        expect(scoreContainer).toHaveClass('text-red-600');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('New scan')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Scan Results' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Ingredient Analysis' })).toBeInTheDocument();
      });
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply transition classes for smooth animations', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      // Check that transition classes are applied
      const elements = document.querySelectorAll('.transition-all');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should have staggered animation delays', async () => {
      render(
        <ResultsDisplay
          score={mockHealthyScore}
          ingredients={mockIngredients}
          onNewScan={mockOnNewScan}
        />
      );

      // Check for delay classes
      const delayedElements = document.querySelectorAll('[class*="delay-"]');
      expect(delayedElements.length).toBeGreaterThan(0);
    });
  });
});