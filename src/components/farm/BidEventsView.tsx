import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  Package, 
  Clock,
  CheckCircle,
  Send,
  Lock,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import type { BidEvent, BidEventType, BidEventStatus, Vendor, CommoditySpec, ProductMaster } from '@/types';
import { generateId } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Breadcrumb } from './Breadcrumb';

interface BidEventsViewProps {
  bidEvents: BidEvent[];
  vendors: Vendor[];
  commoditySpecs: CommoditySpec[];
  productMasters: ProductMaster[];
  currentSeasonYear: number;
  onUpdateEvents: (events: BidEvent[]) => void;
  onSelectEvent: (eventId: string) => void;
  onBack?: () => void;
}

const STATUS_CONFIG: Record<BidEventStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  collecting: { label: 'Collecting Quotes', color: 'bg-amber-100 text-amber-700', icon: Clock },
  awarded: { label: 'Awarded', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  locked: { label: 'Locked', color: 'bg-purple-100 text-purple-700', icon: Lock },
};

const EVENT_TYPE_LABELS: Record<BidEventType, string> = {
  SPRING_DRY: 'Spring Dry Fertilizer',
  SPRING_CHEM: 'Spring Chemicals',
  FALL_DRY: 'Fall Dry Fertilizer',
  CUSTOM: 'Custom',
};

export const BidEventsView: React.FC<BidEventsViewProps> = ({
  bidEvents,
  vendors,
  commoditySpecs,
  productMasters,
  currentSeasonYear,
  onUpdateEvents,
  onSelectEvent,
  onBack,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<BidEventType>('SPRING_DRY');
  const [dueDate, setDueDate] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  
  const resetForm = () => {
    setEventName('');
    setEventType('SPRING_DRY');
    setDueDate('');
    setSelectedVendorIds([]);
  };
  
  const handleCreateEvent = () => {
    const name = eventName.trim() || `${currentSeasonYear} ${EVENT_TYPE_LABELS[eventType]}`;
    
    const newEvent: BidEvent = {
      id: generateId(),
      seasonYear: currentSeasonYear,
      eventType,
      name,
      status: 'draft',
      dueDate: dueDate || undefined,
      invitedVendorIds: selectedVendorIds,
      createdAt: new Date().toISOString(),
    };
    
    onUpdateEvents([...bidEvents, newEvent]);
    setShowCreateModal(false);
    resetForm();
    toast.success('Bid event created');
  };
  
  const toggleVendor = (vendorId: string) => {
    setSelectedVendorIds(prev => 
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };
  
  // Group events by status
  const eventsByStatus = useMemo(() => {
    const active = bidEvents.filter(e => ['draft', 'sent', 'collecting'].includes(e.status));
    const completed = bidEvents.filter(e => ['awarded', 'locked'].includes(e.status));
    return { active, completed };
  }, [bidEvents]);
  
  // Get bid-eligible products count
  const bidEligibleCount = productMasters.filter(p => p.isBidEligible).length;
  
  return (
    <div className="p-8">
      {/* Breadcrumb */}
      {onBack && (
        <Breadcrumb
          items={[
            { label: 'Procurement', onClick: onBack },
            { label: 'Bid Events' },
          ]}
        />
      )}
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-stone-500" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-bold text-stone-800">Bid Events</h2>
            <p className="text-stone-500 mt-1">
              Manage competitive bidding for {currentSeasonYear} commodities
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          New Bid Event
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{bidEvents.length}</p>
              <p className="text-xs text-stone-500">Total Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{eventsByStatus.active.length}</p>
              <p className="text-xs text-stone-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{eventsByStatus.completed.length}</p>
              <p className="text-xs text-stone-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{bidEligibleCount}</p>
              <p className="text-xs text-stone-500">Bid-Eligible Products</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Empty State */}
      {bidEvents.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No Bid Events</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Create a bid event to start collecting competitive quotes from vendors for your commodity needs.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Create First Bid Event
          </button>
        </div>
      )}
      
      {/* Active Events */}
      {eventsByStatus.active.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Active Events
          </h3>
          <div className="space-y-3">
            {eventsByStatus.active.map(event => {
              const statusConfig = STATUS_CONFIG[event.status];
              const StatusIcon = statusConfig.icon;
              const invitedVendors = vendors.filter(v => event.invitedVendorIds.includes(v.id));
              
              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className="w-full bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-stone-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-800 group-hover:text-emerald-700">
                          {event.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-stone-400">
                            {EVENT_TYPE_LABELS[event.eventType]}
                          </span>
                          {event.dueDate && (
                            <span className="text-xs text-stone-400">
                              Due: {new Date(event.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-stone-700">
                          {invitedVendors.length} vendors
                        </p>
                        <p className="text-xs text-stone-400">invited</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-600" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Completed Events */}
      {eventsByStatus.completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Completed Events
          </h3>
          <div className="space-y-3">
            {eventsByStatus.completed.map(event => {
              const statusConfig = STATUS_CONFIG[event.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className="w-full bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-stone-300 transition-all text-left group opacity-75 hover:opacity-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-stone-50 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-stone-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-stone-700">{event.name}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Bid Event</DialogTitle>
            <DialogDescription>
              Set up a new competitive bidding event for commodities
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as BidEventType)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Event Name <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder={`${currentSeasonYear} ${EVENT_TYPE_LABELS[eventType]}`}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Due Date <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Invite Vendors
              </label>
              {vendors.length === 0 ? (
                <p className="text-sm text-stone-500 italic">No vendors available</p>
              ) : (
                <div className="border border-stone-200 rounded-lg max-h-48 overflow-y-auto">
                  {vendors.map(vendor => (
                    <label
                      key={vendor.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.includes(vendor.id)}
                        onChange={() => toggleVendor(vendor.id)}
                        className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-stone-700">{vendor.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-stone-400 mt-1">
                {selectedVendorIds.length} vendor(s) selected
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEvent}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
            >
              Create Event
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
