// ============================================================================
// Market Prices - Storage with optional provider hook
// ============================================================================

export type MarketPrice = {
  id: string;
  symbol: string; // e.g. "CORN", "SOY", "WHEAT"
  price: number;
  unit: string; // e.g. "$/bu"
  asOf: string; // ISO
  source: 'manual' | 'provider';
  notes?: string;
};

function safeId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function defaultMarketPrices(): MarketPrice[] {
  const now = new Date().toISOString();
  return [
    { id: safeId('mp'), symbol: 'CORN', price: 0, unit: '$/bu', asOf: now, source: 'manual' },
    { id: safeId('mp'), symbol: 'SOY', price: 0, unit: '$/bu', asOf: now, source: 'manual' },
    { id: safeId('mp'), symbol: 'WHEAT', price: 0, unit: '$/bu', asOf: now, source: 'manual' },
    { id: safeId('mp'), symbol: 'UREA', price: 0, unit: '$/ton', asOf: now, source: 'manual' },
    { id: safeId('mp'), symbol: 'DAP', price: 0, unit: '$/ton', asOf: now, source: 'manual' },
    { id: safeId('mp'), symbol: 'POTASH', price: 0, unit: '$/ton', asOf: now, source: 'manual' },
  ];
}

// Optional provider hook — wire to your own API later
export async function fetchMarketPricesFromProvider(): Promise<MarketPrice[]> {
  // Placeholder: implement your own endpoint or provider here.
  // Example pattern:
  // const res = await fetch('/api/market');
  // return await res.json();

  throw new Error('No provider configured. Use manual prices or implement /api/market.');
}

export function saveMarketPricesToStorage(prices: MarketPrice[]) {
  try {
    localStorage.setItem('farmcalc-market-prices', JSON.stringify(prices));
  } catch {
    // ignore storage errors
  }
}

export function loadMarketPricesFromStorage(): MarketPrice[] | null {
  try {
    const raw = localStorage.getItem('farmcalc-market-prices');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}
