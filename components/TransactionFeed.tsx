'use client';

import { useEffect, useState } from 'react';

interface TxRecord {
  id: string;
  timestamp: number;
  api_slug: string;
  api_name: string;
  amount_usdc: number;
  payer_wallet: string;
  tx_signature: string;
}

function formatAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function TransactionFeed() {
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/transactions?limit=10');
        if (res.ok) {
          const data = await res.json();
          setTxs(data.transactions ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-72 flex-shrink-0 border-l border-white/10 pl-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono font-semibold text-white/60 uppercase tracking-widest">
          Live Feed
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] text-[#00ff88] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          Live
        </span>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && txs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/20 text-xs font-mono">No transactions yet</p>
          <p className="text-white/15 text-[10px] font-mono mt-1">
            Try an API to see payments appear here
          </p>
        </div>
      )}

      <div className="space-y-2">
        {txs.map((tx) => (
          <div
            key={tx.id}
            className="border border-white/8 bg-white/[0.02] rounded p-3 text-[11px]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#00ff88] font-mono font-semibold">
                +${tx.amount_usdc.toFixed(3)}
              </span>
              <span className="text-white/30 font-mono">{formatAgo(tx.timestamp)}</span>
            </div>
            <p className="text-white/60 truncate font-medium">{tx.api_name}</p>
            <p className="text-white/25 font-mono mt-0.5 truncate">
              {shortAddr(tx.payer_wallet)}
            </p>
            {tx.tx_signature && (
              <a
                href={`https://explorer.solana.com/tx/${tx.tx_signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 font-mono text-[9px] hover:text-white/40 transition-colors truncate block mt-1"
              >
                {shortAddr(tx.tx_signature)} ↗
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <p className="text-[10px] font-mono text-white/20 text-center">
          Polls every 3s · Solana devnet
        </p>
      </div>
    </aside>
  );
}
