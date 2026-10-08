'use client';

/**
 * @file page.tsx
 * @description Main dashboard orchestrating live optical barcode capture, photo upload, SP-API resolution, and rich product presentation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  Keyboard,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Globe,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { LiveCameraScanner } from '@/components/LiveCameraScanner';
import { PhotoUploadScanner } from '@/components/PhotoUploadScanner';
import { ManualBarcodeEntry } from '@/components/ManualBarcodeEntry';
import { ProductResultCard } from '@/components/ProductResultCard';
import { ScanHistory } from '@/components/ScanHistory';
import { SettingsModal } from '@/components/SettingsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  AmazonProduct,
  LookupResponse,
  SPAPICredentials,
  SUPPORTED_MARKETPLACES,
  MarketplaceConfig,
} from '@/types/amazon';

type ScanMode = 'camera' | 'upload' | 'manual';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ScanMode>('camera');
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceConfig>(
    SUPPORTED_MARKETPLACES[0]
  );
  const [credentials, setCredentials] = useState<Partial<SPAPICredentials>>({});
  const [forceMock, setForceMock] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<{ message: string; details?: string } | null>(
    null
  );
  const [activeProduct, setActiveProduct] = useState<AmazonProduct | null>(null);
  const [scanHistory, setScanHistory] = useState<AmazonProduct[]>([]);

  // Load persisted history and credentials from localStorage on boot
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('amazon_scan_history');
      if (savedHistory) {
        setScanHistory(JSON.parse(savedHistory));
      }

      const savedCreds = localStorage.getItem('amazon_sp_api_config');
      if (savedCreds) {
        const parsed = JSON.parse(savedCreds);
        setCredentials(parsed.credentials || {});
        if (typeof parsed.forceMock === 'boolean') {
          setForceMock(parsed.forceMock);
        }
      }
    } catch {
      // Ignore localStorage errors in restricted contexts
    }
  }, []);

  // Save history to localStorage
  const saveHistoryItem = useCallback((product: AmazonProduct) => {
    setScanHistory((prev) => {
      const filtered = prev.filter((p) => p.asin !== product.asin);
      const updated = [product, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('amazon_scan_history', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Clear history
  const handleClearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('amazon_scan_history');
    } catch {
      // Ignore
    }
  };

  // Save settings
  const handleSaveSettings = (creds: Partial<SPAPICredentials>, mock: boolean) => {
    setCredentials(creds);
    setForceMock(mock);
    try {
      localStorage.setItem(
        'amazon_sp_api_config',
        JSON.stringify({ credentials: creds, forceMock: mock })
      );
    } catch {
      // Ignore
    }
  };

  // Perform product investigation
  const handleLookupBarcode = async (barcode: string) => {
    if (!barcode) return;

    setIsLoading(true);
    setLookupError(null);

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          marketplaceId: selectedMarketplace.id,
          forceMock,
          credentials,
        }),
      });

      const result = (await response.json()) as LookupResponse;

      if (response.ok && result.success && result.data) {
        setActiveProduct(result.data);
        saveHistoryItem(result.data);
      } else {
        setLookupError({
          message: result.error || 'Failed to match barcode in Amazon Catalog.',
          details: result.details,
        });
      }
    } catch (err: unknown) {
      setLookupError({
        message: 'Network error connecting to investigation service.',
        details: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500 selection:text-black">
        {/* Top Navbar */}
        <Header
          selectedMarketplace={selectedMarketplace}
          onSelectMarketplace={setSelectedMarketplace}
          isMockMode={forceMock}
          historyCount={scanHistory.length}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleHistory={() => setIsHistoryOpen(true)}
        />

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Active Product Investigation Result Card */}
          {activeProduct ? (
            <div className="space-y-6">
              <ProductResultCard
                product={activeProduct}
                onScanAnother={() => setActiveProduct(null)}
              />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AmzCheck • Barcode & Catalog Investigator</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Point. Scan. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Investigate.</span>
                </h1>
                <p className="text-sm sm:text-base text-zinc-400">
                  Scan an item barcode via live camera, snap a photo, or paste a UPC to find matching Amazon listings, ASINs, pricing, and category sales rank.
                </p>
              </div>

              {/* Marketplace Country Selector Bar (USA, IT, FR, ES, DE, UK, IE) */}
              <div className="max-w-2xl mx-auto p-3 sm:p-4 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Target Marketplace:</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {SUPPORTED_MARKETPLACES.map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setSelectedMarketplace(mp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedMarketplace.id === mp.id
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5'
                      }`}
                      title={`Target Amazon ${mp.name} (${mp.currency})`}
                    >
                      <span className="text-sm">{mp.flag}</span>
                      <span>{mp.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="max-w-md mx-auto flex items-center p-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'camera'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'upload'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Photograph</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'manual'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Manual UPC</span>
                </button>
              </div>

              {/* Active Scanner Viewport */}
              <div className="max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'camera' && (
                    <motion.div
                      key="camera"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LiveCameraScanner
                        isActive={activeTab === 'camera' && !activeProduct}
                        onScan={(barcode) => handleLookupBarcode(barcode)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'upload' && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PhotoUploadScanner
                        isLoading={isLoading}
                        onScan={(barcode) => handleLookupBarcode(barcode)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'manual' && (
                    <motion.div
                      key="manual"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/10 backdrop-blur-xl">
                        <ManualBarcodeEntry
                          onSearch={(barcode) => handleLookupBarcode(barcode)}
                          isLoading={isLoading}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading indicator bar */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-center gap-3 text-sm backdrop-blur-md"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Querying Amazon Selling Partner Catalog...</span>
                  </motion.div>
                )}

                {/* Error Banner */}
                {lookupError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 flex items-start gap-3 text-xs backdrop-blur-md"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-red-300">{lookupError.message}</div>
                      {lookupError.details && (
                        <div className="text-zinc-400">{lookupError.details}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setLookupError(null)}
                      className="text-zinc-400 hover:text-white text-xs underline"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Bottom Quick Barcode Testing Helper */}
              {activeTab !== 'manual' && (
                <div className="max-w-2xl mx-auto pt-4 border-t border-white/5">
                  <ManualBarcodeEntry
                    onSearch={(barcode) => handleLookupBarcode(barcode)}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Slide-over Investigation History */}
        <ScanHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          items={scanHistory}
          onSelectItem={(item) => setActiveProduct(item)}
          onClearHistory={handleClearHistory}
        />

        {/* SP-API & Demo Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialCreds={credentials}
          forceMock={forceMock}
          onSave={handleSaveSettings}
        />
      </div>
    </ErrorBoundary>
  );
}
