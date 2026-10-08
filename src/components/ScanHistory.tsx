'use client';

/**
 * @file ScanHistory.tsx
 * @description Slide-over drawer reviewing session barcode investigations with CSV export and quick re-inspection.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { AmazonProduct } from '@/types/amazon';

interface ScanHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  items: AmazonProduct[];
  onSelectItem: (item: AmazonProduct) => void;
  onClearHistory: () => void;
}

export function ScanHistory({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onClearHistory,
}: ScanHistoryProps) {
  const handleExportCSV = () => {
    if (items.length === 0) return;

    const headers = ['ASIN', 'Title', 'Brand', 'Barcode', 'Price', 'Currency', 'Marketplace', 'URL', 'ScannedAt'];
    const rows = items.map((i) => [
      `"${i.asin}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${(i.brand || '').replace(/"/g, '""')}"`,
      `"${i.barcode}"`,
      `"${i.price?.amount || ''}"`,
      `"${i.price?.currency || ''}"`,
      `"${i.marketplaceName}"`,
      `"${i.amazonUrl}"`,
      `"${i.scannedAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `amazon_scans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md h-full bg-zinc-950/95 border-l border-white/10 p-6 flex flex-col shadow-2xl backdrop-blur-2xl text-white z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Investigation Log</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-mono text-zinc-300">
                  {items.length}
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <p className="text-sm">No items investigated yet.</p>
                  <p className="text-xs mt-1">Scan or upload a barcode to start building your log.</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={`${item.barcode}-${index}`}
                    onClick={() => {
                      onSelectItem(item);
                      onClose();
                    }}
                    className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer flex gap-3 group"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-black/50 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                        <span className="font-mono text-amber-400">{item.asin}</span>
                        {item.price && <span className="font-bold text-white">{item.price.formatted}</span>}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between">
                        <span>Barcode: {item.barcode}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            {items.length > 0 && (
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  onClick={onClearHistory}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
