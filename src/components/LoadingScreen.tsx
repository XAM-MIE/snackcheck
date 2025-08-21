'use client';

import React from 'react';

interface LoadingScreenProps {
  step: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ step }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white">
      <div className="max-w-md mx-auto text-center">
        {/* Animated Logo */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-lime-400 rounded-xl mx-auto flex items-center justify-center mb-4">
              <span className="text-black font-bold text-2xl">S</span>
            </div>
            
            {/* Scanning Animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-lime-200 border-t-lime-500 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Analyzing Your Food
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-gray-700 text-sm font-medium">{step}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                step.includes('Extracting') ? 'bg-lime-500' : 'bg-gray-300'
              }`}></div>
              <span>Reading ingredients</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                step.includes('Looking up') ? 'bg-lime-500' : 'bg-gray-300'
              }`}></div>
              <span>Looking up nutrition data</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                step.includes('Calculating') ? 'bg-lime-500' : 'bg-gray-300'
              }`}></div>
              <span>Calculating health score</span>
            </div>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="mt-8 p-4 bg-lime-50 rounded-lg">
          <p className="text-sm text-lime-700">
            💡 <strong>Did you know?</strong> Reading ingredient lists can help you avoid hidden sugars, 
            artificial additives, and make healthier choices for you and your family.
          </p>
        </div>

        {/* Processing Time Indicator */}
        <div className="mt-6">
          <p className="text-xs text-gray-500">
            This usually takes 2-5 seconds...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;