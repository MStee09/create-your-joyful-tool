import React, { useState, useMemo } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Star,
  ExternalLink,
  FileText,
  Upload,
  User,
  Droplets,
  Weight,
  ChevronRight,
} from 'lucide-react';
import type { 
  Vendor, 
  VendorContact, 
  VendorDocument, 
  VendorTag,
  ProductMaster, 
  VendorOffering, 
  InventoryItem 
} from '@/types';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { generateId, formatCurrency, formatNumber, CATEGORY_LABELS } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';

interface VendorDetailViewProps {
  vendor: Vendor;
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  inventory: InventoryItem[];
  onUpdateVendor: (vendor: Vendor) => void;
  onNavigateToProduct: (productId: string) => void;
  onBack: () => void;
}

const TAG_LABELS: Record<VendorTag, string> = {
  'primary-biological': 'Primary Biological',
  'primary-fertility': 'Primary Fertility',
  'primary-crop-protection': 'Primary Crop Protection',
  'specialty': 'Specialty',
  'local': 'Local',
  'national': 'National',
};

export const VendorDetailView: React.FC<VendorDetailViewProps> = ({
  vendor,
  productMasters,
  vendorOfferings,
  inventory,
  onUpdateVendor,
  onNavigateToProduct,
  onBack,
}) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editName, setEditName] = useState(vendor.name);
  const [editWebsite, setEditWebsite] = useState(vendor.website || '');
  const [editEmail, setEditEmail] = useState(vendor.contactEmail || '');
  const [editPhone, setEditPhone] = useState(vendor.contactPhone || '');
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  
  const [editingNotes, setEditingNotes] = useState(false);
  const [generalNotes, setGeneralNotes] = useState(vendor.generalNotes || '');
  const [freightNotes, setFreightNotes] = useState(vendor.freightNotes || '');

  // Get offerings for this vendor
  const vendorOfferingsFiltered = useMemo(() => {
    return vendorOfferings.filter(o => o.vendorId === vendor.id);
  }, [vendorOfferings, vendor.id]);

  // Get products with their offerings
  const productsWithOfferings = useMemo(() => {
    return vendorOfferingsFiltered.map(offering => {
      const product = productMasters.find(p => p.id === offering.productId);
      if (!product) return null;
      
      const productInventory = inventory.filter(i => i.productId === product.id);
      const totalOnHand = productInventory.reduce((sum, i) => sum + i.quantity, 0);
      const unit = product.form === 'liquid' ? 'gal' : 'lbs';
      
      // Calculate cost per lb
      let costPerLb: number | null = null;
      if (offering.priceUnit === 'lbs') {
        costPerLb = offering.price;
      } else if (offering.priceUnit === 'gal' && product.densityLbsPerGal) {
        costPerLb = offering.price / product.densityLbsPerGal;
      }
      
      return {
        product,
        offering,
        totalOnHand,
        unit,
        costPerLb,
      };
    }).filter(Boolean);
  }, [vendorOfferingsFiltered, productMasters, inventory]);

  // Summary stats
  const stats = useMemo(() => {
    const preferredCount = vendorOfferingsFiltered.filter(o => o.isPreferred).length;
    const categories = [...new Set(productsWithOfferings.map(p => p?.product.category))];
    return {
      productCount: vendorOfferingsFiltered.length,
      preferredCount,
      categories,
    };
  }, [vendorOfferingsFiltered, productsWithOfferings]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Vendors', onClick: onBack },
    { label: vendor.name },
  ];

  const handleSaveHeader = () => {
    onUpdateVendor({
      ...vendor,
      name: editName.trim() || vendor.name,
      website: editWebsite.trim() || undefined,
      contactEmail: editEmail.trim() || undefined,
      contactPhone: editPhone.trim() || undefined,
    });
    setIsEditingHeader(false);
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    const contact: VendorContact = {
      id: generateId(),
      name: newContactName.trim(),
      role: newContactRole.trim() || undefined,
      phone: newContactPhone.trim() || undefined,
      email: newContactEmail.trim() || undefined,
    };
    onUpdateVendor({
      ...vendor,
      contacts: [...(vendor.contacts || []), contact],
    });
    setShowAddContact(false);
    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    setNewContactEmail('');
  };

  const handleDeleteContact = (contactId: string) => {
    onUpdateVendor({
      ...vendor,
      contacts: (vendor.contacts || []).filter(c => c.id !== contactId),
    });
  };

  const handleToggleTag = (tag: VendorTag) => {
    const currentTags = vendor.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onUpdateVendor({ ...vendor, tags: newTags });
  };

  const handleSaveNotes = () => {
    onUpdateVendor({
      ...vendor,
      generalNotes: generalNotes.trim() || undefined,
      freightNotes: freightNotes.trim() || undefined,
    });
    setEditingNotes(false);
  };

  return (
    <div className="p-8 max-w-7xl">
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              {isEditingHeader ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-b border-primary focus:outline-none"
                />
              ) : (
                <h1 className="text-2xl font-bold text-foreground">{vendor.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(vendor.tags || []).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {TAG_LABELS[tag]}
                  </Badge>
                ))}
                {stats.categories.slice(0, 3).map(cat => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingHeader ? (
              <>
                <button
                  onClick={() => setIsEditingHeader(false)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveHeader}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <Save className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingHeader(true)}
                className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Contact info row */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border flex-wrap">
          {isEditingHeader ? (
            <>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="Website URL"
                  className="px-2 py-1 border border-input rounded bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email"
                  className="px-2 py-1 border border-input rounded bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone"
                  className="px-2 py-1 border border-input rounded bg-background text-sm"
                />
              </div>
            </>
          ) : (
            <>
              {vendor.website && (
                <a
                  href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {vendor.contactEmail && (
                <a
                  href={`mailto:${vendor.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="w-4 h-4" />
                  {vendor.contactEmail}
                </a>
              )}
              {vendor.contactPhone && (
                <a
                  href={`tel:${vendor.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="w-4 h-4" />
                  {vendor.contactPhone}
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Products Table */}
        <div className="col-span-2 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="text-2xl font-bold text-foreground">{stats.productCount}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Preferred For</p>
              <p className="text-2xl font-bold text-primary">{stats.preferredCount}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold text-foreground">{stats.categories.length}</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Products from this Vendor</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Form</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">lbs/gal</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">$/lb</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Preferred</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">On Hand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productsWithOfferings.map((item) => {
                    if (!item) return null;
                    const { product, offering, totalOnHand, unit, costPerLb } = item;
                    return (
                      <tr
                        key={offering.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => onNavigateToProduct(product.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{product.name}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {CATEGORY_LABELS[product.category] || product.category}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.form === 'liquid' ? (
                            <Droplets className="w-4 h-4 text-blue-500 mx-auto" />
                          ) : (
                            <Weight className="w-4 h-4 text-amber-600 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatCurrency(offering.price)}/{offering.priceUnit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {product.densityLbsPerGal ? formatNumber(product.densityLbsPerGal, 2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-primary">
                          {costPerLb ? formatCurrency(costPerLb) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {offering.isPreferred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mx-auto" />}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {totalOnHand > 0 ? `${formatNumber(totalOnHand, 1)} ${unit}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {productsWithOfferings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No products from this vendor yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Contacts, Tags, Notes */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h4 className="font-semibold text-foreground mb-3">Vendor Tags</h4>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TAG_LABELS) as [VendorTag, string][]).map(([tag, label]) => {
                const isActive = (vendor.tags || []).includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">Contacts</h4>
              <button
                onClick={() => setShowAddContact(true)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddContact && (
              <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                />
                <input
                  type="text"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  placeholder="Role (sales rep, agronomist...)"
                  className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                />
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddContact(false)}
                    className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContact}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(vendor.contacts || []).map(contact => (
                <div key={contact.id} className="flex items-start justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{contact.name}</p>
                      {contact.role && (
                        <p className="text-xs text-muted-foreground">{contact.role}</p>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline block">
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline block">
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!vendor.contacts || vendor.contacts.length === 0) && !showAddContact && (
                <p className="text-sm text-muted-foreground text-center py-2">No contacts added</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">Notes</h4>
              {editingNotes ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="p-1 text-muted-foreground hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="p-1 text-primary hover:bg-muted rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    General Notes
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1 text-sm border border-input rounded bg-background resize-none"
                    placeholder="Strengths, weaknesses, service quality..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Freight & Pricing Notes
                  </label>
                  <textarea
                    value={freightNotes}
                    onChange={(e) => setFreightNotes(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-input rounded bg-background resize-none"
                    placeholder="Freight terms, seasonal pricing..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {vendor.generalNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">General</p>
                    <p className="text-foreground whitespace-pre-wrap">{vendor.generalNotes}</p>
                  </div>
                )}
                {vendor.freightNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Freight & Pricing</p>
                    <p className="text-foreground whitespace-pre-wrap">{vendor.freightNotes}</p>
                  </div>
                )}
                {!vendor.generalNotes && !vendor.freightNotes && (
                  <p className="text-muted-foreground text-center py-2">No notes added</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
