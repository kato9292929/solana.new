'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const USDC_MINT   = process.env.NEXT_PUBLIC_USDC_MINT   ?? 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
const FACILITATOR = process.env.NEXT_PUBLIC_FACILITATOR ?? '';
const USDC_DECIMALS = 6;

interface ApiOption {
  slug: string;
  name: string;
  name_ja: string;
  price_usdc: number;
  price_micro_usdc: number;
  icon: string;
}

interface Step {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
  code?: string;
}

interface PaymentDetails {
  payment_address: string;
  amount: number;
  asset: string;
  network: string;
  api_slug: string;
}

export default function AgentDemo({ apis }: { apis: ApiOption[] }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [selectedSlug, setSelectedSlug] = useState(apis[0]?.slug ?? '');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [responseData, setResponseData] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const api = apis.find((a) => a.slug === selectedSlug);

  const updateStep = useCallback(
    (id: number, patch: Partial<Step>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const run = useCallback(async () => {
    if (!api || !connected || !publicKey) return;
    setRunning(true);
    setResponseData(null);
    setErrorMsg(null);

    const initial: Step[] = [
      { id: 1, label: 'HTTP GET → gateway',     status: 'active' },
      { id: 2, label: '402 Payment Required',    status: 'pending' },
      { id: 3, label: 'Build USDC transfer tx',  status: 'pending' },
      { id: 4, label: 'Sign & submit on-chain',  status: 'pending' },
      { id: 5, label: 'Retry with X-Payment',    status: 'pending' },
      { id: 6, label: '200 OK — data received',  status: 'pending' },
    ];
    setSteps(initial);

    try {
      // Step 1 — initial request (expect 402)
      const gateUrl = `/api/gateway/${api.slug}`;
      const res1 = await fetch(gateUrl);
      updateStep(1, { status: 'done', detail: `GET ${gateUrl}` });

      if (res1.status !== 402) {
        throw new Error(`Expected 402, got ${res1.status}`);
      }

      // Step 2 — parse payment details
      updateStep(2, { status: 'active' });
      const body402 = (await res1.json()) as { x402: PaymentDetails };
      const pd = body402.x402;
      updateStep(2, {
        status: 'done',
        detail: `$${api.price_usdc} USDC → ${pd.payment_address.slice(0, 8)}…`,
        code: JSON.stringify(pd, null, 2),
      });

      // Step 3 — build transaction
      updateStep(3, { status: 'active' });
      const mintPk        = new PublicKey(USDC_MINT);
      const facilitatorPk = new PublicKey(FACILITATOR || pd.payment_address);
      const sourcePk      = publicKey;

      const sourceATA      = await getAssociatedTokenAddress(mintPk, sourcePk);
      const destATA        = await getAssociatedTokenAddress(mintPk, facilitatorPk);
      const { blockhash }  = await connection.getLatestBlockhash();

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: sourcePk });
      tx.add(
        createTransferCheckedInstruction(
          sourceATA,
          mintPk,
          destATA,
          sourcePk,
          BigInt(pd.amount),
          USDC_DECIMALS,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );
      updateStep(3, {
        status: 'done',
        detail: `Transfer ${pd.amount} μUSDC to ${facilitatorPk.toBase58().slice(0, 8)}…`,
      });

      // Step 4 — sign & submit
      updateStep(4, { status: 'active' });
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      // Wait for confirmation
      await connection.confirmTransaction(sig, 'confirmed');
      updateStep(4, {
        status: 'done',
        detail: sig,
        code: `solana confirm -v ${sig}`,
      });

      // Step 5 — retry with payment header
      updateStep(5, { status: 'active' });
      const res2 = await fetch(gateUrl, {
        headers: { 'X-Payment': sig },
      });
      updateStep(5, { status: 'done', detail: `X-Payment: ${sig.slice(0, 16)}…` });

      if (!res2.ok) {
        const err = await res2.json();
        throw new Error(err.reason ?? `Gateway returned ${res2.status}`);
      }

      // Step 6 — success
      updateStep(6, { status: 'active' });
      const payload = (await res2.json()) as { data: Record<string, unknown> };
      setResponseData(payload.data);
      updateStep(6, {
        status: 'done',
        detail: `200 OK · receipt in X-Payment-Receipt header`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === 'active' ? { ...s, status: 'error', detail: msg } : s,
        ),
      );
    } finally {
      setRunning(false);
    }
  }, [api, connected, publicKey, connection, sendTransaction, updateStep]);

  const stepIcon = (s: Step) => {
    if (s.status === 'done')    return <span className="text-[#00ff88]">✓</span>;
    if (s.status === 'error')   return <span className="text-red-400">✗</span>;
    if (s.status === 'active')  return <span className="animate-spin text-amber-400 inline-block">⟳</span>;
    return <span className="text-white/20">○</span>;
  };

  return (
    <div className="space-y-6">
      {/* Config row */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[11px] font-mono text-white/40 uppercase tracking-widest mb-1.5">
            API to Call
          </label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-white
                       font-mono focus:outline-none focus:border-[#00ff88]/50 min-w-[220px]"
          >
            {apis.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.icon} {a.name} — ${a.price_usdc.toFixed(3)}
              </option>
            ))}
          </select>
        </div>

        <WalletMultiButton
          style={{
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#00ff88',
            height: '38px',
            padding: '0 16px',
          }}
        />

        <button
          onClick={run}
          disabled={running || !connected}
          className="px-5 py-2 rounded font-mono text-sm font-semibold
                     bg-[#00ff88] text-black hover:bg-[#00ff88]/90
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all"
        >
          {running ? 'Running…' : '▶ Run Agent'}
        </button>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`px-5 py-3 flex gap-4 text-sm border-b border-white/5 last:border-0 transition-colors
                ${s.status === 'active' ? 'bg-amber-400/5' : ''}
                ${s.status === 'done'   ? 'bg-[#00ff88]/[0.02]' : ''}
                ${s.status === 'error'  ? 'bg-red-400/5' : ''}
              `}
            >
              <span className="w-4 text-center flex-shrink-0 mt-0.5 font-mono text-xs">
                {stepIcon(s)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-white/30 font-mono text-[11px]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-mono text-xs font-semibold
                      ${s.status === 'done'  ? 'text-white/80' : ''}
                      ${s.status === 'active'? 'text-amber-400' : ''}
                      ${s.status === 'error' ? 'text-red-400'   : ''}
                      ${s.status === 'pending'? 'text-white/30'  : ''}
                    `}
                  >
                    {s.label}
                  </span>
                </div>
                {s.detail && (
                  <p className="text-white/40 text-[11px] font-mono mt-1 truncate">
                    {s.detail}
                  </p>
                )}
                {s.code && (
                  <pre className="mt-2 text-[10px] text-emerald-400/70 bg-black/40 rounded p-2 overflow-x-auto max-h-32">
                    {s.code}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="border border-red-400/30 bg-red-400/5 rounded-lg p-4">
          <p className="text-red-400 font-mono text-xs font-semibold mb-1">Error</p>
          <p className="text-red-300 text-xs font-mono">{errorMsg}</p>
        </div>
      )}

      {/* Response data */}
      {responseData && (
        <div className="border border-[#00ff88]/20 bg-[#00ff88]/[0.03] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <p className="text-[#00ff88] font-mono text-xs font-semibold uppercase tracking-widest">
              Response Data
            </p>
          </div>
          <pre className="text-white/70 text-xs font-mono overflow-x-auto leading-relaxed">
            {JSON.stringify(responseData, null, 2)}
          </pre>
        </div>
      )}

      {/* Not connected hint */}
      {!connected && (
        <div className="text-center py-4 border border-dashed border-white/10 rounded-lg">
          <p className="text-white/30 text-xs font-mono">
            Connect Phantom or Solflare (devnet) to run the agent
          </p>
        </div>
      )}
    </div>
  );
}
