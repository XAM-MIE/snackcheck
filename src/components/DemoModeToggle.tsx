import React, { useState, useEffect } from 'react';
import { DemoService } from '../services/DemoService';

interface DemoModeToggleProps {
  onDemoModeChange?: (isEnabled: boolean) => void;
  className?: string;
}

/**
 * Demo Mode Toggle Component
 * Provides a toggle switch for enabling/disabling demo mode
 * and displays demo status information
 */
export const DemoModeToggle: React.FC<DemoModeToggleProps> = ({
  onDemoModeChange,
  className = ''
}) => {
  const [demoStatus, setDemoStatus] = useState(DemoService.getDemoModeStatus());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update status on mount and when URL changes
    const updateStatus = () => {
      setDemoStatus(DemoService.getDemoModeStatus());
    };

    updateStatus();
    window.addEventListener('popstate', updateStatus);
    
    return () => {
      window.removeEventListener('popstate', updateStatus);
    };
  }, []);

  const handleToggle = async () => {
    setIsLoading(true);
    
    try {
      if (demoStatus.isEnabled) {
        DemoService.disableDemoMode();
      } else {
        DemoService.enableDemoMode();
        // Pre-populate cache when enabling demo mode
        await DemoService.prePopulateCache();
      }
      
      const newStatus = DemoService.getDemoModeStatus();
      setDemoStatus(newStatus);
      onDemoModeChange?.(newStatus.isEnabled);
    } catch (error) {
      console.error('Failed to toggle demo mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!demoStatus.isEnabled) return 'text-gray-500';
    
    switch (demoStatus.source) {
      case 'development':
        return 'text-blue-600';
      case 'environment':
        return 'text-green-600';
      case 'url':
        return 'text-purple-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (!demoStatus.isEnabled) return 'Disabled';
    
    switch (demoStatus.source) {
      case 'development':
        return 'Development Mode';
      case 'environment':
        return 'Environment Variable';
      case 'url':
        return 'URL Parameter';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`demo-mode-toggle ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900">Demo Mode</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              demoStatus.isEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {getStatusText()}
            </span>
          </div>
          
          <p className="text-xs text-gray-600 mt-1">
            {demoStatus.isEnabled 
              ? `Using ${demoStatus.availableImages} demo images for reliable presentation`
              : 'Live camera and API mode'
            }
          </p>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isLoading || demoStatus.source === 'development' || demoStatus.source === 'environment'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            demoStatus.isEnabled 
              ? 'bg-blue-600' 
              : 'bg-gray-200'
          } ${
            (demoStatus.source === 'development' || demoStatus.source === 'environment')
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
          title={
            (demoStatus.source === 'development' || demoStatus.source === 'environment')
              ? 'Demo mode is controlled by environment settings'
              : 'Toggle demo mode'
          }
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              demoStatus.isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {demoStatus.isEnabled && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-800">
                <strong>Demo Mode Active:</strong> Using pre-configured food labels and cached ingredient data. 
                Perfect for presentations and testing when network connectivity is unreliable.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          <span>Updating demo mode...</span>
        </div>
      )}
    </div>
  );
};

export default DemoModeToggle;