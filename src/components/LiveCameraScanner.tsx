'use client';

/**
 * @file LiveCameraScanner.tsx
 * @description Viewfinder component with continuous camera stream scanning, laser reticle, device switching, and torch toggle.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, RefreshCw, Zap, ZapOff, Video, AlertCircle } from 'lucide-react';
import { detectBarcodeFromSource, playScanSuccessFeedback } from '@/lib/barcode-detector';
import { logger } from '@/lib/logger';

interface LiveCameraScannerProps {
  onScan: (barcode: string, format?: string) => void;
  isActive: boolean;
}

export function LiveCameraScanner({ onScan, isActive }: LiveCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanAttemptRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream();
    setErrorMessage('');
    setIsCapturing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera streaming is not supported in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as { torch?: boolean }) : {};
        setTorchAvailable(Boolean(capabilities.torch));
      }

      // Discover available camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (!deviceId && videoInputs.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const currentId = activeTrack?.getSettings()?.deviceId || videoInputs[0].deviceId;
        setSelectedDeviceId(currentId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      logger.warn('CAMERA-SCANNER', 'Camera stream initialization rejected', { msg });
      setHasPermission(false);
      setErrorMessage(
        msg.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in browser permissions.'
          : msg
      );
    } finally {
      setIsCapturing(false);
    }
  }, [stopStream]);

  // Frame processing loop
  const scanLoop = useCallback(() => {
    if (!isActive || !videoRef.current || isScanningRef.current) return;

    const now = performance.now();
    // Throttle scan passes to every 120ms to save CPU & thermal overhead
    if (now - lastScanAttemptRef.current > 120) {
      lastScanAttemptRef.current = now;

      if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        isScanningRef.current = true;
        detectBarcodeFromSource(videoRef.current)
          .then((result) => {
            if (result && result.rawValue) {
              playScanSuccessFeedback();
              onScan(result.rawValue, result.format);
            }
          })
          .catch(() => {})
          .finally(() => {
            isScanningRef.current = false;
          });
      }
    }

    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
  }, [isActive, onScan]);

  // Toggle torch / flash on device
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const newTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: newTorch } as MediaTrackConstraintSet],
        });
        setTorchOn(newTorch);
      } catch (err) {
        logger.debug('CAMERA-TORCH', 'Torch toggle failed', err);
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera(selectedDeviceId);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isActive, selectedDeviceId, startCamera, stopStream]);

  useEffect(() => {
    if (isActive && hasPermission) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, hasPermission, scanLoop]);

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[460px] rounded-3xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center">
      {/* Active Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasPermission ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Target Reticle Overlay */}
      {hasPermission && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Translucent Dimmed Backdrop outside target area */}
          <div className="relative w-[75%] sm:w-[65%] max-w-[340px] aspect-[16/10] rounded-2xl border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-center overflow-hidden">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-sm" />

            {/* Animated Laser Scanning Beam */}
            <motion.div
              animate={{ y: ['-120%', '120%'] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444]"
            />

            <div className="absolute bottom-2 text-[10px] tracking-wider uppercase font-semibold text-amber-300/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Align Barcode in Frame
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Overlay: Camera switch, Torch */}
      {hasPermission && (
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
          {videoDevices.length > 1 && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10">
              <Video className="w-3.5 h-3.5 text-zinc-400 ml-2" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent text-white text-xs font-medium py-1 px-2 focus:outline-none appearance-none cursor-pointer"
                aria-label="Select camera input"
              >
                {videoDevices.map((d, index) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900 text-white">
                    {d.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                torchOn
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                  : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
              }`}
              title="Toggle Flash / Torch"
              aria-label="Toggle flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {/* Error / Permission Denied State */}
      {hasPermission === false && (
        <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-zinc-950/95">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
            <CameraOff className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-white mb-1">Camera Unavailable</h4>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">{errorMessage}</p>
          <button
            onClick={() => startCamera(selectedDeviceId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Camera Access
          </button>
        </div>
      )}

      {/* Loading Stream State */}
      {isCapturing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <span className="text-xs font-medium text-zinc-300">Initializing Optical Sensor...</span>
        </div>
      )}
    </div>
  );
}
