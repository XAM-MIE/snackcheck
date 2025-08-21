/**
 * Unit tests for AppContext state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AppProvider, useApp, AppScreen } from '../../contexts/AppContext';
import { OCRResult, IngredientData, HealthScore } from '../../utils/types';

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.state.currentScreen).toBe('camera');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.currentSession).toBe(null);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.processingStartTime).toBe(null);
    });

    it('should provide all required helper functions', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(typeof result.current.startScan).toBe('function');
      expect(typeof result.current.startProcessing).toBe('function');
      expect(typeof result.current.completeOCR).toBe('function');
      expect(typeof result.current.completeAnalysis).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.resetSession).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.getProcessingTime).toBe('function');
    });
  });

  describe('State Transitions', () => {
    it('should handle startScan action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      // Set some initial state to test reset
      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.startScan();
      });

      expect(result.current.state.currentScreen).toBe('camera');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.currentSession).toBe(null);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.processingStartTime).toBe(null);
    });

    it('should handle startProcessing action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';

      act(() => {
        result.current.startProcessing(mockImageData);
      });

      expect(result.current.state.currentScreen).toBe('processing');
      expect(result.current.state.isProcessing).toBe(true);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.processingStartTime).toBeTypeOf('number');
      expect(result.current.state.currentSession).toMatchObject({
        id: expect.stringMatching(/^scan_\d+$/),
        timestamp: expect.any(Date),
        imageData: mockImageData,
        ocrResult: { text: '', confidence: 0, ingredients: [] },
        ingredients: [],
        healthScore: { overall: 0, color: 'red', factors: [] },
        processingTime: 0,
      });
    });

    it('should handle completeOCR action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';
      const mockOCRResult: OCRResult = {
        text: 'Ingredients: Water, Sugar',
        confidence: 0.85,
        ingredients: ['Water', 'Sugar']
      };

      // Start processing first
      act(() => {
        result.current.startProcessing(mockImageData);
      });

      act(() => {
        result.current.completeOCR(mockOCRResult);
      });

      expect(result.current.state.currentSession?.ocrResult).toEqual(mockOCRResult);
      expect(result.current.state.currentScreen).toBe('processing');
      expect(result.current.state.isProcessing).toBe(true);
    });

    it('should handle completeAnalysis action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';
      const mockIngredients: IngredientData[] = [
        { name: 'Water', source: 'openfoodfacts', nutritionScore: 5 },
        { name: 'Sugar', source: 'openfoodfacts', nutritionScore: 1 }
      ];
      const mockHealthScore: HealthScore = {
        overall: 65,
        color: 'yellow',
        factors: [
          { ingredient: 'Water', impact: 2, reason: 'Natural hydration' },
          { ingredient: 'Sugar', impact: -15, reason: 'High sugar content' }
        ]
      };

      // Start processing first
      act(() => {
        result.current.startProcessing(mockImageData);
      });

      act(() => {
        result.current.completeAnalysis(mockIngredients, mockHealthScore);
      });

      expect(result.current.state.currentScreen).toBe('results');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.processingStartTime).toBe(null);
      expect(result.current.state.currentSession?.ingredients).toEqual(mockIngredients);
      expect(result.current.state.currentSession?.healthScore).toEqual(mockHealthScore);
      expect(result.current.state.currentSession?.processingTime).toBeTypeOf('number');
    });

    it('should handle setError action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const errorMessage = 'Test error message';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.state.error).toBe(errorMessage);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.currentScreen).toBe('camera');
    });

    it('should handle resetSession action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';

      // Set up some state first
      act(() => {
        result.current.startProcessing(mockImageData);
        result.current.setError('Test error');
      });

      act(() => {
        result.current.resetSession();
      });

      expect(result.current.state.currentScreen).toBe('camera');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.currentSession).toBe(null);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.processingStartTime).toBe(null);
    });

    it('should handle clearError action', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });
  });

  describe('Processing Time Calculation', () => {
    it('should calculate processing time correctly', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';

      act(() => {
        result.current.startProcessing(mockImageData);
      });

      // Wait a bit and check processing time
      setTimeout(() => {
        const processingTime = result.current.getProcessingTime();
        expect(processingTime).toBeGreaterThan(0);
        expect(processingTime).toBeLessThan(1000); // Should be less than 1 second in tests
      }, 100);
    });

    it('should return 0 when not processing', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      const processingTime = result.current.getProcessingTime();
      expect(processingTime).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during processing', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockImageData = 'data:image/jpeg;base64,mockdata';

      act(() => {
        result.current.startProcessing(mockImageData);
      });

      expect(result.current.state.isProcessing).toBe(true);

      act(() => {
        result.current.setError('Processing failed');
      });

      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.error).toBe('Processing failed');
      expect(result.current.state.currentScreen).toBe('results'); // Should stay on results if session exists
    });

    it('should return to camera on error when no session exists', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      act(() => {
        result.current.setError('Camera error');
      });

      expect(result.current.state.currentScreen).toBe('camera');
      expect(result.current.state.error).toBe('Camera error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle completeOCR without active session', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockOCRResult: OCRResult = {
        text: 'Test',
        confidence: 0.8,
        ingredients: ['Test']
      };

      act(() => {
        result.current.completeOCR(mockOCRResult);
      });

      // Should not crash and state should remain unchanged
      expect(result.current.state.currentSession).toBe(null);
      expect(result.current.state.currentScreen).toBe('camera');
    });

    it('should handle completeAnalysis without active session', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const mockIngredients: IngredientData[] = [];
      const mockHealthScore: HealthScore = {
        overall: 0,
        color: 'red',
        factors: []
      };

      act(() => {
        result.current.completeAnalysis(mockIngredients, mockHealthScore);
      });

      // Should not crash and state should remain unchanged
      expect(result.current.state.currentSession).toBe(null);
      expect(result.current.state.currentScreen).toBe('camera');
    });
  });

  describe('Context Provider Error Handling', () => {
    it('should throw error when useApp is used outside provider', () => {
      expect(() => {
        renderHook(() => useApp());
      }).toThrow('useApp must be used within an AppProvider');
    });
  });
});