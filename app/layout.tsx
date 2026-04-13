import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import WalletProvider from '@/components/WalletProvider';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'x402 Bazaar Japan — API マーケット',
  description:
    'AI agents discover, pay for, and call Japanese & APAC data APIs using x402 micropayments on Solana.',
};

// Header is a server component — wallet button is injected client-side
function SiteHeader() {
  return (
    <header className="border-b border-white/8 bg-black/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#00ff88]/15 border border-[#00ff88]/30 flex items-center justify-center">
            <span className="text-[#00ff88] text-xs font-mono font-bold">¥</span>
          </div>
          <span className="font-mono font-bold text-white text-sm tracking-tight">
            x402 Bazaar
            <span className="text-white/30 ml-1">Japan</span>
          </span>
          <span className="hidden sm:inline text-white/15 text-[11px] font-mono border border-white/10 rounded px-1.5 py-0.5">
            API マーケット
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-5">
          <Link href="/"     className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors">Marketplace</Link>
          <Link href="/demo" className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors">Agent Demo</Link>
          <a href="/api/registry" target="_blank" rel="noopener noreferrer"
             className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors">
            Registry ↗
          </a>
        </nav>

        {/* Right side — wallet button lives here in client components, devnet pill always visible */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400/70 border border-amber-400/20 rounded px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            devnet
          </span>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-[#0a0a0a]">
        <WalletProvider>
          <SiteHeader />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
