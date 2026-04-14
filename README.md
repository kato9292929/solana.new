# x402 Bazaar Japan — AI Agent API Marketplace on Solana

> **AI agents buy API calls the same way humans use a vending machine — drop a coin, get your data. No API keys. No subscriptions. No humans in the loop.**

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/?cluster=devnet)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![x402](https://img.shields.io/badge/Protocol-x402-00ff88)](https://github.com/coinbase/x402)
[![USDC](https://img.shields.io/badge/Payment-USDC%20SPL-2775CA)](https://www.centre.io/usdc)

---

## The Problem

AI agents are becoming the primary consumers of APIs. But current monetization models are broken for machine-to-machine commerce:

- **API keys** require human sign-up, credit cards, and rate-limit dashboards — impossible for autonomous agents
- **Subscriptions** overpay for bursty, low-frequency access patterns
- **OAuth flows** assume a human is present to authorize

The result: agents either get free access (unsustainable for providers) or require a human to manually set up billing (defeats the purpose of autonomy).

## The Solution

**x402 Bazaar Japan** implements the [x402 protocol](https://github.com/coinbase/x402) on Solana, adapted for SPL token (USDC) micropayments. Any AI agent that can make an HTTP request can autonomously discover what to pay, submit a USDC transfer on Solana, and receive data — in a single round trip after the initial 402.

```
Agent  ──GET /api/gateway/japan-weather──────────────▶  Gateway
Agent  ◀─────────────── 402 + payment details ────────  Gateway
Agent  ──USDC transfer on Solana devnet──────────────▶  Blockchain
Agent  ──GET + X-Payment: <tx-signature>─────────────▶  Gateway
Agent  ◀─────────────── 200 OK + data + receipt ──────  Gateway
```

### Why Solana?

| Factor | Ethereum | Solana |
|---|---|---|
| Avg. tx fee | ~$0.50–$5.00 | **~$0.00025** |
| Finality | ~12s | **~400ms** |
| USDC support | ✓ | ✓ (SPL Token) |
| Viable for $0.007 API call? | ✗ fee > value | **✓** |

Micropayments only make economic sense when the transaction fee is orders of magnitude smaller than the payment amount. Solana is the only L1 where a $0.003 API call is financially rational.

---

## Live Demo

```bash
# Step 1 — call any API endpoint, receive payment instructions
curl -i https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather

# HTTP/1.1 402 Payment Required
# www-authenticate: x402 payment_address="XbqwseaH...", amount="7000", asset="USDC", network="solana-devnet"
#
# {
#   "x402": {
#     "payment_address": "XbqwseaHh7z8eWZaQTRQhBLAGTmLPbCcKaxzcfrDtL6",
#     "amount": 7000,   ← micro-USDC ($0.007)
#     "mint": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
#     "network": "solana-devnet"
#   }
# }

# Step 2 — send USDC on Solana devnet, get transaction signature
# Step 3 — retry with payment proof
curl -H "X-Payment: <tx-signature>" \
     https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather

# HTTP/1.1 200 OK
# X-Payment-Receipt: eyJyZXF1ZXN0X2lkIjoiLi4uIn0=
#
# {"city":"Tokyo","temp_c":22.3,"condition":"Partly Cloudy","condition_ja":"曇り時々晴れ",...}
```

No SDK required. No API key. Any language, any runtime — if it speaks HTTP, it speaks x402.

---

## API Marketplace

5 Japan/APAC-focused data APIs are available at launch:

| API | Slug | Price | Category |
|---|---|---|---|
| 🌤 Japan Weather | `japan-weather` | $0.007 | weather-japan |
| 📈 Tokyo Stock Feed | `tokyo-stocks` | $0.010 | market-data |
| 🈳 JP→EN Translation | `translate-ja` | $0.005 | translation-ja |
| ⚡ Solana DeFi Rates | `solana-defi-rates` | $0.003 | market-data |
| 📰 APAC Crypto News | `apac-news` | $0.010 | market-data |

All endpoints follow the same x402 pattern. Providers register APIs by adding entries to `data/apis.json` — no smart contracts required.

---

## Architecture

```
x402-bazaar-japan/
├── app/
│   ├── page.tsx                  # Marketplace UI — browse, filter, copy endpoints
│   ├── demo/page.tsx             # Interactive x402 handshake demo (Phantom wallet)
│   └── api/
│       ├── registry/route.ts     # GET /api/registry — full API catalogue
│       ├── transactions/route.ts # GET /api/transactions — live payment feed
│       └── gateway/[slug]/       # x402 gateway — 402 or 200 after on-chain check
├── lib/
│   ├── x402.ts                   # Protocol: 402 builder + on-chain USDC verifier
│   ├── solana.ts                 # RPC connection + SPL token balance diff helper
│   ├── store.ts                  # In-memory tx log + replay-attack protection
│   └── mock-responses.ts         # API response payloads (swap for real data)
├── components/
│   ├── AgentDemo.tsx             # Step-by-step flow UI with wallet integration
│   ├── ApiCard.tsx               # API listing card
│   └── TransactionFeed.tsx       # Live sidebar (polls /api/transactions every 3s)
└── data/
    └── apis.json                 # API registry (slug, price, provider, category)
```

### x402 Payment Verification (on-chain, no oracle)

The gateway verifies payment by inspecting the actual Solana transaction — no trusted intermediary:

```typescript
// lib/solana.ts
export function extractUsdcReceived(tx, recipientOwner, usdcMint): bigint {
  const pre  = tx.meta.preTokenBalances.filter(b => b.mint === usdcMint && b.owner === recipientOwner);
  const post = tx.meta.postTokenBalances.filter(b => b.mint === usdcMint && b.owner === recipientOwner);
  return postAmount - preAmount;  // verified on-chain ✓
}
```

Replay protection is enforced with an in-memory `Set` of used signatures — each tx signature can only unlock one API response.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS |
| Wallet | `@solana/wallet-adapter` — Phantom, Solflare |
| Blockchain | Solana devnet, `@solana/web3.js`, `@solana/spl-token` |
| Payment Token | USDC SPL (devnet mint: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`) |
| Protocol | x402 (HTTP 402 + `WWW-Authenticate` + `X-Payment` / `X-Payment-Receipt`) |
| API format | REST — JSON, CORS-enabled, agent-friendly |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/kato9292929/solana.new
cd solana.new
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Fill in FACILITATOR_WALLET_PUBLIC_KEY and FACILITATOR_WALLET_SECRET_KEY_B58
# (a new devnet keypair is already generated and in the repo for testing)
```

### 3. Run

```bash
npm run dev
# → http://localhost:3000
```

### 4. Test the x402 flow immediately (no wallet needed)

```bash
# See the 402 response
curl -i localhost:3000/api/gateway/japan-weather

# Browse all APIs
curl localhost:3000/api/registry | jq

# Check live transaction log
curl localhost:3000/api/transactions | jq
```

### 5. Get devnet USDC for the full flow

```bash
# 1. Airdrop devnet SOL
solana airdrop 2 <your-wallet> --url devnet

# 2. Mint devnet USDC at https://spl-token-faucet.com
#    Mint address: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr

# 3. Connect Phantom (set to Devnet) and click "Try with Agent" on any API card
```

---

## Roadmap

| Phase | Feature |
|---|---|
| ✅ MVP | x402 gateway, 5 APIs, wallet demo, live tx feed |
| 🔜 v2 | Provider registration UI — anyone can list an API |
| 🔜 v2 | Solana Program for escrow + dispute resolution |
| 🔜 v3 | Agent SDK — `x402Fetch()` wrapper for TypeScript/Python agents |
| 🔜 v3 | Token-gated APIs (require NFT / SPL token ownership to access) |
| 🔜 v4 | Real data integrations (JMA weather, TSE market data, DeepL JP) |

---

## Design Philosophy

> "The best API monetization for AI agents is the one that requires zero human action."

x402 turns every HTTP endpoint into a vending machine. The agent reads the price from the 402 response, pays the exact amount, and gets the data. No signup. No dashboard. No rate-limit emails. The economics settle on-chain in 400ms.

Solana's fee structure makes this viable at sub-cent price points — where the real agent economy will operate.

---

---

# 日本語版 / Japanese

## プロジェクト概要

**x402 Bazaar Japan** は、AIエージェントが日本・APAC向けのデータAPIを自律的に発見・購入・利用できるAPIマーケットプレイスです。支払いはSolana上のUSDC（SPLトークン）を使ったマイクロペイメントで行われ、APIキーもサブスクリプションも不要です。

## 解決する課題

現在のAPI課金モデルはAIエージェントに適していません：

- **APIキー方式** — 人間によるサインアップとクレジットカード登録が必要
- **サブスクリプション** — 散発的な利用パターンには過剰なコスト
- **OAuth認証** — 人間の承認操作を前提とした設計

AIエージェントが自律的にデータを取得・購入するためには、**人間の介入なしに決済できる仕組み**が必要です。

## 解決策：x402プロトコル × Solana

HTTP 402ステータスコード（"Payment Required"）を活用したx402プロトコルを、Solana SPLトークン決済に適応させました。

### 決済フロー

```
エージェント  ──GET /api/gateway/japan-weather──▶  ゲートウェイ
エージェント  ◀──── 402 + 支払い先・金額情報 ──────  ゲートウェイ
エージェント  ──Solana devnetでUSDC送金 ──────────▶  ブロックチェーン
エージェント  ──GET + X-Payment: <tx署名> ─────────▶  ゲートウェイ
エージェント  ◀──── 200 OK + データ + レシート ──────  ゲートウェイ
```

### なぜSolanaか

| 比較項目 | Ethereum | **Solana** |
|---|---|---|
| 平均手数料 | 約100〜700円 | **約0.03円** |
| ファイナリティ | 約12秒 | **約400ms** |
| $0.007 API呼び出しは成立するか？ | ✗（手数料＞支払額） | **✓** |

サブセント単位のマイクロペイメントが経済的に成立するのはSolanaだけです。

## マーケットプレイスに登録済みのAPI

| API名 | 単価 | カテゴリ |
|---|---|---|
| 🌤 日本天気API | $0.007 | 気象データ |
| 📈 東京株価フィード（日経225） | $0.010 | 市場データ |
| 🈳 日英翻訳API | $0.005 | 翻訳・NLP |
| ⚡ Solana DeFiレート | $0.003 | DeFi・金融 |
| 📰 APACクリプトニュース | $0.010 | ニュース |

## 技術スタック

- **フロントエンド**: Next.js 16、TypeScript、Tailwind CSS
- **ウォレット**: Phantom / Solflare（`@solana/wallet-adapter`）
- **ブロックチェーン**: Solana devnet、`@solana/web3.js`、`@solana/spl-token`
- **決済トークン**: USDC SPL（devnet）
- **プロトコル**: x402（HTTP 402 → `WWW-Authenticate` → `X-Payment` → `X-Payment-Receipt`）

## 技術的な差別化ポイント

1. **オンチェーン検証** — 信頼できる第三者なしに、Solanaトランザクションのトークン残高差分でUSDC受領を直接検証
2. **リプレイ攻撃対策** — トランザクション署名のSetによる使い回し防止
3. **エージェントフレンドリー** — SDKなし・APIキーなし・curlだけで動作
4. **CORS完全対応** — どんなランタイムのエージェントからも直接呼び出し可能

## ローカルでの動作確認

```bash
git clone https://github.com/kato9292929/solana.new
cd solana.new
npm install
npm run dev

# 402レスポンスを確認（ウォレット不要）
curl -i localhost:3000/api/gateway/japan-weather
```

## 今後のロードマップ

- **v2**: プロバイダー登録UI（誰でもAPIを出品可能）
- **v2**: Solanaプログラムによるエスクロー・紛争解決
- **v3**: TypeScript/Python向けエージェントSDK（`x402Fetch()`）
- **v4**: 実データ統合（気象庁・東証・DeepL）

## コンセプト

> 「AIエージェントにとって最高のAPI課金は、人間が一切関与しない課金だ。」

x402はすべてのHTTPエンドポイントを自動販売機に変えます。エージェントは402レスポンスから価格を読み取り、正確な金額を支払い、データを受け取る。Solanaの手数料構造がこれをサブセント単位で実現します。

---

## Links

- **GitHub**: https://github.com/kato9292929/solana.new
- **Solana Explorer (devnet)**: https://explorer.solana.com/?cluster=devnet
- **x402 Protocol**: https://github.com/coinbase/x402
- **Devnet USDC Faucet**: https://spl-token-faucet.com
- **Solana Faucet**: https://faucet.solana.com
