

# Crop Plan PDF Export Feature

## Overview
Add the ability to export individual crop plans as professionally formatted PDFs. The PDF will include the same information displayed in the crop planning view: season overview, nutrient summary, ratios, and detailed pass/product information.

## Approach
Use the browser's native `window.print()` capability with a print-optimized component. This approach is:
- **Zero dependencies**: No need to add libraries like jspdf or pdfmake
- **Fast to implement**: Leverages existing React components
- **High quality output**: Uses the browser's print engine for crisp text and proper page breaks
- **Maintainable**: Reuses existing calculation and formatting utilities

## What Will Be Included in the PDF

1. **Header Section**
   - Crop name and crop type
   - Season year
   - Total acres
   - Date generated

2. **Season Summary**
   - Total crop cost
   - Cost per acre
   - Program intensity
   - Status (Balanced, Early-heavy, etc.)

3. **Nutrient Summary**
   - N, P, K, S totals (lbs/acre)
   - N:S and N:K ratios

4. **Application Passes**
   - Grouped by timing phase (Pre-Plant, At Planting, In-Season, Post-Harvest)
   - Each pass shows:
     - Pass name and timing info
     - Pattern (Uniform/Selective/Trial)
     - Cost per acre and total cost
     - Nutrient contribution and ratios
   - Products within each pass:
     - Product name and fertilizer grade
     - Application rate and unit
     - Acres percentage
     - Cost per acre
     - Role/function (if assigned)

---

## Technical Details

### New Files

1. **`src/components/farm/CropPlanPrintView.tsx`**
   - A print-optimized React component that renders the entire crop plan
   - Uses clean, print-friendly styling (black/white, proper margins)
   - Includes page break handling for multi-page plans

2. **`src/components/farm/ExportPdfButton.tsx`**
   - A reusable button component that triggers the print dialog
   - Opens the print view in a new window or modal
   - Uses `window.print()` for PDF generation (user can choose "Save as PDF")

### Modified Files

1. **`src/components/farm/CropPlanningView.tsx`**
   - Add an "Export PDF" button to the toolbar/header
   - Pass necessary props to the export functionality

2. **`src/index.css`** (or create `src/styles/print.css`)
   - Add print-specific media query styles
   - Hide non-printable elements
   - Ensure proper page breaks

### Implementation Flow

```text
User clicks "Export PDF"
         │
         ▼
Open new window with CropPlanPrintView
         │
         ▼
Render print-optimized layout
         │
         ▼
Trigger window.print()
         │
         ▼
User saves as PDF via browser dialog
```

### Data Flow

The `CropPlanPrintView` will receive:
- `crop`: The full Crop object with applications and timings
- `products`: Product list for name/analysis lookups
- `productMasters`: For price book and commodity spec info
- `priceBook`: For accurate pricing
- `seasonYear`: For price book lookups
- `purposes`: For product roles/functions

The component will use existing calculation functions:
- `calculateSeasonSummaryWithPriceBook()` - season totals
- `calculatePassSummaryWithPriceBook()` - per-pass details
- `formatCurrency()`, `formatNumber()` - formatting

### Print Styling Strategy

```css
@media print {
  /* Hide sidebar, navigation, action buttons */
  .no-print { display: none !important; }
  
  /* Reset backgrounds for print */
  body { background: white; }
  
  /* Page break handling */
  .pass-card { page-break-inside: avoid; }
  .page-break { page-break-after: always; }
  
  /* Proper margins */
  @page { margin: 0.75in; }
}
```

### Alternative: jsPDF (If Native Print Is Insufficient)

If the user later wants more control (custom headers/footers, auto-naming files, etc.), we can add `jspdf` + `html2canvas`:

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const generatePdf = async (element: HTMLElement) => {
  const canvas = await html2canvas(element);
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(canvas.toDataURL(), 'PNG', 0, 0, 210, 297);
  pdf.save('crop-plan.pdf');
};
```

This would require installing two dependencies but offers programmatic PDF generation.

---

## User Experience

1. User navigates to a crop plan
2. Clicks "Export PDF" button in the header (next to view toggles)
3. A print-optimized view opens in a new window
4. Browser's print dialog appears with "Save as PDF" option
5. User saves the PDF to their device

## Future Enhancements

- Add farm logo/branding to header
- Include vendor information for products
- Add a "Notes" section for user annotations
- Batch export all crops in a season to a single PDF

