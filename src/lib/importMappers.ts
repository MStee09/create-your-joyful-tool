// ============================================================================
// Turn CSV rows into typed entities (vendors, products, inventory, etc.)
// ============================================================================

import type { Vendor, ProductMaster, VendorOffering, InventoryItem, CommoditySpec, PriceBookEntry } from '@/types';
import { toNum, truthy } from '@/lib/csv';

function safeId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function findByName<T extends { id: string; name: string; form?: string }>(items: T[], name: string): T | undefined {
  const n = (name || "").trim().toLowerCase();
  if (!n) return undefined;
  return items.find(x => (x.name || "").trim().toLowerCase() === n);
}

export type ImportEntity =
  | 'vendors'
  | 'product_masters'
  | 'vendor_offerings'
  | 'inventory'
  | 'commodity_specs'
  | 'price_book';

export type ImportResult<T> = {
  items: T[];
  warnings: string[];
  errors: string[];
};

export function mapVendors(rows: Record<string, string>[]): ImportResult<Vendor> {
  const items: Vendor[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const name = r.name || r.vendor || r.vendor_name;
    if (!name) {
      errors.push(`Row ${idx + 2}: missing vendor name (name/vendor/vendor_name).`);
      continue;
    }

    const tagsRaw = r.tags || "";
    const tags = tagsRaw
      ? tagsRaw.split(/[,;|]/).map(t => t.trim()).filter(Boolean) as any
      : [];

    items.push({
      id: safeId('vendor'),
      name: name.trim(),
      website: r.website || undefined,
      contactEmail: r.contact_email || r.email || undefined,
      contactPhone: r.contact_phone || r.phone || undefined,
      notes: r.notes || undefined,
      contacts: [],
      documents: [],
      tags,
      generalNotes: r.general_notes || undefined,
      freightNotes: r.freight_notes || undefined,
    });
  }

  return { items, warnings, errors };
}

export function mapProductMasters(rows: Record<string, string>[]): ImportResult<ProductMaster> {
  const items: ProductMaster[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const name = r.name || r.product || r.product_name;
    if (!name) {
      errors.push(`Row ${idx + 2}: missing product master name (name/product/product_name).`);
      continue;
    }

    const form = (r.form || 'liquid').toLowerCase() === 'dry' ? 'dry' : 'liquid';
    const category = (r.category || 'other') as any;
    const defaultUnit = (r.default_unit || (form === 'dry' ? 'lbs' : 'gal')) as any;

    items.push({
      id: safeId('pm'),
      name: name.trim(),
      category,
      form,
      defaultUnit,
      densityLbsPerGal: r.density_lbs_per_gal ? toNum(r.density_lbs_per_gal, undefined as any) : undefined,
      analysis: undefined,
      activeIngredients: r.active_ingredients || undefined,
      generalNotes: r.general_notes || r.notes || undefined,
      mixingNotes: r.mixing_notes || undefined,
      cropRateNotes: r.crop_rate_notes || undefined,
      labelFileName: undefined,
      sdsFileName: undefined,
      reorderPoint: r.reorder_point ? toNum(r.reorder_point) : undefined,
      reorderUnit: r.reorder_unit as any,
      productType: (r.product_type as any) || undefined,
      isBidEligible: truthy(r.is_bid_eligible),
      commoditySpecId: r.commodity_spec_id || undefined,
      estimatedPrice: r.estimated_price ? toNum(r.estimated_price) : undefined,
      estimatedPriceUnit: r.estimated_price_unit as any,
      productUrl: r.product_url || undefined,
    });
  }

  return { items, warnings, errors };
}

export function mapCommoditySpecs(
  rows: Record<string, string>[],
  productMasters: ProductMaster[]
): ImportResult<CommoditySpec> {
  const items: CommoditySpec[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const name = r.name || r.spec_name || r.spec || r.commodity;
    if (!name) {
      errors.push(`Row ${idx + 2}: missing spec name (name/spec_name/spec/commodity).`);
      continue;
    }

    const pmName = r.product_master || r.product_master_name || r.product;
    const pm = pmName ? findByName(productMasters as any, pmName) : undefined;
    if (pmName && !pm) warnings.push(`Row ${idx + 2}: product master not found for '${pmName}' (spec will be unlinked).`);

    const unit = (r.unit || r.uom || 'ton') as any;

    items.push({
      id: safeId('spec'),
      productId: pm?.id,
      name: name.trim(),
      specName: name.trim(),
      description: r.description || undefined,
      analysis: r.analysis || undefined,
      unit,
      uom: unit,
      category: r.category || undefined,
    });
  }

  return { items, warnings, errors };
}

