import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { 
  Season, 
  Vendor, 
  ProductMaster, 
  VendorOffering, 
  InventoryItem,
  CommoditySpec,
  BidEvent,
  VendorQuote,
  Award,
  PriceBookEntry,
  Product,
  AppState
} from '@/types';
import { migrateAppState, migrateProducts } from './dataMigration';
import { generateId, inferProductCategory } from './calculations';

// Read localStorage data
export const getLocalStorageData = (): AppState | null => {
  // Try new key first, then old key
  const newData = localStorage.getItem('farmcalc-state-v2');
  const oldData = localStorage.getItem('farmcalc-state');
  
  const rawData = newData || oldData;
  if (!rawData) return null;
  
  try {
    const parsed = JSON.parse(rawData);
    // Apply migrations if needed
    return migrateAppState(parsed);
  } catch (e) {
    console.error('Failed to parse localStorage data:', e);
    return null;
  }
};

// Migrate all data to Supabase
export const migrateToSupabase = async (
  user: User,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: string }> => {
  const data = getLocalStorageData();
  
  if (!data) {
    return { success: false, error: 'No localStorage data found to migrate' };
  }

  try {
    // 1. Migrate Vendors
    onProgress?.('Migrating vendors...');
    const vendors = data.vendors || [];
    for (const vendor of vendors) {
      const { error } = await supabase.from('vendors').upsert([{
        id: vendor.id,
        user_id: user.id,
        name: vendor.name,
        contact_email: vendor.contactEmail || null,
        contact_phone: vendor.contactPhone || null,
        website: vendor.website || null,
        notes: vendor.notes || null,
        contacts: (vendor.contacts || []) as any,
        documents: (vendor.documents || []) as any,
        tags: vendor.tags || [],
      }]);
      if (error) {
        console.error('Vendor upsert error:', error);
        throw new Error(`Failed to migrate vendor ${vendor.name}: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${vendors.length} vendors`);

    // 2. Migrate Product Masters
    onProgress?.('Migrating products...');
    const productMasters = data.productMasters || [];
    for (const product of productMasters) {
      const { error } = await supabase.from('product_masters').upsert([{
        id: product.id,
        user_id: user.id,
        name: product.name,
        category: product.category || null,
        form: product.form || 'liquid',
        default_unit: product.defaultUnit || 'gal',
        density_lbs_per_gal: product.densityLbsPerGal || null,
        analysis: (product.analysis || null) as any,
        general_notes: product.generalNotes || null,
        mixing_notes: product.mixingNotes || null,
        crop_rate_notes: product.cropRateNotes || null,
        label_file_name: product.labelFileName || null,
        sds_file_name: product.sdsFileName || null,
        reorder_point: product.reorderPoint || null,
        product_type: product.productType || null,
        is_bid_eligible: product.isBidEligible ?? false,
        commodity_spec_id: product.commoditySpecId || null,
      }]);
      if (error) {
        console.error('Product upsert error:', error);
        throw new Error(`Failed to migrate product ${product.name}: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${productMasters.length} products`);

    // 3. Migrate Vendor Offerings
    onProgress?.('Migrating vendor offerings...');
    const vendorOfferings = data.vendorOfferings || [];
    for (const offering of vendorOfferings) {
      const { error } = await supabase.from('vendor_offerings').upsert([{
        id: offering.id,
        user_id: user.id,
        product_id: offering.productId,
        vendor_id: offering.vendorId,
        price: offering.price || 0,
        price_unit: offering.priceUnit || 'gal',
        sku: offering.sku || null,
        min_order: offering.minOrder || null,
        freight_terms: offering.freightTerms || null,
        last_quoted_date: offering.lastQuotedDate || null,
        is_preferred: offering.isPreferred ?? false,
        packaging_options: (offering.packagingOptions || []) as any,
      }]);
      if (error) {
        console.error('Offering upsert error:', error);
        throw new Error(`Failed to migrate offering: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${vendorOfferings.length} vendor offerings`);

    // 4. Migrate Inventory
    onProgress?.('Migrating inventory...');
    const inventory = data.inventory || [];
    for (const item of inventory) {
      const { error } = await supabase.from('inventory').upsert([{
        id: item.id,
        user_id: user.id,
        product_id: item.productId,
        quantity: item.quantity || 0,
        unit: item.unit || 'gal',
        packaging_name: item.packagingName || null,
        packaging_size: item.packagingSize || null,
        container_count: item.containerCount || null,
      }]);
      if (error) {
        console.error('Inventory upsert error:', error);
        throw new Error(`Failed to migrate inventory: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${inventory.length} inventory items`);

    // 5. Migrate Seasons (with crops)
    onProgress?.('Migrating seasons and crop plans...');
    const seasons = data.seasons || [];
    for (const season of seasons) {
      const { error } = await supabase.from('seasons').upsert([{
        id: season.id,
        user_id: user.id,
        year: season.year,
        name: season.name,
        crops: (season.crops || []) as any,
      }]);
      if (error) {
        console.error('Season upsert error:', error);
        throw new Error(`Failed to migrate season ${season.name}: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${seasons.length} seasons`);

    // 6. Migrate Commodity Specs
    onProgress?.('Migrating commodity specs...');
    const commoditySpecs = data.commoditySpecs || [];
    for (const spec of commoditySpecs) {
      const { error } = await supabase.from('commodity_specs').upsert([{
        id: spec.id,
        user_id: user.id,
        product_id: spec.productId || null,
        name: spec.name || spec.specName,
        description: spec.description || null,
        unit: spec.unit || spec.uom || 'ton',
        analysis: (spec.analysis || null) as any,
        category: spec.category || null,
      }]);
      if (error) {
        console.error('Commodity spec upsert error:', error);
        throw new Error(`Failed to migrate commodity spec: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${commoditySpecs.length} commodity specs`);

    // 7. Migrate Bid Events
    onProgress?.('Migrating bid events...');
    const bidEvents = data.bidEvents || [];
    for (const event of bidEvents) {
      const { error } = await supabase.from('bid_events').upsert([{
        id: event.id,
        user_id: user.id,
        name: event.name,
        season_id: event.seasonId || null,
        status: event.status || 'draft',
        due_date: event.dueDate || null,
        invited_vendor_ids: event.invitedVendorIds || [],
        vendor_invitations: event.vendorInvitations || {},
        notes: event.notes || null,
      }]);
      if (error) {
        console.error('Bid event upsert error:', error);
        throw new Error(`Failed to migrate bid event: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${bidEvents.length} bid events`);

    // 8. Migrate Vendor Quotes
    onProgress?.('Migrating vendor quotes...');
    const vendorQuotes = data.vendorQuotes || [];
    for (const quote of vendorQuotes) {
      const { error } = await supabase.from('vendor_quotes').upsert([{
        id: quote.id,
        user_id: user.id,
        bid_event_id: quote.bidEventId,
        vendor_id: quote.vendorId,
        commodity_spec_id: quote.commoditySpecId,
        price: quote.price,
        delivery_terms: quote.deliveryTerms || null,
        notes: quote.notes || null,
      }]);
      if (error) {
        console.error('Quote upsert error:', error);
        throw new Error(`Failed to migrate vendor quote: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${vendorQuotes.length} vendor quotes`);

    // 9. Migrate Awards
    onProgress?.('Migrating awards...');
    const awards = data.awards || [];
    for (const award of awards) {
      const { error } = await supabase.from('awards').upsert([{
        id: award.id,
        user_id: user.id,
        bid_event_id: award.bidEventId,
        vendor_quote_id: award.vendorQuoteId,
        quantity: award.quantity,
        notes: award.notes || null,
      }]);
      if (error) {
        console.error('Award upsert error:', error);
        throw new Error(`Failed to migrate award: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${awards.length} awards`);

    // 10. Migrate Price Book
    onProgress?.('Migrating price book...');
    const priceBook = data.priceBook || [];
    for (const entry of priceBook) {
      const { error } = await supabase.from('price_book').upsert([{
        id: entry.id,
        user_id: user.id,
        season_id: entry.seasonId || null,
        commodity_spec_id: entry.commoditySpecId || null,
        product_id: entry.productId || null,
        vendor_id: entry.vendorId || null,
        price: entry.price,
        unit: entry.unit || 'ton',
        source: entry.source || 'manual',
        effective_date: entry.effectiveDate || null,
        notes: entry.notes || null,
      }]);
      if (error) {
        console.error('Price book upsert error:', error);
        throw new Error(`Failed to migrate price book entry: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${priceBook.length} price book entries`);

    onProgress?.('Migration complete!');
    return { success: true };
  } catch (error: any) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
};

// Check if localStorage has data to migrate
export const hasLocalStorageData = (): boolean => {
  const data = getLocalStorageData();
  if (!data) return false;
  
  const hasSeasons = (data.seasons?.length ?? 0) > 0;
  const hasProducts = (data.productMasters?.length ?? 0) > 0;
  const hasVendors = (data.vendors?.length ?? 0) > 0;
  
  return hasSeasons || hasProducts || hasVendors;
};

// Get summary of localStorage data
export const getLocalStorageDataSummary = (): { 
  seasons: number;
  vendors: number;
  products: number;
  vendorOfferings: number;
  inventory: number;
  commoditySpecs: number;
  bidEvents: number;
} | null => {
  const data = getLocalStorageData();
  if (!data) return null;
  
  return {
    seasons: data.seasons?.length ?? 0,
    vendors: data.vendors?.length ?? 0,
    products: data.productMasters?.length ?? 0,
    vendorOfferings: data.vendorOfferings?.length ?? 0,
    inventory: data.inventory?.length ?? 0,
    commoditySpecs: data.commoditySpecs?.length ?? 0,
    bidEvents: data.bidEvents?.length ?? 0,
  };
};
