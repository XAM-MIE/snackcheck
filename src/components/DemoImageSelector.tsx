import React, { useState, useEffect } from 'react';
import { DemoService } from '../services/DemoService';

interface DemoImage {
  name: string;
  filename: string;
  mockOCRText: string;
  expectedIngredients: string[];
  expectedScore?: number;
  expectedColor?: 'green' | 'yellow' | 'red';
}

interface DemoImageSelectorProps {
  onImageSelect: (image: DemoImage) => void;
  onRandomSelect: () => void;
  className?: string;
  showPreview?: boolean;
}

/**
 * Demo Image Selector Component
 * Allows users to select specific demo images for testing
 */
export const DemoImageSelector: React.FC<DemoImageSelectorProps> = ({
  onImageSelect,
  onRandomSelect,
  className = '',
  showPreview = true
}) => {
  const [demoImages, setDemoImages] = useState<DemoImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<DemoImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDemoImages();
  }, []);

  const loadDemoImages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const images = await DemoService.getDemoImages();
      setDemoImages(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (image: DemoImage) => {
    setSelectedImage(image);
    onImageSelect(image);
  };

  const handleRandomSelect = () => {
    setSelectedImage(null);
    onRandomSelect();
  };

  const getScoreColor = (color?: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 bg-green-100';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-100';
      case 'red':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreIcon = (color?: string) => {
    switch (color) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'red':
        return '🔴';
      default:
        return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className={`demo-image-selector ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading demo images...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`demo-image-selector ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
          <button
            onClick={loadDemoImages}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`demo-image-selector ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Select Demo Image</h3>
          <button
            onClick={handleRandomSelect}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
          >
            Random
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {demoImages.map((image, index) => (
            <button
              key={image.filename}
              onClick={() => handleImageSelect(image)}
              className={`p-3 text-left border rounded-lg transition-all hover:shadow-sm ${
                selectedImage?.filename === image.filename
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {image.name}
                    </span>
                    {image.expectedScore && (
                      <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(image.expectedColor)}`}>
                        {getScoreIcon(image.expectedColor)} {image.expectedScore}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {image.expectedIngredients.slice(0, 3).join(', ')}
                    {image.expectedIngredients.length > 3 && ` +${image.expectedIngredients.length - 3} more`}
                  </p>
                </div>
                
                <div className="flex-shrink-0 ml-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {showPreview && selectedImage && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <h4 className="text-xs font-medium text-gray-900 mb-2">Preview: {selectedImage.name}</h4>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-600">OCR Text:</span>
                <p className="text-xs text-gray-800 bg-white p-2 rounded border mt-1 font-mono">
                  {selectedImage.mockOCRText}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Expected Ingredients:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedImage.expectedIngredients.map((ingredient, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-white border rounded text-gray-700"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
              {selectedImage.expectedScore && (
                <div>
                  <span className="text-xs text-gray-600">Expected Score:</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getScoreColor(selectedImage.expectedColor)}`}>
                    {getScoreIcon(selectedImage.expectedColor)} {selectedImage.expectedScore} ({selectedImage.expectedColor?.toUpperCase()})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          {demoImages.length} demo images available
        </div>
      </div>
    </div>
  );
};

export default DemoImageSelector;