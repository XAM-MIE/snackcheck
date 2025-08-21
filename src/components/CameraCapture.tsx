'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraProps {
  onImageCapture: (imageData: string) => void;
  isProcessing: boolean;
}

interface CameraError {
  type: 'permission' | 'not_supported' | 'no_camera' | 'unknown';
  message: string;
}

export const CameraCapture: React.FC<CameraProps> = ({ onImageCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [, setHasPermission] = useState<boolean | null>(null);

  // Check if camera is supported
  const isCameraSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!isCameraSupported()) {
      setError({
        type: 'not_supported',
        message: 'Camera is not supported in this browser. Please use a modern browser or upload an image instead.'
      });
      return;
    }

    try {
      setError(null);
      
      // Request camera access with optimal settings for OCR
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16/9 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setHasPermission(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError({
            type: 'permission',
            message: 'Camera permission denied. Please allow camera access and try again.'
          });
          setHasPermission(false);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError({
            type: 'no_camera',
            message: 'No camera found. Please ensure your device has a camera or use the file upload option.'
          });
        } else {
          setError({
            type: 'unknown',
            message: 'Failed to access camera. Please try again or use the file upload option.'
          });
        }
      }
    }
  }, [isCameraSupported]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture image from video stream
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to high-quality JPEG for OCR processing
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    onImageCapture(imageData);
  }, [isStreaming, onImageCapture]);

  // Initialize camera on component mount
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle file upload as fallback
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      onImageCapture(imageData);
    };
    reader.readAsDataURL(file);
  }, [onImageCapture]);

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
      {/* Video Stream */}
      {isStreaming && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
          />
          
          {/* Label positioning guide overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg opacity-70">
              <div className="absolute top-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                Position label here
              </div>
            </div>
          </div>
          
          {/* Capture button */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button
              onClick={captureImage}
              disabled={isProcessing}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-white mb-4">{error.message}</p>
          
          {error.type === 'permission' && (
            <button
              onClick={startCamera}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* File upload fallback */}
      {(error || !isStreaming) && (
        <div className="p-6 text-center border-t border-gray-600">
          <p className="text-gray-300 mb-4">Or upload an image:</p>
          <label className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors inline-block">
            Choose File
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;