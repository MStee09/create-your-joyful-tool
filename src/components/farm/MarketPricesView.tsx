// ============================================================================
// MarketPricesView - Manual market price entry with optional provider refresh
// ============================================================================

import React, { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw, Plus, Trash2 } from 'lucide-react';
import {
  defaultMarketPrices,
  fetchMarketPricesFromProvider,
  saveMarketPricesToStorage,
  loadMarketPricesFromStorage,
  type MarketPrice,
} from '@/lib/marketPrices';
import { toast } from 'sonner';

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const MarketPricesView: React.FC = () => {
  const [prices, setPrices] = useState<MarketPrice[]>(() => {
    const stored = loadMarketPricesFromStorage();
    return stored || defaultMarketPrices();
  });
  const [loading, setLoading] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // Persist to localStorage
  useEffect(() => {
    saveMarketPricesToStorage(prices);
  }, [prices]);

  async function refreshProvider() {
    setLoading(true);
    try {
      const next = await fetchMarketPricesFromProvider();
      setPrices(next);
      toast.success('Market prices updated from provider.');
    } catch (e: any) {
      toast.error(e?.message || 'Provider not configured.');
    } finally {
      setLoading(false);
    }
  }

  function updatePrice(id: string, updates: Partial<MarketPrice>) {
    setPrices(prev => prev.map(p => 
      p.id === id 
        ? { ...p, ...updates, asOf: new Date().toISOString(), source: 'manual' as const }
        : p
    ));
  }

  function addSymbol() {
    if (!newSymbol.trim()) return;
    const symbol = newSymbol.trim().toUpperCase();
    if (prices.some(p => p.symbol === symbol)) {
      toast.error('Symbol already exists.');
      return;
    }
    setPrices(prev => [
      ...prev,
      {
        id: safeId('mp'),
        symbol,
        price: 0,
        unit: '$/unit',
        asOf: new Date().toISOString(),
        source: 'manual',
      },
    ]);
    setNewSymbol('');
    toast.success(`Added ${symbol}`);
  }

  function removeSymbol(id: string) {
    setPrices(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Market Prices</h2>
          <p className="text-sm text-stone-500 mt-1">
            Manual entry by default. Optional provider hook for futures/cash feeds.
          </p>
        </div>

        <button
          onClick={refreshProvider}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh from Provider'}
        </button>
      </div>

      {/* Add new symbol */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Add symbol (e.g., AMMONIA)"
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
          />
          <button
            onClick={addSymbol}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Prices Table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-2">Symbol</div>
          <div className="col-span-3">Price</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-4">Last Updated</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-stone-200">
          {prices.map((p) => (
            <div key={p.id} className="grid grid-cols-12 px-5 py-4 text-sm text-stone-800 items-center">
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold">{p.symbol}</span>
                </div>
              </div>

              <div className="col-span-3">
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => updatePrice(p.id, { price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  step="0.01"
                />
                <div className="text-xs text-stone-500 mt-1">{money(p.price)}</div>
              </div>

              <div className="col-span-2">
                <input
                  value={p.unit}
                  onChange={(e) => updatePrice(p.id, { unit: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="col-span-4 text-stone-600">
                <div className="text-sm">{new Date(p.asOf).toLocaleString()}</div>
                <div className="text-xs text-stone-400">{p.source}</div>
              </div>

              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeSymbol(p.id)}
                  className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {prices.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">
              No market prices configured. Add symbols above.
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">Coming soon</div>
        <ul className="mt-2 space-y-1 list-disc list-inside text-stone-600">
          <li>Price sanity checks (compare awards vs market)</li>
          <li>ROI calculations using crop prices</li>
          <li>Automatic provider integration (DTN, CME, etc.)</li>
        </ul>
      </div>
    </div>
  );
};
