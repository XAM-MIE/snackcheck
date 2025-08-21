import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock MediaDevices API for testing
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: {
    getUserMedia: vi.fn(),
  },
})

// Mock HTMLVideoElement methods
Object.defineProperty(global.HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

Object.defineProperty(global.HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
})

// Mock HTMLCanvasElement methods
Object.defineProperty(global.HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  }),
})

Object.defineProperty(global.HTMLCanvasElement.prototype, 'toDataURL', {
  writable: true,
  value: vi.fn().mockReturnValue('data:image/jpeg;base64,mock-image-data'),
})

// Mock FileReader
global.FileReader = class {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  result: string | ArrayBuffer | null = null
  
  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-file-data'
      if (this.onload) {
        this.onload({ target: this } as unknown as ProgressEvent<FileReader>)
      }
    }, 0)
  }
} as any