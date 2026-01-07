// ============================================================================
// Decision Assistant - Deterministic answers from app state + optional LLM hook
// ============================================================================

import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { buildAlerts } from '@/lib/alertsEngine';
import { calculatePlannedUsage } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage } from '@/lib/readinessEngine';

export type AssistantIntent =
  | 'BUY_LIST'
  | 'SHORTFALLS'
  | 'OVERDUE_ORDERS'
  | 'VARIANCE_SUMMARY'
  | 'INVENTORY_STATUS'
  | 'ORDER_STATUS'
  | 'UNKNOWN';

export type AssistantAnswer = {
  intent: AssistantIntent;
  answer: string;
  bullets?: string[];
  nextActions?: Array<{ label: string; view: string }>;
  notes?: string[];
};

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export function classifyIntent(q: string): AssistantIntent {
  const s = (q || '').toLowerCase();
  if (s.includes('buy') || s.includes('purchase') || s.includes('order list') || s.includes('what do i need to buy') || s.includes('shopping')) return 'BUY_LIST';
  if (s.includes('short') || s.includes('missing') || s.includes('blocking') || s.includes('ready') || s.includes('readiness')) return 'SHORTFALLS';
  if (s.includes('overdue') || s.includes('late') || s.includes('where is my order') || s.includes('delayed')) return 'OVERDUE_ORDERS';
  if (s.includes('variance') || s.includes('over plan') || s.includes('over budget') || s.includes('actual vs') || s.includes('planned vs')) return 'VARIANCE_SUMMARY';
  if (s.includes('inventory') || s.includes('on hand') || s.includes('stock') || s.includes('have in')) return 'INVENTORY_STATUS';
  if (s.includes('order status') || s.includes('orders') || s.includes('pending') || s.includes('open order')) return 'ORDER_STATUS';
  return 'UNKNOWN';
}

