/**
 * x402 Payment Gateway
 *
 * GET  /api/gateway/<slug>
 *   Without X-Payment header  → 402 Payment Required + payment details
 *   With    X-Payment header  → verify on-chain, return data on success
 *
 * Agent curl example (devnet):
 *   # Step 1 — learn what to pay
 *   curl -i https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather
 *
 *   # Step 2 — submit USDC transfer, get tx sig, then:
 *   curl -H "X-Payment: <tx-sig>" \
 *        https://x402-bazaar-japan.vercel.app/api/gateway/japan-weather
 */

import { NextRequest, NextResponse } from 'next/server';
import apis from '@/data/apis.json';
import { ApiEntry, buildPaymentRequired, verifyPayment } from '@/lib/x402';
import { getMockResponse } from '@/lib/mock-responses';
import { addTransaction } from '@/lib/store';
import { randomUUID } from 'crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment, Authorization',
  'Access-Control-Expose-Headers': 'X-Payment-Receipt, X-Request-Id',
};

function findApi(slug: string): ApiEntry | undefined {
  return (apis as ApiEntry[]).find((a) => a.slug === slug);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const api = findApi(slug);

  if (!api) {
    return NextResponse.json(
      { error: 'api_not_found', slug },
      { status: 404, headers: CORS },
    );
  }

  // ---------- Check for payment credential ----------
  const paymentHeader =
    request.headers.get('X-Payment') ??
    request.headers.get('x-payment') ??
    // Also accept "Authorization: Payment <sig>"
    request.headers.get('Authorization')?.replace(/^Payment\s+/i, '');

  if (!paymentHeader) {
    // Return 402 with full x402 payment details
    const body = buildPaymentRequired(api);
    return NextResponse.json(body, {
      status: 402,
      headers: {
        ...CORS,
        'WWW-Authenticate': [
          `x402 payment_address="${body.x402.payment_address}"`,
          `amount="${body.x402.amount}"`,
          `asset="${body.x402.asset}"`,
          `mint="${body.x402.mint}"`,
          `network="${body.x402.network}"`,
          `api_slug="${body.x402.api_slug}"`,
        ].join(', '),
      },
    });
  }

  // ---------- Verify the payment on-chain ----------
  const result = await verifyPayment(paymentHeader.trim(), api.price_micro_usdc);

  if (!result.ok) {
    return NextResponse.json(
      { error: 'payment_verification_failed', reason: result.error },
      { status: 402, headers: CORS },
    );
  }

  // ---------- Payment verified — log and return data ----------
  const { searchParams } = new URL(request.url);
  const query: Record<string, string> = {};
  searchParams.forEach((v, k) => { query[k] = v; });

  const data = getMockResponse(slug, query);
  const requestId = randomUUID();
  const ts = Date.now();

  // Store in transaction log
  addTransaction({
    id: requestId,
    timestamp: ts,
    api_slug: api.slug,
    api_name: api.name,
    amount_usdc: api.price_usdc,
    payer_wallet: result.payer ?? 'unknown',
    tx_signature: paymentHeader.trim(),
  });

  const receipt = Buffer.from(
    JSON.stringify({
      request_id: requestId,
      api_slug: api.slug,
      amount_usdc: api.price_usdc,
      payer: result.payer,
      tx_signature: paymentHeader.trim(),
      timestamp: ts,
    }),
  ).toString('base64');

  return NextResponse.json(
    { data, _meta: { api_slug: api.slug, paid: true, request_id: requestId } },
    {
      status: 200,
      headers: {
        ...CORS,
        'X-Payment-Receipt': receipt,
        'X-Request-Id': requestId,
      },
    },
  );
}

// Also handle POST so agents can send query params in body
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  return GET(request, context);
}
