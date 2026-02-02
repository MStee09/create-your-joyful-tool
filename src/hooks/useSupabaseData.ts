import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadCache, saveCache } from '@/lib/cache';
import { toast } from 'sonner';
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
  Crop,
  Purchase,
  InventoryTransaction,
  Order,
  Invoice,
} from '@/types';
import type { PriceHistory } from '@/types/farm';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import type { SimplePurchase, NewSimplePurchase, SimplePurchaseLine } from '@/types/simplePurchase';
import type { Field, FieldAssignment, Equipment, FieldCropOverride } from '@/types/field';
import type { TankMixRecipe, TankMixProduct } from '@/types/tankMix';
import type { ApplicationRecord, ApplicationProductRecord } from '@/types/applicationRecord';

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
  purchases: Purchase[];
  inventoryTransactions: InventoryTransaction[];
  priceHistory: PriceHistory[];
  orders: Order[];
  invoices: Invoice[];
  // New simplified types
  priceRecords: PriceRecord[];
  simplePurchases: SimplePurchase[];
  // Phase 1: Fields + Equipment
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  fieldCropOverrides: FieldCropOverride[];
  equipment: Equipment[];
  // Phase 3: Tank Mix Recipes
  tankMixRecipes: TankMixRecipe[];
  // Phase 5: Application Records
  applicationRecords: ApplicationRecord[];
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
  // Estimated pricing (fallback when no price book / vendor offering)
  estimatedPrice: row.estimated_price !== null && row.estimated_price !== undefined ? Number(row.estimated_price) : undefined,
  estimatedPriceUnit: row.estimated_price_unit || undefined,
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
  containerSize: row.container_size ? Number(row.container_size) : undefined,
  containerUnit: row.container_unit || undefined,
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

