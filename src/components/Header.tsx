'use client';

/**
 * @file Header.tsx
 * @description Top navigation bar with marketplace selector, active mode status, history counter, and settings triggers.
 */

import React from 'react';
import { ScanBarcode, Settings, Sparkles, Globe, History, ShieldCheck } from 'lucide-react';
import { SUPPORTED_MARKETPLACES, MarketplaceConfig } from '@/types/amazon';

interface HeaderProps {
  selectedMarketplace: MarketplaceConfig;
  onSelectMarketplace: (marketplace: MarketplaceConfig) => void;
  isMockMode: boolean;
  historyCount: number;
  onOpenSettings: () => void;
  onToggleHistory: () => void;
}

export function Header({
  selectedMarketplace,
  onSelectMarketplace,
  isMockMode,
  historyCount,
  onOpenSettings,
  onToggleHistory,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/70 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-500/20">
            <ScanBarcode className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-zinc-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Amz<span className="text-amber-400">lens</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/5">
                Investigator
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Barcode to Amazon Catalog Intelligence
            </p>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Country Buttons (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-white/10">
            {SUPPORTED_MARKETPLACES.map((mp) => (
              <button
                key={mp.id}
                type="button"
                onClick={() => onSelectMarketplace(mp)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedMarketplace.id === mp.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title={`Target Amazon ${mp.name} (${mp.currency})`}
              >
                <span>{mp.flag}</span>
                <span>{mp.code}</span>
              </button>
            ))}
          </div>

          {/* Compact Marketplace Dropdown (Mobile / Tablet) */}
          <div className="relative flex lg:hidden items-center">
            <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedMarketplace.id}
              onChange={(e) => {
                const found = SUPPORTED_MARKETPLACES.find((m) => m.id === e.target.value);
                if (found) onSelectMarketplace(found);
              }}
              className="pl-8 pr-7 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-semibold text-zinc-200 hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none cursor-pointer transition-colors"
              aria-label="Select Amazon Marketplace"
            >
              {SUPPORTED_MARKETPLACES.map((mp) => (
                <option key={mp.id} value={mp.id} className="bg-zinc-900 text-white">
                  {mp.flag} {mp.code} ({mp.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Pill Badge */}
          <button
            onClick={onOpenSettings}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isMockMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="Click to toggle or configure API mode in settings"
          >
            {isMockMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Mode</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SP-API Live</span>
              </>
            )}
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={onToggleHistory}
            className="relative p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-colors flex items-center gap-1.5"
            aria-label="Toggle scan history"
          >
            <History className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
