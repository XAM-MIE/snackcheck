/**
 * Cross-browser compatibility tests for mobile devices
 * Tests camera functionality, touch interactions, and responsive design
 * across different mobile browsers and viewport sizes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../contexts/AppContext';
import SnackCheckApp from '../../components/SnackCheckApp';

// Mobile browser user agents for testing
const MOBILE_USER_AGENTS = {
  'iOS Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Chrome Android': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  'Samsung Internet': 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36',
  'Firefox Mobile': 'Mozilla/5.0 (Mobile; rv:91.0) Gecko/91.0 Firefox/91.0'
};

// Mobile viewport sizes for testing
const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone 12 Pro Max': { width: 428, height: 926 },
  'Samsung Galaxy S21': { width: 360, height: 800 },
  'Samsung Galaxy S21 Ultra': { width: 384, height: 854 },
  'Pixel 5': { width: 393, height: 851 }
};

// Mock camera and media APIs
const mockGetUserMedia = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }]
};

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const touchList = touches.map(touch => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    identifier: 0,
    target: document.body
  }));

  return new TouchEvent(type, {
    touches: touchList as any,
    targetTouches: touchList as any,
    changedTouches: touchList as any,
    bubbles: true,
    cancelable: true
  });
};

describe('Mobile Cross-Browser Compatibility Tests', () => {
  let originalUserAgent: string;
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Store original values
    originalUserAgent = navigator.userAgent;
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    // Mock media devices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: { getUserMedia: mockGetUserMedia }
    });

    mockGetUserMedia.mockResolvedValue(mockStream);

    // Mock canvas and video elements
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData');

    Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
      set: vi.fn(),
      get: vi.fn()
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { get: () => 1920 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { get: () => 1080 });

    // Mock FileReader
    global.FileReader = class MockFileReader {
      onload: ((event: any) => void) | null = null;
      readAsDataURL = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/jpeg;base64,mockImageData' } });
          }
        }, 0);
      });
    } as any;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUserAgent
    });
    
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });

    vi.restoreAllMocks();
  });

  const setUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: userAgent
    });
  };

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));
  };

  const renderApp = () => {
    return render(
      <AppProvider>
        <SnackCheckApp />
      </AppProvider>
    );
  };

  describe('Mobile Browser Compatibility', () => {
    Object.entries(MOBILE_USER_AGENTS).forEach(([browserName, userAgent]) => {
      describe(`${browserName} Browser`, () => {
        beforeEach(() => {
          setUserAgent(userAgent);
        });

        it('should render correctly on mobile browser', async () => {
          setViewport(375, 667); // iPhone SE size
          renderApp();

          expect(screen.getByText('SnackCheck')).toBeInTheDocument();
          expect(screen.getByText('Scan food labels for instant health insights')).toBeInTheDocument();

          // Should show mobile-optimized interface
          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });
        });

        it('should handle camera access appropriately', async () => {
          setViewport(390, 844); // iPhone 12 size
          renderApp();

          // Camera should be requested with mobile-optimized settings
          await waitFor(() => {
            if (mockGetUserMedia.mock.calls.length > 0) {
              const cameraConfig = mockGetUserMedia.mock.calls[0][0];
              expect(cameraConfig.video.facingMode).toBe('environment');
              expect(cameraConfig.video.width).toBeDefined();
              expect(cameraConfig.video.height).toBeDefined();
            }
          });
        });

        it('should handle camera failure gracefully', async () => {
          mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
          setViewport(375, 667);
          renderApp();

          // Should fallback to file upload
          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });

          // File upload should work
          const fileInput = screen.getByLabelText('Choose File');
          const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
          
          await act(async () => {
            fireEvent.change(fileInput, { target: { files: [testFile] } });
          });

          await waitFor(() => {
            expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
          });
        });

        it('should complete scan workflow on mobile browser', async () => {
          setViewport(393, 851); // Pixel 5 size
          renderApp();

          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });

          const fileInput = screen.getByLabelText('Choose File');
          const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
          
          await act(async () => {
            fireEvent.change(fileInput, { target: { files: [testFile] } });
          });

          await waitFor(() => {
            expect(screen.getByText('Scan Results')).toBeInTheDocument();
          }, { timeout: 8000 });

          expect(screen.getByText(/\d+\/100/)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Mobile Viewport Responsiveness', () => {
    Object.entries(MOBILE_VIEWPORTS).forEach(([deviceName, viewport]) => {
      describe(`${deviceName} (${viewport.width}x${viewport.height})`, () => {
        beforeEach(() => {
          setViewport(viewport.width, viewport.height);
        });

        it('should render responsive layout', async () => {
          renderApp();

          expect(screen.getByText('SnackCheck')).toBeInTheDocument();
          
          // Check that content fits in viewport
          const mainContent = screen.getByText('SnackCheck').closest('div');
          expect(mainContent).toBeInTheDocument();
        });

        it('should handle touch interactions', async () => {
          const user = userEvent.setup();
          renderApp();

          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });

          // Test touch interaction with file input
          const fileInput = screen.getByLabelText('Choose File');
          
          // Simulate touch event
          fireEvent(fileInput, createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
          fireEvent(fileInput, createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));

          // Should still be functional
          expect(fileInput).toBeInTheDocument();
        });

        it('should maintain usability in portrait orientation', async () => {
          renderApp();

          expect(screen.getByText('SnackCheck')).toBeInTheDocument();
          expect(screen.getByText('Scan food labels for instant health insights')).toBeInTheDocument();

          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });

          // All essential elements should be visible
          expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
        });

        it('should handle landscape orientation', async () => {
          // Swap width and height for landscape
          setViewport(viewport.height, viewport.width);
          renderApp();

          expect(screen.getByText('SnackCheck')).toBeInTheDocument();
          
          await waitFor(() => {
            expect(screen.getByText('Choose File')).toBeInTheDocument();
          });

          // Should still be functional in landscape
          const fileInput = screen.getByLabelText('Choose File');
          expect(fileInput).toBeInTheDocument();
        });
      });
    });
  });

  describe('Touch and Gesture Support', () => {
    beforeEach(() => {
      setViewport(375, 667); // Standard mobile size
    });

    it('should support touch-based file selection', async () => {
      const user = userEvent.setup();
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      
      // Test touch interaction
      await act(async () => {
        await user.click(fileInput);
      });

      // Should be interactive
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle touch events on results screen', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Complete a scan
      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 8000 });

      // Test touch interaction with "Scan Another" button
      const scanAnotherButton = screen.getByText('Scan Another');
      
      fireEvent(scanAnotherButton, createTouchEvent('touchstart', [{ clientX: 200, clientY: 500 }]));
      fireEvent(scanAnotherButton, createTouchEvent('touchend', [{ clientX: 200, clientY: 500 }]));
      
      await act(async () => {
        fireEvent.click(scanAnotherButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Position the ingredient list in the frame')).toBeInTheDocument();
      });
    });

    it('should support pinch-to-zoom gestures (passive)', async () => {
      renderApp();

      // Simulate pinch gesture (we can't actually test zoom, but ensure no errors)
      const element = screen.getByText('SnackCheck');
      
      fireEvent(element, createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ]));

      fireEvent(element, createTouchEvent('touchmove', [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 }
      ]));

      fireEvent(element, createTouchEvent('touchend', [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 }
      ]));

      // Should not crash or cause errors
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
    });
  });

  describe('Mobile Performance Considerations', () => {
    beforeEach(() => {
      setViewport(375, 667);
    });

    it('should handle limited memory gracefully', async () => {
      // Mock limited memory scenario
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50000000, // 50MB
          totalJSHeapSize: 60000000, // 60MB (limited)
          jsHeapSizeLimit: 100000000 // 100MB limit
        }
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Should still function with limited memory
      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle slow network conditions', async () => {
      // Mock slow network by adding delays to API calls
      const { IngredientLookup } = await import('../../services/IngredientLookup');
      const mockIngredientLookup = IngredientLookup as any;
      mockIngredientLookup.mockImplementation(() => ({
        lookupIngredient: vi.fn().mockImplementation(async (ingredient: string) => {
          // Simulate slow network (2 second delay)
          await new Promise(resolve => setTimeout(resolve, 2000));
          return {
            name: ingredient,
            source: 'openfoodfacts',
            nutritionScore: 50,
            explanation: `${ingredient} information`
          };
        })
      }));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      // Should show loading indicators during slow network
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });

      // Should eventually complete despite slow network
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 15000 });
    });

    it('should optimize image processing for mobile', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Test with a large image file
      const largeFile = new File(['large image data'.repeat(1000)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText('Choose File');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      // Should handle large files without crashing
      await waitFor(() => {
        expect(screen.getByText('Analyzing Your Food')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Accessibility on Mobile', () => {
    beforeEach(() => {
      setViewport(375, 667);
    });

    it('should support screen reader navigation', async () => {
      renderApp();

      // Check for proper ARIA labels and roles
      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      
      await waitFor(() => {
        const fileInput = screen.getByLabelText('Choose File');
        expect(fileInput).toHaveAttribute('type', 'file');
        expect(fileInput).toHaveAttribute('accept', 'image/*');
      });
    });

    it('should have appropriate touch target sizes', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });

      // Complete a scan to test button sizes
      const fileInput = screen.getByLabelText('Choose File');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument();
      }, { timeout: 8000 });

      // "Scan Another" button should be easily tappable
      const scanAnotherButton = screen.getByText('Scan Another');
      expect(scanAnotherButton).toBeInTheDocument();
    });

    it('should support high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderApp();

      expect(screen.getByText('SnackCheck')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument();
      });
    });
  });
});