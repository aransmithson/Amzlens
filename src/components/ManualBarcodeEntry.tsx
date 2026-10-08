'use client';

/**
 * @file ManualBarcodeEntry.tsx
 * @description Form input for manual barcode lookup with paste shortcut and one-click quick retail test samples.
 */

import React, { useState } from 'react';
import { Search, Sparkles, CornerDownLeft } from 'lucide-react';
import { getSampleBarcodes } from '@/lib/mock-catalog';

interface ManualBarcodeEntryProps {
  onSearch: (barcode: string) => void;
  isLoading: boolean;
}

export function ManualBarcodeEntry({ onSearch, isLoading }: ManualBarcodeEntryProps) {
  const [inputValue, setInputValue] = useState('');
  const samples = getSampleBarcodes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleSelectSample = (barcode: string) => {
    setInputValue(barcode);
    onSearch(barcode);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter UPC, EAN-13, or ISBN (e.g. 5000159459228)..."
          className="w-full pl-5 pr-28 py-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 backdrop-blur-xl transition-all font-mono"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="absolute right-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          {isLoading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Lookup</span>
              <CornerDownLeft className="w-3 h-3 text-black/60 hidden sm:inline" />
            </>
          )}
        </button>
      </form>

      {/* Quick Test Samples */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Test Barcodes:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {samples.map((item) => (
            <button
              key={item.barcode}
              type="button"
              onClick={() => handleSelectSample(item.barcode)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 hover:border-amber-500/40 text-zinc-300 hover:text-white text-xs transition-all flex items-center gap-2 group text-left"
            >
              <span className="font-medium group-hover:text-amber-300 transition-colors">
                {item.label}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400">
                {item.barcode}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
