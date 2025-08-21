'use client';

import React, { useEffect, useRef } from 'react';
import { initializeMobileOptimizations } from '../utils/mobileOptimizations';

interface MobileOptimizationProviderProps {
  children: React.ReactNode;
}

export const MobileOptimizationProvider: React.FC<MobileOptimizationProviderProps> = ({
  children,
}) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize mobile optimizations
    cleanupRef.current = initializeMobileOptimizations();

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return <>{children}</>;
};