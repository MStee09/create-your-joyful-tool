/**
 * FarmCalc Order & Invoice System
 * ================================
 * 
 * LIFECYCLE:
 * 
 *   BID AWARD ──┐
 *               ├──▶ ORDER ──▶ INVOICE(S) ──▶ INVENTORY
 *   DIRECT ────┘         │          │
 *                        │          └── Each load = 1 invoice
 *                        │              Freight allocated per invoice
 *                        │
 *                        └── "On Order" (committed, not received)
 * 
 * 
 * KEY CONCEPTS:
 * 
 * 1. ORDER = Commitment to buy
 *    - Created from bid award or manually
 *    - Tracks what you've committed to purchase
 *    - Shows in "On Order" inventory status
 *    - Can be prepaid before delivery
 *    - May result in multiple invoices (loads)
 * 
 * 2. INVOICE = Actual delivery/load
 *    - One invoice per truck/delivery
 *    - Contains actual quantities (scale tickets)
 *    - Contains freight as single line item
 *    - Freight divided equally across products by weight
 *    - Creates inventory at LANDED COST
 * 
 * 3. LANDED COST = True cost per unit
 *    - (Product Cost + Allocated Freight) / Actual Quantity
 *    - This flows to Price Book
 *    - This is used for Plan vs Actual
 * 
 * 4. PACKAGE PRICING = Volume discounts
 *    - Same product, different price by package size
 *    - Jug > Drum > Tote > Bulk pricing
 *    - Helps identify savings opportunities
 */

// ============================================================================
// ORDERS
// ============================================================================

export type OrderStatus = 
  | 'draft'      // Still building, not committed
  | 'ordered'    // Committed to vendor
  | 'confirmed'  // Vendor confirmed
  | 'partial'    // Some invoices received
  | 'complete'   // All product received
  | 'cancelled'; // Cancelled

export type PaymentStatus = 
  | 'unpaid'     // Not yet paid
  | 'prepaid'    // Paid before delivery (early order program)
  | 'partial'    // Partial payment made
  | 'paid';      // Fully paid

export interface Order {
  id: string;
  orderNumber: string;           // Auto-generated: ORD-2026-001
  vendorId: string;
  seasonYear: number;
  
  // Dates
  orderDate: string;             // When committed
  createdAt: string;
  updatedAt: string;
  
  // Delivery expectations (flexible, not hard dates)
  deliveryWindow?: {
    month?: string;              // "March", "Early April"
    notes?: string;              // "Call when ready", "After ground thaws"
  };
  deliveryLocationId?: string;
  
  // Line items
  lineItems: OrderLineItem[];
  
  // Totals (product only, before freight)
  subtotal: number;
  
  // Status
  status: OrderStatus;
  
  // Payment
  paymentStatus: PaymentStatus;
  prepayment?: {
    amount: number;
    date: string;
    note?: string;               // "Early order 3% discount"
  };
  
  // Source tracking
  bidEventId?: string;           // If created from bid award
  bidAwardDate?: string;
  
  // Linked invoices
  invoiceIds: string[];          // Invoices received against this order
  
  notes?: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  commoditySpecId?: string;      // For commodity products
  
  // Quantities
  orderedQuantity: number;
  unit: string;
  
  // Pricing (from bid or quote)
  unitPrice: number;             // Product price only
  totalPrice: number;
  
  // Package info (for specialty products)
  packageType?: string;          // "2.5 gal jug", "275 gal tote"
  packageQuantity?: number;      // 8 jugs
  
  // Fulfillment tracking (calculated from invoices)
  receivedQuantity: number;      // Sum from all invoices
  remainingQuantity: number;     // ordered - received
  
  // Status
  status: 'pending' | 'partial' | 'complete';
}


// ============================================================================
// INVOICES
// ============================================================================

export type InvoiceStatus = 
  | 'draft'      // Entering data
  | 'received'   // Product received, invoice recorded
  | 'paid';      // Payment made

export interface Invoice {
  id: string;
  invoiceNumber: string;         // Vendor's invoice number
  vendorId: string;
  seasonYear: number;
  
  // Dates
  invoiceDate: string;           // Date on invoice
  receivedDate: string;          // When product arrived
  createdAt: string;
  
  // Links
  orderId?: string;              // Optional - can be standalone purchase
  deliveryLocationId?: string;
  
  // Products received
  lineItems: InvoiceLineItem[];
  productSubtotal: number;       // Sum of line item totals
  
  // Freight & charges (typically just one freight line)
  charges: InvoiceCharge[];
  chargesTotal: number;
  
  // Invoice total
  totalAmount: number;           // productSubtotal + chargesTotal
  
  // Payment
  status: InvoiceStatus;
  paymentDate?: string;
  paymentMethod?: string;        // "Check", "ACH", "Credit"
  paymentReference?: string;     // Check number, etc.
  
