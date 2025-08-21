/**
 * Image optimization utilities for better OCR performance and reduced memory usage
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  enablePreprocessing?: boolean;
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.85,
    format: 'jpeg',
    enablePreprocessing: true,
  };

  /**
   * Optimize image for OCR processing
   */
  static async optimizeForOCR(
    imageData: string,
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Calculate optimal dimensions
          const { width, height } = this.calculateOptimalDimensions(
            img.width,
            img.height,
            opts.maxWidth,
            opts.maxHeight
          );

          canvas.width = width;
          canvas.height = height;

          // Apply image preprocessing for better OCR
          if (opts.enablePreprocessing) {
            this.preprocessImage(ctx, img, width, height);
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }

          // Convert to optimized format
          const optimizedData = canvas.toDataURL(
            `image/${opts.format}`,
            opts.quality
          );

          resolve(optimizedData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      img.src = imageData;
    });
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Scale down if too large
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    // Ensure minimum size for OCR
    const minWidth = 400;
    const minHeight = 300;

    if (width < minWidth) {
      height = (height * minWidth) / width;
      width = minWidth;
    }

    if (height < minHeight) {
      width = (width * minHeight) / height;
      height = minHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Apply image preprocessing to improve OCR accuracy
   */
  private static preprocessImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number
  ): void {
    // Draw the image
    ctx.drawImage(img, 0, 0, width, height);

    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Apply contrast enhancement and noise reduction
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to grayscale with weighted average
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      // Apply contrast enhancement
      const enhanced = this.enhanceContrast(gray);

      // Set RGB to enhanced grayscale value
      data[i] = enhanced;     // R
      data[i + 1] = enhanced; // G
      data[i + 2] = enhanced; // B
      // Alpha channel (data[i + 3]) remains unchanged
    }

    // Put the processed image data back
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Enhance contrast for better text recognition
   */
  private static enhanceContrast(value: number): number {
    // Apply sigmoid contrast enhancement
    const normalized = value / 255;
    const enhanced = 1 / (1 + Math.exp(-12 * (normalized - 0.5)));
    return Math.round(enhanced * 255);
  }

  /**
   * Compress image data for storage/transmission
   */
  static async compressImage(
    imageData: string,
    quality: number = 0.7
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const compressedData = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = imageData;
    });
  }

  /**
   * Get image size information
   */
  static getImageInfo(imageData: string): Promise<{
    width: number;
    height: number;
    size: number;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const format = imageData.split(';')[0].split('/')[1] || 'unknown';
        const size = Math.round((imageData.length * 3) / 4); // Approximate size in bytes
        
        resolve({
          width: img.width,
          height: img.height,
          size,
          format,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for analysis'));
      };

      img.src = imageData;
    });
  }
}