export function mapVendorOfferings(
  rows: Record<string, string>[],
  vendors: Vendor[],
  productMasters: ProductMaster[]
): ImportResult<VendorOffering> {
  const items: VendorOffering[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const vendorName = r.vendor || r.vendor_name;
    const productName = r.product || r.product_name || r.product_master;

    if (!vendorName || !productName) {
      errors.push(`Row ${idx + 2}: missing vendor/product (vendor + product).`);
      continue;
    }

    const vendor = findByName(vendors as any, vendorName);
    const product = findByName(productMasters as any, productName);

    if (!vendor) {
      errors.push(`Row ${idx + 2}: vendor not found '${vendorName}'.`);
      continue;
    }
    if (!product) {
      errors.push(`Row ${idx + 2}: product master not found '${productName}'.`);
      continue;
    }

    const price = toNum(r.price, 0);
    const priceUnit = (r.price_unit || r.uom || (product.form === 'dry' ? 'ton' : 'gal')) as any;

    items.push({
      id: safeId('offer'),
      vendorId: vendor.id,
      productId: product.id,
      price,
      priceUnit,
      sku: r.sku || undefined,
      minOrder: r.min_order || undefined,
      freightTerms: r.freight_terms || undefined,
      lastQuotedDate: r.last_quoted_date || undefined,
      isPreferred: truthy(r.is_preferred),
      packagingOptions: [],
      containerSize: r.container_size ? toNum(r.container_size) : undefined,
      containerUnit: r.container_unit as any,
    });
  }

  return { items, warnings, errors };
}

export function mapInventory(
  rows: Record<string, string>[],
  productMasters: ProductMaster[]
): ImportResult<InventoryItem> {
  const items: InventoryItem[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const productName = r.product || r.product_name || r.product_master;
    if (!productName) {
      errors.push(`Row ${idx + 2}: missing product name.`);
      continue;
    }

    const pm = findByName(productMasters as any, productName);
    if (!pm) {
      errors.push(`Row ${idx + 2}: product master not found '${productName}'.`);
      continue;
    }

    const unit = (r.unit || (pm.form === 'dry' ? 'lbs' : 'gal')).toLowerCase() === 'gal' ? 'gal' : 'lbs';
    const qty = toNum(r.quantity, 0);

    items.push({
      id: safeId('inv'),
      productId: pm.id,
      quantity: qty,
      unit,
      packagingName: r.packaging_name || r.package || undefined,
      packagingSize: r.packaging_size ? toNum(r.packaging_size) : undefined,
      containerCount: r.container_count ? toNum(r.container_count) : undefined,
      lotNumber: r.lot_number || r.lot || undefined,
      location: r.location || undefined,
      receivedDate: r.received_date || undefined,
      expirationDate: r.expiration_date || undefined,
    });
  }

  return { items, warnings, errors };
}

export function mapPriceBook(
  rows: Record<string, string>[],
  seasonYear: number,
  vendors: Vendor[],
  productMasters: ProductMaster[],
  commoditySpecs: CommoditySpec[]
): ImportResult<PriceBookEntry> {
  const items: PriceBookEntry[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [idx, r] of rows.entries()) {
    const price = toNum(r.price, NaN);
    if (!Number.isFinite(price)) {
      errors.push(`Row ${idx + 2}: invalid price.`);
      continue;
    }

    const vendorName = r.vendor || r.vendor_name;
    const productName = r.product || r.product_name || r.product_master;
    const specName = r.spec || r.spec_name;

    const vendor = vendorName ? findByName(vendors as any, vendorName) : undefined;
    if (vendorName && !vendor) warnings.push(`Row ${idx + 2}: vendor not found '${vendorName}'.`);

    const pm = productName ? findByName(productMasters as any, productName) : undefined;
    if (productName && !pm) warnings.push(`Row ${idx + 2}: product not found '${productName}'.`);

    const spec = specName ? findByName(commoditySpecs as any, specName) : undefined;
    if (specName && !spec) warnings.push(`Row ${idx + 2}: spec not found '${specName}'.`);

    if (!pm && !spec) {
      errors.push(`Row ${idx + 2}: needs product OR spec (product/product_name or spec/spec_name).`);
      continue;
    }

    const unit = (r.unit || r.price_uom || r.uom || 'ton') as any;

    items.push({
      id: safeId('pb'),
      seasonYear,
      vendorId: vendor?.id,
      productId: pm?.id,
      commoditySpecId: spec?.id,
      price,
      priceUom: unit,
      source: (r.source as any) || 'manual',
      effectiveDate: r.effective_date || undefined,
      notes: r.notes || undefined,
    });
  }

  return { items, warnings, errors };
}