const dbBidEventToBidEvent = (row: any): BidEvent => {
  const raw = row.vendor_invitations;

  // vendor_invitations is jsonb in DB and has been stored as:
  // - [] (preferred)
  // - {} (default/empty)
  // - { [vendorId]: {status,...} } (older shape)
  const vendorInvitations = (() => {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    if (typeof raw === 'object') {
      // convert map -> array
      return Object.entries(raw).map(([vendorId, v]: any) => ({
        vendorId,
        status: v?.status || 'pending',
        sentDate: v?.sentDate,
        responseDate: v?.responseDate,
        notes: v?.notes,
      }));
    }
    return [];
  })();

  return {
    id: row.id,
    name: row.name,
    seasonId: row.season_id,
    seasonYear: row.season_year,
    eventType: row.event_type,
    status: row.status || 'draft',
    dueDate: row.due_date,
    invitedVendorIds: row.invited_vendor_ids || [],
    vendorInvitations,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  };
};

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
    purchases: [],
    inventoryTransactions: [],
    priceHistory: [],
    orders: [],
    invoices: [],
    priceRecords: [],
    simplePurchases: [],
    fields: [],
    fieldAssignments: [],
    fieldCropOverrides: [],
    equipment: [],
    tankMixRecipes: [],
    applicationRecords: [],
    currentSeasonId: null,
    loading: true,
    error: null,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    // Use userId from closure to avoid re-triggering on user object changes
    const userId = user?.id;
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Load cached data for instant display
    const cached = loadCache(userId);
    if (cached) {
      setState(prev => ({
        ...prev,
        ...cached,
        loading: true, // still show loading since we're fetching fresh
        error: null,
      }));
    } else {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

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
        purchasesRes,
        transactionsRes,
        priceHistoryRes,
        ordersRes,
        invoicesRes,
        priceRecordsRes,
        fieldsRes,
        fieldAssignmentsRes,
        fieldCropOverridesRes,
        equipmentRes,
        tankMixRecipesRes,
        applicationRecordsRes,
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
        supabase.from('purchases').select('*').order('date', { ascending: false }),
        supabase.from('inventory_transactions').select('*').order('date', { ascending: false }),
        supabase.from('price_history').select('*').order('date', { ascending: false }),
        supabase.from('orders').select('*').order('order_date', { ascending: false }),
        supabase.from('invoices').select('*').order('received_date', { ascending: false }),
        supabase.from('price_records').select('*').order('date', { ascending: false }),
        supabase.from('fields').select('*').order('name'),
        supabase.from('field_assignments').select('*'),
        supabase.from('field_crop_overrides').select('*'),
        supabase.from('equipment').select('*').order('name'),
        supabase.from('tank_mix_recipes').select('*').order('name'),
        supabase.from('application_records').select('*').order('date_applied', { ascending: false }),
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
      
      // Map purchases
      const purchases: Purchase[] = (purchasesRes.data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        vendorId: row.vendor_id,
        seasonYear: row.season_year,
        status: row.status,
        invoiceNumber: row.invoice_number,
        notes: row.notes,
        lineItems: row.line_items || [],
        totalCost: Number(row.total_cost) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Map simple purchases (same underlying table, newer columns)
      const simplePurchases: SimplePurchase[] = (purchasesRes.data || [])
        .filter((row: any) => !!row.season_id)
        .map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          seasonId: row.season_id,
          vendorId: row.vendor_id,
          status: (row.status || 'ordered') as 'ordered' | 'received',
          orderDate: row.order_date || row.date,
          expectedDeliveryDate: row.expected_delivery_date || undefined,
          receivedDate: row.received_date || undefined,
          lines: (Array.isArray(row.line_items) ? row.line_items : []) as unknown as SimplePurchaseLine[],
          freightCost: Number(row.freight_cost) || 0,
          freightNotes: row.freight_notes || undefined,
          subtotal: Number(row.subtotal) || 0,
          total: Number(row.total) || 0,
          notes: row.notes || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
        .sort((a, b) => new Date((b.receivedDate || b.orderDate) as string).getTime() - new Date((a.receivedDate || a.orderDate) as string).getTime());
      
      // Map inventory transactions
      const inventoryTransactions: InventoryTransaction[] = (transactionsRes.data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        productId: row.product_id,
        type: row.type,
        quantity: Number(row.quantity) || 0,
        unit: row.unit,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        seasonYear: row.season_year,
        notes: row.notes,
        unitCost: row.unit_cost ? Number(row.unit_cost) : undefined,
        createdAt: row.created_at,
      }));
      
      // Map price history
      const priceHistory: PriceHistory[] = (priceHistoryRes.data || []).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        vendorId: row.vendor_id,
        date: row.date,
        unitPrice: Number(row.unit_price) || 0,
        unit: row.unit,
        seasonYear: row.season_year,
        purchaseId: row.purchase_id,
      }));

      // NOTE: Auto-sync of commodity specs from products has been removed.
      // Specs should only be created manually or via the explicit "Create new spec" action
      // from the product detail page. The commoditySpecId on ProductMaster is the source
      // of truth for linking products to specs.

      // Map orders
      const orders: Order[] = (ordersRes.data || []).map((row: any) => ({
        id: row.id,
        orderNumber: row.order_number,
        vendorId: row.vendor_id,
        seasonYear: row.season_year,
        orderDate: row.order_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deliveryWindow: row.delivery_window,
        lineItems: row.line_items || [],
        subtotal: Number(row.subtotal) || 0,
        status: row.status || 'draft',
        paymentStatus: row.payment_status || 'unpaid',
        prepayment: row.prepayment,
        bidEventId: row.bid_event_id,
        notes: row.notes,
        invoiceIds: [],
      }));

      // Map invoices
      const invoices: Invoice[] = (invoicesRes.data || []).map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        vendorId: row.vendor_id,
        seasonYear: row.season_year,
        invoiceDate: row.invoice_date,
        receivedDate: row.received_date,
        createdAt: row.created_at,
        orderId: row.order_id,
        lineItems: row.line_items || [],
        productSubtotal: Number(row.product_subtotal) || 0,
        charges: row.charges || [],
        chargesTotal: Number(row.charges_total) || 0,
        totalAmount: Number(row.total_amount) || 0,
        status: row.status || 'draft',
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        paymentReference: row.payment_reference,
        scaleTickets: row.scale_tickets,
        notes: row.notes,
      }));

      // Map price records (new simplified type)
      const priceRecords: PriceRecord[] = (priceRecordsRes.data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        vendorId: row.vendor_id,
        price: Number(row.price) || 0,
        unit: row.unit || 'gal',
        normalizedPrice: Number(row.normalized_price) || 0,
        packageType: row.package_type,
        packageSize: row.package_size ? Number(row.package_size) : undefined,
        packageUnit: row.package_unit,
        quantityPurchased: row.quantity_purchased ? Number(row.quantity_purchased) : undefined,
        date: row.date,
        seasonYear: row.season_year,
        type: row.type || 'purchased',
        purchaseId: row.purchase_id,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Get saved current season ID or use first season
      const savedSeasonId = localStorage.getItem('farmcalc-current-season');
      const currentSeasonId = seasons.find(s => s.id === savedSeasonId)?.id || seasons[0]?.id || null;

      // Map fields
      const fields: Field[] = (fieldsRes.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        acres: Number(row.acres) || 0,
        farm: row.farm,
        soilType: row.soil_type,
        pH: row.ph ? Number(row.ph) : undefined,
        organicMatter: row.organic_matter ? Number(row.organic_matter) : undefined,
        cec: row.cec ? Number(row.cec) : undefined,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Map field assignments
      const fieldAssignments: FieldAssignment[] = (fieldAssignmentsRes.data || []).map((row: any) => ({
        id: row.id,
        seasonId: row.season_id,
        fieldId: row.field_id,
        cropId: row.crop_id,
        acres: Number(row.acres) || 0,
        plannedAcres: row.planned_acres ? Number(row.planned_acres) : undefined,
        yieldGoal: row.yield_goal ? Number(row.yield_goal) : undefined,
        yieldUnit: row.yield_unit,
        actualYield: row.actual_yield ? Number(row.actual_yield) : undefined,
        previousCropId: row.previous_crop_id,
        previousCropName: row.previous_crop_name,
        notes: row.notes,
        createdAt: row.created_at,
      }));

      // Map field crop overrides
      const fieldCropOverrides: FieldCropOverride[] = (fieldCropOverridesRes.data || []).map((row: any) => ({
        id: row.id,
        fieldAssignmentId: row.field_assignment_id,
        applicationId: row.application_id,
        overrideType: row.override_type || 'rate_adjust',
        rateAdjustment: row.rate_adjustment ? Number(row.rate_adjustment) : undefined,
        customRate: row.custom_rate ? Number(row.custom_rate) : undefined,
        customUnit: row.custom_unit,
        productId: row.product_id,
        notes: row.notes,
        createdAt: row.created_at,
      }));

      // Map equipment
      const equipment: Equipment[] = (equipmentRes.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type || 'sprayer',
        tankSize: Number(row.tank_size) || 0,
        tankUnit: 'gal' as const,
        defaultCarrierGPA: row.default_carrier_gpa ? Number(row.default_carrier_gpa) : undefined,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Map tank mix recipes
      const tankMixRecipes: TankMixRecipe[] = (tankMixRecipesRes.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        carrierGPA: Number(row.carrier_gpa) || 10,
        products: (row.products || []) as TankMixProduct[],
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Map application records
      const applicationRecords: ApplicationRecord[] = (applicationRecordsRes.data || []).map((row: any) => ({
        id: row.id,
        seasonId: row.season_id,
        cropId: row.crop_id,
        fieldId: row.field_id,
        timingId: row.timing_id,
        dateApplied: row.date_applied,
        acresTreated: Number(row.acres_treated) || 0,
        products: (row.products || []) as ApplicationProductRecord[],
        equipmentId: row.equipment_id,
        carrierGPA: row.carrier_gpa ? Number(row.carrier_gpa) : undefined,
        applicator: row.applicator || 'self',
        customApplicatorName: row.custom_applicator_name,
        weatherNotes: row.weather_notes,
        notes: row.notes,
        overriddenWarnings: row.overridden_warnings || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

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
        purchases,
        inventoryTransactions,
        priceHistory,
        orders,
        invoices,
        priceRecords,
        simplePurchases,
        fields,
        fieldAssignments,
        fieldCropOverrides,
        equipment,
        tankMixRecipes,
        applicationRecords,
        currentSeasonId,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only refetch when user ID changes, not on token refresh

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save to cache when data changes
  useEffect(() => {
    if (!user) return;
    if (state.loading) return;
    if (state.error) return;

    // Only cache the data fields, not loading/error
    const { loading, error, ...dataOnly } = state;
    saveCache(user.id, dataOnly);
  }, [state, user]);

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
        estimated_price: product.estimatedPrice ?? null,
        estimated_price_unit: product.estimatedPriceUnit ?? null,
        // Procurement
        product_type: product.productType ?? null,
        is_bid_eligible: product.isBidEligible ?? false,
        commodity_spec_id: product.commoditySpecId ?? null,
      });
      if (error) console.error('Error upserting product:', error);
    }
    
    setState(prev => ({ ...prev, productMasters }));
  }, [user, state.productMasters]);

  // Add a single product (faster than updating all)
  const addProductMaster = useCallback(async (product: ProductMaster) => {
    if (!user) return;

    const { error } = await supabase.from('product_masters').insert({
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
      estimated_price: product.estimatedPrice ?? null,
      estimated_price_unit: product.estimatedPriceUnit ?? null,
      product_type: product.productType ?? null,
      is_bid_eligible: product.isBidEligible ?? false,
      commodity_spec_id: product.commoditySpecId ?? null,
    });

    if (error) {
      console.error('Error adding product:', error);
      return;
    }

    setState(prev => ({ ...prev, productMasters: [...prev.productMasters, product] }));
  }, [user]);

  // Update a single product (prevents re-saving every product on every edit)
  const updateProductMaster = useCallback(async (product: ProductMaster) => {
    if (!user) return;

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
      estimated_price: product.estimatedPrice ?? null,
      estimated_price_unit: product.estimatedPriceUnit ?? null,
      // Procurement
      product_type: product.productType ?? null,
      is_bid_eligible: product.isBidEligible ?? false,
      commodity_spec_id: product.commoditySpecId ?? null,
    });

    if (error) {
      console.error('Error updating product:', error);
      // Show user-friendly error for foreign key constraint violations
      if (error.code === '23503' && error.message.includes('commodity_spec')) {
        toast.error('Failed to link commodity spec - the selected spec may no longer exist. Try creating a new one.');
      } else {
        toast.error('Failed to update product');
      }
      return;
    }

    setState(prev => ({
      ...prev,
      productMasters: prev.productMasters.map(p => (p.id === product.id ? product : p)),
    }));
  }, [user]);

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
        container_size: offering.containerSize ?? null,
        container_unit: offering.containerUnit ?? null,
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
        vendor_invitations: (Array.isArray(event.vendorInvitations) ? event.vendorInvitations : []) as any,
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

  // Update purchases
  const updatePurchases = useCallback(async (purchases: Purchase[]) => {
    if (!user) return;
    
    // Upsert all purchases
    for (const purchase of purchases) {
      const { error } = await supabase.from('purchases').upsert({
        id: purchase.id,
        user_id: user.id,
        vendor_id: purchase.vendorId,
        season_year: purchase.seasonYear,
        date: purchase.date,
        status: purchase.status,
        invoice_number: purchase.invoiceNumber,
        notes: purchase.notes,
        line_items: purchase.lineItems as any,
        total_cost: purchase.totalCost,
      });
      if (error) console.error('Error upserting purchase:', error);
    }
    
    setState(prev => ({ ...prev, purchases }));
  }, [user]);

  // Add a single purchase (OLD - for backwards compatibility)
  const addPurchase = useCallback(async (purchase: Purchase) => {
    if (!user) return;
    
    const { error } = await supabase.from('purchases').insert({
      id: purchase.id,
      user_id: user.id,
      vendor_id: purchase.vendorId,
      season_year: purchase.seasonYear,
      date: purchase.date,
      status: purchase.status,
      invoice_number: purchase.invoiceNumber,
      notes: purchase.notes,
      line_items: purchase.lineItems as any,
      total_cost: purchase.totalCost,
    });
    
    if (error) {
      console.error('Error adding purchase:', error);
      return;
    }
    
    setState(prev => ({ ...prev, purchases: [...prev.purchases, purchase] }));
  }, [user]);

  // =============================================
  // SIMPLE PURCHASE CRUD (New simplified system)
  // =============================================
  
  const addSimplePurchase = useCallback(async (purchase: NewSimplePurchase): Promise<SimplePurchase | null> => {
    if (!user) return null;
    
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        id,
        user_id: user.id,
        season_id: purchase.seasonId,
        vendor_id: purchase.vendorId,
        status: purchase.status,
        order_date: purchase.orderDate,
        expected_delivery_date: purchase.expectedDeliveryDate || null,
        received_date: purchase.receivedDate || null,
        line_items: purchase.lines as any,
        freight_cost: purchase.freightCost || 0,
        freight_notes: purchase.freightNotes || null,
        subtotal: purchase.subtotal,
        total: purchase.total,
        notes: purchase.notes || null,
        // Also set old columns for backwards compatibility
        date: purchase.orderDate,
        season_year: new Date().getFullYear(),
        total_cost: purchase.total,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding simple purchase:', error);
      toast.error('Failed to save purchase');
      return null;
    }
    
    const newPurchase: SimplePurchase = {
      id: data.id,
      userId: data.user_id,
      seasonId: data.season_id,
      vendorId: data.vendor_id,
      status: data.status as 'ordered' | 'received',
      orderDate: data.order_date,
      expectedDeliveryDate: data.expected_delivery_date,
      receivedDate: data.received_date,
      lines: (Array.isArray(data.line_items) ? data.line_items : []) as unknown as SimplePurchaseLine[],
      freightCost: Number(data.freight_cost) || 0,
      freightNotes: data.freight_notes,
      subtotal: Number(data.subtotal) || 0,
      total: Number(data.total) || 0,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
    setState(prev => ({ ...prev, simplePurchases: [newPurchase, ...prev.simplePurchases] }));
    toast.success('Purchase saved');
    return newPurchase;
  }, [user]);

  const updateSimplePurchase = useCallback(async (id: string, updates: Partial<SimplePurchase>): Promise<boolean> => {
    if (!user) return false;
    
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.orderDate !== undefined) dbUpdates.order_date = updates.orderDate;
    if (updates.expectedDeliveryDate !== undefined) dbUpdates.expected_delivery_date = updates.expectedDeliveryDate;
    if (updates.receivedDate !== undefined) dbUpdates.received_date = updates.receivedDate;
    if (updates.lines !== undefined) dbUpdates.line_items = updates.lines;
    if (updates.freightCost !== undefined) dbUpdates.freight_cost = updates.freightCost;
    if (updates.freightNotes !== undefined) dbUpdates.freight_notes = updates.freightNotes;
    if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    
    const { error } = await supabase
      .from('purchases')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating simple purchase:', error);
      toast.error('Failed to update purchase');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      simplePurchases: prev.simplePurchases.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
    
    toast.success('Purchase updated');
    return true;
  }, [user]);

  const deleteSimplePurchase = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting simple purchase:', error);
      toast.error('Failed to delete purchase');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      simplePurchases: prev.simplePurchases.filter(p => p.id !== id),
    }));
    
    toast.success('Purchase deleted');
    return true;
  }, [user]);

  // Add inventory transaction
  const addInventoryTransaction = useCallback(async (transaction: InventoryTransaction) => {
    if (!user) return;
    
    const { error } = await supabase.from('inventory_transactions').insert({
      id: transaction.id,
      user_id: user.id,
      product_id: transaction.productId,
      type: transaction.type,
      quantity: transaction.quantity,
      unit: transaction.unit,
      reference_id: transaction.referenceId,
      reference_type: transaction.referenceType,
      season_year: transaction.seasonYear,
      notes: transaction.notes,
      unit_cost: transaction.unitCost,
      date: transaction.date,
    });
    
    if (error) {
      console.error('Error adding inventory transaction:', error);
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      inventoryTransactions: [...prev.inventoryTransactions, transaction] 
    }));
  }, [user]);

  // Add price history entry
  const addPriceHistory = useCallback(async (entry: PriceHistory) => {
    if (!user) return;
    
    const { error } = await supabase.from('price_history').insert({
      id: entry.id,
      user_id: user.id,
      product_id: entry.productId,
      vendor_id: entry.vendorId,
      date: entry.date,
      unit_price: entry.unitPrice,
      unit: entry.unit,
      season_year: entry.seasonYear,
      purchase_id: entry.purchaseId,
    });
    
    if (error) {
      console.error('Error adding price history:', error);
      return;
    }
    
    setState(prev => ({ ...prev, priceHistory: [...prev.priceHistory, entry] }));
  }, [user]);

  // Update orders
  const updateOrders = useCallback(async (orders: Order[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.orders.map(o => o.id));
    const newIds = new Set(orders.map(o => o.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    const newOrders = orders.filter(o => !currentIds.has(o.id));
    const updatedOrders = orders.filter(o => currentIds.has(o.id));
    
    for (const id of deletedIds) {
      await supabase.from('orders').delete().eq('id', id);
    }
    
    for (const order of newOrders) {
      await supabase.from('orders').insert({
        id: order.id,
        user_id: user.id,
        order_number: order.orderNumber,
        vendor_id: order.vendorId,
        season_year: order.seasonYear,
        order_date: order.orderDate,
        delivery_window: order.deliveryWindow as any,
        line_items: order.lineItems as any,
        subtotal: order.subtotal,
        status: order.status,
        payment_status: order.paymentStatus,
        prepayment: order.prepayment as any,
        bid_event_id: order.bidEventId,
        notes: order.notes,
      });
    }
    
    for (const order of updatedOrders) {
      await supabase.from('orders').update({
        order_number: order.orderNumber,
        vendor_id: order.vendorId,
        season_year: order.seasonYear,
        order_date: order.orderDate,
        delivery_window: order.deliveryWindow as any,
        line_items: order.lineItems as any,
        subtotal: order.subtotal,
        status: order.status,
        payment_status: order.paymentStatus,
        prepayment: order.prepayment as any,
        bid_event_id: order.bidEventId,
        notes: order.notes,
      }).eq('id', order.id);
    }
    
    setState(prev => ({ ...prev, orders }));
  }, [user, state.orders]);

  // Add a single order
  const addOrder = useCallback(async (order: Order) => {
    if (!user) return;
    
    const { error } = await supabase.from('orders').insert({
      id: order.id,
      user_id: user.id,
      order_number: order.orderNumber,
      vendor_id: order.vendorId,
      season_year: order.seasonYear,
      order_date: order.orderDate,
      delivery_window: order.deliveryWindow as any,
      line_items: order.lineItems as any,
      subtotal: order.subtotal,
      status: order.status,
      payment_status: order.paymentStatus,
      prepayment: order.prepayment as any,
      bid_event_id: order.bidEventId,
      notes: order.notes,
    });
    
    if (error) {
      console.error('Error adding order:', error);
      return;
    }
    
    setState(prev => ({ ...prev, orders: [...prev.orders, order] }));
  }, [user]);

  // Update invoices
  const updateInvoices = useCallback(async (invoices: Invoice[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.invoices.map(i => i.id));
    const newIds = new Set(invoices.map(i => i.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    const newInvoices = invoices.filter(i => !currentIds.has(i.id));
    const updatedInvoices = invoices.filter(i => currentIds.has(i.id));
    
    for (const id of deletedIds) {
      await supabase.from('invoices').delete().eq('id', id);
    }
    
    for (const invoice of newInvoices) {
      await supabase.from('invoices').insert({
        id: invoice.id,
        user_id: user.id,
        invoice_number: invoice.invoiceNumber,
        vendor_id: invoice.vendorId,
        season_year: invoice.seasonYear,
        invoice_date: invoice.invoiceDate,
        received_date: invoice.receivedDate,
        order_id: invoice.orderId,
        line_items: invoice.lineItems as any,
        product_subtotal: invoice.productSubtotal,
        charges: invoice.charges as any,
        charges_total: invoice.chargesTotal,
        total_amount: invoice.totalAmount,
        status: invoice.status,
        payment_date: invoice.paymentDate,
        payment_method: invoice.paymentMethod,
        payment_reference: invoice.paymentReference,
        scale_tickets: invoice.scaleTickets,
        notes: invoice.notes,
      });
    }
    
    for (const invoice of updatedInvoices) {
      await supabase.from('invoices').update({
        invoice_number: invoice.invoiceNumber,
        vendor_id: invoice.vendorId,
        season_year: invoice.seasonYear,
        invoice_date: invoice.invoiceDate,
        received_date: invoice.receivedDate,
        order_id: invoice.orderId,
        line_items: invoice.lineItems as any,
        product_subtotal: invoice.productSubtotal,
        charges: invoice.charges as any,
        charges_total: invoice.chargesTotal,
        total_amount: invoice.totalAmount,
        status: invoice.status,
        payment_date: invoice.paymentDate,
        payment_method: invoice.paymentMethod,
        payment_reference: invoice.paymentReference,
        scale_tickets: invoice.scaleTickets,
        notes: invoice.notes,
      }).eq('id', invoice.id);
    }
    
    setState(prev => ({ ...prev, invoices }));
  }, [user, state.invoices]);

  // Add a single invoice
  const addInvoice = useCallback(async (invoice: Invoice) => {
    if (!user) return;
    
    const { error } = await supabase.from('invoices').insert({
      id: invoice.id,
      user_id: user.id,
      invoice_number: invoice.invoiceNumber,
      vendor_id: invoice.vendorId,
      season_year: invoice.seasonYear,
      invoice_date: invoice.invoiceDate,
      received_date: invoice.receivedDate,
      order_id: invoice.orderId,
      line_items: invoice.lineItems as any,
      product_subtotal: invoice.productSubtotal,
      charges: invoice.charges as any,
      charges_total: invoice.chargesTotal,
      total_amount: invoice.totalAmount,
      status: invoice.status,
      payment_date: invoice.paymentDate,
      payment_method: invoice.paymentMethod,
      payment_reference: invoice.paymentReference,
      scale_tickets: invoice.scaleTickets,
      notes: invoice.notes,
    });
    
    if (error) {
      console.error('Error adding invoice:', error);
      return;
    }
    
    setState(prev => ({ ...prev, invoices: [...prev.invoices, invoice] }));
  }, [user]);

  // =============================================
  // PRICE RECORDS CRUD (New simplified price tracking)
  // =============================================
  
  const addPriceRecord = useCallback(async (record: NewPriceRecord): Promise<PriceRecord | null> => {
    if (!user) return null;
    
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('price_records')
      .insert({
        id,
        user_id: user.id,
        product_id: record.productId,
        vendor_id: record.vendorId,
        price: record.price,
        unit: record.unit,
        normalized_price: record.normalizedPrice,
        package_type: record.packageType,
        package_size: record.packageSize,
        package_unit: record.packageUnit,
        quantity_purchased: record.quantityPurchased,
        date: record.date,
        season_year: record.seasonYear,
        type: record.type,
        purchase_id: record.purchaseId,
        notes: record.notes,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding price record:', error);
      toast.error('Failed to save price record');
      return null;
    }
    
    const newRecord: PriceRecord = {
      id: data.id,
      userId: data.user_id,
      productId: data.product_id,
      vendorId: data.vendor_id,
      price: Number(data.price),
      unit: data.unit as 'gal' | 'lbs' | 'ton',
      normalizedPrice: Number(data.normalized_price),
      packageType: data.package_type,
      packageSize: data.package_size ? Number(data.package_size) : undefined,
      packageUnit: data.package_unit as 'gal' | 'lbs' | undefined,
      quantityPurchased: data.quantity_purchased ? Number(data.quantity_purchased) : undefined,
      date: data.date,
      seasonYear: data.season_year,
      type: data.type as 'quote' | 'purchased',
      purchaseId: data.purchase_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
    setState(prev => ({ ...prev, priceRecords: [newRecord, ...prev.priceRecords] }));
    return newRecord;
  }, [user]);

  const updatePriceRecord = useCallback(async (id: string, updates: Partial<PriceRecord>): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('price_records')
      .update({
        product_id: updates.productId,
        vendor_id: updates.vendorId,
        price: updates.price,
        unit: updates.unit,
        normalized_price: updates.normalizedPrice,
        package_type: updates.packageType,
        package_size: updates.packageSize,
        package_unit: updates.packageUnit,
        quantity_purchased: updates.quantityPurchased,
        date: updates.date,
        season_year: updates.seasonYear,
        type: updates.type,
        purchase_id: updates.purchaseId,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating price record:', error);
      toast.error('Failed to update price record');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      priceRecords: prev.priceRecords.map(r => r.id === id ? { ...r, ...updates } : r),
    }));
    return true;
  }, [user]);

  const deletePriceRecord = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('price_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting price record:', error);
      toast.error('Failed to delete price record');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      priceRecords: prev.priceRecords.filter(r => r.id !== id),
    }));
    return true;
  }, [user]);

  // =============================================
  // FIELDS CRUD
  // =============================================
  
  const addField = useCallback(async (field: Field): Promise<Field | null> => {
    if (!user) return null;
    
    const { error } = await supabase.from('fields').insert({
      id: field.id,
      user_id: user.id,
      name: field.name,
      acres: field.acres,
      farm: field.farm,
      soil_type: field.soilType,
      ph: field.pH,
      organic_matter: field.organicMatter,
      cec: field.cec,
      notes: field.notes,
    });
    
    if (error) {
      console.error('Error adding field:', error);
      toast.error('Failed to save field');
      return null;
    }
    
    setState(prev => ({ ...prev, fields: [...prev.fields, field] }));
    return field;
  }, [user]);

  const updateField = useCallback(async (field: Field): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase.from('fields').update({
      name: field.name,
      acres: field.acres,
      farm: field.farm,
      soil_type: field.soilType,
      ph: field.pH,
      organic_matter: field.organicMatter,
      cec: field.cec,
      notes: field.notes,
    }).eq('id', field.id);
    
    if (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update field');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === field.id ? field : f),
    }));
    return true;
  }, [user]);

  const deleteField = useCallback(async (fieldId: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase.from('fields').delete().eq('id', fieldId);
    
    if (error) {
      console.error('Error deleting field:', error);
      toast.error('Failed to delete field');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
      fieldAssignments: prev.fieldAssignments.filter(fa => fa.fieldId !== fieldId),
    }));
    return true;
  }, [user]);

  const updateFields = useCallback(async (fields: Field[]) => {
    if (!user) return;
    
    const currentIds = new Set(state.fields.map(f => f.id));
    const newIds = new Set(fields.map(f => f.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    const newFields = fields.filter(f => !currentIds.has(f.id));
    const updatedFields = fields.filter(f => currentIds.has(f.id));
    
    for (const id of deletedIds) {
      await supabase.from('fields').delete().eq('id', id);
    }
    
    for (const field of newFields) {
      await supabase.from('fields').insert({
        id: field.id,
        user_id: user.id,
        name: field.name,
        acres: field.acres,
        farm: field.farm,
        soil_type: field.soilType,
        ph: field.pH,
        organic_matter: field.organicMatter,
        cec: field.cec,
        notes: field.notes,
      });
    }
    
    for (const field of updatedFields) {
      await supabase.from('fields').update({
        name: field.name,
        acres: field.acres,
        farm: field.farm,
        soil_type: field.soilType,
        ph: field.pH,
        organic_matter: field.organicMatter,
        cec: field.cec,
        notes: field.notes,
      }).eq('id', field.id);
    }
    
    setState(prev => ({ ...prev, fields }));
  }, [user, state.fields]);

  // =============================================
  // EQUIPMENT CRUD
  // =============================================
  
  const addEquipment = useCallback(async (equipment: Equipment): Promise<Equipment | null> => {
    if (!user) return null;
    
    const { error } = await supabase.from('equipment').insert({
      id: equipment.id,
      user_id: user.id,
      name: equipment.name,
      type: equipment.type,
      tank_size: equipment.tankSize,
      tank_unit: equipment.tankUnit,
      default_carrier_gpa: equipment.defaultCarrierGPA,
      notes: equipment.notes,
    });
    
    if (error) {
      console.error('Error adding equipment:', error);
      toast.error('Failed to save equipment');
      return null;
    }
    
    setState(prev => ({ ...prev, equipment: [...prev.equipment, equipment] }));
    return equipment;
  }, [user]);

  const updateEquipmentItem = useCallback(async (equipment: Equipment): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase.from('equipment').update({
      name: equipment.name,
      type: equipment.type,
      tank_size: equipment.tankSize,
      tank_unit: equipment.tankUnit,
      default_carrier_gpa: equipment.defaultCarrierGPA,
      notes: equipment.notes,
    }).eq('id', equipment.id);
    
    if (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.map(e => e.id === equipment.id ? equipment : e),
    }));
    return true;
  }, [user]);

  const deleteEquipment = useCallback(async (equipmentId: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase.from('equipment').delete().eq('id', equipmentId);
    
    if (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e.id !== equipmentId),
    }));
    return true;
  }, [user]);

  // =============================================
  // TANK MIX RECIPES CRUD
  // =============================================
  
  const addTankMixRecipe = useCallback(async (
    recipe: Omit<TankMixRecipe, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TankMixRecipe | null> => {
    if (!user) return null;
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const { error } = await supabase.from('tank_mix_recipes').insert({
      id,
      user_id: user.id,
      name: recipe.name,
      description: recipe.description,
      carrier_gpa: recipe.carrierGPA,
      products: recipe.products as any,
      notes: recipe.notes,
    });
    
    if (error) {
      console.error('Error adding tank mix recipe:', error);
      toast.error('Failed to save recipe');
      return null;
    }
    
    const newRecipe: TankMixRecipe = {
      ...recipe,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    setState(prev => ({ ...prev, tankMixRecipes: [...prev.tankMixRecipes, newRecipe] }));
    return newRecipe;
  }, [user]);

  const deleteTankMixRecipe = useCallback(async (recipeId: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase.from('tank_mix_recipes').delete().eq('id', recipeId);
    
    if (error) {
      console.error('Error deleting tank mix recipe:', error);
      toast.error('Failed to delete recipe');
      return false;
    }
    
    setState(prev => ({
      ...prev,
      tankMixRecipes: prev.tankMixRecipes.filter(r => r.id !== recipeId),
    }));
    return true;
  }, [user]);

  // =============================================
  // FIELD CROP OVERRIDES CRUD (Phase 4)
  // =============================================
  
  const updateFieldCropOverrides = useCallback(async (overrides: FieldCropOverride[]): Promise<boolean> => {
    if (!user) return false;
    
    // Get unique field assignment IDs from the overrides
    const assignmentIds = [...new Set(overrides.map(o => o.fieldAssignmentId))];
    
    // Delete existing overrides for these assignments
    for (const assignmentId of assignmentIds) {
      await supabase.from('field_crop_overrides').delete().eq('field_assignment_id', assignmentId);
    }
    
    // Insert new overrides
    for (const override of overrides) {
      const { error } = await supabase.from('field_crop_overrides').insert({
        id: override.id,
        user_id: user.id,
        field_assignment_id: override.fieldAssignmentId,
        application_id: override.applicationId,
        override_type: override.overrideType,
        rate_adjustment: override.rateAdjustment,
        custom_rate: override.customRate,
        custom_unit: override.customUnit,
        product_id: override.productId,
        notes: override.notes,
      });
      if (error) console.error('Error inserting override:', error);
    }
    
    return true;
  }, [user]);

  // Field Assignments update
  const updateFieldAssignments = useCallback(async (assignments: FieldAssignment[]): Promise<boolean> => {
    if (!user) return false;
    
    const currentIds = new Set(state.fieldAssignments.map(fa => fa.id));
    const newIds = new Set(assignments.map(fa => fa.id));
    
    const deletedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of deletedIds) {
      await supabase.from('field_assignments').delete().eq('id', id);
    }
    
    for (const fa of assignments) {
      const { error } = await supabase.from('field_assignments').upsert({
        id: fa.id,
        user_id: user.id,
        season_id: fa.seasonId,
        field_id: fa.fieldId,
        crop_id: fa.cropId,
        acres: fa.acres,
        planned_acres: fa.plannedAcres,
        yield_goal: fa.yieldGoal,
        yield_unit: fa.yieldUnit,
        actual_yield: fa.actualYield,
        previous_crop_id: fa.previousCropId,
        previous_crop_name: fa.previousCropName,
        notes: fa.notes,
      });
      if (error) console.error('Error upserting field assignment:', error);
    }
    
    setState(prev => ({ ...prev, fieldAssignments: assignments }));
    return true;
  }, [user, state.fieldAssignments]);

  // =============================================
  // APPLICATION RECORDS CRUD (Phase 5)
  // =============================================

  const addApplicationRecord = useCallback(async (record: Omit<ApplicationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApplicationRecord | null> => {
    if (!user) return null;

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabase.from('application_records').insert({
      id: newId,
      user_id: user.id,
      season_id: record.seasonId,
      crop_id: record.cropId,
      field_id: record.fieldId,
      timing_id: record.timingId,
      date_applied: record.dateApplied,
      acres_treated: record.acresTreated,
      products: record.products as any,
      equipment_id: record.equipmentId,
      carrier_gpa: record.carrierGPA,
      applicator: record.applicator,
      custom_applicator_name: record.customApplicatorName,
      weather_notes: record.weatherNotes,
      notes: record.notes,
      overridden_warnings: record.overriddenWarnings as any,
    }).select().single();

    if (error) {
      console.error('Error adding application record:', error);
      toast.error('Failed to save application record');
      return null;
    }

    const newRecord: ApplicationRecord = {
      id: data.id,
      seasonId: data.season_id,
      cropId: data.crop_id,
      fieldId: data.field_id,
      timingId: data.timing_id,
      dateApplied: data.date_applied,
      acresTreated: Number(data.acres_treated) || 0,
      products: (Array.isArray(data.products) ? data.products : []) as unknown as ApplicationProductRecord[],
      equipmentId: data.equipment_id,
      carrierGPA: data.carrier_gpa ? Number(data.carrier_gpa) : undefined,
      applicator: (data.applicator === 'custom' ? 'custom' : 'self') as 'self' | 'custom',
      customApplicatorName: data.custom_applicator_name,
      weatherNotes: data.weather_notes,
      notes: data.notes,
      overriddenWarnings: (Array.isArray(data.overridden_warnings) ? data.overridden_warnings : []) as unknown as import('@/types/applicationRecord').OverriddenWarning[],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setState(prev => ({
      ...prev,
      applicationRecords: [newRecord, ...prev.applicationRecords],
    }));

    return newRecord;
  }, [user]);

  const updateApplicationRecord = useCallback(async (record: ApplicationRecord): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase.from('application_records').update({
      season_id: record.seasonId,
      crop_id: record.cropId,
      field_id: record.fieldId,
      timing_id: record.timingId,
      date_applied: record.dateApplied,
      acres_treated: record.acresTreated,
      products: record.products as any,
      equipment_id: record.equipmentId,
      carrier_gpa: record.carrierGPA,
      applicator: record.applicator,
      custom_applicator_name: record.customApplicatorName,
      weather_notes: record.weatherNotes,
      notes: record.notes,
      overridden_warnings: record.overriddenWarnings as any,
    }).eq('id', record.id);

    if (error) {
      console.error('Error updating application record:', error);
      toast.error('Failed to update application record');
      return false;
    }

    setState(prev => ({
      ...prev,
      applicationRecords: prev.applicationRecords.map(r => r.id === record.id ? record : r),
    }));

    return true;
  }, [user]);

  const deleteApplicationRecord = useCallback(async (recordId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase.from('application_records').delete().eq('id', recordId);

    if (error) {
      console.error('Error deleting application record:', error);
      toast.error('Failed to delete application record');
      return false;
    }

    setState(prev => ({
      ...prev,
      applicationRecords: prev.applicationRecords.filter(r => r.id !== recordId),
    }));

    return true;
  }, [user]);

  // Add application record with inventory deduction
  const addApplicationWithInventoryDeduction = useCallback(async (
    record: Omit<ApplicationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApplicationRecord | null> => {
    if (!user) return null;

    // First, create the application record
    const appRecord = await addApplicationRecord(record);
    if (!appRecord) return null;

    // Then, create inventory transactions for each product
    const currentSeason = state.seasons.find(s => s.id === record.seasonId);
    const seasonYear = currentSeason?.year || new Date().getFullYear();

    for (const product of record.products) {
      // Create inventory transaction (negative = deduction)
      const { error } = await supabase.from('inventory_transactions').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        product_id: product.productId,
        type: 'application',
        quantity: -product.totalApplied, // Negative for deduction
        unit: product.totalUnit,
        reference_id: appRecord.id,
        reference_type: 'application_record',
        season_year: seasonYear,
        notes: `Applied to field (${record.acresTreated} ac)`,
      });

      if (error) {
        console.error('Error creating inventory transaction:', error);
      }

      // Update inventory balance
      const invItems = state.inventory.filter(i => i.productId === product.productId);
      if (invItems.length > 0) {
        const primaryInv = invItems[0];
        const newQty = Math.max(0, primaryInv.quantity - product.totalApplied);
        
        await supabase.from('inventory').update({
          quantity: newQty,
          updated_at: new Date().toISOString(),
        }).eq('id', primaryInv.id);
      }
    }

    // Refetch inventory to get updated balances
    const { data: invData } = await supabase.from('inventory').select('*');
    if (invData) {
      const inventory: InventoryItem[] = invData.map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        quantity: Number(row.quantity) || 0,
        unit: row.unit || 'gal',
        packagingName: row.packaging_name,
        packagingSize: row.packaging_size ? Number(row.packaging_size) : undefined,
        containerCount: row.container_count,
      }));
      setState(prev => ({ ...prev, inventory }));
    }

    return appRecord;
  }, [user, addApplicationRecord, state.seasons, state.inventory]);

  return {
    ...state,
    refetch: fetchData,
    setCurrentSeasonId,
    updateSeasons,
    updateVendors,
    updateProductMasters,
    addProductMaster,
    updateProductMaster,
    updateVendorOfferings,
    updateInventory,
    updateCommoditySpecs,
    updateBidEvents,
    updateVendorQuotes,
    updateAwards,
    updatePriceBook,
    updatePurchases,
    addPurchase,
    addInventoryTransaction,
    addPriceHistory,
    updateOrders,
    addOrder,
    updateInvoices,
    addInvoice,
    // New price records operations
    addPriceRecord,
    updatePriceRecord,
    deletePriceRecord,
    // New simple purchase operations
    addSimplePurchase,
    updateSimplePurchase,
    deleteSimplePurchase,
    // Fields operations
    addField,
    updateField,
    deleteField,
    updateFields,
    updateFieldAssignments,
    updateFieldCropOverrides,
    // Equipment operations
    addEquipment,
    updateEquipmentItem,
    deleteEquipment,
    // Tank mix recipes operations
    addTankMixRecipe,
    deleteTankMixRecipe,
    // Application records operations (Phase 5)
    addApplicationRecord,
    updateApplicationRecord,
    deleteApplicationRecord,
    addApplicationWithInventoryDeduction,
  };
}
