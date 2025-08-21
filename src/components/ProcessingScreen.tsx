'use client';

import React, { useEffect, useState } from 'react';

interface ProcessingScreenProps {
  processingTime: number;
  onTimeout?: () => void;
}

const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ 
  processingTime, 
  onTimeout 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const steps = [
    { label: 'Extracting text from image...', icon: '🔍', duration: 2000 },
    { label: 'Identifying ingredients...', icon: '📝', duration: 1500 },
    { label: 'Looking up nutritional data...', icon: '🔬', duration: 1000 },
    { label: 'Calculating health score...', icon: '⚖️', duration: 500 },
  ];

  useEffect(() => {
    // Auto-advance through steps based on processing time
    const stepDuration = 1200; // 1.2 seconds per step
    const targetStep = Math.min(
      Math.floor(processingTime / stepDuration),
      steps.length - 1
    );
    
    if (targetStep !== currentStep) {
      const timer = setTimeout(() => {
        setCurrentStep(targetStep);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [processingTime, currentStep, steps.length]);

  useEffect(() => {
    // Show timeout warning after 8 seconds
    if (processingTime > 8000 && !timeoutWarning) {
      setTimeoutWarning(true);
    }

    // Call timeout callback after 10 seconds
    if (processingTime > 10000 && onTimeout) {
      onTimeout();
    }
  }, [processingTime, timeoutWarning, onTimeout]);

  const progressPercentage = Math.min((processingTime / 5000) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main processing animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Outer spinning ring */}
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            
            {/* Inner content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl animate-pulse">
                {steps[currentStep]?.icon || '🔍'}
              </span>
            </div>
          </div>
        </div>

        {/* Current step */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Analyzing Your Food
          </h2>
          <p className="text-gray-600 animate-pulse">
            {steps[currentStep]?.label || 'Processing...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0s</span>
            <span className="font-medium">
              {(processingTime / 1000).toFixed(1)}s
            </span>
            <span>5s target</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`
                flex items-center space-x-3 p-3 rounded-lg transition-all duration-300
                ${index <= currentStep 
                  ? 'bg-white shadow-sm border border-blue-100' 
                  : 'bg-gray-50 border border-gray-100'
                }
              `}
            >
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm
                ${index < currentStep 
                  ? 'bg-green-100 text-green-600' 
                  : index === currentStep 
                    ? 'bg-blue-100 text-blue-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-400'
                }
              `}>
                {index < currentStep ? '✓' : step.icon}
              </div>
              <span className={`
                text-sm font-medium
                ${index <= currentStep ? 'text-gray-800' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Performance indicator */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Performance</span>
            <div className="flex items-center space-x-2">
              <div className={`
                w-2 h-2 rounded-full
                ${processingTime < 3000 ? 'bg-green-500' :
                  processingTime < 5000 ? 'bg-yellow-500' : 'bg-red-500'}
              `} />
              <span className={`
                text-sm font-medium
                ${processingTime < 3000 ? 'text-green-600' :
                  processingTime < 5000 ? 'text-yellow-600' : 'text-red-600'}
              `}>
                {processingTime < 3000 ? 'Excellent' :
                 processingTime < 5000 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>
        </div>

        {/* Timeout warning */}
        {timeoutWarning && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Taking longer than expected
                </p>
                <p className="text-xs text-yellow-600">
                  This might be due to image quality or network conditions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fun facts during processing */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 italic">
            💡 Did you know? The average food product contains 15-20 ingredients
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingScreen;