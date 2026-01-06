import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft,
  Calendar, 
  Users, 
  Package, 
  Clock,
  CheckCircle,
  Send,
  Lock,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  DollarSign,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Phone,
  Mail,
  MoreHorizontal,
} from 'lucide-react';
import type { 
  BidEvent, 
  BidEventStatus, 
  Vendor, 
  CommoditySpec, 
  ProductMaster,
  VendorQuote,
  DemandRollup,
  Award,
  Season,
  PriceBookEntry,
  VendorInvitation,
  VendorInvitationStatus,
} from '@/types';
import { generateId, formatCurrency, formatNumber, downloadCSV } from '@/lib/calculations';
import { calculateDemandRollup, formatDemandQty, generateBidSheetCSV } from '@/lib/procurementCalculations';
import { decodeBidEventScope } from '@/lib/bidEventScope';
import { updatePriceBookFromAwards } from '@/lib/priceBookUtils';
import { buildDraftOrdersFromAwards } from '@/lib/ordersFromAwards';
import type { Order } from '@/types/orderInvoice';
import { Breadcrumb } from './Breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BidEventDetailViewProps {
  event: BidEvent;
  vendors: Vendor[];
  commoditySpecs: CommoditySpec[];
  productMasters: ProductMaster[];
  vendorQuotes: VendorQuote[];
  awards: Award[];
  priceBook: PriceBookEntry[];
  season: Season | null;
  // Phase 2.2: For generating orders from awards
  orders: Order[];
  onAddOrder: (order: Order) => Promise<void> | void;
  onNavigate: (viewId: string) => void;
  // Original props
  onUpdateEvent: (event: BidEvent) => void;
  onUpdateQuotes: (quotes: VendorQuote[]) => void;
  onUpdateAwards: (awards: Award[]) => void;
  onUpdatePriceBook: (priceBook: PriceBookEntry[]) => void;
  onBack: () => void;
}

const STATUS_CONFIG: Record<BidEventStatus, { label: string; color: string; nextStatus?: BidEventStatus; nextAction?: string }> = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600', nextStatus: 'sent', nextAction: 'Send to Vendors' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', nextStatus: 'collecting', nextAction: 'Start Collecting' },
  collecting: { label: 'Collecting Quotes', color: 'bg-amber-100 text-amber-700', nextStatus: 'awarded', nextAction: 'Finalize Awards' },
  awarded: { label: 'Awarded', color: 'bg-emerald-100 text-emerald-700', nextStatus: 'locked', nextAction: 'Lock Event' },
  locked: { label: 'Locked', color: 'bg-purple-100 text-purple-700' },
};

