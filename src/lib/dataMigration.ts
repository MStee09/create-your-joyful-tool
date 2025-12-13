import type { 
  Product, 
  ProductMaster, 
  VendorOffering, 
  AppState,
  ProductCategory 
} from '../types';
import { generateId, inferProductCategory } from './calculations';

const CURRENT_DATA_VERSION = 2;

// Migrate old Product[] to ProductMaster[] + VendorOffering[]
export const migrateProducts = (
  products: Product[]
): { productMasters: ProductMaster[]; vendorOfferings: VendorOffering[] } => {
  const productMasters: ProductMaster[] = [];
  const vendorOfferings: VendorOffering[] = [];

  products.forEach(product => {
    // Create ProductMaster
    const productMaster: ProductMaster = {
      id: product.id,
      name: product.name,
      category: inferProductCategory(product.name, product.form),
      form: product.form,
      defaultUnit: product.form === 'liquid' ? 'gal' : 'lbs',
      densityLbsPerGal: product.densityLbsPerGal,
      analysis: product.analysis,
      generalNotes: product.notes,
      labelData: product.labelData,
      labelFileName: product.labelFileName,
    };
    productMasters.push(productMaster);

    // Create VendorOffering
    const vendorOffering: VendorOffering = {
      id: generateId(),
      productId: product.id,
      vendorId: product.vendorId,
      price: product.price,
      priceUnit: product.priceUnit,
      isPreferred: true, // The only offering, so it's preferred
    };
    vendorOfferings.push(vendorOffering);
  });

  return { productMasters, vendorOfferings };
};

// Check if migration is needed and perform it
export const migrateAppState = (state: AppState): AppState => {
  // If already at current version, no migration needed
  if (state.dataVersion === CURRENT_DATA_VERSION) {
    return state;
  }

  // If we have old products but no productMasters, migrate
  if (state.products?.length > 0 && (!state.productMasters || state.productMasters.length === 0)) {
    const { productMasters, vendorOfferings } = migrateProducts(state.products);
    
    return {
      ...state,
      productMasters,
      vendorOfferings,
      dataVersion: CURRENT_DATA_VERSION,
    };
  }

  // If we have productMasters already, just update version
  return {
    ...state,
    productMasters: state.productMasters || [],
    vendorOfferings: state.vendorOfferings || [],
    dataVersion: CURRENT_DATA_VERSION,
  };
};

// Create a merged Product-like object for backward compatibility in views
export const createProductFromMaster = (
  productMaster: ProductMaster,
  vendorOfferings: VendorOffering[]
): Product => {
  const preferredOffering = vendorOfferings.find(
    vo => vo.productId === productMaster.id && vo.isPreferred
  ) || vendorOfferings.find(vo => vo.productId === productMaster.id);

  return {
    id: productMaster.id,
    vendorId: preferredOffering?.vendorId || '',
    name: productMaster.name,
    price: preferredOffering?.price || 0,
    priceUnit: (preferredOffering?.priceUnit as 'gal' | 'lbs' | 'ton') || 'gal',
    form: productMaster.form,
    analysis: productMaster.analysis,
    densityLbsPerGal: productMaster.densityLbsPerGal,
    notes: productMaster.generalNotes,
    labelData: productMaster.labelData,
    labelFileName: productMaster.labelFileName,
  };
};

// Get all products as legacy format (for backward compatibility)
export const getProductsAsLegacy = (
  productMasters: ProductMaster[],
  vendorOfferings: VendorOffering[]
): Product[] => {
  return productMasters.map(pm => createProductFromMaster(pm, vendorOfferings));
};
