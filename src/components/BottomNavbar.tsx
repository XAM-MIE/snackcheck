'use client';

import { Home, Scan, Upload } from 'lucide-react';

interface BottomNavbarProps {
  activeTab?: 'home' | 'scan' | 'upload';
  onTabChange?: (tab: 'home' | 'scan' | 'upload') => void;
}

export function BottomNavbar({ activeTab = 'home', onTabChange }: BottomNavbarProps) {
  const handleTabChange = (tab: 'home' | 'scan' | 'upload') => {
    onTabChange?.(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 lg:hidden">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => handleTabChange('home')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            activeTab === 'home' ? 'text-lime-500' : 'text-gray-500'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">Home</span>
        </button>

        <button
          onClick={() => handleTabChange('scan')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            activeTab === 'scan' ? 'text-lime-500' : 'text-gray-500'
          }`}
        >
          <Scan className="w-6 h-6" />
          <span className="text-xs mt-1">Scan</span>
        </button>

        <button
          onClick={() => handleTabChange('upload')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            activeTab === 'upload' ? 'text-lime-500' : 'text-gray-500'
          }`}
        >
          <Upload className="w-6 h-6" />
          <span className="text-xs mt-1">Upload</span>
        </button>
      </div>
    </nav>
  );
}