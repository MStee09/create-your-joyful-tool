// ============================================================================
// INITIAL DATA - PRE-LOADED FROM SPREADSHEET
// ============================================================================

import type { Season, Crop, Product, Vendor, InventoryItem, Tier, ApplicationTiming, Application, SeedTreatment, AppState } from './types';

// Helper to generate IDs
const id = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// ============================================================================
// VENDORS
// ============================================================================
export const initialVendors: Vendor[] = [
  { id: 'v1', name: 'BioAg Management', contacts: [], documents: [], tags: ['primary-biological'] },
  { id: 'v2', name: 'Hafa Industries', contacts: [], documents: [], tags: [] },
  { id: 'v3', name: 'BW Fusion', contacts: [], documents: [], tags: [] },
  { id: 'v4', name: 'Soil Biotics', contacts: [], documents: [], tags: [] },
  { id: 'v5', name: 'QLF', contacts: [], documents: [], tags: [] },
  { id: 'v6', name: 'Professional Agronomy', contacts: [], documents: [], tags: [] },
  { id: 'v7', name: 'Growth Tech LLC', contacts: [], documents: [], tags: [] },
  { id: 'v8', name: 'Dry Fertilizer', contacts: [], documents: [], tags: ['primary-fertility'] },
  { id: 'v9', name: 'Sabbath Soil', contacts: [], documents: [], tags: [] },
  { id: 'v10', name: 'AquaYield', contacts: [], documents: [], tags: ['specialty'] },
  { id: 'v11', name: 'Interpose Ag', contacts: [], documents: [], tags: [] },
];