export const BidEventDetailView: React.FC<BidEventDetailViewProps> = ({
  event,
  vendors,
  commoditySpecs,
  productMasters,
  vendorQuotes,
  awards,
  priceBook,
  season,
  orders,
  onAddOrder,
  onNavigate,
  onUpdateEvent,
  onUpdateQuotes,
  onUpdateAwards,
  onUpdatePriceBook,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'awards'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<{ vendorId: string; specId: string } | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [showAwardModal, setShowAwardModal] = useState<string | null>(null); // specId
  const [editingInvitation, setEditingInvitation] = useState<string | null>(null); // vendorId
  const [invitationNotes, setInvitationNotes] = useState('');
  
  // Get invited vendors
  const invitedVendors = vendors.filter(v => event.invitedVendorIds.includes(v.id));
  
  // Get demand rollup for bid-eligible products
  const demandRollup = useMemo(() => {
    const all = calculateDemandRollup(season, productMasters, commoditySpecs);

    // If this bid event was created from Buy Workflow with a scope, filter to only included items
    const scope = decodeBidEventScope(event.notes);
    if (!scope) return all;

    const allowed = new Set(scope.includedRollupKeys);
    // rollupKey is specId if available; otherwise productId
    return all.filter(r => allowed.has(r.specId || r.productId));
  }, [season, productMasters, commoditySpecs, event.notes]);
  
  // Get quotes for this event
  const eventQuotes = vendorQuotes.filter(q => q.bidEventId === event.id);
  
  // Get awards for this event
  const eventAwards = awards.filter(a => a.bidEventId === event.id);
  
  // Build quote matrix data
  const quoteMatrix = useMemo(() => {
    return demandRollup.map(rollup => {
      const specQuotes = eventQuotes.filter(q => 
        q.specId === rollup.specId || (!rollup.specId && q.specId === rollup.productId)
      );
      const vendorPrices = invitedVendors.map(vendor => {
        const quote = specQuotes.find(q => q.vendorId === vendor.id);
        return { vendor, quote };
      });
      const lowestPrice = Math.min(...vendorPrices.filter(vp => vp.quote).map(vp => vp.quote!.price));
      const awarded = eventAwards.find(a => a.specId === (rollup.specId || rollup.productId));
      return { rollup, vendorPrices, lowestPrice, awarded };
    });
  }, [demandRollup, eventQuotes, invitedVendors, eventAwards]);
  
  const handleUpdateStatus = (newStatus: BidEventStatus) => {
    onUpdateEvent({ ...event, status: newStatus });
    toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
  };
  
  const handleInviteVendor = (vendorId: string) => {
    if (!event.invitedVendorIds.includes(vendorId)) {
      const newInvitation: VendorInvitation = {
        vendorId,
        status: 'pending',
      };
      onUpdateEvent({
        ...event,
        invitedVendorIds: [...event.invitedVendorIds, vendorId],
        vendorInvitations: [...(event.vendorInvitations || []), newInvitation],
      });
      toast.success('Vendor invited');
    }
  };

  const getVendorInvitation = (vendorId: string): VendorInvitation | undefined => {
    return event.vendorInvitations?.find(inv => inv.vendorId === vendorId);
  };

  const handleUpdateInvitationStatus = (vendorId: string, status: VendorInvitationStatus) => {
    const existingInvitations = event.vendorInvitations || [];
    const existingInv = existingInvitations.find(inv => inv.vendorId === vendorId);
    
    let updatedInvitations: VendorInvitation[];
    if (existingInv) {
      updatedInvitations = existingInvitations.map(inv => 
        inv.vendorId === vendorId 
          ? { 
              ...inv, 
              status,
              sentDate: status === 'sent' && !inv.sentDate ? new Date().toISOString() : inv.sentDate,
              responseDate: ['responded', 'declined'].includes(status) && !inv.responseDate 
                ? new Date().toISOString() 
                : inv.responseDate,
            }
          : inv
      );
    } else {
      updatedInvitations = [...existingInvitations, {
        vendorId,
        status,
        sentDate: status === 'sent' ? new Date().toISOString() : undefined,
        responseDate: ['responded', 'declined'].includes(status) ? new Date().toISOString() : undefined,
      }];
    }
    
    onUpdateEvent({
      ...event,
      vendorInvitations: updatedInvitations,
    });
    toast.success('Invitation status updated');
  };

  const handleUpdateInvitationNotes = (vendorId: string, notes: string) => {
    const existingInvitations = event.vendorInvitations || [];
    const existingInv = existingInvitations.find(inv => inv.vendorId === vendorId);
    
    let updatedInvitations: VendorInvitation[];
    if (existingInv) {
      updatedInvitations = existingInvitations.map(inv => 
        inv.vendorId === vendorId ? { ...inv, notes } : inv
      );
    } else {
      updatedInvitations = [...existingInvitations, {
        vendorId,
        status: 'pending' as VendorInvitationStatus,
        notes,
      }];
    }
    
    onUpdateEvent({
      ...event,
      vendorInvitations: updatedInvitations,
    });
    setEditingInvitation(null);
    setInvitationNotes('');
    toast.success('Notes saved');
  };
  
  const handleRemoveVendor = (vendorId: string) => {
    onUpdateEvent({
      ...event,
      invitedVendorIds: event.invitedVendorIds.filter(id => id !== vendorId),
      vendorInvitations: (event.vendorInvitations || []).filter(inv => inv.vendorId !== vendorId),
    });
    // Also remove their quotes
    onUpdateQuotes(vendorQuotes.filter(q => !(q.bidEventId === event.id && q.vendorId === vendorId)));
    toast.success('Vendor removed');
  };
  
  const handleSaveQuote = (vendorId: string, specId: string) => {
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    
    const existingQuote = eventQuotes.find(q => q.vendorId === vendorId && q.specId === specId);
    const rollup = demandRollup.find(r => (r.specId || r.productId) === specId);
    
    if (existingQuote) {
      onUpdateQuotes(vendorQuotes.map(q => 
        q.id === existingQuote.id ? { ...q, price } : q
      ));
    } else {
      const newQuote: VendorQuote = {
        id: generateId(),
        bidEventId: event.id,
        vendorId,
        specId,
        commoditySpecId: specId,
        price,
        priceUom: rollup?.uom || 'ton',
        isDeliveredIncluded: true,
      };
      onUpdateQuotes([...vendorQuotes, newQuote]);
    }
    
    setEditingQuote(null);
    setQuotePrice('');
    toast.success('Quote saved');
  };
  
  const handleAward = (specId: string, vendorId: string, price: number) => {
    const existingAward = eventAwards.find(a => a.specId === specId);
    
    let updatedAwards: Award[];
    if (existingAward) {
      updatedAwards = awards.map(a => 
        a.id === existingAward.id ? { ...a, vendorId, awardedPrice: price } : a
      );
    } else {
      const newAward: Award = {
        id: generateId(),
        bidEventId: event.id,
        specId,
        vendorId,
        vendorQuoteId: eventQuotes.find(q => q.vendorId === vendorId && q.specId === specId)?.id || '',
        quantity: demandRollup.find(r => r.specId === specId)?.plannedQty || 0,
        awardedPrice: price,
        effectiveDate: new Date().toISOString(),
      };
      updatedAwards = [...awards, newAward];
    }
    
    onUpdateAwards(updatedAwards);
    
    // Update price book with new award
    const updatedPriceBook = updatePriceBookFromAwards(
      updatedAwards.filter(a => a.bidEventId === event.id),
      commoditySpecs,
      productMasters,
      season?.year || new Date().getFullYear(),
      priceBook
    );
    onUpdatePriceBook(updatedPriceBook);
    
    setShowAwardModal(null);
    toast.success('Award saved & price book updated');
  };

  // Phase 2.2: Generate draft orders from awards
  const handleGenerateOrdersFromAwards = async () => {
    const eventAwards = awards.filter(a => a.bidEventId === event.id);

    if (eventAwards.length === 0) {
      toast.error('No awards found for this event. Award vendors first.');
      return;
    }

    const { orders: newOrders, warnings } = buildDraftOrdersFromAwards({
      bidEventId: event.id,
      seasonYear: event.seasonYear || season?.year || new Date().getFullYear(),
      awards: eventAwards,
      vendorQuotes,
      commoditySpecs,
      existingOrders: orders,
    });

    if (newOrders.length === 0) {
      toast.error('Could not generate orders. Check that awards have vendor, quantity, and price.');
      return;
    }

    // Create all orders
    for (const o of newOrders) {
      await onAddOrder(o);
    }

    if (warnings.length > 0) {
      console.warn('Order generation warnings:', warnings);
      toast.success(`Created ${newOrders.length} draft order(s), with ${warnings.length} warning(s) (check console).`);
    } else {
      toast.success(`Created ${newOrders.length} draft order(s) from awards.`);
    }

    // Auto-advance bid status to "awarded" if still collecting
    if (event.status === 'collecting') {
      onUpdateEvent({ ...event, status: 'awarded' });
    }

    // Navigate to Orders screen
    onNavigate('orders');
  };
  
  const handleExportBidSheet = () => {
    const csv = generateBidSheetCSV(demandRollup, event.seasonYear);
    downloadCSV(csv, `${event.name.replace(/\s+/g, '-')}-bid-sheet.csv`);
    toast.success('Bid sheet exported');
  };
  
  const statusConfig = STATUS_CONFIG[event.status];
  const uninvitedVendors = vendors.filter(v => !event.invitedVendorIds.includes(v.id));
  
  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Bid Events', onClick: onBack },
          { label: event.name },
        ]}
      />
      
      {/* Header */}
      <div className="mt-6 mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-stone-800">{event.name}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
            <span>{event.seasonYear}</span>
            {event.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Due: {new Date(event.dueDate).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {invitedVendors.length} vendors invited
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportBidSheet}
            className="flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50"
          >
            <Download className="w-4 h-4" />
            Export Bid Sheet
          </button>
          {statusConfig.nextStatus && (
            <button
              onClick={() => handleUpdateStatus(statusConfig.nextStatus!)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              {statusConfig.nextAction}
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {(['overview', 'quotes', 'awards'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Vendor Invitation Tracker */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Vendor Invitations</h3>
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Add Vendor
              </button>
            </div>
            
            {invitedVendors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No vendors invited yet</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Invite your first vendor
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {invitedVendors.map(vendor => {
                  const invitation = getVendorInvitation(vendor.id);
                  const status = invitation?.status || 'pending';
                  const isEditingNotes = editingInvitation === vendor.id;
                  
                  const statusColors: Record<VendorInvitationStatus, string> = {
                    pending: 'bg-stone-100 text-stone-600',
                    sent: 'bg-blue-100 text-blue-700',
                    responded: 'bg-emerald-100 text-emerald-700',
                    declined: 'bg-red-100 text-red-700',
                    no_response: 'bg-amber-100 text-amber-700',
                  };
                  
                  const statusLabels: Record<VendorInvitationStatus, string> = {
                    pending: 'Pending',
                    sent: 'Sent',
                    responded: 'Responded',
                    declined: 'Declined',
                    no_response: 'No Response',
                  };
                  
                  return (
                    <div 
                      key={vendor.id}
                      className="p-4 bg-stone-50 rounded-lg border border-stone-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-stone-800">{vendor.name}</span>
                            <select
                              value={status}
                              onChange={(e) => handleUpdateInvitationStatus(vendor.id, e.target.value as VendorInvitationStatus)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border-0 ${statusColors[status]}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="sent">Sent</option>
                              <option value="responded">Responded</option>
                              <option value="declined">Declined</option>
                              <option value="no_response">No Response</option>
                            </select>
                          </div>
                          
                          {/* Contact info */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                            {vendor.contactEmail && (
                              <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-1 hover:text-emerald-600">
                                <Mail className="w-3 h-3" />
                                {vendor.contactEmail}
                              </a>
                            )}
                            {vendor.contactPhone && (
                              <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-1 hover:text-emerald-600">
                                <Phone className="w-3 h-3" />
                                {vendor.contactPhone}
                              </a>
                            )}
                          </div>
                          
                          {/* Dates */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                            {invitation?.sentDate && (
                              <span>Sent: {new Date(invitation.sentDate).toLocaleDateString()}</span>
                            )}
                            {invitation?.responseDate && (
                              <span>Response: {new Date(invitation.responseDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          
                          {/* Notes */}
                          {isEditingNotes ? (
                            <div className="mt-3 flex gap-2">
                              <input
                                type="text"
                                value={invitationNotes}
                                onChange={(e) => setInvitationNotes(e.target.value)}
                                placeholder="Add notes about this vendor..."
                                className="flex-1 px-2 py-1 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateInvitationNotes(vendor.id, invitationNotes)}
                                className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingInvitation(null); setInvitationNotes(''); }}
                                className="px-2 py-1 text-stone-400 hover:bg-stone-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : invitation?.notes ? (
                            <button
                              onClick={() => { setEditingInvitation(vendor.id); setInvitationNotes(invitation.notes || ''); }}
                              className="mt-2 text-xs text-stone-500 italic hover:text-stone-700 text-left"
                            >
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {invitation.notes}
                            </button>
                          ) : (
                            <button
                              onClick={() => { setEditingInvitation(vendor.id); setInvitationNotes(''); }}
                              className="mt-2 text-xs text-stone-400 hover:text-stone-600"
                            >
                              + Add notes
                            </button>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleRemoveVendor(vendor.id)}
                          className="p-1 text-stone-400 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Summary stats */}
            {invitedVendors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-200 flex items-center gap-6 text-xs">
                <span className="text-stone-500">
                  <span className="font-medium text-stone-700">{invitedVendors.length}</span> invited
                </span>
                <span className="text-stone-500">
                  <span className="font-medium text-blue-600">
                    {(event.vendorInvitations || []).filter(inv => inv.status === 'sent').length}
                  </span> sent
                </span>
                <span className="text-stone-500">
                  <span className="font-medium text-emerald-600">
                    {(event.vendorInvitations || []).filter(inv => inv.status === 'responded').length}
                  </span> responded
                </span>
              </div>
            )}
          </div>
          
          {/* Demand Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <h3 className="font-semibold text-stone-800 mb-4">Demand Summary</h3>
            
            {demandRollup.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No bid-eligible products in crop plans</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      <th className="pb-3">Commodity</th>
                      <th className="pb-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {demandRollup.map(item => (
                      <tr key={item.specId || item.productId}>
                        <td className="py-2 font-medium text-stone-800 text-sm">{item.specName}</td>
                        <td className="py-2 text-right text-stone-600 text-sm">
                          {formatDemandQty(item.plannedQty, item.uom)} {item.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Quotes Tab - Quote Matrix */}
      {activeTab === 'quotes' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          {invitedVendors.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">Invite vendors first to collect quotes</p>
            </div>
          ) : demandRollup.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">No bid-eligible products to quote</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50 z-10">
                      Commodity
                    </th>
                    <th className="text-right px-4 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Qty
                    </th>
                    {invitedVendors.map(vendor => (
                      <th key={vendor.id} className="text-center px-4 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-[120px]">
                        {vendor.name}
                      </th>
                    ))}
                    <th className="text-center px-4 py-4 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Low
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {quoteMatrix.map(({ rollup, vendorPrices, lowestPrice, awarded }) => (
                    <tr key={rollup.specId || rollup.productId} className="hover:bg-stone-50">
                      <td className="px-6 py-4 sticky left-0 bg-white z-10">
                        <span className="font-medium text-stone-800">{rollup.specName}</span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-stone-600">
                        {formatDemandQty(rollup.plannedQty, rollup.uom)} {rollup.uom}
                      </td>
                      {vendorPrices.map(({ vendor, quote }) => {
                        const specId = rollup.specId || rollup.productId;
                        const isEditing = editingQuote?.vendorId === vendor.id && editingQuote?.specId === specId;
                        const isLowest = quote && quote.price === lowestPrice;
                        const isAwarded = awarded?.vendorId === vendor.id;
                        
                        return (
                          <td key={vendor.id} className="px-4 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-stone-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={quotePrice}
                                  onChange={(e) => setQuotePrice(e.target.value)}
                                  className="w-20 px-2 py-1 border border-stone-300 rounded text-sm text-center"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveQuote(vendor.id, specId)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingQuote(null); setQuotePrice(''); }}
                                  className="p-1 text-stone-400 hover:bg-stone-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : quote ? (
                              <button
                                onClick={() => {
                                  setEditingQuote({ vendorId: vendor.id, specId });
                                  setQuotePrice(String(quote.price));
                                }}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  isAwarded
                                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                                    : isLowest
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                ${formatNumber(quote.price, 2)}
                                {isAwarded && <CheckCircle className="inline w-3 h-3 ml-1" />}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingQuote({ vendorId: vendor.id, specId });
                                  setQuotePrice('');
                                }}
                                className="px-3 py-1 text-stone-400 hover:text-stone-600 text-sm"
                              >
                                + Add
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center">
                        {isFinite(lowestPrice) ? (
                          <span className="font-semibold text-emerald-600">
                            ${formatNumber(lowestPrice, 2)}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Awards Tab */}
      {activeTab === 'awards' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Award Summary</h3>
            {eventAwards.length > 0 && (
              <button
                onClick={handleGenerateOrdersFromAwards}
                className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Generate Draft Orders from Awards
              </button>
            )}
          </div>
          
          {demandRollup.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No commodities to award</p>
          ) : (
            <div className="space-y-3">
              {quoteMatrix.map(({ rollup, vendorPrices, lowestPrice, awarded }) => {
                const specId = rollup.specId || rollup.productId;
                const awardedVendor = awarded ? vendors.find(v => v.id === awarded.vendorId) : null;
                const quotesExist = vendorPrices.some(vp => vp.quote);
                
                return (
                  <div 
                    key={specId}
                    className={`p-4 rounded-lg border ${
                      awarded ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-stone-800">{rollup.specName}</h4>
                        <p className="text-sm text-stone-500">
                          {formatDemandQty(rollup.plannedQty, rollup.uom)} {rollup.uom}
                        </p>
                      </div>
                      
                      {awarded ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-emerald-700">
                              {awardedVendor?.name}
                            </p>
                            <p className="text-lg font-bold text-emerald-600">
                              ${formatNumber(awarded.awardedPrice, 2)}/{rollup.uom}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowAwardModal(specId)}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-white rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : quotesExist ? (
                        <button
                          onClick={() => setShowAwardModal(specId)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          Award
                        </button>
                      ) : (
                        <span className="text-sm text-stone-400 italic">No quotes yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Invite Vendor Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Invite Vendor</DialogTitle>
            <DialogDescription>Select vendors to invite to this bid event</DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 max-h-64 overflow-y-auto">
            {uninvitedVendors.length === 0 ? (
              <p className="text-center text-stone-500 py-4">All vendors already invited</p>
            ) : (
              <div className="space-y-2">
                {uninvitedVendors.map(vendor => (
                  <button
                    key={vendor.id}
                    onClick={() => {
                      handleInviteVendor(vendor.id);
                      setShowInviteModal(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-left"
                  >
                    <Users className="w-5 h-5 text-stone-400" />
                    <span className="font-medium text-stone-700">{vendor.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Award Modal */}
      <Dialog open={!!showAwardModal} onOpenChange={() => setShowAwardModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Award Contract</DialogTitle>
            <DialogDescription>Select the winning vendor for this commodity</DialogDescription>
          </DialogHeader>
          
          {showAwardModal && (() => {
            const matrixItem = quoteMatrix.find(m => (m.rollup.specId || m.rollup.productId) === showAwardModal);
            if (!matrixItem) return null;
            
            const quotedVendors = matrixItem.vendorPrices.filter(vp => vp.quote);
            
            return (
              <div className="mt-4">
                <h4 className="font-medium text-stone-800 mb-3">{matrixItem.rollup.specName}</h4>
                <div className="space-y-2">
                  {quotedVendors.map(({ vendor, quote }) => {
                    const isLowest = quote!.price === matrixItem.lowestPrice;
                    return (
                      <button
                        key={vendor.id}
                        onClick={() => handleAward(showAwardModal, vendor.id, quote!.price)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          isLowest
                            ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className={`w-5 h-5 ${isLowest ? 'text-emerald-600' : 'text-stone-400'}`} />
                          <span className="font-medium text-stone-700">{vendor.name}</span>
                          {isLowest && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Lowest
                            </span>
                          )}
                        </div>
                        <span className={`text-lg font-bold ${isLowest ? 'text-emerald-600' : 'text-stone-700'}`}>
                          ${formatNumber(quote!.price, 2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
