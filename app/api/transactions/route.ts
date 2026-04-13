import { NextResponse } from 'next/server';
import { getRecentTransactions } from '@/lib/store';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
  const records = getRecentTransactions(limit);
  return NextResponse.json({ transactions: records, count: records.length }, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
