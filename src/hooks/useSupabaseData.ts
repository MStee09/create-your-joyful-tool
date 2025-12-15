import { useState, useEffect, useCallback } from 'react';
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
  Crop
} from '@/types';

interface SupabaseDataState {
  seasons: Season[];
  vendors: Vendor[];
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  inventory: InventoryItem[];
  commoditySpecs: CommoditySpec[];
  bidEvents: BidEvent[];
  vendorQuotes: VendorQuote[];
  awards: Award[];
  priceBook: PriceBookEntry[];
  currentSeasonId: string | null;
  loading: boolean;
  error: string | null;
}

// Helper to convert DB row to app type
const dbVendorToVendor = (row: any): Vendor => ({
  id: row.id,
  name: row.name,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  website: row.website,
  notes: row.notes,
  contacts: row.contacts || [],
  documents: row.documents || [],
  tags: row.tags || [],
});

const dbProductMasterToProductMaster = (row: any): ProductMaster => ({
  id: row.id,
  name: row.name,
  category: row.category,
  form: row.form || 'liquid',
  defaultUnit: row.default_unit || 'gal',
  densityLbsPerGal: row.density_lbs_per_gal ? Number(row.density_lbs_per_gal) : undefined,
  analysis: row.analysis,
  generalNotes: row.general_notes,
  mixingNotes: row.mixing_notes,
  cropRateNotes: row.crop_rate_notes,
  labelFileName: row.label_file_name,
  sdsFileName: row.sds_file_name,
  reorderPoint: row.reorder_point ? Number(row.reorder_point) : undefined,
  // Procurement
  productType: row.product_type || undefined,
  isBidEligible: row.is_bid_eligible ?? false,
  commoditySpecId: row.commodity_spec_id || undefined,
});

const dbVendorOfferingToVendorOffering = (row: any): VendorOffering => ({
  id: row.id,
  productId: row.product_id,
  vendorId: row.vendor_id,
  price: Number(row.price) || 0,
  priceUnit: row.price_unit || 'gal',
  sku: row.sku,
  minOrder: row.min_order,
  freightTerms: row.freight_terms,
  lastQuotedDate: row.last_quoted_date,
  isPreferred: row.is_preferred || false,
  packagingOptions: row.packaging_options || [],
});

const dbSeasonToSeason = (row: any): Season => ({
  id: row.id,
  year: row.year,
  name: row.name,
  crops: (row.crops || []) as Crop[],
  createdAt: new Date(row.created_at),
});

const dbInventoryToInventory = (row: any): InventoryItem => ({
  id: row.id,
  productId: row.product_id,
  quantity: Number(row.quantity) || 0,
  unit: row.unit || 'gal',
  packagingName: row.packaging_name,
  packagingSize: row.packaging_size ? Number(row.packaging_size) : undefined,
  containerCount: row.container_count,
});

const dbCommoditySpecToCommoditySpec = (row: any): CommoditySpec => ({
  id: row.id,
  productId: row.product_id || undefined,
  name: row.name,
  specName: row.name, // legacy alias used across UI
  description: row.description,
  unit: row.unit || 'ton',
  uom: row.unit || 'ton', // legacy alias used across UI
  analysis: row.analysis,
  category: row.category,
});

const dbBidEventToBidEvent = (row: any): BidEvent => ({
  id: row.id,
  name: row.name,
  seasonId: row.season_id,
  status: row.status || 'draft',
  dueDate: row.due_date,
  invitedVendorIds: row.invited_vendor_ids || [],
  vendorInvitations: row.vendor_invitations || {},
  notes: row.notes,
  createdAt: new Date(row.created_at),
});

const dbVendorQuoteToVendorQuote = (row: any): VendorQuote => ({
  id: row.id,
  bidEventId: row.bid_event_id,
  vendorId: row.vendor_id,
  commoditySpecId: row.commodity_spec_id,
  price: Number(row.price),
  deliveryTerms: row.delivery_terms,
  notes: row.notes,
});