  // Documentation
  scaleTickets?: string[];       // List of scale ticket numbers
  attachmentUrls?: string[];     // Scanned invoice images
  
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  orderLineItemId?: string;      // Links to order line if from order
  
  // Actual delivery
  quantity: number;              // Actual quantity received
  unit: string;
  scaleTicket?: string;          // For bulk products
  
  // Product pricing
  unitPrice: number;             // Price per unit (product only)
  subtotal: number;              // quantity × unitPrice
  
  // Package info (for packaged goods)
  packageType?: string;
  packageQuantity?: number;
  
  // Landed cost (calculated after freight allocation)
  allocatedFreight: number;      // Share of invoice freight
  landedUnitCost: number;        // (subtotal + allocatedFreight) / quantity
  landedTotal: number;           // subtotal + allocatedFreight
}

export type ChargeType = 
  | 'freight'
  | 'fuel_surcharge'
  | 'handling'
  | 'delivery'
  | 'other';

export interface InvoiceCharge {
  id: string;
  type: ChargeType;
  description?: string;          // "Delivery from Morris"
  amount: number;
}


// ============================================================================
// FREIGHT ALLOCATION LOGIC
// ============================================================================

/**
 * Allocate freight charges across invoice line items by weight.
 * 
 * Example:
 *   Invoice has:
 *   - AMS: 15 tons
 *   - Urea: 12 tons
 *   - Freight: $500
 *   
 *   Total weight: 27 tons
 *   AMS allocation: $500 × (15/27) = $277.78
 *   Urea allocation: $500 × (12/27) = $222.22
 */
export function allocateFreight(
  lineItems: InvoiceLineItem[],
  totalCharges: number
): InvoiceLineItem[] {
  // Calculate total weight (normalize to common unit)
  const totalWeight = lineItems.reduce((sum, item) => {
    return sum + convertToBaseWeight(item.quantity, item.unit);
  }, 0);
  
  if (totalWeight === 0) return lineItems;
  
  return lineItems.map(item => {
    const itemWeight = convertToBaseWeight(item.quantity, item.unit);
    const weightRatio = itemWeight / totalWeight;
    const allocatedFreight = totalCharges * weightRatio;
    
    return {
      ...item,
      allocatedFreight,
      landedTotal: item.subtotal + allocatedFreight,
      landedUnitCost: (item.subtotal + allocatedFreight) / item.quantity,
    };
  });
}

/**
 * Convert quantity to base weight (lbs) for allocation.
 * Liquids converted using standard weights.
 */
function convertToBaseWeight(quantity: number, unit: string): number {
  const weightMap: Record<string, number> = {
    'ton': 2000,
    'tons': 2000,
    'lb': 1,
    'lbs': 1,
    'gal': 10,        // ~10 lbs/gal average for ag liquids
    'gallon': 10,
    'gallons': 10,
    'oz': 0.0625,
    'pt': 1,
    'qt': 2,
  };
  
  const multiplier = weightMap[unit.toLowerCase()] || 1;
  return quantity * multiplier;
}


// ============================================================================
// PACKAGE PRICING
// ============================================================================

/**
 * Products can have different prices based on package size.
 * This enables:
 * 1. Accurate costing based on how you actually buy
 * 2. Visibility into savings when moving to larger packages
 */

export interface PackagePriceTier {
  id: string;
  packageType: string;           // "2.5 gal jug", "275 gal tote", "Bulk"
  packageSize: number;           // 2.5, 275, 0 (for bulk)
  unit: string;                  // "gal"
  pricePerUnit: number;          // $48/gal for jugs
  minQuantity?: number;          // Minimum order for this tier
  isDefault?: boolean;           // Default selection
}

export interface ProductPricing {
  productId: string;
  seasonYear: number;
  
  // For specialty products: tiered by package
  packageTiers?: PackagePriceTier[];
  
  // For commodity products: single price (from bid/quote)
  commodityPrice?: {
    unitPrice: number;
    unit: string;
    source: 'bid' | 'quote' | 'list';
    effectiveDate: string;
  };
}

/**
 * Example package tiers for a specialty liquid product:
 * 
 * Humical (BW Fusion)
 * ├── 2.5 gal jug:   $48.00/gal  (min 1 jug)
 * ├── 30 gal drum:   $45.00/gal  (min 1 drum)
 * ├── 275 gal tote:  $42.00/gal  (min 1 tote)
 * └── Bulk tanker:   $38.00/gal  (min 500 gal)
 * 
 * If you need 300 gal:
 * - 120 jugs @ $48 = $14,400  ❌
 * - 10 drums @ $45 = $13,500
 * - 2 totes @ $42 = $12,600   ← Best value, slight overage
 */


// ============================================================================
// DELIVERY LOCATIONS
// ============================================================================

export interface DeliveryLocation {
  id: string;
  name: string;                  // "Home Farm", "North Bins"
  address?: string;
  directions?: string;           // "Turn left at the red barn"
  contactPhone?: string;
  isDefault: boolean;
  isActive: boolean;
}


// ============================================================================
// INVENTORY INTEGRATION
// ============================================================================

/**
 * When an invoice is saved:
 * 1. Create InventoryTransaction for each line item
 * 2. Use LANDED COST (not product price) for the transaction
 * 3. Update inventory on-hand quantities
 * 4. Create PriceHistory entry with landed cost
 */

export interface InventoryTransaction {
  id: string;
  productId: string;
  date: string;
  seasonYear: number;
  
  type: 'purchase' | 'adjustment' | 'application' | 'return' | 'carryover';
  
  quantity: number;              // Positive for additions
  unit: string;
  
  // Cost tracking (for purchases)
  unitCost?: number;             // LANDED cost per unit
  totalCost?: number;
  
  // Source reference
  invoiceId?: string;            // For purchases
  invoiceLineItemId?: string;
  orderId?: string;
  
  // For adjustments
  adjustmentReason?: string;
  
  notes?: string;
}


// ============================================================================
// PLAN READINESS (ENHANCED)
// ============================================================================

/**
 * Plan Readiness now shows three inventory states:
 * 
 * ON HAND:  Physically here, available to use
 * ON ORDER: Committed but not delivered
 * NEEDED:   Total plan requirement
 * 
 * Status logic:
 * - If OnHand >= Needed: ✓ Ready
 * - If OnHand + OnOrder >= Needed: ⏳ Covered (pending delivery)
 * - If OnHand + OnOrder < Needed: ⚠ Short X units
 */

export interface PlanReadinessItem {
  productId: string;
  productName: string;
  vendorName: string;
  unit: string;
  
  // Quantities
  planNeeded: number;            // From crop plans
  onHand: number;                // Current inventory
  onOrder: number;               // Sum of unfulfilled order quantities
  
  // Calculated
  totalAvailable: number;        // onHand + onOrder
  shortage: number;              // max(0, planNeeded - totalAvailable)
  
  // Status
  status: 'ready' | 'covered' | 'short' | 'not_ordered';
  
  // If on order, when expected
  expectedDelivery?: string;     // "March", "Apr 15"
  
  // Usage breakdown
  usedIn: {
    cropId: string;
    cropName: string;
    timingName: string;
    quantity: number;
  }[];
}


// ============================================================================
// ORDER SUMMARY / DASHBOARD
// ============================================================================

export interface OrderSummary {
  seasonYear: number;
  
  // Order counts
  totalOrders: number;
  pendingDelivery: number;
  partiallyReceived: number;
  complete: number;
  
  // Financial
  totalOrdered: number;          // Sum of all order values
  totalReceived: number;         // Sum of all invoice values
  totalPrepaid: number;          // Sum of prepayments
  totalOutstanding: number;      // Ordered but not invoiced
  
  // By vendor
  byVendor: {
    vendorId: string;
    vendorName: string;
    orderCount: number;
    totalValue: number;
    pendingValue: number;
  }[];
}


// ============================================================================
// PRICE BOOK (ENHANCED)
// ============================================================================

/**
 * Price Book now tracks LANDED costs, enabling true comparison.
 * 
 * Example entry:
 * {
 *   product: "AMS 21-0-0-24S",
 *   vendor: "Nutrien",
 *   date: "2026-03-15",
 *   productPrice: $415/ton,
 *   freightAllocated: $29/ton,
 *   landedCost: $444/ton,  ← This is the real cost
 *   source: "invoice",
 *   invoiceId: "inv-123"
 * }
 */

export interface PriceBookEntry {
  id: string;
  productId: string;
  commoditySpecId?: string;
  vendorId: string;
  seasonYear: number;
  date: string;
  
  // Pricing breakdown
  productUnitPrice: number;      // Price before freight
  freightPerUnit: number;        // Allocated freight
  landedUnitCost: number;        // Total landed cost
  
  unit: string;
  quantity: number;              // For context
  
  // Source
  source: 'invoice' | 'bid_award' | 'quote' | 'manual';
  invoiceId?: string;
  bidEventId?: string;
  
  // Package info (for specialty)
  packageType?: string;
  
  notes?: string;
}


// ============================================================================
// HELPER TYPES
// ============================================================================

export interface CreateOrderFromBidInput {
  bidEventId: string;
  awardedLineItems: {
    commoditySpecId: string;
    vendorId: string;
    quantity: number;
    unitPrice: number;
  }[];
  deliveryWindow?: {
    month?: string;
    notes?: string;
  };
  notes?: string;
}

export interface RecordInvoiceInput {
  invoiceNumber: string;
  vendorId: string;
  invoiceDate: string;
  receivedDate: string;
  orderId?: string;
  
  lineItems: {
    productId: string;
    orderLineItemId?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    scaleTicket?: string;
    packageType?: string;
    packageQuantity?: number;
  }[];
  
  charges: {
    type: ChargeType;
    description?: string;
    amount: number;
  }[];
  
  notes?: string;
}
