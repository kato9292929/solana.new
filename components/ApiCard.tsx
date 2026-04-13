'use client';

import { useState } from 'react';
import Link from 'next/link';

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

const CATEGORY_COLORS: Record<string, string> = {
  'weather-japan': 'text-sky-400 border-sky-400/30 bg-sky-400/10',
  'market-data':   'text-amber-400 border-amber-400/30 bg-amber-400/10',
  'translation-ja':'text-violet-400 border-violet-400/30 bg-violet-400/10',
};

export default function ApiCard({ api }: { api: ApiEntry }) {
  const [copied, setCopied] = useState(false);

  const endpoint = `/api/gateway/${api.slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${endpoint}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const catClass =
    CATEGORY_COLORS[api.category] ??
    'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';

  return (
    <div className="group relative flex flex-col border border-white/10 bg-white/[0.03] rounded-lg p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{api.icon}</span>
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{api.name}</h3>
            <p className="text-[11px] text-white/40 font-mono mt-0.5">{api.name_ja}</p>
          </div>
        </div>
        {/* Price badge */}
        <div className="text-right flex-shrink-0 ml-2">
          <span className="font-mono text-amber-400 font-bold text-sm">
            ${api.price_usdc.toFixed(3)}
          </span>
          <p className="text-[10px] text-white/30 font-mono">per call</p>
        </div>
      </div>

      {/* Category pill */}
      <span
        className={`self-start mb-3 px-2 py-0.5 rounded text-[10px] font-mono border ${catClass}`}
      >
        {api.category}
      </span>

      {/* Description */}
      <p className="text-white/50 text-xs leading-relaxed flex-1 mb-4 line-clamp-3">
        {api.description}
      </p>

      {/* Provider */}
      <p className="text-[11px] text-white/25 font-mono mb-4">
        by {api.provider}
      </p>

      {/* Endpoint */}
      <div className="font-mono text-[10px] text-white/30 bg-black/30 rounded px-2.5 py-1.5 mb-4 truncate border border-white/5">
        {endpoint}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/demo?api=${api.slug}`}
          className="flex-1 text-center py-1.5 rounded text-xs font-mono font-semibold
                     bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30
                     hover:bg-[#00ff88]/20 hover:border-[#00ff88]/50 transition-colors"
        >
          Try with Agent →
        </Link>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded text-xs font-mono
                     bg-white/5 text-white/50 border border-white/10
                     hover:bg-white/10 hover:text-white/70 transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
