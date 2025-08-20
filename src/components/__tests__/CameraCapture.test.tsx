import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import CameraCapture from '../CameraCapture'

// Mock MediaStream
const mockMediaStream = {
  getTracks: vi.fn(() => [
    { stop: vi.fn() }
  ]),
} as unknown as MediaStream

describe('CameraCapture', () => {
  const mockOnImageCapture = vi.fn()
  const defaultProps = {
    onImageCapture: mockOnImageCapture,
    isProcessing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.mediaDevices mock
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockMediaStream)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render camera component container', () => {
      render(<CameraCapture {...defaultProps} />)
      const container = document.querySelector('.relative.w-full.max-w-md')
      expect(container).toBeInTheDocument()
    })

    it('should request camera access on mount', async () => {
      render(<CameraCapture {...defaultProps} />)
      
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle permission denied error', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError)

      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Camera permission denied/)).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('should handle no camera found error', async () => {
      const noDeviceError = new Error('No camera found')
      noDeviceError.name = 'NotFoundError'
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(noDeviceError)

      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/No camera found/)).toBeInTheDocument()
      })
    })

    it('should handle unsupported browser', () => {
      // Mock unsupported browser by deleting mediaDevices
      const originalMediaDevices = navigator.mediaDevices
      // @ts-ignore
      delete navigator.mediaDevices

      render(<CameraCapture {...defaultProps} />)

      expect(screen.getByText(/Camera is not supported/)).toBeInTheDocument()

      // Restore
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        configurable: true,
        writable: true
      })
    })

    it('should allow retry after permission error', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(permissionError)
        .mockResolvedValueOnce(mockMediaStream)

      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try Again')
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('File Upload Functionality', () => {
    it('should show file upload option when camera fails', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError)

      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument()
      })
    })

    it('should handle file upload', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError)

      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Choose File')).toBeInTheDocument()
      })

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeInTheDocument()

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(mockOnImageCapture).toHaveBeenCalledWith('data:image/jpeg;base64,mock-file-data')
      })
    })

    it('should disable file upload when processing', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError)

      render(<CameraCapture {...defaultProps} isProcessing={true} />)

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        expect(fileInput).toBeDisabled()
      })
    })
  })

  describe('Camera Configuration', () => {
    it('should request optimal camera settings for OCR', async () => {
      render(<CameraCapture {...defaultProps} />)

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment', // Back camera for better label scanning
            width: { ideal: 1920, min: 1280 }, // High resolution for text clarity
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        })
      })
    })
  })

})