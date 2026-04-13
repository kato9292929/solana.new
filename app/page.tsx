'use client';

import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ApiCard from '@/components/ApiCard';
import TransactionFeed from '@/components/TransactionFeed';

interface ApiEntry {
  slug: string;
  name: string;
  name_ja: string;
  description: string;
  price_usdc: number;
  price_micro_usdc: number;
  category: string;
  provider: string;
  icon: string;
  tags: string[];
}

const CATEGORIES = [
  { id: 'all',            label: 'すべて / All' },
  { id: 'weather-japan',  label: '🌤 Weather' },
  { id: 'market-data',    label: '📈 Market Data' },
  { id: 'translation-ja', label: '🈳 Translation' },
];

export default function Home() {
  const [apis, setApis]       = useState<ApiEntry[]>([]);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/registry')
      .then((r) => r.json())
      .then((data) => setApis(data))
      .finally(() => setLoading(false));
  }, []);

  const visible =
    filter === 'all' ? apis : apis.filter((a) => a.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-tight mb-1">
              バザール{' '}
              <span className="text-white/30 font-normal text-xl">/ API Marketplace</span>
            </h1>
            <p className="text-white/40 text-sm max-w-xl">
              AI agents pay per call using x402 micropayments on Solana devnet.
              No subscriptions. No API keys. Just USDC.
            </p>
          </div>

          {/* Wallet + CTA */}
          <div className="flex items-center gap-3">
            <WalletMultiButton
              style={{
                background: 'rgba(0,255,136,0.08)',
                border: '1px solid rgba(0,255,136,0.25)',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#00ff88',
                height: '36px',
                padding: '0 14px',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex gap-6 flex-wrap">
          {[
            { label: 'APIs Listed',    value: apis.length.toString() },
            { label: 'Network',        value: 'Solana devnet' },
            { label: 'Payment Token',  value: 'USDC (6 dec)' },
            { label: 'Protocol',       value: 'x402 v1' },
          ].map((s) => (
            <div key={s.label} className="border border-white/8 rounded-lg px-4 py-2.5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{s.label}</p>
              <p className="text-sm font-mono text-white/80 font-semibold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-8">
        {/* Left: API grid */}
        <div className="flex-1 min-w-0">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  filter === c.id
                    ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-64 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((api) => (
                <ApiCard key={api.slug} api={api} />
              ))}
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm font-mono">No APIs in this category</p>
            </div>
          )}

          {/* x402 quick-start */}
          <div className="mt-10 border border-white/8 bg-white/[0.02] rounded-lg p-5">
            <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-3">
              Agent Quick-Start
            </p>
            <pre className="text-[11px] font-mono text-[#00ff88]/70 leading-relaxed overflow-x-auto">{`# 1. Call any endpoint — receive 402 + payment details
curl -i https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather

# 2. Send USDC on Solana devnet, get tx signature
# 3. Retry with payment proof
curl -H "X-Payment: <tx-signature>" \\
     https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather`}</pre>
          </div>
        </div>

        {/* Right: live feed */}
        <TransactionFeed />
      </div>
    </div>
  );
}
