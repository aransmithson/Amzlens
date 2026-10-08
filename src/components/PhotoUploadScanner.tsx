'use client';

/**
 * @file PhotoUploadScanner.tsx
 * @description Drag-and-drop file upload and photo capture component decoding barcodes from snapshot images.
 */

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { detectBarcodeFromFile } from '@/lib/barcode-detector';

interface PhotoUploadScannerProps {
  onScan: (barcode: string, format?: string) => void;
  isLoading: boolean;
}

export function PhotoUploadScanner({ onScan, isLoading: parentLoading }: PhotoUploadScannerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorNotice('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    setErrorNotice(null);
    setDetectedCode(null);
    setIsProcessing(true);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const result = await detectBarcodeFromFile(file);
      if (result && result.rawValue) {
        setDetectedCode(result.rawValue);
        onScan(result.rawValue, result.format);
      } else {
        setErrorNotice(
          'No readable barcode detected in this image. Ensure the barcode is in focus, well-lit, and not cropped.'
        );
      }
    } catch {
      setErrorNotice('Failed to process image. Please try another snapshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setErrorNotice(null);
    setDetectedCode(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="barcode-photo-upload"
      />

      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer w-full aspect-[4/3] sm:aspect-[16/10] max-h-[360px] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
              : 'border-white/15 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-white/30 backdrop-blur-xl'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
            <Upload className="w-8 h-8" />
          </div>

          <h4 className="text-base font-bold text-white mb-1.5">
            Photograph or Upload Barcode
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
            Drag & drop an item packaging image here, or snap a photo with your mobile or webcam.
          </p>

          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20">
            <ImageIcon className="w-4 h-4" />
            Select Image / Take Photo
          </span>
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[360px] rounded-3xl overflow-hidden border border-white/15 bg-zinc-950 flex items-center justify-center">
          {/* Preview Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded barcode target"
            className="w-full h-full object-contain"
          />

          {/* Reset action */}
          <button
            onClick={handleReset}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-colors z-20"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Processing overlay */}
          {(isProcessing || parentLoading) && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
              <span className="text-xs font-medium text-white">Analyzing Optical Barcode...</span>
            </div>
          )}

          {/* Success notice */}
          {detectedCode && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 inset-x-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Detected Barcode: <strong className="font-mono">{detectedCode}</strong>
                </span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] underline text-emerald-300 hover:text-white"
              >
                Scan Another
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorNotice && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 backdrop-blur-md"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-semibold text-red-200 underline hover:text-white"
          >
            Try Again
          </button>
        </motion.div>
      )}
    </div>
  );
}
