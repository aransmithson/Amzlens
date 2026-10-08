'use client';

/**
 * @file ProductResultCard.tsx
 * @description Glassmorphic product card presenting Amazon catalog findings, ASIN metadata, pricing, rating, and buy links.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Star,
  Tag,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Layers,
  Globe,
} from 'lucide-react';
import { AmazonProduct } from '@/types/amazon';

interface ProductResultCardProps {
  product: AmazonProduct;
  onScanAnother: () => void;
}

export function ProductResultCard({ product, onScanAnother }: ProductResultCardProps) {
  const [copiedField, setCopiedField] = useState<'asin' | 'barcode' | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(
    product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
  );

  const handleCopy = (text: string, field: 'asin' | 'barcode') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const imagesList = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.additionalImages || []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full rounded-3xl bg-zinc-900/60 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Top Banner: Marketplace & Source Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            Amazon Product Match
          </span>
          <span className="text-xs text-zinc-400">
            Marketplace: <strong className="text-zinc-200">{product.marketplaceName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onScanAnother}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Scan Another
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left: Product Images (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-square w-full rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt={product.title}
              className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />
            {product.inStock && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                In Stock
              </span>
            )}
          </div>

          {/* Thumbnails row if multiple images exist */}
          {imagesList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {imagesList.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border shrink-0 transition-all ${
                    selectedImage === img
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Specification & Buy Information (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            {/* Brand & Category */}
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
              {product.brand && (
                <span className="text-amber-400 font-bold uppercase tracking-wider">
                  {product.brand}
                </span>
              )}
              {product.category && (
                <>
                  <span>•</span>
                  <span className="truncate">{product.category}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {product.title}
            </h2>

            {/* Ratings & Sales Rank */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {product.rating && (
                <div className="flex items-center gap-1.5 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-white">{product.rating}</span>
                  {product.reviewCount && (
                    <span className="text-xs text-zinc-400">
                      ({product.reviewCount.toLocaleString()} reviews)
                    </span>
                  )}
                </div>
              )}

              {product.salesRank && (
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg text-blue-300 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    #{product.salesRank.rank} in {product.salesRank.category}
                  </span>
                </div>
              )}
            </div>

            {/* Pricing Section */}
            {product.price && (
              <div className="mt-5 p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-white">
                  {product.price.formatted}
                </span>
                {product.listPrice && product.listPrice.amount > product.price.amount && (
                  <span className="text-sm text-zinc-500 line-through">
                    {product.listPrice.formatted}
                  </span>
                )}
                {product.buyBoxWinner && (
                  <span className="ml-auto text-xs text-zinc-400">
                    Buy Box: <strong className="text-zinc-200">{product.buyBoxWinner}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Identifiers (ASIN & Barcode) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* ASIN Pill */}
              <div className="p-3 rounded-xl bg-zinc-800/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Amazon ASIN
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-300">
                    {product.asin}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(product.asin, 'asin')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Copy ASIN"
                >
                  {copiedField === 'asin' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Barcode Pill */}
              <div className="p-3 rounded-xl bg-zinc-800/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    {product.barcodeType}
                  </div>
                  <div className="font-mono text-sm font-bold text-zinc-200">
                    {product.barcode}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(product.barcode, 'barcode')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Copy Barcode"
                >
                  {copiedField === 'barcode' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Key Features Bullets */}
            {product.features && product.features.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Key Highlights
                </div>
                <ul className="space-y-1.5">
                  {product.features.map((feat, idx) => (
                    <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specification Attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2 rounded-lg bg-zinc-950/40 border border-white/5 flex flex-col"
                    >
                      <span className="text-zinc-500 text-[10px]">{key}</span>
                      <span className="text-zinc-200 font-medium truncate">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* International Regional Marketplaces (USA, IT, FR, ES, DE, UK, IE) */}
            {product.marketplaceComparisons && product.marketplaceComparisons.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                    Check Across Amazon Marketplaces
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    USA • IT • FR • ES • DE • UK • IE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {product.marketplaceComparisons.map((item) => (
                    <a
                      key={item.marketplace.id}
                      href={item.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between group ${
                        item.marketplace.id === product.marketplaceId
                          ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/60 hover:bg-zinc-900 border-white/5 hover:border-white/20'
                      }`}
                      title={`Open on Amazon ${item.marketplace.name}`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm">{item.marketplace.flag}</span>
                          <span className="text-white group-hover:text-amber-300 transition-colors">
                            {item.marketplace.code}
                          </span>
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                      </div>

                      <div className="mt-2 flex items-baseline justify-between text-[11px]">
                        <span className="font-bold text-amber-300">
                          {item.price ? item.price.formatted : 'Check Store'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.marketplace.currency}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
            <a
              href={product.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all shadow-xl shadow-amber-500/20 group"
            >
              <Tag className="w-4 h-4 fill-black group-hover:scale-110 transition-transform" />
              <span>View Product on Amazon</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
