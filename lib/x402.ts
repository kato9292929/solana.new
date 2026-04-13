/**
 * x402 payment verification helpers for Solana SPL token (USDC) transfers.
 *
 * Flow:
 *   1. Client calls /api/gateway/<slug>  →  server returns 402 + payment details
 *   2. Client builds and submits a USDC SPL transfer to the facilitator wallet
 *   3. Client retries with `X-Payment: <tx-signature>` header
 *   4. Server calls verifyPayment() — validates on-chain, then proxies
 */

import { fetchParsedTx, extractUsdcReceived, USDC_MINT_DEVNET, FACILITATOR_PUBKEY } from './solana';
import { isSignatureUsed } from './store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiEntry {
  slug: string;
  name: string;
  name_ja: string;
  description: string;
  price_usdc: number;
  price_micro_usdc: number; // USDC with 6 decimals
  category: string;
  provider: string;
  icon: string;
  tags: string[];
}

export interface PaymentRequiredBody {
  error: 'payment_required';
  x402: {
    version: 1;
    payment_address: string;
    amount: number;          // micro-USDC (6 decimals)
    asset: 'USDC';
    mint: string;
    network: 'solana-devnet';
    api_slug: string;
    api_name: string;
    price_usdc: number;
    memo?: string;
  };
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  error?: string;
  payer?: string;
  amountReceived?: bigint;
}

// ---------------------------------------------------------------------------
// Build 402 response body
// ---------------------------------------------------------------------------

export function buildPaymentRequired(api: ApiEntry): PaymentRequiredBody {
  return {
    error: 'payment_required',
    x402: {
      version: 1,
      payment_address: FACILITATOR_PUBKEY,
      amount: api.price_micro_usdc,
      asset: 'USDC',
      mint: USDC_MINT_DEVNET,
      network: 'solana-devnet',
      api_slug: api.slug,
      api_name: api.name,
      price_usdc: api.price_usdc,
      memo: `x402|${api.slug}`,
    },
    message: `Payment of $${api.price_usdc} USDC required. Send ${api.price_micro_usdc} micro-USDC to ${FACILITATOR_PUBKEY} on Solana devnet, then retry with X-Payment: <tx-signature>.`,
  };
}

// ---------------------------------------------------------------------------
// Verify an incoming payment credential
// ---------------------------------------------------------------------------

/**
 * Validates that `signature` represents a confirmed USDC transfer to the
 * facilitator wallet of at least `requiredMicroUsdc`.
 *
 * Also guards against replay: the same signature can only be used once.
 */
export async function verifyPayment(
  signature: string,
  requiredMicroUsdc: number,
): Promise<VerificationResult> {
  // Basic format check
  if (!signature || signature.length < 32 || signature.length > 128) {
    return { ok: false, error: 'invalid_signature_format' };
  }

  // Replay protection
  if (isSignatureUsed(signature)) {
    return { ok: false, error: 'signature_already_used' };
  }

  // Fetch the transaction from Solana
  const tx = await fetchParsedTx(signature);
  if (!tx) {
    return { ok: false, error: 'transaction_not_found_or_not_confirmed' };
  }

  if (tx.meta?.err) {
    return { ok: false, error: 'transaction_failed_on_chain' };
  }

  if (!FACILITATOR_PUBKEY) {
    return { ok: false, error: 'facilitator_wallet_not_configured' };
  }

  // Check USDC received
  const received = extractUsdcReceived(tx, FACILITATOR_PUBKEY);

  if (received < BigInt(requiredMicroUsdc)) {
    return {
      ok: false,
      error: `insufficient_payment: received ${received} micro-USDC, required ${requiredMicroUsdc}`,
      amountReceived: received,
    };
  }

  // Identify the payer (first fee-payer / signer)
  const payer =
    (tx.transaction.message as { accountKeys?: Array<{ pubkey: { toBase58(): string }; signer?: boolean }> })
      .accountKeys
      ?.find((k) => k.signer)
      ?.pubkey.toBase58() ?? 'unknown';

  return { ok: true, payer, amountReceived: received };
}
