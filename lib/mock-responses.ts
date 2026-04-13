/**
 * Mock API responses returned by the gateway after successful payment.
 * In a real deployment these would proxy to external data providers.
 */

export type MockResponse = Record<string, unknown>;

const now = () => new Date().toISOString();

export function getMockResponse(slug: string, query?: Record<string, string>): MockResponse {
  switch (slug) {
    case 'japan-weather': {
      const city = query?.city ?? 'Tokyo';
      const cities: Record<string, MockResponse> = {
        Tokyo:   { temp_c: 22.3, temp_f: 72.1, humidity: 67, wind_kph: 12.5, condition: 'Partly Cloudy',   condition_ja: '曇り時々晴れ', uv_index: 4 },
        Osaka:   { temp_c: 24.1, temp_f: 75.4, humidity: 71, wind_kph:  8.2, condition: 'Sunny',           condition_ja: '晴れ',         uv_index: 6 },
        Sapporo: { temp_c:  5.8, temp_f: 42.4, humidity: 55, wind_kph: 18.0, condition: 'Light Snow',      condition_ja: '小雪',         uv_index: 1 },
        Fukuoka: { temp_c: 20.5, temp_f: 68.9, humidity: 74, wind_kph: 15.3, condition: 'Mostly Cloudy',   condition_ja: 'ほぼ曇り',     uv_index: 3 },
      };
      const data = cities[city] ?? cities['Tokyo'];
      return { city, ...data, timestamp: now(), provider: 'WeatherJP Labs' };
    }

    case 'tokyo-stocks':
      return {
        index: 'Nikkei 225',
        value: 38_124.56 + Math.random() * 200 - 100,
        change: +(Math.random() * 300 - 150).toFixed(2),
        change_pct: +(Math.random() * 1.5 - 0.75).toFixed(3),
        stocks: [
          { ticker: '7203', name: 'Toyota Motor',  price: 2_845.5,  change: +12.3, volume: 9_820_000 },
          { ticker: '6758', name: 'Sony Group',    price: 12_430,   change: -45.0, volume: 4_310_000 },
          { ticker: '9984', name: 'SoftBank Group',price: 10_025,   change: +78.5, volume: 6_750_000 },
          { ticker: '6861', name: 'Keyence',       price: 59_040,   change: -210,  volume: 1_230_000 },
          { ticker: '8306', name: 'MUFG',          price:  1_549.5, change:  +6.5, volume: 22_100_000 },
        ],
        currency: 'JPY',
        market_status: 'open',
        timestamp: now(),
        provider: 'TDX Market Data',
      };

    case 'translate-ja': {
      const text = query?.text ?? '日本語のテキストをここに入力してください';
      // Demo translations for known phrases
      const translations: Record<string, string> = {
        'こんにちは': 'Hello',
        'ありがとう': 'Thank you',
        '日本語のテキストをここに入力してください': 'Please enter Japanese text here',
        'お疲れ様でした': 'Good work / Thank you for your effort',
        'よろしくお願いします': 'I look forward to working with you',
      };
      return {
        source_lang: 'ja',
        target_lang: 'en',
        original: text,
        translated: translations[text] ?? `[Translated] ${text}`,
        confidence: 0.96 + Math.random() * 0.03,
        char_count: text.length,
        timestamp: now(),
        provider: 'LinguaAPI Japan',
      };
    }

    case 'solana-defi-rates':
      return {
        rates: [
          { protocol: 'Marinade',  asset: 'SOL',  type: 'liquid-staking', apy: 6.82,  tvl_usd: 892_450_000 },
          { protocol: 'Kamino',    asset: 'USDC', type: 'lending',        supply_apy: 5.14, borrow_apy:  8.33, tvl_usd: 450_000_000 },
          { protocol: 'Kamino',    asset: 'SOL',  type: 'lending',        supply_apy: 2.91, borrow_apy:  4.12, tvl_usd: 310_000_000 },
          { protocol: 'Drift',     asset: 'SOL',  type: 'perp-funding',   funding_rate_8h: 0.0023, open_interest_usd: 75_000_000 },
          { protocol: 'Orca',      asset: 'SOL/USDC', type: 'clmm',      fee_apy: 18.5, tvl_usd: 125_000_000 },
          { protocol: 'Jupiter',   asset: 'various',  type: 'jlp-pool',   apy: 32.1, tvl_usd: 680_000_000 },
        ],
        network: 'mainnet-beta',
        timestamp: now(),
        provider: 'Solana Analytics',
      };

    case 'apac-news':
      return {
        articles: [
          {
            id: 'apac-001',
            title: 'Solana DEX Volume Surges to Record High Amid Japan Crypto Boom',
            title_ja: 'ソラナDEX取引量が日本の仮想通貨ブームで過去最高を記録',
            source: 'CoinDesk Asia',
            category: 'DeFi',
            published: now(),
            summary: 'Trading volumes on Solana-based decentralized exchanges hit an all-time high this week as institutional interest from Japanese financial firms accelerates.',
            url: 'https://coindesk.com/asia',
          },
          {
            id: 'apac-002',
            title: 'FSA Japan Approves New Framework for Crypto Asset Managers',
            title_ja: '金融庁、暗号資産運用会社の新規制を承認',
            source: 'Nikkei Digital',
            category: 'Regulation',
            published: now(),
            summary: 'Japan\'s Financial Services Agency released updated guidelines for crypto asset management companies, paving the way for broader institutional adoption.',
            url: 'https://nikkei.com',
          },
          {
            id: 'apac-003',
            title: 'SBI Holdings Expands Solana Staking Service to Retail',
            title_ja: 'SBIホールディングス、ソラナステーキングをリテールに拡大',
            source: 'The Block Asia',
            category: 'Business',
            published: now(),
            summary: 'SBI Holdings announced the expansion of its Solana staking product to retail investors, offering an estimated 6.8% APY.',
            url: 'https://theblock.co',
          },
          {
            id: 'apac-004',
            title: 'x402 Protocol Adoption Grows in APAC AI Agent Ecosystem',
            title_ja: 'x402プロトコル、APACのAIエージェントエコシステムで普及拡大',
            source: 'Blockworks Asia',
            category: 'Technology',
            published: now(),
            summary: 'The x402 micropayment protocol is seeing rapid uptake among AI agent developers in Japan, South Korea, and Singapore as agent-to-agent commerce scales.',
            url: 'https://blockworks.co',
          },
          {
            id: 'apac-005',
            title: 'Hong Kong Approves Six New Crypto ETFs in Single Week',
            title_ja: '香港、1週間で6つの新しい暗号資産ETFを承認',
            source: 'SCMP Markets',
            category: 'Markets',
            published: now(),
            summary: 'Hong Kong\'s Securities and Futures Commission approved six new cryptocurrency ETFs including products tracking Solana and Ethereum staking yields.',
            url: 'https://scmp.com',
          },
        ],
        total: 5,
        timestamp: now(),
        provider: 'APACNews.io',
      };

    default:
      return { error: 'Unknown API slug', slug };
  }
}