export function answerDeterministically(opts: {
  question: string;
  season: Season | null;
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
}): AssistantAnswer {
  const { question, season, products, inventory, orders, invoices, priceBook } = opts;
  const intent = classifyIntent(question);

  // common computed facts
  const plannedUsage = calculatePlannedUsage(season, products);
  const plannedForEngine: PlannedUsage[] = (plannedUsage || []).map((u: any) => {
    const p = products.find(x => x.id === u.productId);
    return {
      id: u.productId,
      label: p?.name || 'Unknown product',
      productId: u.productId,
      requiredQty: toNum(u.totalNeeded),
      plannedUnit: u.unit,
      crop: u.usages?.[0]?.cropName,
      passName: u.usages?.[0]?.timingName,
    };
  });

  const readiness = computeReadiness({
    planned: plannedForEngine,
    inventory,
    orders,
    inventoryAccessors: {
      getProductId: (row: any) => row.productId,
      getQty: (row: any) => row.quantity,
      getContainerCount: (row: any) => row.containerCount,
    },
    orderAccessors: {
      orders,
      getOrderId: (o: any) => o.id,
      getOrderStatus: (o: any) => o.status,
      getVendorName: () => undefined,
      getLines: (o: any) => o.lineItems || [],
      getLineProductId: (l: any) => l.productId,
      getLineRemainingQty: (l: any) => l.remainingQuantity ?? (toNum(l.orderedQuantity) - toNum(l.receivedQuantity)),
      getLineUnit: (l: any) => l.unit,
    },
  });

  const alerts = buildAlerts({ season, products, inventory, orders, invoices, priceBook });

  // Intent handlers
  if (intent === 'SHORTFALLS') {
    const blocking = readiness.items.filter(i => i.status === 'BLOCKING' && i.shortQty > 0);
    const onOrder = readiness.items.filter(i => i.status === 'ON_ORDER');
    const ready = readiness.items.filter(i => i.status === 'READY');

    return {
      intent,
      answer: blocking.length
        ? `You have ${blocking.length} blocking shortfall(s), ${onOrder.length} item(s) on order, and ${ready.length} item(s) ready.`
        : `No blocking shortfalls! ${onOrder.length} item(s) on order, ${ready.length} item(s) ready.`,
      bullets: blocking.slice(0, 8).map(b => `${b.label}: short ${Math.round(b.shortQty)} ${b.plannedUnit}`),
      nextActions: [{ label: 'Open Plan Readiness', view: 'plan-readiness' }],
    };
  }

  if (intent === 'OVERDUE_ORDERS') {
    const overdue = alerts.find(a => a.type === 'ORDER_OVERDUE');
    return {
      intent,
      answer: overdue ? overdue.title : 'No overdue orders detected.',
      bullets: overdue?.detail ? [overdue.detail] : [],
      nextActions: [{ label: 'Open Orders', view: 'orders' }],
    };
  }

  if (intent === 'BUY_LIST') {
    const buy = readiness.items.filter(i => i.shortQty > 0);
    const top = buy.slice(0, 10);
    return {
      intent,
      answer: buy.length
        ? `Buy list contains ${buy.length} item(s) with a shortfall.`
        : `No buy list items detected (no shortfalls).`,
      bullets: top.map(x => `${x.label}: buy ~${Math.round(x.shortQty)} ${x.plannedUnit}`),
      nextActions: [{ label: 'Open Buy Workflow', view: 'buy-workflow' }],
      notes: ['Computed from plan demand vs on-hand + on-order.'],
    };
  }

  if (intent === 'VARIANCE_SUMMARY') {
    const varianceAlert = alerts.find(a => a.type === 'PRICE_SPIKE');
    const missingPrice = alerts.find(a => a.type === 'MISSING_PLANNED_PRICE');
    const details: string[] = [];
    if (varianceAlert) details.push(varianceAlert.title);
    if (missingPrice) details.push(missingPrice.title);

    return {
      intent,
      answer: details.length
        ? `Variance issues detected: ${details.join('; ')}`
        : 'No major variance issues detected.',
      bullets: details,
      nextActions: [{ label: 'Open Variance', view: 'variance' }],
    };
  }

  if (intent === 'INVENTORY_STATUS') {
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((sum, i) => sum + toNum(i.quantity), 0);
    const uniqueProducts = new Set(inventory.map(i => i.productId)).size;

    return {
      intent,
      answer: `Inventory: ${totalItems} row(s), ${uniqueProducts} unique product(s), total quantity ${Math.round(totalQty).toLocaleString()}.`,
      bullets: inventory.slice(0, 5).map(i => {
        const p = products.find(pr => pr.id === i.productId);
        return `${p?.name || 'Unknown'}: ${Math.round(i.quantity)} ${i.unit}`;
      }),
      nextActions: [{ label: 'Open Inventory', view: 'inventory' }],
    };
  }

  if (intent === 'ORDER_STATUS') {
    const openOrders = (orders || []).filter(o => 
      ['draft', 'ordered', 'confirmed', 'partial'].includes(String(o.status || 'draft'))
    );
    const completeOrders = (orders || []).filter(o => o.status === 'complete');

    return {
      intent,
      answer: `Orders: ${openOrders.length} open, ${completeOrders.length} complete.`,
      bullets: openOrders.slice(0, 5).map(o => `${o.orderNumber || o.id}: ${o.status}`),
      nextActions: [{ label: 'Open Orders', view: 'orders' }],
    };
  }

  return {
    intent: 'UNKNOWN',
    answer: `I can answer questions about:\n• Buy list / what to purchase\n• Shortfalls / blocking items\n• Overdue orders\n• Variance / budget\n• Inventory status\n• Order status\n\nTry asking: "What do I need to buy?" or "Do I have any blocking shortfalls?"`,
    nextActions: [
      { label: 'Open Alerts', view: 'alerts' },
      { label: 'Open Buy Workflow', view: 'buy-workflow' },
    ],
  };
}

// Optional LLM hook — wire to your own endpoint later
export async function callAssistantApi(question: string, context: any) {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  });

  if (!res.ok) throw new Error(`Assistant API failed (${res.status})`);
  return res.json();
}
