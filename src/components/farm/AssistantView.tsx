// ============================================================================
// AssistantView - Decision Assistant UI with deterministic + optional API mode
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Sparkles, Send, Lightbulb, ArrowRight } from 'lucide-react';
import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { answerDeterministically, callAssistantApi, type AssistantAnswer } from '@/lib/decisionAssistant';
import { toast } from 'sonner';

interface AssistantViewProps {
  season: Season | null;
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
  onNavigate: (view: string) => void;
}

const QUICK_QUESTIONS = [
  'What do I need to buy this week?',
  'Do I have any blocking shortfalls?',
  'Are there any overdue orders?',
  'How is my variance vs plan?',
  'What is my inventory status?',
  'What orders are open?',
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  season,
  products,
  inventory,
  orders,
  invoices,
  priceBook,
  onNavigate,
}) => {
  const [q, setQ] = useState('What do I need to buy this week?');
  const [mode, setMode] = useState<'deterministic' | 'api'>('deterministic');
  const [loading, setLoading] = useState(false);
  const [apiAnswer, setApiAnswer] = useState<any>(null);
  const [history, setHistory] = useState<Array<{ q: string; a: AssistantAnswer }>>([]);

  const det = useMemo(() => {
    return answerDeterministically({ question: q, season, products, inventory, orders, invoices, priceBook });
  }, [q, season, products, inventory, orders, invoices, priceBook]);

  async function runApi() {
    setLoading(true);
    try {
      const context = { 
        season: season ? { year: season.year, name: season.name } : null,
        counts: { 
          products: products.length, 
          orders: orders.length, 
          invoices: invoices.length,
          inventory: inventory.length,
        } 
      };
      const out = await callAssistantApi(q, context);
      setApiAnswer(out);
      toast.success('Assistant response received.');
    } catch (e: any) {
      toast.error(e?.message || 'Assistant API not configured.');
    } finally {
      setLoading(false);
    }
  }

  function askQuestion(question: string) {
    setQ(question);
    if (mode === 'deterministic') {
      const answer = answerDeterministically({ question, season, products, inventory, orders, invoices, priceBook });
      setHistory(prev => [...prev, { q: question, a: answer }]);
    }
  }

  function handleSubmit() {
    if (mode === 'deterministic') {
      setHistory(prev => [...prev, { q, a: det }]);
    } else {
      runApi();
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Decision Assistant</h2>
          <p className="text-sm text-stone-500 mt-1">
            Tool-backed answers (no hallucinations). Optional API mode for LLM integration.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode('deterministic')}
            className={'rounded-xl border px-4 py-2 text-sm font-semibold transition ' + 
              (mode === 'deterministic' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')}
          >
            Deterministic
          </button>
          <button
            onClick={() => setMode('api')}
            className={'rounded-xl border px-4 py-2 text-sm font-semibold transition ' + 
              (mode === 'api' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')}
          >
            API (LLM)
          </button>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Quick Questions
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((question, i) => (
            <button
              key={i}
              onClick={() => askQuestion(question)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm hover:bg-stone-100"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Ask Input */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
        <div className="text-sm font-semibold text-stone-900">Ask a question</div>
        <div className="flex gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you need to know?"
            className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {loading ? (
              'Thinking…'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Ask
              </>
            )}
          </button>
        </div>
      </div>

      {/* Answer */}
      {mode === 'deterministic' ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Answer
            <span className="ml-auto text-xs text-stone-400 font-normal">Intent: {det.intent}</span>
          </div>
          
          <div className="text-sm text-stone-700 whitespace-pre-wrap">{det.answer}</div>

          {det.bullets && det.bullets.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1">
              {det.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}

          {det.nextActions && det.nextActions.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {det.nextActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(a.view)}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
                >
                  {a.label}
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {det.notes && det.notes.length > 0 && (
            <div className="text-xs text-stone-500 pt-2 border-t border-stone-100">
              {det.notes.join(' ')}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Answer (API)
          </div>
          {apiAnswer ? (
            <pre className="whitespace-pre-wrap break-words text-sm text-stone-700 bg-stone-50 rounded-xl p-4">
              {JSON.stringify(apiAnswer, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-stone-500">
              No API answer yet. Configure <code className="bg-stone-100 px-1 rounded">/api/assistant</code> to use this mode.
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-4">
          <div className="text-sm font-semibold text-stone-900">Recent Questions</div>
          <div className="space-y-3">
            {history.slice(-5).reverse().map((h, i) => (
              <div key={i} className="rounded-xl bg-white border border-stone-200 p-4">
                <div className="text-sm font-medium text-stone-800">Q: {h.q}</div>
                <div className="text-sm text-stone-600 mt-1">{h.a.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
