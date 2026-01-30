import React, { useMemo } from 'react';
import type { Crop, Product, ApplicationTiming, TimingBucket } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { ProductPurpose } from '@/types/productIntelligence';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import { 
  calculateSeasonSummaryWithPriceBook, 
  calculatePassSummaryWithPriceBook, 
  calculateApplicationCostPerAcreWithPriceBook,
  getApplicationAcresPercentage,
  PriceBookContext 
} from '@/lib/cropCalculations';
import { TIMING_BUCKET_INFO, getStageOrder } from '@/lib/growthStages';
import { calculateApplicationNutrients } from '@/lib/calculations';
interface CropPlanPrintViewProps {
  crop: Crop;
  products: Product[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  seasonYear: number;
  purposes: Record<string, ProductPurpose>;
}

const PHASE_LABELS: Record<TimingBucket, string> = {
  'PRE_PLANT': 'Pre-Plant',
  'AT_PLANTING': 'At Planting',
  'IN_SEASON': 'In-Season',
  'POST_HARVEST': 'Post-Harvest',
};

const PHASE_ORDER: TimingBucket[] = ['PRE_PLANT', 'AT_PLANTING', 'IN_SEASON', 'POST_HARVEST'];

// Helper to format fertilizer grade
const formatGrade = (analysis: { n: number; p: number; k: number; s: number } | undefined): string => {
  if (!analysis) return '';
  const { n, p, k, s } = analysis;
  if (s > 0) return `${n}-${p}-${k}-${s}S`;
  return `${n}-${p}-${k}`;
};

// Helper to format applied nutrients (lbs/ac)
const formatAppliedNutrients = (nutrients: { n: number; p: number; k: number; s: number }): string => {
  const parts: string[] = [];
  if (nutrients.n > 0.1) parts.push(`N ${nutrients.n.toFixed(1)}`);
  if (nutrients.p > 0.1) parts.push(`P ${nutrients.p.toFixed(1)}`);
  if (nutrients.k > 0.1) parts.push(`K ${nutrients.k.toFixed(1)}`);
  if (nutrients.s > 0.1) parts.push(`S ${nutrients.s.toFixed(1)}`);
  return parts.join(' · ') || '—';
};

export const CropPlanPrintView: React.FC<CropPlanPrintViewProps> = ({
  crop,
  products,
  productMasters,
  priceBook,
  seasonYear,
  purposes,
}) => {
  const priceBookContext: PriceBookContext = useMemo(() => ({
    productMasters,
    priceBook,
    seasonYear,
  }), [productMasters, priceBook, seasonYear]);

  const summary = useMemo(() => 
    calculateSeasonSummaryWithPriceBook(crop, products, priceBookContext),
    [crop, products, priceBookContext]
  );

  // Sort timings by bucket then growth stage then order
  const sortedTimings = useMemo(() => {
    return crop.applicationTimings
      .slice()
      .sort((a, b) => {
        const bucketOrderA = TIMING_BUCKET_INFO[a.timingBucket || 'IN_SEASON'].order;
        const bucketOrderB = TIMING_BUCKET_INFO[b.timingBucket || 'IN_SEASON'].order;
        if (bucketOrderA !== bucketOrderB) return bucketOrderA - bucketOrderB;
        
        if ((a.timingBucket || 'IN_SEASON') === 'IN_SEASON') {
          const stageOrderA = getStageOrder(crop.cropType, a.growthStageStart, crop.name);
          const stageOrderB = getStageOrder(crop.cropType, b.growthStageStart, crop.name);
          if (stageOrderA !== stageOrderB) return stageOrderA - stageOrderB;
        }
        
        return a.order - b.order;
      });
  }, [crop.applicationTimings, crop.cropType, crop.name]);

  // Group timings by phase
  const timingsByPhase = useMemo(() => {
    const grouped: Record<TimingBucket, ApplicationTiming[]> = {
      'PRE_PLANT': [],
      'AT_PLANTING': [],
      'IN_SEASON': [],
      'POST_HARVEST': [],
    };
    
    sortedTimings.forEach(timing => {
      const bucket = timing.timingBucket || 'IN_SEASON';
      grouped[bucket].push(timing);
    });
    
    return grouped;
  }, [sortedTimings]);

  // Calculate N:S and N:K ratios
  const nToS = summary.nutrients.s > 0 ? (summary.nutrients.n / summary.nutrients.s).toFixed(1) : '—';
  const nToK = summary.nutrients.k > 0 ? (summary.nutrients.n / summary.nutrients.k).toFixed(1) : '—';

  const cropTypeLabel = crop.cropType 
    ? crop.cropType.charAt(0).toUpperCase() + crop.cropType.slice(1).replace('_', ' ')
    : 'Crop';

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="print-view bg-white text-black p-8 max-w-[8.5in] mx-auto font-sans text-sm leading-relaxed">
      {/* Header */}
      <header className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{crop.name}</h1>
            <p className="text-gray-600">{cropTypeLabel} &bull; {seasonYear} Season</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{formatNumber(crop.totalAcres, 0)} acres</p>
            <p>Generated {generatedDate}</p>
          </div>
        </div>
      </header>

      {/* Season Summary */}
      <section className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Season Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Total Cost</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalCost, 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Cost / Acre</p>
            <p className="text-xl font-bold">{formatCurrency(summary.costPerAcre, 2)}/ac</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Intensity</p>
            <p className="text-xl font-bold">{summary.intensityLabel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p className="text-xl font-bold capitalize">{summary.status.replace('-', ' ')}</p>
          </div>
        </div>
      </section>

      {/* Nutrient Summary */}
      <section className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Nutrient Summary (lbs/acre)</h2>
        <div className="grid grid-cols-6 gap-4">
          <div className="text-center p-2 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-gray-500">N</p>
            <p className="text-lg font-bold">{formatNumber(summary.nutrients.n, 1)}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-gray-500">P</p>
            <p className="text-lg font-bold">{formatNumber(summary.nutrients.p, 1)}</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
            <p className="text-xs text-gray-500">K</p>
            <p className="text-lg font-bold">{formatNumber(summary.nutrients.k, 1)}</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs text-gray-500">S</p>
            <p className="text-lg font-bold">{formatNumber(summary.nutrients.s, 1)}</p>
          </div>
          <div className="text-center p-2 bg-white rounded border border-gray-200">
            <p className="text-xs text-gray-500">N:S</p>
            <p className="text-lg font-bold">{nToS}</p>
          </div>
          <div className="text-center p-2 bg-white rounded border border-gray-200">
            <p className="text-xs text-gray-500">N:K</p>
            <p className="text-lg font-bold">{nToK}</p>
          </div>
        </div>
      </section>

      {/* Application Passes by Phase */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Application Passes</h2>
        
        {PHASE_ORDER.map(phase => {
          const timings = timingsByPhase[phase];
          if (timings.length === 0) return null;
          
          return (
            <div key={phase} className="mb-6">
              <h3 className="text-base font-semibold bg-gray-100 px-3 py-2 mb-3 rounded">
                {PHASE_LABELS[phase]}
              </h3>
              
              {timings.map(timing => {
                const passSummary = calculatePassSummaryWithPriceBook(timing, crop, products, priceBookContext);
                const passNutrients = passSummary.nutrients;
                const passNtoS = passNutrients.s > 0 ? (passNutrients.n / passNutrients.s).toFixed(1) : '—';
                const passNtoK = passNutrients.k > 0 ? (passNutrients.n / passNutrients.k).toFixed(1) : '—';
                
                // Determine pattern label
                const patternLabel = passSummary.passPattern === 'uniform' 
                  ? 'Uniform' 
                  : passSummary.passPattern === 'selective'
                    ? 'Selective'
                    : 'Trial';
                
                // Format growth stage range
                const stageRange = timing.growthStageStart 
                  ? timing.growthStageEnd && timing.growthStageEnd !== timing.growthStageStart
                    ? `${timing.growthStageStart} – ${timing.growthStageEnd}`
                    : timing.growthStageStart
                  : null;
                
                return (
                  <div key={timing.id} className="pass-card mb-4 border border-gray-200 rounded overflow-hidden">
                    {/* Pass Header */}
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{timing.name}</span>
                          {stageRange && (
                            <span className="text-xs text-gray-500">{stageRange}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">{patternLabel}</span>
                        </div>
                        <div className="text-right text-sm">
                          <span className="font-semibold">{formatCurrency(passSummary.costPerFieldAcre, 2)}/ac</span>
                          <span className="text-gray-500 ml-2">({formatCurrency(passSummary.totalCost, 0)} total)</span>
                        </div>
                      </div>
                      {/* Pass nutrient summary */}
                      <div className="flex gap-4 mt-2 text-xs text-gray-600">
                        <span>N: {formatNumber(passNutrients.n, 1)}</span>
                        <span>P: {formatNumber(passNutrients.p, 1)}</span>
                        <span>K: {formatNumber(passNutrients.k, 1)}</span>
                        <span>S: {formatNumber(passNutrients.s, 1)}</span>
                        <span className="ml-2">N:S {passNtoS}</span>
                        <span>N:K {passNtoK}</span>
                      </div>
                    </div>
                    
                    {/* Products Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                          <th className="px-4 py-2">Product</th>
                          <th className="px-4 py-2 text-right">Rate</th>
                          <th className="px-4 py-2 text-right">Acres %</th>
                          <th className="px-4 py-2 text-right">$/Acre</th>
                          <th className="px-4 py-2 text-right">Applied (lbs/ac)</th>
                          <th className="px-4 py-2">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passSummary.applications.map(app => {
                          const product = products.find(p => p.id === app.productId);
                          const productMaster = productMasters.find(pm => pm.id === app.productId);
                          const analysisData = product?.analysis || (productMaster?.analysis as { n: number; p: number; k: number; s: number } | undefined);
                          const grade = formatGrade(analysisData);
                          
                          const costPerAcre = calculateApplicationCostPerAcreWithPriceBook(
                            app,
                            product,
                            productMasters,
                            priceBook,
                            seasonYear
                          );
                          
                          const acresPercent = getApplicationAcresPercentage(app, crop);
                          
                          // Find purpose/role
                          const purpose = purposes[app.productId];
                          const roleLabel = app.role || (purpose?.roles && purpose.roles.length > 0 ? purpose.roles[0] : '') || '';
                          
                          const productName = product?.name || productMaster?.name || 'Unknown';
                          
                          // Calculate applied nutrients
                          const appNutrients = calculateApplicationNutrients(
                            app.rate,
                            app.rateUnit,
                            analysisData,
                            product?.form || productMaster?.form || 'liquid',
                            product?.densityLbsPerGal || productMaster?.densityLbsPerGal
                          );
                          
                          return (
                            <tr key={app.id} className="border-t border-gray-100">
                              <td className="px-4 py-2">
                                <span className="font-medium">{productName}</span>
                                {grade && <span className="text-gray-500 ml-2 text-xs">{grade}</span>}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatNumber(app.rate, 2)} {app.rateUnit}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatNumber(acresPercent, 0)}%
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                {formatCurrency(costPerAcre, 2)}
                              </td>
                              <td className="px-4 py-2 text-right text-xs">
                                {formatAppliedNutrients(appNutrients)}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                {roleLabel}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>Crop Plan Export &bull; {crop.name} &bull; {seasonYear}</p>
      </footer>
    </div>
  );
};
