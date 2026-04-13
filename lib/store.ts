/**
 * In-memory transaction log.
 * Persists for the lifetime of the Node.js process (suitable for dev/MVP).
 * Replace with Redis or a database for production.
 */

export interface TransactionRecord {
  id: string;
  timestamp: number; // unix ms
  api_slug: string;
  api_name: string;
  amount_usdc: number;
  payer_wallet: string;
  tx_signature: string;
}

const MAX_RECORDS = 100;

// Module-level array — survives across requests in the same process.
const _transactions: TransactionRecord[] = [];

// Set of used tx signatures for simple replay protection.
const _usedSignatures = new Set<string>();

export function addTransaction(record: TransactionRecord): void {
  _transactions.unshift(record);
  if (_transactions.length > MAX_RECORDS) {
    _transactions.pop();
  }
  _usedSignatures.add(record.tx_signature);
}

export function getRecentTransactions(limit = 10): TransactionRecord[] {
  return _transactions.slice(0, limit);
}

export function isSignatureUsed(signature: string): boolean {
  return _usedSignatures.has(signature);
}
