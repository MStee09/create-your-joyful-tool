

# Chemical Product View & AI Extraction Improvements - Implementation Plan (Updated)

## Overview

This plan implements a dedicated product view for chemical products (herbicides, fungicides, insecticides) with:
- **Separate UI** from fertility products with tabbed chemical-specific views
- **Structured chemical data** (restrictions, rates, adjuvants, mixing) in queryable fields
- **Manufacturer vs Vendor clarity** - products know who makes them; vendor relationships track who sells them
- **Enhanced AI extraction** using label PDFs with a review flow
- **Product comparison** by active ingredient and MOA group

---

## Current State Analysis

**What already exists:**
- `ChemicalDataTab.tsx` - Basic chemical data display (active ingredients, restrictions, regulatory info, rotation restrictions)
- `ChemicalData` type in `src/types/chemicalData.ts` - Core structure for pesticide data
- `extract-label` edge function - Already extracts chemical data from PDFs
- `ProductDetailView.tsx` - Single view for all products, includes ChemicalDataTab for pesticides
- `isPesticideCategory()` helper function
- `product_masters` table has `chemical_data` JSONB column

**What needs to be built:**
1. Expanded `ChemicalProductData` type with rates, adjuvants, application requirements
2. Manufacturer fields on ProductMaster with known manufacturers list
3. Category-based routing to dedicated chemical vs fertility views
4. New Chemical Product Detail View with 5 tabs
5. Reusable table components for chemical data display
6. Enhanced product list with data status indicators
7. Product comparison features (MOA groups, active ingredient search)

---

## Implementation Phases

### Phase 1: Data Model & Database Updates

**1.1 Update `ChemicalData` type (`src/types/chemicalData.ts`)**

Expand to include:
- Rate information (min, max, typical, unit)
- Application requirements (carrier GPA, droplet size, spray pressure)
- Adjuvant requirements (type, required vs recommended, rate, notes)
- Enhanced rotation restrictions (interval unit, conditions)
- Target pests/weeds
- Subcategory field (e.g., "Post-emerge broadleaf")

**1.2 Update `ProductMaster` type (`src/types.ts`)**

Add manufacturer fields:
- `manufacturer?: string` - Company name (BASF, Corteva, etc.)
- `manufacturerWebsite?: string` - URL to product page
- `epaRegistrationNumber?: string` - EPA Reg No.
- `labelPdfUrl?: string` - Stored label URL
- `sdsPdfUrl?: string` - Stored SDS URL
- `extractionSource?: 'label-pdf' | 'sds-pdf' | 'manufacturer-website' | 'manual'`
- `extractionConfidence?: 'high' | 'medium' | 'low'`
- `lastExtractedAt?: string`

**1.3 Known Manufacturers List (`src/lib/manufacturers.ts`)**

Create a reference list for autocomplete and label URL suggestions:

```typescript
export interface KnownManufacturer {
  name: string;
  urlPattern: string;
  labelSearchUrl?: string;
}

export const KNOWN_MANUFACTURERS: KnownManufacturer[] = [
  { name: 'BASF', urlPattern: 'agriculture.basf.us', labelSearchUrl: 'https://agriculture.basf.us/crop-protection/products.html' },
  { name: 'Bayer', urlPattern: 'cropscience.bayer.us', labelSearchUrl: 'https://www.cropscience.bayer.us/products' },
  { name: 'Corteva', urlPattern: 'corteva.us', labelSearchUrl: 'https://www.corteva.us/products-and-solutions.html' },
  { name: 'Syngenta', urlPattern: 'syngenta-us.com', labelSearchUrl: 'https://www.syngenta-us.com/product-list' },
  { name: 'FMC', urlPattern: 'fmc.com', labelSearchUrl: 'https://www.fmcagricultural.com/products' },
  { name: 'AMVAC', urlPattern: 'amvac.com', labelSearchUrl: 'https://amvac.com/products' },
  { name: 'Nufarm', urlPattern: 'nufarm.com' },
  { name: 'UPL', urlPattern: 'upl-ltd.com' },
  { name: 'Valent', urlPattern: 'valent.com' },
  { name: 'Winfield United', urlPattern: 'winfieldunited.com' },
];

export function findManufacturerByUrl(url: string): KnownManufacturer | null {
  return KNOWN_MANUFACTURERS.find(m => url.includes(m.urlPattern)) || null;
}

export function getManufacturerNames(): string[] {
  return KNOWN_MANUFACTURERS.map(m => m.name);
}
```

This enables:
- Autocomplete when entering manufacturer name
- Auto-detect manufacturer from pasted URLs
- Suggest where to find labels for known manufacturers

**1.4 Database Migration**

Add new columns to `product_masters` table:
```sql
ALTER TABLE product_masters 
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_website TEXT,
ADD COLUMN IF NOT EXISTS epa_registration_number TEXT,
ADD COLUMN IF NOT EXISTS label_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sds_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS extraction_source TEXT,
ADD COLUMN IF NOT EXISTS extraction_confidence TEXT,
ADD COLUMN IF NOT EXISTS last_extracted_at TIMESTAMPTZ;
```

---

### Phase 2: Reusable Table Components

**2.1 Create `ActiveIngredientsTable.tsx`**

Reusable component displaying active ingredients with:
- Name, concentration, unit columns
- MOA group with badge styling
- Chemical family/class
- Used in: Overview Tab, Extraction Review Modal, Product Comparison

**2.2 Create `AdjuvantRequirementsTable.tsx`**

Reusable component for adjuvant display:
- Adjuvant type (MSO, COC, NIS, AMS)
- Required vs Recommended badge
- Rate and notes
- Used in: Rates Tab, Extraction Review Modal

**2.3 Create `RotationRestrictionsTable.tsx`**

Reusable component for rotation display:
- Crop name
- Interval (days/months)
- Conditions/notes
- Used in: Restrictions Tab, Extraction Review Modal

---

### Phase 3: Product List View Updates

**3.1 Add Category Filter Tabs**

Update `ProductsListView.tsx` to add horizontal category filter tabs:
- [All] [Fertilizer] [Herbicide] [Fungicide] [Insecticide] [Adjuvant]
- Quick click to filter by category

**3.2 Add Data Status Column**

For chemical products, show data completeness:
- Complete - chemicalData with activeIngredients + restrictions + rates
- Needs Review - partial data or low confidence extraction
- No Data - no chemicalData (for chemicals only)

**3.3 Add Manufacturer Column**

Display manufacturer name in product list for chemicals (distinct from vendor)

---

### Phase 4: Chemical Product Detail View - Structure

**4.1 Create `ChemicalProductDetailView.tsx`**

New dedicated component for herbicides/fungicides/insecticides with:
- Header with signal word badge, EPA Reg number, formulation type
- Active ingredient summary with MOA group
- Tabbed layout: Overview | Rates & Application | Restrictions | Mixing | Documents

**4.2 Update Category Routing**

Modify `ProductDetailView.tsx` or parent routing to:
- Route herbicide/fungicide/insecticide/seed-treatment to `ChemicalProductDetailView`
- Route fertilizer/biological/micronutrient to existing fertility view
- **Adjuvants**: Use the same `ChemicalProductDetailView` with conditional tab visibility
  - Show: Overview (simplified), Documents
  - Hide: Restrictions, Rates (or show minimal)
  - This keeps MVP scope tight while allowing adjuvant expansion later

---

### Phase 5: Chemical Product View - Tab Components

**5.1 Overview Tab (`ChemicalProductOverviewTab.tsx`)**
- `ActiveIngredientsTable` component with MOA group badges
- Quick reference cards: Rate, Carrier, PHI, Adjuvant, Max/Season, REI
- Vendors & Pricing section (existing vendor offerings)

**5.2 Rates & Application Tab (`ChemicalProductRatesTab.tsx`)**
- Visual rate range slider (min/typical/max)
- Carrier volume requirements
- Droplet size recommendations
- `AdjuvantRequirementsTable` component

**5.3 Restrictions Tab (`ChemicalProductRestrictionsTab.tsx`)**
- Application limits cards: PHI, REI, Max/App, Max/Season, Max Applications
- `RotationRestrictionsTable` component with conditions
- Environmental restrictions (buffer zones, groundwater, pollinator)

**5.4 Mixing Tab (`ChemicalProductMixingTab.tsx`)**
- Mixing order display with visual sequence
- Water quality considerations (pH, hardness)
- Tank mix warnings and compatibility notes

**5.5 Documents Tab (`ChemicalProductDocumentsTab.tsx`)**
- Label PDF upload/view/re-extract
- SDS PDF upload/view
- Data extraction status and confidence
- Extraction source indicator

---

### Phase 6: AI Extraction Flow Enhancements

**6.1 Create Extraction Source Selection Modal**

When adding chemical data, offer options:
1. Upload Label PDF (recommended) - most accurate
2. Use Manufacturer Website - scrape from URL (with autocomplete from KNOWN_MANUFACTURERS)
3. Enter Manually - open edit forms
4. Skip for Now - create product without chemical data

**6.2 Create Extraction Review Modal (`ChemicalExtractionReviewModal.tsx`)**

After AI extraction, show all extracted fields for review using reusable components:
- `ActiveIngredientsTable` (editable mode)
- `AdjuvantRequirementsTable` (editable mode)
- `RotationRestrictionsTable` (editable mode)
- Confidence indicators per field
- Missing field warnings
- Accept/Edit/Reject per section

**6.3 Update Edge Function Prompt**

Enhance `extract-label/index.ts` with:
- Adjuvant requirements extraction
- Rate range extraction (min/max/typical)
- Carrier volume requirements
- Enhanced target pest/weed extraction

---

### Phase 7: Product Creation Flow Updates

**7.1 Add Category Selection Modal (`AddProductCategoryModal.tsx`)**

First step when adding product:
- Visual category selection cards (Fertilizer, Herbicide, Fungicide, Insecticide, Adjuvant, Other)
- Routes to appropriate creation flow

**7.2 Chemical Product Creation Wizard**

3-step flow:
1. Basic info: Name, Manufacturer (with autocomplete from KNOWN_MANUFACTURERS), EPA Reg
2. Data source: Upload label / Website / Manual / Skip
3. Initial vendor offering (existing step 2)

---

### Phase 8: Product Comparison Features

**8.1 Find Similar Products by Active Ingredient**

From product detail, button to "Find products with same active ingredient":
- Query products by active ingredient name
- Show comparison table with prices using `ActiveIngredientsTable`

**8.2 MOA Group View (`MOAGroupView.tsx`)**

New view accessible from Products section:
- Group all herbicides/fungicides/insecticides by MOA group
- Resistance management warning if multiple products in same group

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/manufacturers.ts` | Known manufacturers list with URL patterns |
| `src/components/farm/ActiveIngredientsTable.tsx` | Reusable AI table component |
| `src/components/farm/AdjuvantRequirementsTable.tsx` | Reusable adjuvant requirements table |
| `src/components/farm/RotationRestrictionsTable.tsx` | Reusable rotation restrictions table |
| `src/components/farm/ChemicalProductDetailView.tsx` | Main chemical product view with tabs |
| `src/components/farm/ChemicalProductOverviewTab.tsx` | Overview tab content |
| `src/components/farm/ChemicalProductRatesTab.tsx` | Rates & application tab |
| `src/components/farm/ChemicalProductRestrictionsTab.tsx` | Restrictions tab |
| `src/components/farm/ChemicalProductMixingTab.tsx` | Mixing & compatibility tab |
| `src/components/farm/ChemicalProductDocumentsTab.tsx` | Documents & extraction tab |
| `src/components/farm/ChemicalExtractionReviewModal.tsx` | Review extracted data |
| `src/components/farm/AddProductCategoryModal.tsx` | Category selection for new products |
| `src/components/farm/MOAGroupView.tsx` | View products by MOA group |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/chemicalData.ts` | Expand ChemicalProductData structure |
| `src/types.ts` | Add manufacturer fields to ProductMaster |
| `src/components/farm/ProductsListView.tsx` | Add category tabs, data status column, manufacturer column |
| `src/components/farm/ProductDetailView.tsx` | Route chemicals to ChemicalProductDetailView |
| `src/hooks/useSupabaseData.ts` | Handle new manufacturer fields |
| `supabase/functions/extract-label/index.ts` | Enhanced extraction prompt |
| `src/lib/restrictionEngine.ts` | Use expanded chemicalData structure |
| `src/components/farm/Sidebar.tsx` | Add MOA Groups nav item under Products |

---

## Technical Notes

### Adjuvant Handling (MVP)
- Adjuvants use `ChemicalProductDetailView` with conditional rendering
- Tabs shown for adjuvants: Overview (simplified), Documents
- Tabs hidden/minimal: Restrictions, Rates (adjuvants don't have PHI/REI)
- Future: Can create dedicated `AdjuvantDetailView` if complexity warrants

### Manufacturer Autocomplete Integration
- Text input with dropdown suggestions from `KNOWN_MANUFACTURERS`
- When user pastes a URL, auto-detect manufacturer via `findManufacturerByUrl()`
- Show "Find Label" button linking to manufacturer's product page for known manufacturers

### Reusable Table Components
- All three table components support both "display" and "editable" modes
- Display mode: read-only with badges and formatting
- Editable mode: inline editing with add/remove rows (for extraction review)
- Prop: `editable?: boolean` toggles behavior

### Backward Compatibility
- Existing `chemicalData` structure is preserved; new fields are additive
- Products without new fields continue to work
- Migration populates new columns as nullable

### Integration Points
- **Restriction Engine** - Already reads from `chemicalData.restrictions`; will use new structured fields
- **Mix Calculator** - Will use `chemicalData.mixing.mixingOrder` for tank mix sequence
- **Tank Mix Templates** - Will surface adjuvant requirements from included products

---

## Estimated Scope

- **Phase 1**: ~1 session (data model + manufacturers list + migration)
- **Phase 2**: ~1 session (reusable table components)
- **Phase 3**: ~1 session (product list updates)
- **Phase 4-5**: ~3 sessions (chemical detail view + all tabs)
- **Phase 6**: ~1 session (extraction flow)
- **Phase 7**: ~1 session (creation flow)
- **Phase 8**: ~1 session (comparison features)

**Total: ~9 implementation sessions**

