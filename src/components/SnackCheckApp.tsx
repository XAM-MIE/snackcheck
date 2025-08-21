'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { User, Scan, Home as HomeIcon } from 'lucide-react';
import { BottomNavbar } from './BottomNavbar';
import { FoodHistory } from './FoodHistory';
import { CameraCapture } from './CameraCapture';
import ResultsDisplay from './ResultsDisplay';
import LoadingScreen from './LoadingScreen';
import { OCRProcessor } from '../services/OCRProcessor';
import { IngredientLookup } from '../services/IngredientLookup';
import { HealthScoreCalculator } from '../services/HealthScoreCalculator';
import { DemoService } from '../services/DemoService';
import { OCRResult, IngredientData, HealthScore, ScanSession } from '../utils/types';

type AppState = 'home' | 'scan' | 'processing' | 'results';
type TabState = 'home' | 'scan' | 'upload';

export const SnackCheckApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [activeTab, setActiveTab] = useState<TabState>('home');
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanSession[]>([]);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize services
  const ocrProcessor = new OCRProcessor();
  const ingredientLookup = new IngredientLookup();
  const healthCalculator = new HealthScoreCalculator();

  // Load scan history from localStorage on mount
  useEffect(() => {
    const loadScanHistory = () => {
      try {
        const stored = localStorage.getItem('snackcheck_scan_history');
        if (stored) {
          const history = JSON.parse(stored).map((item: unknown) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          setScanHistory(history);
        }
      } catch (error) {
        console.error('Failed to load scan history:', error);
      }
    };

    loadScanHistory();
  }, []);

  // Save scan to history
  const saveScanToHistory = useCallback((session: ScanSession) => {
    try {
      const updatedHistory = [session, ...scanHistory].slice(0, 50); // Keep last 50 scans
      setScanHistory(updatedHistory);
      localStorage.setItem('snackcheck_scan_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save scan to history:', error);
    }
  }, [scanHistory]);

  // Handle image capture
  const handleImageCapture = useCallback(async (imageData: string) => {
    const startTime = Date.now();
    setAppState('processing');
    setError(null);

    try {
      // Step 1: OCR Processing
      setProcessingStep('Extracting text from image...');
      let ocrResult: OCRResult;

      // Use demo mode if enabled or OCR fails
      if (DemoService.shouldUseDemoMode()) {
        ocrResult = await DemoService.simulateOCRProcessing();
      } else {
        try {
          ocrResult = await ocrProcessor.processImage(imageData);

          // If OCR confidence is too low, fall back to demo
          if (ocrResult.confidence < 60) {
            console.warn('OCR confidence too low, using demo data');
            ocrResult = await DemoService.simulateOCRProcessing();
          }
        } catch (ocrError) {
          console.warn('OCR failed, using demo data:', ocrError);
          ocrResult = await DemoService.simulateOCRProcessing();
        }
      }

      // Step 2: Ingredient Lookup
      setProcessingStep('Looking up ingredient information...');
      const ingredients: IngredientData[] = await ingredientLookup.lookupIngredients(ocrResult.ingredients);

      // Step 3: Health Score Calculation
      setProcessingStep('Calculating health score...');
      const healthScore: HealthScore = healthCalculator.calculateScore(ingredients);

      const processingTime = Date.now() - startTime;

      // Create scan session
      const session: ScanSession = {
        id: `scan_${Date.now()}`,
        timestamp: new Date(),
        imageData,
        ocrResult,
        ingredients,
        healthScore,
        processingTime
      };

      setScanSession(session);
      saveScanToHistory(session);
      setAppState('results');

    } catch (error) {
      console.error('Processing failed:', error);
      setError(error instanceof Error ? error.message : 'Processing failed. Please try again.');
      setAppState('home');
    }
  }, [ocrProcessor, ingredientLookup, healthCalculator, saveScanToHistory]);

  // Handle new scan
  const handleNewScan = useCallback(() => {
    setScanSession(null);
    setError(null);
    setAppState('home');
    setActiveTab('home');
  }, []);

  // Handle share
  const handleShare = useCallback(() => {
    if (!scanSession) return;

    const shareData = {
      title: 'SnackCheck Results',
      text: `Health Score: ${scanSession.healthScore.overall}/100 (${scanSession.healthScore.color.toUpperCase()})`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`)
        .then(() => alert('Results copied to clipboard!'))
        .catch(() => alert('Unable to share results'));
    }
  }, [scanSession]);

  // Handle tab changes
  const handleTabChange = useCallback((tab: TabState) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setAppState('home');
    } else if (tab === 'scan') {
      setAppState('scan');
    } else if (tab === 'upload') {
      // Trigger file input for uploading
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;
            handleImageCapture(imageData);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  }, [handleImageCapture]);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile View */}
      <div className="lg:hidden">
        {/* Profile Icon */}
        <div className="absolute top-4 right-4 z-10">
          <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        {appState === 'home' && (
          <>
            <div className="px-4 sm:px-6 pt-8 pb-24">
              {/* Welcome Message */}
              <p className="text-gray-600 text-base mb-8 font-light">welcome back, User ⭐</p>

              {/* Main Headline */}
              <div className="mb-12">
                <h1 className="text-4xl sm:text-5xl text-black leading-tight font-normal tracking-tight">
                  Scan your<br />
                  food<br />
                  ingredients<br />
                  with our AI
                </h1>
              </div>

              {/* Section Divider */}
              <div className="flex items-center mb-8">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="px-4 text-gray-500 text-sm font-light">your recent scans</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Food History */}
            <div className="px-4 sm:px-6 pb-6">
              <FoodHistory scanHistory={scanHistory} />
            </div>
          </>
        )}

        {appState === 'scan' && (
          <div className="px-4 sm:px-6 pt-8 pb-24">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Scan Food Label
              </h2>
              <p className="text-gray-600">
                Point your camera at the ingredients list
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <CameraCapture
              onImageCapture={handleImageCapture}
              isProcessing={appState === 'processing'}
            />

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Make sure the ingredients list is clearly visible and well-lit
              </p>
            </div>
          </div>
        )}

        {appState === 'processing' && (
          <div className="px-4 sm:px-6 pt-8">
            <LoadingScreen step={processingStep} />
          </div>
        )}

        {appState === 'results' && scanSession && (
          <div className="px-4 sm:px-6 pt-8 pb-24">
            <ResultsDisplay
              score={scanSession.healthScore}
              ingredients={scanSession.ingredients}
              onNewScan={handleNewScan}
              onShare={handleShare}
            />
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNavbar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Profile Icon */}
          <div className="absolute top-6 right-8">
            <button className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-16 items-center min-h-screen">
            {/* Left Column - Content */}
            <div>
              <p className="text-gray-600 text-lg mb-8 font-light">welcome back, User ⭐</p>
              <h1 className="text-5xl text-black leading-tight font-normal mb-12 tracking-tight">
                Scan your food ingredients with our AI
              </h1>

              <div className="flex items-center mb-12">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="px-6 text-gray-500 text-lg font-light">your recent scans</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Desktop Navigation */}
              <div className="flex space-x-6">
                <button 
                  onClick={() => handleTabChange('scan')}
                  className="w-16 h-16 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl flex items-center justify-center"
                >
                  <Scan className="w-8 h-8 text-gray-700" />
                </button>
                <button 
                  onClick={() => handleTabChange('home')}
                  className={`w-16 h-16 transition-colors rounded-xl flex items-center justify-center ${
                    activeTab === 'home' ? 'bg-lime-400 hover:bg-lime-500' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <HomeIcon className={`w-8 h-8 ${activeTab === 'home' ? 'text-black' : 'text-gray-700'}`} />
                </button>
              </div>

              {error && (
                <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Right Column - Food History */}
            <div className="relative">
              {appState === 'home' && (
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-white p-6">
                  <FoodHistory scanHistory={scanHistory} />
                </div>
              )}

              {appState === 'scan' && (
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-white p-6 flex flex-col">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan Food Label</h3>
                    <p className="text-sm text-gray-600">Point your camera at the ingredients list</p>
                  </div>
                  <div className="flex-1">
                    <CameraCapture
                      onImageCapture={handleImageCapture}
                      isProcessing={appState === 'processing'}
                    />
                  </div>
                </div>
              )}
              
              {appState === 'processing' && (
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-white p-6 flex items-center justify-center">
                  <LoadingScreen step={processingStep} />
                </div>
              )}

              {appState === 'results' && scanSession && (
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-white p-6">
                  <ResultsDisplay
                    score={scanSession.healthScore}
                    ingredients={scanSession.ingredients}
                    onNewScan={handleNewScan}
                    onShare={handleShare}
                  />
                </div>
              )}

              {/* Floating Action Button */}
              <button 
                onClick={() => handleTabChange('scan')}
                className="absolute -bottom-6 -right-6 w-20 h-20 bg-lime-400 hover:bg-lime-500 transition-all duration-300 hover:scale-105 rounded-full shadow-lg flex items-center justify-center"
              >
                <Scan className="w-10 h-10 text-black" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnackCheckApp;