import type { Vendor, Product, Tier, Crop } from '@/types/farm';
import { generateId } from '@/utils/farmUtils';

export const initialVendors: Vendor[] = [
  { id: 'v1', name: 'BioAg Management' },
  { id: 'v2', name: 'Hafa Industries' },
  { id: 'v3', name: 'BW Fusion' },
  { id: 'v4', name: 'Soil Biotics' },
  { id: 'v5', name: 'QLF' },
  { id: 'v6', name: 'Professional Agronomy' },
  { id: 'v7', name: 'Growth Tech LLC' },
  { id: 'v8', name: 'Dry Fertilizer' },
  { id: 'v9', name: 'Sabbath Soil' },
  { id: 'v10', name: 'AquaYield' },
  { id: 'v11', name: 'Interpose Ag' },
];

export const initialProducts: Product[] = [
  // BioAg Management
  { id: 'p1', vendorId: 'v1', name: 'BioAg E', price: 28, priceUnit: 'gal', form: 'liquid' },
  { id: 'p2', vendorId: 'v1', name: 'Amino Carb', price: 28, priceUnit: 'gal', form: 'liquid' },
  { id: 'p3', vendorId: 'v1', name: 'Backbone', price: 20, priceUnit: 'gal', form: 'liquid' },
  { id: 'p4', vendorId: 'v1', name: 'ATP Pump', price: 15.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p5', vendorId: 'v1', name: 'ATP Pump+', price: 16.5, priceUnit: 'gal', form: 'liquid' },
  { id: 'p6', vendorId: 'v1', name: 'Checkmate Liquid Urea 20-0-0', price: 1.93, priceUnit: 'gal', form: 'liquid', analysis: { n: 20, p: 0, k: 0, s: 0 } },
  { id: 'p7', vendorId: 'v1', name: 'NitroSul (liquid AMS) 7-0-0-8S', price: 2.01, priceUnit: 'gal', form: 'liquid', analysis: { n: 7, p: 0, k: 0, s: 8 } },
  { id: 'p8', vendorId: 'v1', name: 'K Libra (Liquid KCL) 0-0-12', price: 1.12, priceUnit: 'gal', form: 'liquid', analysis: { n: 0, p: 0, k: 12, s: 0 } },
  { id: 'p9', vendorId: 'v1', name: 'Hydrogen Co', price: 22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p10', vendorId: 'v1', name: 'RPM', price: 32, priceUnit: 'gal', form: 'liquid' },
  { id: 'p11', vendorId: 'v1', name: 'PhloemMax 5 Plex (B, Cu, Fe, Mn, Zn)', price: 19.5, priceUnit: 'gal', form: 'liquid' },
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
  
  // QLF
  { id: 'p39', vendorId: 'v5', name: 'Boost', price: 3.5, priceUnit: 'gal', form: 'liquid' },
  
  // Professional Agronomy
  { id: 'p40', vendorId: 'v6', name: '25-0-0-5S', price: 2.83, priceUnit: 'gal', form: 'liquid', analysis: { n: 25, p: 0, k: 0, s: 5 } },
  
  // Growth Tech LLC
  { id: 'p41', vendorId: 'v7', name: 'NitrogMagS', price: 2.22, priceUnit: 'gal', form: 'liquid' },
  { id: 'p42', vendorId: 'v7', name: 'NitroMag K-S', price: 1.86, priceUnit: 'gal', form: 'liquid' },
  { id: 'p43', vendorId: 'v7', name: 'A21-0-0', price: 1.83, priceUnit: 'gal', form: 'liquid', analysis: { n: 21, p: 0, k: 0, s: 0 } },
  
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
  { id: 'p51', vendorId: 'v10', name: 'Aquayield NanoCote', price: 100, priceUnit: 'gal', form: 'liquid' },
  
  // Interpose Ag
  { id: 'p52', vendorId: 'v11', name: 'Unicorn Heavy 2-26-37', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 2, p: 26, k: 37, s: 0 } },
  { id: 'p53', vendorId: 'v11', name: 'Unicorn Ignite 10-30-30', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 10, p: 30, k: 30, s: 0 } },
  { id: 'p54', vendorId: 'v11', name: 'Unicorn Maxx 6-8-10-8S w/ Micros', price: 15, priceUnit: 'gal', form: 'liquid', analysis: { n: 6, p: 8, k: 10, s: 8 } },
  
  // Fungicide
  { id: 'p55', vendorId: 'v1', name: 'Prosaro (Fungicide)', price: 234, priceUnit: 'gal', form: 'liquid' },
  
  // Potassium Acetate
  { id: 'p56', vendorId: 'v4', name: 'Potassium Acetate', price: 7, priceUnit: 'gal', form: 'liquid' },
];

export const defaultTiers: Tier[] = [
  { id: 't1', name: 'Core Plan', percentage: 100 },
  { id: 't2', name: 'Tier 2', percentage: 60 },
  { id: 't3', name: 'Tier 3', percentage: 25 },
  { id: 't4', name: 'Tier 4', percentage: 15 },
  { id: 't5', name: 'Tier 5', percentage: 8 },
];

export const createDefaultCrop = (name: string, acres: number): Crop => ({
  id: generateId(),
  name,
  totalAcres: acres,
  tiers: defaultTiers.map(t => ({ ...t, id: generateId() })),
  applicationTimings: [],
  applications: [],
  seedTreatments: [],
});
