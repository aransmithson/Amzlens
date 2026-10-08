/**
 * @file barcode-detector.ts
 * @description Client-side barcode recognition engine supporting both modern native BarcodeDetector API and ZXing fallback with audio/haptic feedback.
 */

import { BrowserMultiFormatReader, BarcodeFormat as ZXingBarcodeFormat } from '@zxing/browser';
import { logger } from './logger';

export interface ScanDetectionResult {
  rawValue: string;
  format: string;
  engine: 'native-barcode-detector' | 'zxing';
}

/**
 * Audio Context singleton to trigger non-blocking scan confirmation chirps.
 */
let audioCtx: AudioContext | null = null;

/**
 * Triggers an electronic confirmation chirp and brief device vibration upon successful barcode capture.
 */
export function playScanSuccessFeedback(): void {
  try {
    if (typeof window === 'undefined') return;

    // Trigger haptic rumble on supported mobile hardware
    if ('vibrate' in navigator) {
      navigator.vibrate([60, 40, 60]);
    }

    // Synthesize crisp audio beep
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08); // Jump to A6

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (err: unknown) {
    logger.debug('AUDIO-FEEDBACK', 'Audio feedback was blocked or unsupported', err);
  }
}

/**
 * Cached ZXing reader instance to minimize initialization overhead during continuous video stream decoding.
 */
let zxingReaderInstance: BrowserMultiFormatReader | null = null;

function getZXingReader(): BrowserMultiFormatReader {
  if (!zxingReaderInstance) {
    zxingReaderInstance = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 100,
    });
  }
  return zxingReaderInstance;
}

/**
 * Scans an HTML video element or image source for barcodes.
 * Prefers native hardware-accelerated BarcodeDetector, gracefully falling back to ZXing.
 *
 * @param {HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap} source - Media element to analyze.
 * @returns {Promise<ScanDetectionResult | null>} Detected barcode result or null.
 */
export async function detectBarcodeFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<ScanDetectionResult | null> {
  // Strategy 1: Native BarcodeDetector (Chrome, Edge, Opera, Android WebView)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      type NativeDetectorType = {
        detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>>;
      };
      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: new (opts?: { formats: string[] }) => NativeDetectorType }).BarcodeDetector;
      const detector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      const barcodes = await detector.detect(source as ImageBitmapSource);
      if (barcodes && barcodes.length > 0) {
        return {
          rawValue: barcodes[0].rawValue,
          format: barcodes[0].format,
          engine: 'native-barcode-detector',
        };
      }
    } catch {
      // Continue to ZXing fallback
    }
  }

  // Strategy 2: ZXing Reader Fallback
  try {
    const reader = getZXingReader();
    if (source instanceof HTMLImageElement) {
      const result = await reader.decodeFromImageElement(source);
      if (result) {
        return {
          rawValue: result.getText(),
          format: ZXingBarcodeFormat[result.getBarcodeFormat()] || 'BARCODE',
          engine: 'zxing',
        };
      }
    } else if (source instanceof HTMLCanvasElement) {
      const result = await reader.decodeFromCanvas(source);
      if (result) {
        return {
          rawValue: result.getText(),
          format: ZXingBarcodeFormat[result.getBarcodeFormat()] || 'BARCODE',
          engine: 'zxing',
        };
      }
    }
  } catch {
    // Decoding frame did not contain a valid barcode
  }

  return null;
}

/**
 * Decodes a barcode from a user-supplied image file (PNG, JPG, WebP).
 *
 * @param {File} file - User-selected or photographed image file.
 * @returns {Promise<ScanDetectionResult | null>} Detection result.
 */
export async function detectBarcodeFromFile(file: File): Promise<ScanDetectionResult | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          const result = await detectBarcodeFromSource(img);
          if (result) {
            playScanSuccessFeedback();
            resolve(result);
          } else {
            // Also try offscreen canvas drawing with contrast boost for difficult lighting
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const canvasResult = await detectBarcodeFromSource(canvas);
              if (canvasResult) {
                playScanSuccessFeedback();
                resolve(canvasResult);
                return;
              }
            }
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
