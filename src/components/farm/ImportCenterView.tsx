// ============================================================================
// CSV import UI for fast onboarding
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Vendor, ProductMaster, VendorOffering, InventoryItem, CommoditySpec, PriceBookEntry, Season } from '@/types';
import { parseCsv } from '@/lib/csv';
import {
  mapVendors,
  mapProductMasters,
  mapVendorOfferings,
  mapInventory,
  mapCommoditySpecs,
  mapPriceBook,
  type ImportEntity,
} from '@/lib/importMappers';
import { toast } from 'sonner';

type Preview = {
  entity: ImportEntity;
  headers: string[];
  rowCount: number;
  warnings: string[];
  errors: string[];
  vendors?: Vendor[];
  productMasters?: ProductMaster[];
  vendorOfferings?: VendorOffering[];
  inventory?: InventoryItem[];
  commoditySpecs?: CommoditySpec[];
  priceBook?: PriceBookEntry[];
};

interface ImportCenterViewProps {
  currentSeason: Season | null;
  vendors: Vendor[];
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  inventory: InventoryItem[];
  commoditySpecs: CommoditySpec[];
  priceBook: PriceBookEntry[];
  onUpdateVendors: (vendors: Vendor[]) => Promise<void> | void;
  onUpdateProductMasters: (p: ProductMaster[]) => Promise<void> | void;
  onUpdateVendorOfferings: (o: VendorOffering[]) => Promise<void> | void;
  onUpdateInventory: (i: InventoryItem[]) => Promise<void> | void;
  onUpdateCommoditySpecs: (s: CommoditySpec[]) => Promise<void> | void;
  onUpdatePriceBook: (pb: PriceBookEntry[]) => Promise<void> | void;
}