// ============================================================================
// PRODUCTS
// ============================================================================
export const initialProducts: Product[] = [
  // BioAg Management
  { id: 'p1', vendorId: 'v1', name: 'BioAg E', price: 28, priceUnit: 'gal', form: 'liquid' },
  { id: 'p2', vendorId: 'v1', name: 'Amino Carb', price: 28, priceUnit: 'gal', form: 'liquid' },
  { id: 'p3', vendorId: 'v1', name: 'Backbone', price: 20, priceUnit: 'gal', form: 'liquid' },
  { id: 'p4', vendorId: 'v1', name: 'ATP Pump', price: 15.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p5', vendorId: 'v1', name: 'ATP Pump+', price: 16.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p6', vendorId: 'v1', name: 'Checkmate Liquid Urea 20-0-0', price: 1.93, priceUnit: 'gal', form: 'liquid', analysis: { n: 20, p: 0, k: 0, s: 0 }, densityLbsPerGal: 10.6 },
  { id: 'p7', vendorId: 'v1', name: 'NitroSul 7-0-0-8S', price: 2.01, priceUnit: 'gal', form: 'liquid', analysis: { n: 7, p: 0, k: 0, s: 8 }, densityLbsPerGal: 10.5 },
  { id: 'p8', vendorId: 'v1', name: 'K Libra 0-0-12', price: 1.12, priceUnit: 'gal', form: 'liquid', analysis: { n: 0, p: 0, k: 12, s: 0 }, densityLbsPerGal: 11.0 },
  { id: 'p9', vendorId: 'v1', name: 'Hydrogen Co', price: 22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p10', vendorId: 'v1', name: 'RPM', price: 32, priceUnit: 'gal', form: 'liquid' },
  { id: 'p11', vendorId: 'v1', name: 'PhloemMax 5 Plex', price: 19.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p12', vendorId: 'v1', name: 'Phloem EDTA Ca', price: 20.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p13', vendorId: 'v1', name: 'Phloem EDTA Zn', price: 25, priceUnit: 'gal', form: 'liquid' },
  { id: 'p14', vendorId: 'v1', name: 'Phloem MEA Zn', price: 22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p15', vendorId: 'v1', name: 'Phloem MEA Mn', price: 21, priceUnit: 'gal', form: 'liquid' },
  { id: 'p16', vendorId: 'v1', name: 'Phloem MEA B', price: 22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p17', vendorId: 'v1', name: 'Phloem MEA Mg', price: 20.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p18', vendorId: 'v1', name: 'PhloemMEA Fe', price: 20.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p19', vendorId: 'v1', name: 'Phloem MEA Cu', price: 22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p20', vendorId: 'v1', name: 'Phloem Moly 5%', price: 60, priceUnit: 'gal', form: 'liquid' },
  { id: 'p21', vendorId: 'v1', name: 'Phloem MEA Co 5%', price: 107, priceUnit: 'gal', form: 'liquid' },
  { id: 'p22', vendorId: 'v1', name: 'PhloemMax Mo 3% Co 2%', price: 108, priceUnit: 'gal', form: 'liquid' },
  { id: 'p55', vendorId: 'v1', name: 'Prosaro (Fungicide)', price: 234, priceUnit: 'gal', form: 'liquid' },
  
  // Hafa Industries
  { id: 'p23', vendorId: 'v2', name: 'Humic Acid 12%', price: 7.75, priceUnit: 'gal', form: 'liquid' },
  { id: 'p24', vendorId: 'v2', name: 'Fulvic Acid 6%', price: 7.75, priceUnit: 'gal', form: 'liquid' },
  { id: 'p25', vendorId: 'v2', name: 'PHXR', price: 58.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p26', vendorId: 'v2', name: 'Ngen', price: 160, priceUnit: 'gal', form: 'liquid' },
  
  // BW Fusion
  { id: 'p27', vendorId: 'v3', name: 'Meltdown', price: 55.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p28', vendorId: 'v3', name: 'Humical', price: 9.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p29', vendorId: 'v3', name: 'Full Sun', price: 33.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p30', vendorId: 'v3', name: 'Relax RX', price: 44, priceUnit: 'gal', form: 'liquid' },
  { id: 'p31', vendorId: 'v3', name: 'BioCast Max', price: 94.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p32', vendorId: 'v3', name: 'Amino', price: 45.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p33', vendorId: 'v3', name: 'BLG', price: 44, priceUnit: 'gal', form: 'liquid' },
  { id: 'p34', vendorId: 'v3', name: 'HF 12', price: 19, priceUnit: 'gal', form: 'liquid' },
  { id: 'p35', vendorId: 'v3', name: 'BW Fixate', price: 162, priceUnit: 'gal', form: 'liquid' },
  { id: 'p36', vendorId: 'v3', name: 'Boron 7', price: 25, priceUnit: 'gal', form: 'liquid' },
  { id: 'p37', vendorId: 'v3', name: 'BW 401', price: 77, priceUnit: 'gal', form: 'liquid' },
  
  // Soil Biotics
  { id: 'p38', vendorId: 'v4', name: 'Fulvic Acid 30%', price: 48, priceUnit: 'gal', form: 'liquid' },
  { id: 'p56', vendorId: 'v4', name: 'Potassium Acetate', price: 7, priceUnit: 'gal', form: 'liquid', analysis: { n: 0, p: 0, k: 24, s: 0 }, densityLbsPerGal: 11.5 },
  
  // QLF
  { id: 'p39', vendorId: 'v5', name: 'Boost', price: 3.5, priceUnit: 'gal', form: 'liquid' },
  
  // Professional Agronomy
  { id: 'p40', vendorId: 'v6', name: '25-0-0-5S', price: 2.83, priceUnit: 'gal', form: 'liquid', analysis: { n: 25, p: 0, k: 0, s: 5 }, densityLbsPerGal: 10.8 },
  
  // Growth Tech LLC
  { id: 'p41', vendorId: 'v7', name: 'NitrogMagS', price: 2.22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p42', vendorId: 'v7', name: 'NitroMag K-S', price: 1.86, priceUnit: 'gal', form: 'liquid' },
  { id: 'p43', vendorId: 'v7', name: 'A21-0-0', price: 1.83, priceUnit: 'gal', form: 'liquid', analysis: { n: 21, p: 0, k: 0, s: 0 }, densityLbsPerGal: 10.6 },
  
  // Dry Fertilizer
  { id: 'p44', vendorId: 'v8', name: 'AMS', price: 420, priceUnit: 'ton', form: 'dry', analysis: { n: 21, p: 0, k: 0, s: 24 } },
  { id: 'p45', vendorId: 'v8', name: 'Urea', price: 520, priceUnit: 'ton', form: 'dry', analysis: { n: 46, p: 0, k: 0, s: 0 } },
  { id: 'p46', vendorId: 'v8', name: 'KCL', price: 490, priceUnit: 'ton', form: 'dry', analysis: { n: 0, p: 0, k: 60, s: 0 } },
  { id: 'p47', vendorId: 'v8', name: 'SOP', price: 850, priceUnit: 'ton', form: 'dry', analysis: { n: 0, p: 0, k: 50, s: 18 } },
  
  // Sabbath Soil
  { id: 'p48', vendorId: 'v9', name: 'Growthfull Max (Hydronium)', price: 16, priceUnit: 'gal', form: 'liquid' },
  { id: 'p49', vendorId: 'v9', name: 'Pacific Gro Oceanic', price: 6.5, priceUnit: 'gal', form: 'liquid' },
  
  // AquaYield
  { id: 'p50', vendorId: 'v10', name: 'AquaYield NanoK', price: 128, priceUnit: 'gal', form: 'liquid' },
  { id: 'p51', vendorId: 'v10', name: 'AquaYield NanoCote', price: 100, priceUnit: 'gal', form: 'liquid' },
  
  // Interpose Ag
  { id: 'p52', vendorId: 'v11', name: 'Unicorn Heavy 2-26-37', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 2, p: 26, k: 37, s: 0 }, densityLbsPerGal: 11.5 },
  { id: 'p53', vendorId: 'v11', name: 'Unicorn Ignite 10-30-30', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 10, p: 30, k: 30, s: 0 }, densityLbsPerGal: 11.2 },
  { id: 'p54', vendorId: 'v11', name: 'Unicorn Maxx 6-8-10-8S', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 6, p: 8, k: 10, s: 8 }, densityLbsPerGal: 10.8 },
  
  // Seed Treatments
  { id: 'p57', vendorId: 'v1', name: 'Jakes Mix (Seed Treatment)', price: 85, priceUnit: 'gal', form: 'liquid' },
];

// ============================================================================
// CORN - 132 Acres
// ============================================================================
const cornTiers: Tier[] = [
  { id: 'corn-t1', name: 'Core Plan', percentage: 100 },
  { id: 'corn-t2', name: 'Tier 2', percentage: 60 },
  { id: 'corn-t3', name: 'Tier 3', percentage: 25 },
  { id: 'corn-t4', name: 'Tier 4', percentage: 10 },
  { id: 'corn-t5', name: 'Tier 5', percentage: 8 },
];

const cornTimings: ApplicationTiming[] = [
  { id: 'corn-timing-1', name: 'In Furrow', order: 0 },
  { id: 'corn-timing-2', name: '2x2x2', order: 1 },
  { id: 'corn-timing-3', name: 'Herbicide Pass', order: 2 },
  { id: 'corn-timing-4', name: 'Post Herbicide V6-V8', order: 3 },
  { id: 'corn-timing-5', name: 'Topdress', order: 4 },
  { id: 'corn-timing-6', name: 'V10', order: 5 },
  { id: 'corn-timing-7', name: 'R2', order: 6 },
  { id: 'corn-timing-8', name: 'R4', order: 7 },
  { id: 'corn-timing-9', name: 'Fall', order: 8 },
];

const cornApplications: Application[] = [
  // In Furrow
  { id: id(), timingId: 'corn-timing-1', productId: 'p28', rate: 32, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-1', productId: 'p1', rate: 48, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-1', productId: 'p2', rate: 32, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-1', productId: 'p23', rate: 32, rateUnit: 'oz', tierId: 'corn-t1' },
  
  // 2x2x2
  { id: id(), timingId: 'corn-timing-2', productId: 'p6', rate: 4, rateUnit: 'gal', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-2', productId: 'p7', rate: 4, rateUnit: 'gal', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-2', productId: 'p52', rate: 3, rateUnit: 'gal', tierId: 'corn-t3' },
  { id: id(), timingId: 'corn-timing-2', productId: 'p23', rate: 1.5, rateUnit: 'gal', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-2', productId: 'p20', rate: 3, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-2', productId: 'p31', rate: 24, rateUnit: 'oz', tierId: 'corn-t2' },
  
  // Herbicide Pass
  { id: id(), timingId: 'corn-timing-3', productId: 'p30', rate: 16, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-3', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-3', productId: 'p38', rate: 4, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-3', productId: 'p25', rate: 3.2, rateUnit: 'oz', tierId: 'corn-t1' },
  
  // Post Herbicide V6-V8
  { id: id(), timingId: 'corn-timing-4', productId: 'p29', rate: 64, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-4', productId: 'p20', rate: 5, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-4', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'corn-t2' },
  
  // Topdress
  { id: id(), timingId: 'corn-timing-5', productId: 'p44', rate: 100, rateUnit: 'lbs', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-5', productId: 'p45', rate: 70, rateUnit: 'lbs', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-5', productId: 'p46', rate: 15, rateUnit: 'lbs', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-5', productId: 'p47', rate: 50, rateUnit: 'lbs', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-5', productId: 'p51', rate: 64, rateUnit: 'oz', tierId: 'corn-t1' },
  
  // V10
  { id: id(), timingId: 'corn-timing-6', productId: 'p32', rate: 16, rateUnit: 'oz', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-6', productId: 'p56', rate: 64, rateUnit: 'oz', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-6', productId: 'p11', rate: 16, rateUnit: 'oz', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-6', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-6', productId: 'p38', rate: 6, rateUnit: 'oz', tierId: 'corn-t2' },
  
  // R2
  { id: id(), timingId: 'corn-timing-7', productId: 'p32', rate: 16, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-7', productId: 'p56', rate: 128, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-7', productId: 'p36', rate: 16, rateUnit: 'oz', tierId: 'corn-t2' },
  { id: id(), timingId: 'corn-timing-7', productId: 'p1', rate: 16, rateUnit: 'oz', tierId: 'corn-t1' },
  { id: id(), timingId: 'corn-timing-7', productId: 'p3', rate: 32, rateUnit: 'oz', tierId: 'corn-t1' },
  
  // R4
  { id: id(), timingId: 'corn-timing-8', productId: 'p56', rate: 64, rateUnit: 'oz', tierId: 'corn-t4' },
  { id: id(), timingId: 'corn-timing-8', productId: 'p36', rate: 8, rateUnit: 'oz', tierId: 'corn-t4' },
  { id: id(), timingId: 'corn-timing-8', productId: 'p38', rate: 6, rateUnit: 'oz', tierId: 'corn-t4' },
  
  // Fall
  { id: id(), timingId: 'corn-timing-9', productId: 'p23', rate: 1, rateUnit: 'gal', tierId: 'corn-t1' },
];

// ============================================================================
// EDIBLE BEANS - 158 Acres
// ============================================================================
const beansTiers: Tier[] = [
  { id: 'beans-t1', name: 'Core Plan', percentage: 100 },
  { id: 'beans-t2', name: 'Tier 2', percentage: 60 },
  { id: 'beans-t3', name: 'Tier 3', percentage: 25 },
  { id: 'beans-t4', name: 'Tier 4', percentage: 15 },
  { id: 'beans-t5', name: 'Tier 5', percentage: 8 },
];

const beansTimings: ApplicationTiming[] = [
  { id: 'beans-timing-1', name: 'In Furrow', order: 0 },
  { id: 'beans-timing-2', name: '2x2x2', order: 1 },
  { id: 'beans-timing-3', name: 'Herbicide Pass', order: 2 },
  { id: 'beans-timing-4', name: 'Post Herbicide V6', order: 3 },
  { id: 'beans-timing-5', name: 'Topdress - Early July', order: 4 },
  { id: 'beans-timing-6', name: 'V10', order: 5 },
  { id: 'beans-timing-7', name: 'R2', order: 6 },
  { id: 'beans-timing-8', name: 'R4', order: 7 },
  { id: 'beans-timing-9', name: 'Fall', order: 8 },
];

const beansApplications: Application[] = [
  // In Furrow
  { id: id(), timingId: 'beans-timing-1', productId: 'p28', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-1', productId: 'p1', rate: 48, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-1', productId: 'p2', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-1', productId: 'p23', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  
  // 2x2x2
  { id: id(), timingId: 'beans-timing-2', productId: 'p7', rate: 3, rateUnit: 'gal', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-2', productId: 'p23', rate: 2, rateUnit: 'gal', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-2', productId: 'p52', rate: 3, rateUnit: 'gal', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-2', productId: 'p31', rate: 24, rateUnit: 'oz', tierId: 'beans-t3' },
  
  // Herbicide Pass
  { id: id(), timingId: 'beans-timing-3', productId: 'p30', rate: 16, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-3', productId: 'p1', rate: 16, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-3', productId: 'p25', rate: 3.2, rateUnit: 'oz', tierId: 'beans-t1' },
  
  // Post Herbicide V6
  { id: id(), timingId: 'beans-timing-4', productId: 'p29', rate: 64, rateUnit: 'oz', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-4', productId: 'p6', rate: 1, rateUnit: 'gal', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-4', productId: 'p56', rate: 16, rateUnit: 'oz', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-4', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'beans-t3' },
  
  // Topdress - Early July
  { id: id(), timingId: 'beans-timing-5', productId: 'p44', rate: 70, rateUnit: 'lbs', tierId: 'beans-t3' },
  
  // V10
  { id: id(), timingId: 'beans-timing-6', productId: 'p32', rate: 16, rateUnit: 'oz', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-6', productId: 'p56', rate: 64, rateUnit: 'oz', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-6', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'beans-t3' },
  { id: id(), timingId: 'beans-timing-6', productId: 'p38', rate: 6, rateUnit: 'oz', tierId: 'beans-t3' },
  
  // R2
  { id: id(), timingId: 'beans-timing-7', productId: 'p32', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-7', productId: 'p56', rate: 128, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-7', productId: 'p36', rate: 16, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-7', productId: 'p1', rate: 16, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-7', productId: 'p3', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  
  // R4
  { id: id(), timingId: 'beans-timing-8', productId: 'p56', rate: 64, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-8', productId: 'p36', rate: 16, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-8', productId: 'p38', rate: 6, rateUnit: 'oz', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-8', productId: 'p3', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
  
  // Fall
  { id: id(), timingId: 'beans-timing-9', productId: 'p23', rate: 1, rateUnit: 'gal', tierId: 'beans-t1' },
  { id: id(), timingId: 'beans-timing-9', productId: 'p27', rate: 32, rateUnit: 'oz', tierId: 'beans-t1' },
];

// ============================================================================
// SMALL GRAINS - 130 Acres
// ============================================================================
const grainsTiers: Tier[] = [
  { id: 'grains-t1', name: 'Core Plan', percentage: 100 },
  { id: 'grains-t2', name: 'Tier 2', percentage: 50 },
  { id: 'grains-t3', name: 'Tier 3', percentage: 20 },
  { id: 'grains-t4', name: 'Tier 4', percentage: 15 },
  { id: 'grains-t5', name: 'Tier 5', percentage: 8 },
];

const grainsTimings: ApplicationTiming[] = [
  { id: 'grains-timing-1', name: 'Preplant Dry Broadcast', order: 0 },
  { id: 'grains-timing-2', name: 'Pre-Emerge', order: 1 },
  { id: 'grains-timing-3', name: 'In Furrow', order: 2 },
  { id: 'grains-timing-4', name: 'Herbicide Pass', order: 3 },
  { id: 'grains-timing-5', name: 'Streambar Tillering', order: 4 },
  { id: 'grains-timing-6', name: 'Flag Leaf Foliar', order: 5 },
  { id: 'grains-timing-7', name: 'Heading Foliar', order: 6 },
  { id: 'grains-timing-8', name: 'Fall', order: 7 },
];

const grainsApplications: Application[] = [
  // Preplant Dry Broadcast
  { id: id(), timingId: 'grains-timing-1', productId: 'p44', rate: 100, rateUnit: 'lbs', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-1', productId: 'p47', rate: 30, rateUnit: 'lbs', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-1', productId: 'p45', rate: 20, rateUnit: 'lbs', tierId: 'grains-t1' },
  
  // Pre-Emerge
  { id: id(), timingId: 'grains-timing-2', productId: 'p31', rate: 32, rateUnit: 'oz', tierId: 'grains-t3' },
  
  // In Furrow
  { id: id(), timingId: 'grains-timing-3', productId: 'p23', rate: 2, rateUnit: 'gal', tierId: 'grains-t1' },
  
  // Herbicide Pass
  { id: id(), timingId: 'grains-timing-4', productId: 'p30', rate: 16, rateUnit: 'oz', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-4', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-4', productId: 'p25', rate: 2.4, rateUnit: 'oz', tierId: 'grains-t1' },
  
  // Streambar Tillering
  { id: id(), timingId: 'grains-timing-5', productId: 'p7', rate: 3, rateUnit: 'gal', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-5', productId: 'p8', rate: 10, rateUnit: 'gal', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-5', productId: 'p6', rate: 7, rateUnit: 'gal', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-5', productId: 'p23', rate: 1, rateUnit: 'gal', tierId: 'grains-t1' },
  { id: id(), timingId: 'grains-timing-5', productId: 'p20', rate: 4, rateUnit: 'oz', tierId: 'grains-t1' },
  
  // Flag Leaf Foliar
  { id: id(), timingId: 'grains-timing-6', productId: 'p29', rate: 32, rateUnit: 'oz', tierId: 'grains-t3' },
  { id: id(), timingId: 'grains-timing-6', productId: 'p32', rate: 8, rateUnit: 'oz', tierId: 'grains-t3' },
  { id: id(), timingId: 'grains-timing-6', productId: 'p56', rate: 32, rateUnit: 'oz', tierId: 'grains-t2' },
  { id: id(), timingId: 'grains-timing-6', productId: 'p1', rate: 16, rateUnit: 'oz', tierId: 'grains-t2' },
  { id: id(), timingId: 'grains-timing-6', productId: 'p38', rate: 4, rateUnit: 'oz', tierId: 'grains-t2' },
  { id: id(), timingId: 'grains-timing-6', productId: 'p36', rate: 16, rateUnit: 'oz', tierId: 'grains-t2' },
  
  // Heading Foliar
  { id: id(), timingId: 'grains-timing-7', productId: 'p55', rate: 6.5, rateUnit: 'oz', tierId: 'grains-t3' },
  { id: id(), timingId: 'grains-timing-7', productId: 'p1', rate: 8, rateUnit: 'oz', tierId: 'grains-t3' },
  { id: id(), timingId: 'grains-timing-7', productId: 'p38', rate: 6, rateUnit: 'oz', tierId: 'grains-t3' },
  
  // Fall
  { id: id(), timingId: 'grains-timing-8', productId: 'p23', rate: 1, rateUnit: 'gal', tierId: 'grains-t1' },
];

// Small Grains Seed Treatment
const grainsSeedTreatments: SeedTreatment[] = [
  {
    id: id(),
    productId: 'p57',
    ratePerCwt: 6,
    rateUnit: 'oz',
    plantingRateLbsPerAcre: 100,
  },
];

// ============================================================================
// CROPS
// ============================================================================
const cornCrop: Crop = {
  id: 'crop-corn',
  name: 'Corn',
  totalAcres: 132,
  tiers: cornTiers,
  applicationTimings: cornTimings,
  applications: cornApplications,
  seedTreatments: [],
};

const beansCrop: Crop = {
  id: 'crop-beans',
  name: 'Edible Beans',
  totalAcres: 158,
  tiers: beansTiers,
  applicationTimings: beansTimings,
  applications: beansApplications,
  seedTreatments: [],
};

const grainsCrop: Crop = {
  id: 'crop-grains',
  name: 'Small Grains',
  totalAcres: 130,
  tiers: grainsTiers,
  applicationTimings: grainsTimings,
  applications: grainsApplications,
  seedTreatments: grainsSeedTreatments,
};

// ============================================================================
// SEASON
// ============================================================================
const season2026: Season = {
  id: 'season-2026',
  year: 2026,
  name: 'Growing Season',
  crops: [cornCrop, beansCrop, grainsCrop],
  createdAt: new Date(),
};

// ============================================================================
// EXPORT INITIAL STATE
// ============================================================================
export const initialState: AppState = {
  seasons: [season2026],
  products: initialProducts,
  productMasters: [],  // Will be populated by migration
  vendorOfferings: [], // Will be populated by migration
  vendors: initialVendors,
  inventory: [] as InventoryItem[],
  currentSeasonId: 'season-2026',
  currentCropId: null as string | null,
  // Procurement system
  commoditySpecs: [],
  bidEvents: [],
  vendorQuotes: [],
  awards: [],
  priceBook: [],
};

export default initialState;
