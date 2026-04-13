import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const SOLANA_RPC =
  process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

export const FACILITATOR_PUBKEY =
  process.env.FACILITATOR_WALLET_PUBLIC_KEY ?? '';

// Singleton connection (re-used across requests in the same process)
let _connection: Connection | null = null;
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC, 'confirmed');
  }
  return _connection;
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

/**
 * Fetch and parse a transaction by signature.
 * Returns null if the transaction is not found or not yet confirmed.
 */
export async function fetchParsedTx(
  signature: string,
): Promise<ParsedTransactionWithMeta | null> {
  const conn = getConnection();
  try {
    const tx = await conn.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return tx;
  } catch {
    return null;
  }
}

/**
 * Determine how much USDC (in micro-units, 6 decimals) was received by
 * `recipientOwner` in the given transaction.
 *
 * We inspect postTokenBalances − preTokenBalances for the USDC mint where
 * `owner` matches the recipient wallet address.
 */
export function extractUsdcReceived(
  tx: ParsedTransactionWithMeta,
  recipientOwner: string,
  usdcMint: string = USDC_MINT_DEVNET,
): bigint {
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];

  const preAmt = pre
    .filter((b) => b.mint === usdcMint && b.owner === recipientOwner)
    .reduce((sum, b) => sum + BigInt(b.uiTokenAmount.amount), 0n);

  const postAmt = post
    .filter((b) => b.mint === usdcMint && b.owner === recipientOwner)
    .reduce((sum, b) => sum + BigInt(b.uiTokenAmount.amount), 0n);

  return postAmt - preAmt;
}
