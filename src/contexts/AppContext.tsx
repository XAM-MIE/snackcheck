'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { ScanSession, OCRResult, IngredientData, HealthScore } from '../utils/types';

// App states
export type AppScreen = 'camera' | 'processing' | 'results';

export interface AppState {
  currentScreen: AppScreen;
  isProcessing: boolean;
  currentSession: ScanSession | null;
  error: string | null;
  processingStartTime: number | null;
}

// Action types
export type AppAction =
  | { type: 'START_SCAN' }
  | { type: 'START_PROCESSING'; imageData: string; startTime: number }
  | { type: 'OCR_COMPLETE'; ocrResult: OCRResult }
  | { type: 'ANALYSIS_COMPLETE'; ingredients: IngredientData[]; healthScore: HealthScore; processingTime: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET_SESSION' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AppState = {
  currentScreen: 'camera',
  isProcessing: false,
  currentSession: null,
  error: null,
  processingStartTime: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_SCAN':
      return {
        ...state,
        currentScreen: 'camera',
        isProcessing: false,
        currentSession: null,
        error: null,
        processingStartTime: null,
      };

    case 'START_PROCESSING':
      return {
        ...state,
        currentScreen: 'processing',
        isProcessing: true,
        error: null,
        processingStartTime: action.startTime,
        currentSession: {
          id: `scan_${Date.now()}`,
          timestamp: new Date(),
          imageData: action.imageData,
          ocrResult: { text: '', confidence: 0, ingredients: [] },
          ingredients: [],
          healthScore: { overall: 0, color: 'red', factors: [] },
          processingTime: 0,
        },
      };

    case 'OCR_COMPLETE':
      if (!state.currentSession) return state;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          ocrResult: action.ocrResult,
        },
      };

    case 'ANALYSIS_COMPLETE':
      if (!state.currentSession) return state;
      return {
        ...state,
        currentScreen: 'results',
        isProcessing: false,
        currentSession: {
          ...state.currentSession,
          ingredients: action.ingredients,
          healthScore: action.healthScore,
          processingTime: action.processingTime,
        },
        processingStartTime: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isProcessing: false,
        currentScreen: state.currentSession ? 'results' : 'camera',
      };

    case 'RESET_SESSION':
      return initialState;

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  startScan: () => void;
  startProcessing: (imageData: string) => void;
  completeOCR: (ocrResult: OCRResult) => void;
  completeAnalysis: (ingredients: IngredientData[], healthScore: HealthScore) => void;
  setError: (error: string) => void;
  resetSession: () => void;
  clearError: () => void;
  getProcessingTime: () => number;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const startScan = useCallback(() => {
    dispatch({ type: 'START_SCAN' });
  }, []);

  const startProcessing = useCallback((imageData: string) => {
    const startTime = Date.now();
    dispatch({ type: 'START_PROCESSING', imageData, startTime });
  }, []);

  const completeOCR = useCallback((ocrResult: OCRResult) => {
    dispatch({ type: 'OCR_COMPLETE', ocrResult });
  }, []);

  const completeAnalysis = useCallback((ingredients: IngredientData[], healthScore: HealthScore) => {
    const processingTime = state.processingStartTime ? Date.now() - state.processingStartTime : 0;
    dispatch({ type: 'ANALYSIS_COMPLETE', ingredients, healthScore, processingTime });
  }, [state.processingStartTime]);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const getProcessingTime = useCallback(() => {
    return state.processingStartTime ? Date.now() - state.processingStartTime : 0;
  }, [state.processingStartTime]);

  const contextValue: AppContextType = {
    state,
    dispatch,
    startScan,
    startProcessing,
    completeOCR,
    completeAnalysis,
    setError,
    resetSession,
    clearError,
    getProcessingTime,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;