'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AgentDemo from '@/components/AgentDemo';
import Link from 'next/link';

interface ApiOption {
  slug: string;
  name: string;
  name_ja: string;
  price_usdc: number;
  price_micro_usdc: number;
  icon: string;
}

function DemoContent() {
  const searchParams = useSearchParams();
  const preselected  = searchParams.get('api') ?? '';
  const [apis, setApis] = useState<ApiOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/registry')
      .then((r) => r.json())
      .then((data: ApiOption[]) => {
        setApis(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-white/25 mb-8">
        <Link href="/" className="hover:text-white/50 transition-colors">Marketplace</Link>
        <span>/</span>
        <span className="text-white/50">Agent Demo</span>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight mb-2">
          x402 Payment Flow Demo
        </h1>
        <p className="text-white/40 text-sm max-w-2xl">
          Watch a simulated AI agent execute the full x402 handshake — 402 response, USDC
          payment on Solana devnet, and authenticated data retrieval. Connect a Phantom or
          Solflare wallet loaded with devnet USDC to run it live.
        </p>
      </div>

      {/* Protocol diagram */}
      <div className="mb-8 border border-white/8 rounded-lg p-5 bg-white/[0.02]">
        <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-4">
          x402 Protocol · Solana Adaptation
        </p>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {[
            { label: 'Agent',       sublabel: 'AI client',       color: 'text-violet-400 border-violet-400/30 bg-violet-400/8' },
            { label: 'GET /gateway',sublabel: 'no credential',   color: 'text-white/30  border-white/10      bg-white/5',       arrow: '→' },
            { label: '402',         sublabel: 'payment details',  color: 'text-amber-400 border-amber-400/30 bg-amber-400/8',   arrow: '←' },
            { label: 'Solana',      sublabel: 'USDC transfer',    color: 'text-sky-400   border-sky-400/30   bg-sky-400/8',     arrow: '→' },
            { label: 'X-Payment',   sublabel: 'tx signature',     color: 'text-white/30  border-white/10     bg-white/5',       arrow: '→' },
            { label: '200 OK',      sublabel: 'data + receipt',   color: 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/8',  arrow: '←' },
          ].map((step, i) => (
            <div key={i} className="flex items-center">
              {step.arrow && (
                <span className="font-mono text-white/15 text-sm px-1 flex-shrink-0">
                  {step.arrow}
                </span>
              )}
              <div
                className={`flex-shrink-0 border rounded px-2.5 py-2 text-center min-w-[80px] ${step.color}`}
              >
                <p className="font-mono font-bold text-xs">{step.label}</p>
                <p className="font-mono text-[9px] opacity-60 mt-0.5">{step.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Devnet USDC info */}
      <div className="mb-8 flex gap-3 flex-wrap">
        <div className="border border-amber-400/20 bg-amber-400/5 rounded-lg px-4 py-3 text-xs">
          <p className="font-mono text-amber-400 font-semibold mb-1">Devnet USDC Mint</p>
          <p className="font-mono text-white/40 break-all text-[11px]">
            Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
          </p>
        </div>
        <div className="border border-white/8 bg-white/[0.02] rounded-lg px-4 py-3 text-xs">
          <p className="font-mono text-white/50 font-semibold mb-1">Get devnet USDC</p>
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[#00ff88]/70 hover:text-[#00ff88] transition-colors text-[11px]"
          >
            faucet.solana.com ↗
          </a>
        </div>
        <div className="border border-white/8 bg-white/[0.02] rounded-lg px-4 py-3 text-xs">
          <p className="font-mono text-white/50 font-semibold mb-1">Curl (no wallet)</p>
          <code className="font-mono text-[#00ff88]/50 text-[10px]">
            curl -i /api/gateway/japan-weather
          </code>
        </div>
      </div>

      {/* Demo widget */}
      {loading ? (
        <div className="h-48 rounded-lg bg-white/5 animate-pulse" />
      ) : (
        <AgentDemo
          apis={
            preselected
              ? [
                  ...apis.filter((a) => a.slug === preselected),
                  ...apis.filter((a) => a.slug !== preselected),
                ]
              : apis
          }
        />
      )}
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-5 py-10">
          <div className="h-12 w-48 rounded bg-white/5 animate-pulse mb-6" />
          <div className="h-96 rounded-lg bg-white/5 animate-pulse" />
        </div>
      }
    >
      <DemoContent />
    </Suspense>
  );
}
