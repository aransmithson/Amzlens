'use client';

/**
 * @file SettingsModal.tsx
 * @description Modal dialog configuring Amazon SP-API credentials, regional endpoints, and mock mode toggles.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, ShieldCheck, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { SPAPICredentials, SUPPORTED_MARKETPLACES } from '@/types/amazon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (creds: Partial<SPAPICredentials>, forceMock: boolean) => void;
  initialCreds: Partial<SPAPICredentials>;
  forceMock: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  onSave,
  initialCreds,
  forceMock: initialForceMock,
}: SettingsModalProps) {
  const [clientId, setClientId] = useState(initialCreds.clientId || '');
  const [clientSecret, setClientSecret] = useState(initialCreds.clientSecret || '');
  const [refreshTokenEU, setRefreshTokenEU] = useState(
    initialCreds.refreshTokenEU || initialCreds.refreshToken || ''
  );
  const [refreshTokenNA, setRefreshTokenNA] = useState(initialCreds.refreshTokenNA || '');
  const [forceMock, setForceMock] = useState(initialForceMock);
  const [testRegion, setTestRegion] = useState<'EU' | 'NA'>('EU');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setClientId(initialCreds.clientId || '');
    setClientSecret(initialCreds.clientSecret || '');
    setRefreshTokenEU(initialCreds.refreshTokenEU || initialCreds.refreshToken || '');
    setRefreshTokenNA(initialCreds.refreshTokenNA || '');
    setForceMock(initialForceMock);
  }, [initialCreds, initialForceMock, isOpen]);

  const handleTestConnection = async (targetReg: 'EU' | 'NA') => {
    setTestStatus('testing');
    setTestRegion(targetReg);
    setTestMessage('');

    try {
      const marketplaceId = targetReg === 'NA' ? 'ATVPDKIKX0DER' : 'A1F83G8C2ARO7P';
      const region = targetReg === 'NA' ? 'us-east-1' : 'eu-west-1';
      const token = targetReg === 'NA' ? refreshTokenNA : refreshTokenEU;

      if (!forceMock && !token) {
        setTestStatus('error');
        setTestMessage(
          `Please provide a ${targetReg === 'NA' ? 'North America (USA)' : 'Europe'} Refresh Token before testing.`
        );
        return;
      }

      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: '5000159459228',
          marketplaceId,
          forceMock,
          credentials: {
            clientId,
            clientSecret,
            refreshTokenEU,
            refreshTokenNA,
            region,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus('success');
        setTestMessage(
          forceMock
            ? 'Demo engine responding normally with simulated catalog.'
            : `Successfully authenticated with Amazon SP-API (${targetReg === 'NA' ? 'USA/NA' : 'Europe'})!`
        );
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'Connection verification failed.');
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Network failure during test.');
    }
  };

  const handleSave = () => {
    onSave(
      {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        refreshToken: refreshTokenEU.trim() || refreshTokenNA.trim(),
        refreshTokenEU: refreshTokenEU.trim(),
        refreshTokenNA: refreshTokenNA.trim(),
      },
      forceMock
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-900/95 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">API & Investigation Settings</h3>
                  <p className="text-xs text-zinc-400">Configure Amazon SP-API or switch to Demo Mode</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Toggle Switch */}
            <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-sm">Demo / Mock Mode</div>
                  <div className="text-xs text-zinc-400">
                    Use realistic mock catalog data without live SP-API keys
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForceMock(!forceMock)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  forceMock ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
                role="switch"
                aria-checked={forceMock}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    forceMock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* SP-API Credentials Section */}
            <div className={`space-y-4 transition-opacity ${forceMock ? 'opacity-50' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Amazon Selling Partner API (SP-API)
              </div>

              <div>
                <label className="block text-xs text-zinc-300 font-medium mb-1.5">
                  LWA Client ID (App ID)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="amzn1.application-oa2-client.xxxx..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all placeholder:text-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 font-medium mb-1.5">
                  LWA Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="amzn1.oa2-cs.v1.xxxx..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all placeholder:text-zinc-500 font-mono"
                />
              </div>

              {/* Regional Refresh Tokens */}
              <div className="pt-2 space-y-4">
                {/* Europe Region Token */}
                <div className="p-3.5 rounded-2xl bg-zinc-800/50 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-200 font-bold flex items-center gap-1.5">
                      <span>🇬🇧 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇮🇪</span>
                      <span>Europe Refresh Token (UK, IT, FR, ES, DE, IE)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">eu-west-1</span>
                  </div>
                  <textarea
                    rows={2}
                    value={refreshTokenEU}
                    onChange={(e) => setRefreshTokenEU(e.target.value)}
                    placeholder="Atzr|IwEBIxxxx (European seller authorization)..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs focus:outline-none focus:border-amber-500/60 transition-all placeholder:text-zinc-500 font-mono resize-none"
                  />
                </div>

                {/* North America / USA Region Token */}
                <div className="p-3.5 rounded-2xl bg-zinc-800/50 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-200 font-bold flex items-center gap-1.5">
                      <span>🇺🇸 🇨🇦</span>
                      <span>North America Refresh Token (USA, CA)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">us-east-1</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-snug">
                    Amazon SP-API requires a distinct authorization refresh token for North America vs Europe.
                  </p>
                  <textarea
                    rows={2}
                    value={refreshTokenNA}
                    onChange={(e) => setRefreshTokenNA(e.target.value)}
                    placeholder="Atzr|IwEBIxxxx (North America / USA seller authorization)..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs focus:outline-none focus:border-amber-500/60 transition-all placeholder:text-zinc-500 font-mono resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Test feedback */}
            {testMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testStatus === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {testStatus === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('EU')}
                  disabled={testStatus === 'testing'}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/5 disabled:opacity-50"
                  title="Test European SP-API Connection"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testStatus === 'testing' && testRegion === 'EU' ? 'animate-spin' : ''}`}
                  />
                  <span>Test Europe</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestConnection('NA')}
                  disabled={testStatus === 'testing'}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/5 disabled:opacity-50"
                  title="Test USA / North America SP-API Connection"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testStatus === 'testing' && testRegion === 'NA' ? 'animate-spin' : ''}`}
                  />
                  <span>Test USA</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
