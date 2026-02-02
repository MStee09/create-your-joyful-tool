import React, { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Crop, Product } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { ProductPurpose } from '@/types/productIntelligence';
import type { Field, FieldAssignment, FieldCropOverride } from '@/types/field';
import { CropPlanPrintView } from './CropPlanPrintView';
import { createRoot } from 'react-dom/client';

interface ExportPdfButtonProps {
  crop: Crop;
  products: Product[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  seasonYear: number;
  purposes: Record<string, ProductPurpose>;
  // Optional field data for By Field section
  fields?: Field[];
  fieldAssignments?: FieldAssignment[];
  fieldOverrides?: FieldCropOverride[];
}

export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  crop,
  products,
  productMasters,
  priceBook,
  seasonYear,
  purposes,
  fields,
  fieldAssignments,
  fieldOverrides,
}) => {
  const handleExport = useCallback(() => {
    // Open a new window for print view
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups to export the PDF');
      return;
    }

    // Write basic HTML structure
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${crop.name} - Crop Plan</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
              color: #1a1a1a;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: letter;
              margin: 0.75in;
            }
            @media print {
              body { background: white; }
              .pass-card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for document to be ready, then render React component
    const renderContent = () => {
      const container = printWindow.document.getElementById('print-root');
      if (!container) {
        setTimeout(renderContent, 50);
        return;
      }

      const root = createRoot(container);
      root.render(
        <CropPlanPrintView
          crop={crop}
          products={products}
          productMasters={productMasters}
          priceBook={priceBook}
          seasonYear={seasonYear}
          purposes={purposes}
          fields={fields}
          fieldAssignments={fieldAssignments}
          fieldOverrides={fieldOverrides}
        />
      );

      // Give React time to render, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };

    // Start rendering after the window loads
    printWindow.onload = renderContent;
    // Fallback if onload doesn't fire
    setTimeout(renderContent, 100);
  }, [crop, products, productMasters, priceBook, seasonYear, purposes, fields, fieldAssignments, fieldOverrides]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <FileText className="w-4 h-4" />
      Export PDF
    </Button>
  );
};