const dbAwardToAward = (row: any): Award => ({
  id: row.id,
  bidEventId: row.bid_event_id,
  vendorQuoteId: row.vendor_quote_id,
  quantity: Number(row.quantity),
  notes: row.notes,
});

const dbPriceBookToPriceBook = (row: any): PriceBookEntry => ({
  id: row.id,
  seasonId: row.season_id,
  commoditySpecId: row.commodity_spec_id,
  productId: row.product_id,
  vendorId: row.vendor_id,
  price: Number(row.price),
  unit: row.unit || 'ton',
  source: row.source || 'manual',
  effectiveDate: row.effective_date,
  notes: row.notes,
});

export function useSupabaseData(user: User | null) {
  const [state, setState] = useState<SupabaseDataState>({
    seasons: [],
    vendors: [],
    productMasters: [],
    vendorOfferings: [],
    inventory: [],
    commoditySpecs: [],
    bidEvents: [],
    vendorQuotes: [],
    awards: [],
    priceBook: [],
    currentSeasonId: null,
    loading: true,
    error: null,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [
        seasonsRes,
        vendorsRes,
        productsRes,
        offeringsRes,
        inventoryRes,
        commoditySpecsRes,
        bidEventsRes,
        quotesRes,
        awardsRes,
        priceBookRes,
      ] = await Promise.all([
        supabase.from('seasons').select('*').order('year', { ascending: false }),
        supabase.from('vendors').select('*').order('name'),
        supabase.from('product_masters').select('*').order('name'),
        supabase.from('vendor_offerings').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('commodity_specs').select('*').order('name'),
        supabase.from('bid_events').select('*').order('created_at', { ascending: false }),
        supabase.from('vendor_quotes').select('*'),
        supabase.from('awards').select('*'),
        supabase.from('price_book').select('*'),
      ]);

      const seasons = (seasonsRes.data || []).map(dbSeasonToSeason);
      const vendors = (vendorsRes.data || []).map(dbVendorToVendor);
      const productMasters = (productsRes.data || []).map(dbProductMasterToProductMaster);
      const vendorOfferings = (offeringsRes.data || []).map(dbVendorOfferingToVendorOffering);
      const inventory = (inventoryRes.data || []).map(dbInventoryToInventory);
      let commoditySpecs = (commoditySpecsRes.data || []).map(dbCommoditySpecToCommoditySpec);
      const bidEvents = (bidEventsRes.data || []).map(dbBidEventToBidEvent);
      const vendorQuotes = (quotesRes.data || []).map(dbVendorQuoteToVendorQuote);
      const awards = (awardsRes.data || []).map(dbAwardToAward);
      const priceBook = (priceBookRes.data || []).map(dbPriceBookToPriceBook);

      // NOTE: Auto-sync of commodity specs from products has been removed.
      // Specs should only be created manually or via the explicit "Create new spec" action
      // from the product detail page. The commoditySpecId on ProductMaster is the source
      // of truth for linking products to specs.

      // Get saved current season ID or use first season
      const savedSeasonId = localStorage.getItem('farmcalc-current-season');
      const currentSeasonId = seasons.find(s => s.id === savedSeasonId)?.id || seasons[0]?.id || null;

      setState({
        seasons,
        vendors,
        productMasters,
        vendorOfferings,
        inventory,
        commoditySpecs,
        bidEvents,
        vendorQuotes,
        awards,
        priceBook,
        currentSeasonId,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CRUD operations
  const setCurrentSeasonId = useCallback((id: string | null) => {
    if (id) localStorage.setItem('farmcalc-current-season', id);
    setState(prev => ({ ...prev, currentSeasonId: id }));
  }, []);

  // Seasons
  const updateSeasons = useCallback(async (seasons: Season[]) => {
    if (!user) return;
    
    // Find what changed
    const currentIds = new Set(state.seasons.map(s => s.id));
    const newIds = new Set(seasons.map(s => s.id));
    
    // Deleted seasons
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('seasons').delete().eq('id', id);
    }
    
    // Upsert seasons
    for (const season of seasons) {
      const { error } = await supabase.from('seasons').upsert({
        id: season.id,
        user_id: user.id,
        year: season.year,
        name: season.name,
        crops: season.crops as any,
      });
      if (error) console.error('Error upserting season:', error);
    }
    
    setState(prev => ({ ...prev, seasons }));
  }, [user, state.seasons]);

  // Vendors
  const updateVendors = useCallback(async (vendors: Vendor[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.vendors.map(v => v.id));
    const newIds = new Set(vendors.map(v => v.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('vendors').delete().eq('id', id);
    }
    
    for (const vendor of vendors) {
      const { error } = await supabase.from('vendors').upsert({
        id: vendor.id,
        user_id: user.id,
        name: vendor.name,
        contact_email: vendor.contactEmail,
        contact_phone: vendor.contactPhone,
        website: vendor.website,
        notes: vendor.notes,
        contacts: vendor.contacts as any,
        documents: vendor.documents as any,
        tags: vendor.tags,
      });
      if (error) console.error('Error upserting vendor:', error);
    }
    
    setState(prev => ({ ...prev, vendors }));
  }, [user, state.vendors]);

  // Product Masters
  const updateProductMasters = useCallback(async (productMasters: ProductMaster[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.productMasters.map(p => p.id));
    const newIds = new Set(productMasters.map(p => p.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('product_masters').delete().eq('id', id);
    }
    
    for (const product of productMasters) {
      const { error } = await supabase.from('product_masters').upsert({
        id: product.id,
        user_id: user.id,
        name: product.name,
        category: product.category,
        form: product.form,
        default_unit: product.defaultUnit,
        density_lbs_per_gal: product.densityLbsPerGal,
        analysis: product.analysis as any,
        general_notes: product.generalNotes,
        mixing_notes: product.mixingNotes,
        crop_rate_notes: product.cropRateNotes,
        label_file_name: product.labelFileName,
        sds_file_name: product.sdsFileName,
        reorder_point: product.reorderPoint,
        // Procurement
        product_type: product.productType ?? null,
        is_bid_eligible: product.isBidEligible ?? false,
        commodity_spec_id: product.commoditySpecId ?? null,
      });
      if (error) console.error('Error upserting product:', error);
    }
    
    setState(prev => ({ ...prev, productMasters }));
  }, [user, state.productMasters]);

  // Vendor Offerings
  const updateVendorOfferings = useCallback(async (vendorOfferings: VendorOffering[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.vendorOfferings.map(o => o.id));
    const newIds = new Set(vendorOfferings.map(o => o.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('vendor_offerings').delete().eq('id', id);
    }
    
    for (const offering of vendorOfferings) {
      const { error } = await supabase.from('vendor_offerings').upsert({
        id: offering.id,
        user_id: user.id,
        product_id: offering.productId,
        vendor_id: offering.vendorId,
        price: offering.price,
        price_unit: offering.priceUnit,
        sku: offering.sku,
        min_order: offering.minOrder,
        freight_terms: offering.freightTerms,
        last_quoted_date: offering.lastQuotedDate,
        is_preferred: offering.isPreferred,
        packaging_options: offering.packagingOptions as any,
      });
      if (error) console.error('Error upserting offering:', error);
    }
    
    setState(prev => ({ ...prev, vendorOfferings }));
  }, [user, state.vendorOfferings]);

  // Inventory
  const updateInventory = useCallback(async (inventory: InventoryItem[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.inventory.map(i => i.id));
    const newIds = new Set(inventory.map(i => i.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('inventory').delete().eq('id', id);
    }
    
    for (const item of inventory) {
      const { error } = await supabase.from('inventory').upsert({
        id: item.id,
        user_id: user.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        packaging_name: item.packagingName,
        packaging_size: item.packagingSize,
        container_count: item.containerCount,
      });
      if (error) console.error('Error upserting inventory:', error);
    }
    
    setState(prev => ({ ...prev, inventory }));
  }, [user, state.inventory]);

  // Commodity Specs
  const updateCommoditySpecs = useCallback(async (commoditySpecs: CommoditySpec[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.commoditySpecs.map(s => s.id));
    const newIds = new Set(commoditySpecs.map(s => s.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('commodity_specs').delete().eq('id', id);
    }
    
    for (const spec of commoditySpecs) {
      const { error } = await supabase.from('commodity_specs').upsert({
        id: spec.id,
        user_id: user.id,
        product_id: spec.productId ?? null,
        name: spec.name,
        description: spec.description,
        unit: spec.unit,
        analysis: spec.analysis as any,
        category: spec.category,
      });
      if (error) console.error('Error upserting commodity spec:', error);
    }
    
    setState(prev => ({ ...prev, commoditySpecs }));
  }, [user, state.commoditySpecs]);

  // Bid Events
  const updateBidEvents = useCallback(async (bidEvents: BidEvent[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.bidEvents.map(e => e.id));
    const newIds = new Set(bidEvents.map(e => e.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('bid_events').delete().eq('id', id);
    }
    
    for (const event of bidEvents) {
      const { error } = await supabase.from('bid_events').upsert({
        id: event.id,
        user_id: user.id,
        name: event.name,
        season_id: event.seasonId,
        status: event.status,
        due_date: event.dueDate,
        invited_vendor_ids: event.invitedVendorIds,
        vendor_invitations: event.vendorInvitations as any,
        notes: event.notes,
      });
      if (error) console.error('Error upserting bid event:', error);
    }
    
    setState(prev => ({ ...prev, bidEvents }));
  }, [user, state.bidEvents]);

  // Vendor Quotes
  const updateVendorQuotes = useCallback(async (vendorQuotes: VendorQuote[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.vendorQuotes.map(q => q.id));
    const newIds = new Set(vendorQuotes.map(q => q.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('vendor_quotes').delete().eq('id', id);
    }
    
    for (const quote of vendorQuotes) {
      const { error } = await supabase.from('vendor_quotes').upsert({
        id: quote.id,
        user_id: user.id,
        bid_event_id: quote.bidEventId,
        vendor_id: quote.vendorId,
        commodity_spec_id: quote.commoditySpecId,
        price: quote.price,
        delivery_terms: quote.deliveryTerms,
        notes: quote.notes,
      });
      if (error) console.error('Error upserting vendor quote:', error);
    }
    
    setState(prev => ({ ...prev, vendorQuotes }));
  }, [user, state.vendorQuotes]);

  // Awards
  const updateAwards = useCallback(async (awards: Award[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.awards.map(a => a.id));
    const newIds = new Set(awards.map(a => a.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('awards').delete().eq('id', id);
    }
    
    for (const award of awards) {
      const { error } = await supabase.from('awards').upsert({
        id: award.id,
        user_id: user.id,
        bid_event_id: award.bidEventId,
        vendor_quote_id: award.vendorQuoteId,
        quantity: award.quantity,
        notes: award.notes,
      });
      if (error) console.error('Error upserting award:', error);
    }
    
    setState(prev => ({ ...prev, awards }));
  }, [user, state.awards]);

  // Price Book
  const updatePriceBook = useCallback(async (priceBook: PriceBookEntry[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.priceBook.map(p => p.id));
    const newIds = new Set(priceBook.map(p => p.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('price_book').delete().eq('id', id);
    }
    
    for (const entry of priceBook) {
      const { error } = await supabase.from('price_book').upsert({
        id: entry.id,
        user_id: user.id,
        season_id: entry.seasonId,
        commodity_spec_id: entry.commoditySpecId,
        product_id: entry.productId,
        vendor_id: entry.vendorId,
        price: entry.price,
        unit: entry.unit,
        source: entry.source,
        effective_date: entry.effectiveDate,
        notes: entry.notes,
      });
      if (error) console.error('Error upserting price book entry:', error);
    }
    
    setState(prev => ({ ...prev, priceBook }));
  }, [user, state.priceBook]);

  return {
    ...state,
    refetch: fetchData,
    setCurrentSeasonId,
    updateSeasons,
    updateVendors,
    updateProductMasters,
    updateVendorOfferings,
    updateInventory,
    updateCommoditySpecs,
    updateBidEvents,
    updateVendorQuotes,
    updateAwards,
    updatePriceBook,
  };
}
