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
import { Button } from '@/components/ui/button';
import { AddProductToVendorModal } from './AddProductToVendorModal';

interface VendorDetailViewProps {
  vendor: Vendor;
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  inventory: InventoryItem[];
  onUpdateVendor: (vendor: Vendor) => void;
  onNavigateToProduct: (productId: string) => void;
  onBack: () => void;
  onAddProduct?: (product: ProductMaster) => void;
  onAddVendorOffering?: (offering: VendorOffering) => void;
  onUpdateOfferings?: (offerings: VendorOffering[]) => void;
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
  onAddProduct,
  onAddVendorOffering,
  onUpdateOfferings,
}) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
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
  
  // Contact editing state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<VendorContact | null>(null);
  
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

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, typeof productsWithOfferings> = {};
    
    productsWithOfferings.forEach(item => {
      if (!item) return;
      const category = CATEGORY_LABELS[item.product.category as keyof typeof CATEGORY_LABELS] || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    
    // Sort categories alphabetically, but put "Other" last
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    
    return { grouped, sortedCategories };
  }, [productsWithOfferings]);

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

  const handleStartEditContact = (contact: VendorContact) => {
    setEditingContactId(contact.id);
    setEditContact({ ...contact });
  };

  const handleSaveContact = () => {
    if (!editContact) return;
    onUpdateVendor({
      ...vendor,
      contacts: (vendor.contacts || []).map(c => 
        c.id === editContact.id ? editContact : c
      ),
    });
    setEditingContactId(null);
    setEditContact(null);
  };

  const handleCancelEditContact = () => {
    setEditingContactId(null);
    setEditContact(null);
  };

  // Document handlers
  const handleUploadDocument = (type: VendorDocument['type'], file: File) => {
    if (file.type !== 'application/pdf') {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const doc: VendorDocument = {
        id: generateId(),
        name: file.name,
        type,
        data: base64,
        fileName: file.name,
      };
      onUpdateVendor({
        ...vendor,
        documents: [...(vendor.documents || []), doc],
      });
    };
    reader.readAsDataURL(file);
  };

  const handleViewDocument = (data: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe src="${data}" style="width:100%;height:100%;border:none;"></iframe>`);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    onUpdateVendor({
      ...vendor,
      documents: (vendor.documents || []).filter(d => d.id !== docId),
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

          {/* Products by Category */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Products from this Vendor</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.productCount} products • {stats.preferredCount} preferred
                </p>
              </div>
              {onAddProduct && onAddVendorOffering && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddProduct(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              )}
            </div>
            
            <div className="p-4 space-y-6">
              {productsByCategory.sortedCategories.map(category => {
                const items = productsByCategory.grouped[category];
                return (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {category} ({items.length})
                    </h4>
                    <div className="bg-muted/30 rounded-lg border border-border divide-y divide-border">
                      {items.map(item => {
                        if (!item) return null;
                        const { product, offering, totalOnHand, unit, costPerLb } = item;
                        return (
                          <div
                            key={offering.id}
                            onClick={() => onNavigateToProduct(product.id)}
                            className="px-4 py-3 flex items-center gap-4 hover:bg-muted/50 cursor-pointer"
                          >
                            {/* Preferred star */}
                            <div className="w-5 flex-shrink-0">
                              {offering.isPreferred && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            
                            {/* Product name */}
                            <span className="font-medium text-foreground flex-1 min-w-0 truncate">
                              {product.name}
                            </span>
                            
                            {/* Form icon */}
                            {product.form === 'liquid' ? (
                              <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Weight className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            )}
                            
                            {/* Price */}
                            <span className="text-sm text-muted-foreground w-24 text-right flex-shrink-0">
                              {formatCurrency(offering.price)}/{offering.priceUnit}
                            </span>
                            
                            {/* Cost per lb */}
                            <span className="text-sm font-medium text-primary w-20 text-right flex-shrink-0">
                              {costPerLb ? `${formatCurrency(costPerLb)}/lb` : '—'}
                            </span>
                            
                            {/* On hand */}
                            <span className="text-sm text-muted-foreground w-20 text-right flex-shrink-0">
                              {totalOnHand > 0 ? `${formatNumber(totalOnHand, 0)} ${unit}` : '—'}
                            </span>
                            
                            {/* Arrow */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {productsByCategory.sortedCategories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products from this vendor yet
                </div>
              )}
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
                <div key={contact.id} className="p-2 rounded-lg hover:bg-muted/50">
                  {editingContactId === contact.id && editContact ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editContact.name}
                        onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                        placeholder="Name"
                        className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                      />
                      <input
                        type="text"
                        value={editContact.role || ''}
                        onChange={(e) => setEditContact({ ...editContact, role: e.target.value || undefined })}
                        placeholder="Role"
                        className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                      />
                      <input
                        type="tel"
                        value={editContact.phone || ''}
                        onChange={(e) => setEditContact({ ...editContact, phone: e.target.value || undefined })}
                        placeholder="Phone"
                        className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                      />
                      <input
                        type="email"
                        value={editContact.email || ''}
                        onChange={(e) => setEditContact({ ...editContact, email: e.target.value || undefined })}
                        placeholder="Email"
                        className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleCancelEditContact}
                          className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveContact}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditContact(contact)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!vendor.contacts || vendor.contacts.length === 0) && !showAddContact && (
                <p className="text-sm text-muted-foreground text-center py-2">No contacts added</p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">Documents</h4>
            </div>
            
            <div className="space-y-2 mb-3">
              {(vendor.documents || []).map(doc => (
                <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                  </div>
                  {doc.data && (
                    <button
                      onClick={() => handleViewDocument(doc.data!)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!vendor.documents || vendor.documents.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">No documents added</p>
              )}
            </div>
            
            {/* Upload buttons */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-1 p-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-xs">
                <Upload className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Catalog</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument('catalog', file);
                  }}
                  className="hidden"
                />
              </label>
              <label className="flex items-center justify-center gap-1 p-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-xs">
                <Upload className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Pricing</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument('pricing', file);
                  }}
                  className="hidden"
                />
              </label>
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

      {/* Add Product to Vendor Modal */}
      {onAddProduct && onAddVendorOffering && (
        <AddProductToVendorModal
          isOpen={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          vendor={vendor}
          existingProducts={productMasters}
          existingOfferings={vendorOfferings}
          onAddOffering={(offering) => {
            onAddVendorOffering(offering);
            // If setting as preferred, unset other offerings for this product
            if (offering.isPreferred && onUpdateOfferings) {
              const updated = vendorOfferings.map(o => 
                o.productId === offering.productId && o.id !== offering.id
                  ? { ...o, isPreferred: false }
                  : o
              );
              onUpdateOfferings(updated);
            }
          }}
          onAddProduct={(product, offering) => {
            onAddProduct(product);
            onAddVendorOffering(offering);
          }}
        />
      )}
    </div>
  );
};