export const ImportCenterView: React.FC<ImportCenterViewProps> = ({
  currentSeason,
  vendors,
  productMasters,
  vendorOfferings,
  inventory,
  commoditySpecs,
  priceBook,
  onUpdateVendors,
  onUpdateProductMasters,
  onUpdateVendorOfferings,
  onUpdateInventory,
  onUpdateCommoditySpecs,
  onUpdatePriceBook,
}) => {
  const [entity, setEntity] = useState<ImportEntity>('product_masters');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const seasonYear = currentSeason?.year || new Date().getFullYear();

  const canApply = useMemo(() => {
    if (!preview) return false;
    return preview.errors.length === 0 && preview.rowCount > 0;
  }, [preview]);

  const entityLabels: Record<ImportEntity, string> = {
    vendors: 'Vendors',
    product_masters: 'Product Masters',
    commodity_specs: 'Commodity Specs',
    vendor_offerings: 'Vendor Offerings',
    inventory: 'Inventory',
    price_book: 'Price Book',
  };

  const entityHelp: Record<ImportEntity, string> = {
    vendors: 'Required columns: name (or vendor, vendor_name). Optional: website, contact_email, contact_phone, notes, tags',
    product_masters: 'Required columns: name (or product, product_name). Optional: form (liquid/dry), category, default_unit, active_ingredients, notes',
    commodity_specs: 'Required columns: name (or spec_name, spec). Optional: product_master, unit, description, analysis, category',
    vendor_offerings: 'Required columns: vendor, product. Optional: price, price_unit, sku, min_order, freight_terms, is_preferred',
    inventory: 'Required columns: product (matches product master name), quantity. Optional: unit, packaging_name, container_count, lot_number, location',
    price_book: 'Required columns: price, product (or spec). Optional: vendor, unit, source, effective_date, notes',
  };

  async function onFile(file: File) {
    setFileName(file.name);

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    const warnings: string[] = [];
    const errors: string[] = [];

    let next: Preview = {
      entity,
      headers,
      rowCount: rows.length,
      warnings: [],
      errors: [],
    };

    try {
      if (entity === 'vendors') {
        const res = mapVendors(rows);
        next.vendors = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      if (entity === 'product_masters') {
        const res = mapProductMasters(rows);
        next.productMasters = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      if (entity === 'commodity_specs') {
        const res = mapCommoditySpecs(rows, productMasters);
        next.commoditySpecs = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      if (entity === 'vendor_offerings') {
        const res = mapVendorOfferings(rows, vendors, productMasters);
        next.vendorOfferings = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      if (entity === 'inventory') {
        const res = mapInventory(rows, productMasters);
        next.inventory = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      if (entity === 'price_book') {
        const res = mapPriceBook(rows, seasonYear, vendors, productMasters, commoditySpecs);
        next.priceBook = res.items;
        warnings.push(...res.warnings);
        errors.push(...res.errors);
      }

      next.warnings = warnings;
      next.errors = errors;

      setPreview(next);
      if (errors.length) {
        toast.error(`Import has ${errors.length} error(s). Fix CSV and re-upload.`);
      } else {
        toast.success(`Parsed ${rows.length} row(s). Review and apply.`);
      }
    } catch (e: any) {
      setPreview({
        entity,
        headers,
        rowCount: rows.length,
        warnings,
        errors: [`Import failed: ${e?.message || String(e)}`],
      });
      toast.error('Import failed. Check console.');
      console.error(e);
    }
  }

  async function applyImport() {
    if (!preview) return;

    setIsApplying(true);
    try {
      if (preview.entity === 'vendors' && preview.vendors) {
        await onUpdateVendors([...vendors, ...preview.vendors]);
      }
      if (preview.entity === 'product_masters' && preview.productMasters) {
        await onUpdateProductMasters([...productMasters, ...preview.productMasters]);
      }
      if (preview.entity === 'commodity_specs' && preview.commoditySpecs) {
        await onUpdateCommoditySpecs([...commoditySpecs, ...preview.commoditySpecs]);
      }
      if (preview.entity === 'vendor_offerings' && preview.vendorOfferings) {
        await onUpdateVendorOfferings([...(vendorOfferings || []), ...preview.vendorOfferings]);
      }
      if (preview.entity === 'inventory' && preview.inventory) {
        await onUpdateInventory([...(inventory || []), ...preview.inventory]);
      }
      if (preview.entity === 'price_book' && preview.priceBook) {
        await onUpdatePriceBook([...(priceBook || []), ...preview.priceBook]);
      }

      toast.success(`Import applied: ${preview.rowCount} ${entityLabels[preview.entity]} added.`);
      setPreview(null);
      setFileName('');
    } catch (e: any) {
      console.error(e);
      toast.error(`Apply failed: ${e?.message || String(e)}`);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Import Center</h2>
        <p className="text-sm text-stone-500 mt-1">
          CSV import for fast onboarding. Import in order: Vendors → Products → Specs → Offerings → Inventory → Price Book
        </p>
      </div>

      {/* Current counts */}
      <div className="grid gap-3 sm:grid-cols-6">
        {[
          { label: 'Vendors', count: vendors.length },
          { label: 'Products', count: productMasters.length },
          { label: 'Specs', count: commoditySpecs.length },
          { label: 'Offerings', count: vendorOfferings?.length || 0 },
          { label: 'Inventory', count: inventory.length },
          { label: 'Price Book', count: priceBook.length },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-3 text-center">
            <div className="text-2xl font-semibold text-stone-900">{s.count}</div>
            <div className="text-xs text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Step 1: Choose type */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">1</span>
            Choose import type
          </div>

          <select
            value={entity}
            onChange={(e) => { setEntity(e.target.value as ImportEntity); setPreview(null); setFileName(''); }}
            className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="mt-3 p-3 rounded-xl bg-stone-50 text-xs text-stone-600">
            <div className="font-semibold text-stone-800 mb-1">Expected columns:</div>
            {entityHelp[entity]}
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">2</span>
            Upload CSV
          </div>

          <label className="mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 cursor-pointer hover:bg-stone-100 transition">
            <Upload className="w-8 h-8 text-stone-400 mb-2" />
            <span className="text-sm text-stone-600">Click to upload or drag & drop</span>
            <span className="text-xs text-stone-400 mt-1">.csv files only</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>

          {fileName && (
            <div className="mt-3 flex items-center gap-2 text-sm text-stone-700">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">3</span>
              Preview & Apply
            </div>

            <button
              disabled={!canApply || isApplying}
              onClick={applyImport}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isApplying ? 'Applying...' : `Apply ${preview.rowCount} ${entityLabels[entity]}`}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs text-stone-500">Rows parsed</div>
              <div className="text-xl font-semibold text-stone-900">{preview.rowCount}</div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs text-stone-500">Headers found</div>
              <div className="text-xl font-semibold text-stone-900">{preview.headers.length}</div>
            </div>
            <div className={`rounded-xl border p-3 ${preview.errors.length ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="text-xs text-stone-500">Status</div>
              <div className={`text-xl font-semibold ${preview.errors.length ? 'text-rose-700' : 'text-emerald-700'}`}>
                {preview.errors.length ? `${preview.errors.length} Error(s)` : 'Ready'}
              </div>
            </div>
          </div>

          {preview.headers.length > 0 && (
            <div className="text-xs text-stone-600">
              <span className="font-semibold">Headers:</span> {preview.headers.join(', ')}
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Errors ({preview.errors.length})
              </div>
              <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({preview.warnings.length})
              </div>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {canApply && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              Ready to import. Click "Apply" to add to your data.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
