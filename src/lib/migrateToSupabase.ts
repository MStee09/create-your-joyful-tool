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
import { migrateAppState } from './dataMigration';

// Generate proper UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

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
    // ID mapping tables (old ID -> new UUID)
    const vendorIdMap = new Map<string, string>();
    const productIdMap = new Map<string, string>();
    const seasonIdMap = new Map<string, string>();
    const specIdMap = new Map<string, string>();
    const bidEventIdMap = new Map<string, string>();
    const quoteIdMap = new Map<string, string>();
    const tierIdMap = new Map<string, string>();
    const timingIdMap = new Map<string, string>();

    // Helper to get or create UUID for an ID
    const getNewId = (oldId: string, idMap: Map<string, string>): string => {
      if (!oldId) return generateUUID();
      if (isValidUUID(oldId)) return oldId; // Already a valid UUID
      if (idMap.has(oldId)) return idMap.get(oldId)!;
      const newId = generateUUID();
      idMap.set(oldId, newId);
      return newId;
    };

    // 1. Migrate Vendors first (products reference vendors)
    onProgress?.('Migrating vendors...');
    const vendors = data.vendors || [];
    for (const vendor of vendors) {
      const newId = getNewId(vendor.id, vendorIdMap);
      const { error } = await supabase.from('vendors').upsert([{
        id: newId,
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

    // 2. Migrate Commodity Specs (products may reference specs)
    onProgress?.('Migrating commodity specs...');
    const commoditySpecs = data.commoditySpecs || [];
    for (const spec of commoditySpecs) {
      const newId = getNewId(spec.id, specIdMap);
      const { error } = await supabase.from('commodity_specs').upsert([{
        id: newId,
        user_id: user.id,
        product_id: null, // Will be updated after products are migrated
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

    // 3. Migrate Product Masters
    onProgress?.('Migrating products...');
    const productMasters = data.productMasters || [];
    for (const product of productMasters) {
      const newId = getNewId(product.id, productIdMap);
      const newSpecId = product.commoditySpecId ? getNewId(product.commoditySpecId, specIdMap) : null;
      
      const { error } = await supabase.from('product_masters').upsert([{
        id: newId,
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
        commodity_spec_id: newSpecId,
      }]);
      if (error) {
        console.error('Product upsert error:', error);
        throw new Error(`Failed to migrate product ${product.name}: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${productMasters.length} products`);

    // 4. Migrate Vendor Offerings (references products and vendors)
    onProgress?.('Migrating vendor offerings...');
    const vendorOfferings = data.vendorOfferings || [];
    for (const offering of vendorOfferings) {
      const newId = generateUUID();
      const newProductId = getNewId(offering.productId, productIdMap);
      const newVendorId = getNewId(offering.vendorId, vendorIdMap);
      
      const { error } = await supabase.from('vendor_offerings').upsert([{
        id: newId,
        user_id: user.id,
        product_id: newProductId,
        vendor_id: newVendorId,
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

    // 5. Migrate Inventory (references products)
    onProgress?.('Migrating inventory...');
    const inventory = data.inventory || [];
    for (const item of inventory) {
      const newId = generateUUID();
      const newProductId = getNewId(item.productId, productIdMap);
      
      const { error } = await supabase.from('inventory').upsert([{
        id: newId,
        user_id: user.id,
        product_id: newProductId,
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

    // 6. Migrate Seasons with updated crop plan IDs
    onProgress?.('Migrating seasons and crop plans...');
    const seasons = data.seasons || [];
    for (const season of seasons) {
      const newSeasonId = getNewId(season.id, seasonIdMap);
      
      // Update product IDs and tier IDs within crop plans
      const updatedCrops = (season.crops || []).map(crop => {
        // Update tier IDs
        const updatedTiers = (crop.tiers || []).map(tier => {
          const newTierId = getNewId(tier.id, tierIdMap);
          return { ...tier, id: newTierId };
        });
        
        // Update timing IDs
        const updatedTimings = (crop.applicationTimings || []).map(timing => {
          const newTimingId = getNewId(timing.id, timingIdMap);
          return { ...timing, id: newTimingId };
        });
        
        // Update applications with new product, tier, and timing IDs
        const updatedApplications = (crop.applications || []).map(app => ({
          ...app,
          id: generateUUID(),
          productId: getNewId(app.productId, productIdMap),
          tierId: app.tierId ? getNewId(app.tierId, tierIdMap) : undefined,
          timingId: getNewId(app.timingId, timingIdMap),
        }));
        
        return {
          ...crop,
          id: generateUUID(),
          tiers: updatedTiers,
          applicationTimings: updatedTimings,
          applications: updatedApplications,
        };
      });
      
      const { error } = await supabase.from('seasons').upsert([{
        id: newSeasonId,
        user_id: user.id,
        year: season.year,
        name: season.name,
        crops: updatedCrops as any,
      }]);
      if (error) {
        console.error('Season upsert error:', error);
        throw new Error(`Failed to migrate season ${season.name}: ${error.message}`);
      }
    }
    onProgress?.(`Migrated ${seasons.length} seasons`);

    // 7. Migrate Bid Events (references seasons)
    onProgress?.('Migrating bid events...');
    const bidEvents = data.bidEvents || [];
    for (const event of bidEvents) {
      const newId = getNewId(event.id, bidEventIdMap);
      const newSeasonId = event.seasonId ? getNewId(event.seasonId, seasonIdMap) : null;
      const newInvitedVendorIds = (event.invitedVendorIds || []).map(id => getNewId(id, vendorIdMap));
      
      const { error } = await supabase.from('bid_events').upsert([{
        id: newId,
        user_id: user.id,
        name: event.name,
        season_id: newSeasonId,
        status: event.status || 'draft',
        due_date: event.dueDate || null,
        invited_vendor_ids: newInvitedVendorIds,
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
      const newId = getNewId(quote.id, quoteIdMap);
      const newBidEventId = getNewId(quote.bidEventId, bidEventIdMap);
      const newVendorId = getNewId(quote.vendorId, vendorIdMap);
      const newSpecId = getNewId(quote.commoditySpecId, specIdMap);
      
      const { error } = await supabase.from('vendor_quotes').upsert([{
        id: newId,
        user_id: user.id,
        bid_event_id: newBidEventId,
        vendor_id: newVendorId,
        commodity_spec_id: newSpecId,
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
      const newId = generateUUID();
      const newBidEventId = getNewId(award.bidEventId, bidEventIdMap);
      const newQuoteId = getNewId(award.vendorQuoteId, quoteIdMap);
      
      const { error } = await supabase.from('awards').upsert([{
        id: newId,
        user_id: user.id,
        bid_event_id: newBidEventId,
        vendor_quote_id: newQuoteId,
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
      const newId = generateUUID();
      const newSeasonId = entry.seasonId ? getNewId(entry.seasonId, seasonIdMap) : null;
      const newSpecId = entry.commoditySpecId ? getNewId(entry.commoditySpecId, specIdMap) : null;
      const newProductId = entry.productId ? getNewId(entry.productId, productIdMap) : null;
      const newVendorId = entry.vendorId ? getNewId(entry.vendorId, vendorIdMap) : null;
      
      const { error } = await supabase.from('price_book').upsert([{
        id: newId,
        user_id: user.id,
        season_id: newSeasonId,
        commodity_spec_id: newSpecId,
        product_id: newProductId,
        vendor_id: newVendorId,
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
