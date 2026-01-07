// ============================================================================
// Templates UI for fast crop plan setup
// ============================================================================

import React, { useState } from 'react';
import { Leaf, Clock, ChevronRight } from 'lucide-react';
import type { Season } from '@/types';
import { CROP_TEMPLATES, applyTemplateToSeason } from '@/lib/templates';
import { toast } from 'sonner';

interface TemplatesViewProps {
  season: Season | null;
  onUpdateSeason: (season: Season) => Promise<void> | void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ season, onUpdateSeason }) => {
  const [mode, setMode] = useState<'add' | 'replace_timings'>('add');
  const [acres, setAcres] = useState<number>(150);
  const [applying, setApplying] = useState<string | null>(null);

  if (!season) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-stone-900">Templates</h2>
        <p className="text-stone-500 mt-2">Select a season first to apply templates.</p>
      </div>
    );
  }

  async function apply(templateId: string) {
    const tpl = CROP_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    setApplying(templateId);
    try {
      const nextSeason = applyTemplateToSeason({ season, template: tpl, mode, acres });
      await onUpdateSeason(nextSeason);
      toast.success(`Applied template: ${tpl.name}`);
    } catch (e: any) {
      toast.error(`Failed to apply template: ${e?.message || String(e)}`);
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Templates</h2>
        <p className="text-sm text-stone-500 mt-1">
          Fast plan setup: adds standard passes/timings so you can plan and buy faster.
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-stone-900">Apply Mode</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="add">Add missing timings (safe)</option>
              <option value="replace_timings">Replace all timings (overwrite)</option>
            </select>
            <div className="mt-2 text-xs text-stone-500">
              "Add" keeps existing timings. "Replace" resets them.
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-stone-900">Default Acres</div>
            <input
              type="number"
              value={acres}
              onChange={(e) => setAcres(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              min={0}
            />
            <div className="mt-2 text-xs text-stone-500">
              Used when creating/updating the crop.
            </div>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <div className="text-xs font-semibold text-stone-600">Current Season</div>
            <div className="mt-1 text-lg font-semibold text-stone-900">{season.year}</div>
            <div className="text-sm text-stone-600">{season.name}</div>
            <div className="mt-2 text-xs text-stone-500">
              {season.crops.length} crop(s) configured
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CROP_TEMPLATES.map(tpl => {
          const isApplying = applying === tpl.id;
          const existingCrop = season.crops.find(c => 
            c.name.toLowerCase().includes(tpl.name.split('—')[0].trim().toLowerCase())
          );

          return (
            <div key={tpl.id} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-stone-900">{tpl.name}</div>
                  <div className="text-sm text-stone-600 mt-1">{tpl.description}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{tpl.timings.length} timings</span>
                {existingCrop && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                    Crop exists
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs text-stone-500 space-y-1 max-h-32 overflow-y-auto">
                {tpl.timings.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-stone-400" />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => apply(tpl.id)}
                disabled={isApplying}
                className="mt-auto pt-4 w-full rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {isApplying ? 'Applying...' : existingCrop ? 'Update Crop' : 'Add to Season'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">How templates work</div>
        <ul className="mt-2 space-y-1 list-disc list-inside text-stone-600">
          <li>Templates add <b>timings only</b> (no products) — you add products to each timing</li>
          <li>If the crop already exists, timings are merged or replaced based on mode</li>
          <li>Default acres can be adjusted before applying</li>
          <li>After applying, go to Crop Plans to add products to each timing</li>
        </ul>
      </div>
    </div>
  );
};
