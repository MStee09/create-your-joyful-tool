import React, { useState } from 'react';
import { 
  ChevronDown, ChevronRight, BookOpen, Layers, Package, Beaker, Calendar,
  TrendingUp, CheckCircle, AlertTriangle, ArrowRight, Lightbulb, Zap, Settings,
  FileSpreadsheet, DollarSign, BarChart3, Leaf, Droplets, ClipboardList,
  HelpCircle, PlayCircle, Building2, Tag, ShoppingCart, Scale, Receipt,
  Calculator, Gavel, BookMarked, Download, FileText
} from 'lucide-react';

// Reusable Components
interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | null;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children, defaultOpen = false, badge = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-3 px-5 py-4 bg-muted/50 hover:bg-muted transition-colors text-left">
        {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        <Icon className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">{title}</span>
        {badge && <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">{badge}</span>}
      </button>
      {isOpen && <div className="px-5 py-4 bg-background border-t border-border">{children}</div>}
    </div>
  );
};

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg my-4">
    <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-amber-800 dark:text-amber-200">{children}</div>
  </div>
);

const ProTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg my-4">
    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-purple-800 dark:text-purple-200"><strong>Power User Tip:</strong> {children}</div>
  </div>
);

const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg my-4">
    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-red-800 dark:text-red-200">{children}</div>
  </div>
);

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ number, title, children }) => (
  <div className="flex gap-4 my-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
      <span className="text-sm font-bold text-primary">{number}</span>
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  </div>
);

interface KeyConceptProps {
  term: string;
  children: React.ReactNode;
}

const KeyConcept: React.FC<KeyConceptProps> = ({ term, children }) => (
  <div className="my-3 pl-4 border-l-2 border-primary">
    <span className="font-semibold text-foreground">{term}:</span>{' '}
    <span className="text-muted-foreground">{children}</span>
  </div>
);

interface SubSectionProps {
  title: string;
  children: React.ReactNode;
}

const SubSection: React.FC<SubSectionProps> = ({ title, children }) => (
  <div className="mt-6 first:mt-0">
    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      {title}
    </h4>
    {children}
  </div>
);

export const HowToPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('guide');
  const [activeCategory, setActiveCategory] = useState('basics');

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">FarmCalc User Guide</h1>
        </div>
        <p className="text-muted-foreground">Master your crop input planning. Learn every feature and become a power user.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
        {[
          { id: 'guide', label: 'Feature Guide', icon: BookOpen },
          { id: 'workflow', label: 'Workflow', icon: PlayCircle },
          { id: 'glossary', label: 'Glossary', icon: HelpCircle },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* FEATURE GUIDE TAB */}
      {activeTab === 'guide' && (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'basics', label: 'Getting Started', icon: PlayCircle },
              { id: 'planning', label: 'Planning', icon: ClipboardList },
              { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
              { id: 'analysis', label: 'Analysis', icon: BarChart3 },
            ].map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                <cat.icon className="w-4 h-4" />{cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* ===== BASICS ===== */}
            {activeCategory === 'basics' && (
              <>
                <Section title="Quick Start (5 Minutes)" icon={PlayCircle} defaultOpen={true}>
                  <p className="text-muted-foreground mb-4">Get up and running with FarmCalc in just 5 minutes:</p>
                  <Step number={1} title="Select or Create a Season">Use the season selector to choose your planning year (e.g., "2026 Season").</Step>
                  <Step number={2} title="Add Your First Crop">Click "+ Add Crop" in the sidebar. Enter crop name and total acres.</Step>
                  <Step number={3} title="Create Application Timings">Click "+ Add Application Timing" and type a name like "In Furrow" or "V6 Foliar". FarmCalc auto-detects the phase and growth stage.</Step>
                  <Step number={4} title="Add Products">Expand a timing, click "+ Add Product", select product, set rate, and choose coverage tier (Core 100%, Selective 60%, Trial 25%).</Step>
                  <Step number={5} title="Review">Check the Season Overview bar for nutrients and cost per acre.</Step>
                  <ProTip>Start with "must-have" applications first, then layer in selective and trial products.</ProTip>
                </Section>

                <Section title="Adding & Managing Products" icon={Beaker}>
                  <p className="text-muted-foreground mb-4">Products are inputs you apply. Set them up once, use across all seasons.</p>
                  <SubSection title="Adding a New Product">
                    <Step number={1} title="Navigate to Products">Click "Products" in the main navigation.</Step>
                    <Step number={2} title="Click + Add Product">Fill in: Name, Vendor, Form (Liquid/Dry), Price, Product Type (Specialty/Commodity), Nutrient Analysis, Package Options.</Step>
                  </SubSection>
                  <SubSection title="Product Types">
                    <div className="grid grid-cols-2 gap-4 my-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="font-semibold text-blue-700 dark:text-blue-400">🔷 Specialty</div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">Proprietary formulations. Single source. Examples: BioAg E, Humical</p>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="font-semibold text-orange-700 dark:text-orange-400">🔶 Commodity</div>
                        <p className="text-sm text-orange-800 dark:text-orange-300">Standard products from multiple vendors. Worth bidding. Examples: AMS, Urea, KCL</p>
                      </div>
                    </div>
                  </SubSection>
                  <Warning><strong>Important:</strong> Setting correct product type is critical. Commodity products can be linked to Commodity Specs for bidding.</Warning>
                  <ProTip>For commodities like AMS, create ONE product and link to a Commodity Spec. Don't create separate products per vendor.</ProTip>
                </Section>

                <Section title="Adding & Managing Vendors" icon={Building2}>
                  <p className="text-muted-foreground mb-4">Vendors are companies you buy from. Track contacts, products, and purchase history.</p>
                  <SubSection title="Adding a New Vendor">
                    <p className="text-muted-foreground">Navigate to Vendors → + Add Vendor. Enter: Company Name, Contact Name, Email/Phone, Type (Specialty/Commodity/Both), Notes.</p>
                  </SubSection>
                  <SubSection title="Vendor Types">
                    <KeyConcept term="Specialty Supplier">Sells proprietary products. You buy specific products only from them. Examples: BW Fusion, BioAg Management.</KeyConcept>
                    <KeyConcept term="Commodity Supplier">Sells standard products. Request bids from multiple. Examples: Nutrien, CHS, local co-op.</KeyConcept>
                  </SubSection>
                  <Tip>Add commodity vendors before creating Bid Events. You'll select which vendors to invite from your vendor list.</Tip>
                </Section>

                <Section title="Seasons & Year Management" icon={Calendar}>
                  <p className="text-muted-foreground mb-4">Seasons organize everything by crop year. Your "2026 Season" includes all planning for crops harvested in 2026.</p>
                  <SubSection title="Managing Seasons">
                    <ul className="list-disc list-inside text-muted-foreground space-y-2">
                      <li><strong>Create:</strong> Season dropdown → "New Season"</li>
                      <li><strong>Switch:</strong> Use dropdown to view different years</li>
                      <li><strong>Clone:</strong> Copy last year's plans as starting point</li>
                    </ul>
                  </SubSection>
                  <SubSection title="Shared vs. Per-Season">
                    <KeyConcept term="Shared (all seasons)">Products, Vendors, Commodity Specs, Settings</KeyConcept>
                    <KeyConcept term="Per Season">Crop plans, Inventory, Purchases, Bid Events</KeyConcept>
                  </SubSection>
                  <Tip>Create next year's season in the fall to plan winter applications against the correct year.</Tip>
                </Section>
              </>
            )}

            {/* ===== PLANNING ===== */}
            {activeCategory === 'planning' && (
              <>
                <Section title="Crop Planner" icon={Leaf} defaultOpen={true}>
                  <p className="text-muted-foreground mb-4">Build detailed input plans organized around your growing season.</p>
                  <SubSection title="The Four Timing Phases">
                    <div className="grid grid-cols-2 gap-3 my-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"><span className="font-semibold text-amber-700 dark:text-amber-400">❄️ Pre-Plant</span><p className="text-sm text-amber-800 dark:text-amber-300">Fall apps, burndown, pre-emerge</p></div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><span className="font-semibold text-emerald-700 dark:text-emerald-400">🌱 At Planting</span><p className="text-sm text-emerald-800 dark:text-emerald-300">In-furrow, 2x2, starters</p></div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><span className="font-semibold text-blue-700 dark:text-blue-400">☀️ In-Season</span><p className="text-sm text-blue-800 dark:text-blue-300">Post-emerge, foliar, fungicides</p></div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><span className="font-semibold text-purple-700 dark:text-purple-400">🌨️ Post-Harvest</span><p className="text-sm text-purple-800 dark:text-purple-300">Residue digesters, fall fert</p></div>
                    </div>
                  </SubSection>
                  <SubSection title="View Modes">
                    <KeyConcept term="Full Season">See all phases with collapsible sections. Great for overall planning.</KeyConcept>
                    <KeyConcept term="Focus Phase">Drill into one phase at a time. Useful when preparing for a specific window.</KeyConcept>
                  </SubSection>
                  <Tip>Name timings by purpose ("Herbicide Pass") not just stage ("V6").</Tip>
                </Section>

                <Section title="The Tier System" icon={Layers}>
                  <p className="text-muted-foreground mb-4">Plan different programs for different acres within the same crop.</p>
                  <div className="space-y-3 my-4">
                    <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="w-3 h-10 bg-emerald-500 rounded-full" />
                      <div><div className="font-semibold text-emerald-700 dark:text-emerald-400">Core (100%)</div><p className="text-sm text-emerald-800 dark:text-emerald-300">Base program. Applied everywhere.</p></div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="w-3 h-10 bg-amber-400 rounded-full" />
                      <div><div className="font-semibold text-amber-700 dark:text-amber-400">Selective (60%)</div><p className="text-sm text-amber-800 dark:text-amber-300">Products you want to validate with comparison strips.</p></div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="w-3 h-10 bg-purple-400 rounded-full" />
                      <div><div className="font-semibold text-purple-700 dark:text-purple-400">Trial (25%)</div><p className="text-sm text-purple-800 dark:text-purple-300">New products you're testing.</p></div>
                    </div>
                  </div>
                  <SubSection title="Why Tiers Matter">
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li><strong>Accurate budgeting:</strong> Trial at 25% costs 1/4 of 100%</li>
                      <li><strong>Inventory planning:</strong> Exact quantities needed</li>
                      <li><strong>Risk management:</strong> Test without betting the farm</li>
                    </ul>
                  </SubSection>
                  <ProTip>Use tiers as a product pipeline. Trial → Selective → Core as products prove out.</ProTip>
                </Section>

                <Section title="Inventory Management" icon={Package}>
                  <p className="text-muted-foreground mb-4">Track what you have vs. what you need.</p>
                  <SubSection title="Plan Readiness">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 my-4">
                      <div className="font-semibold text-red-700 dark:text-red-400">🚫 Blocking Items</div>
                      <p className="text-sm text-red-800 dark:text-red-300">Products you need but don't have. Shows shortage amount and which crops need it.</p>
                    </div>
                  </SubSection>
                  <SubSection title="Adding Inventory">
                    <KeyConcept term="Purchase Mode">Captures vendor, price, date, invoice. Creates purchase record + price history.</KeyConcept>
                    <KeyConcept term="Adjustment Mode">For carryover, corrections, samples. Just adds quantity.</KeyConcept>
                  </SubSection>
                </Section>
              </>
            )}

            {/* ===== PROCUREMENT ===== */}
            {activeCategory === 'procurement' && (
              <>
                <Section title="Procurement Overview" icon={ShoppingCart} defaultOpen={true}>
                  <Warning>
                    <strong>This section is for COMMODITY products only.</strong> Commodity Specs, Bid Events, and competitive bidding apply to standard products (AMS, Urea, etc.) that multiple vendors can supply. For specialty/proprietary products, simply purchase directly from the vendor and record in Inventory.
                  </Warning>
                  <p className="text-muted-foreground mb-4">The workflow differs for specialty (buy direct) vs. commodity (bid competitively).</p>
                  <div className="bg-muted rounded-lg p-4 my-4">
                    <div className="flex items-center justify-between text-sm">
                      {[
                        { icon: Calculator, label: 'Demand', sub: 'Rollup' },
                        { icon: Tag, label: 'Commodity', sub: 'Specs' },
                        { icon: Gavel, label: 'Bid', sub: 'Events' },
                        { icon: Receipt, label: 'Purchase', sub: '& Track' },
                      ].map((item, i, arr) => (
                        <React.Fragment key={item.label}>
                          <div className="text-center">
                            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-1">
                              <item.icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="font-medium text-foreground text-xs">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.sub}</div>
                          </div>
                          {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="font-semibold text-blue-700 dark:text-blue-400">Specialty Flow</div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">(Proprietary products, single source)</p>
                      <ol className="text-sm text-blue-800 dark:text-blue-300 list-decimal list-inside">
                        <li>Check Inventory for shortages</li>
                        <li>Contact vendor directly</li>
                        <li>Record purchase in Inventory</li>
                      </ol>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="font-semibold text-orange-700 dark:text-orange-400">Commodity Flow</div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">(Standard products, multiple vendors)</p>
                      <ol className="text-sm text-orange-800 dark:text-orange-300 list-decimal list-inside">
                        <li>Use Demand Rollup for quantities</li>
                        <li>Link product to Commodity Spec</li>
                        <li>Create Bid Event</li>
                        <li>Collect/compare quotes</li>
                        <li>Award bid, record purchase</li>
                      </ol>
                    </div>
                  </div>
                </Section>

                <Section title="Demand Rollup vs. Inventory" icon={Calculator}>
                  <p className="text-muted-foreground mb-4">These serve different purposes—understanding the difference is key.</p>
                  
                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">📦 Inventory Page</div>
                      <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-2"><strong>What you HAVE</strong></p>
                      <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                        <li>• Current stock on hand</li>
                        <li>• Product-by-product quantities</li>
                        <li>• Where to record purchases</li>
                        <li>• Shows shortages vs. plan</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="font-semibold text-purple-700 dark:text-purple-400 mb-2">📊 Demand Rollup</div>
                      <p className="text-sm text-purple-800 dark:text-purple-300 mb-2"><strong>What you NEED to buy</strong></p>
                      <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                        <li>• Aggregated quantities for bidding</li>
                        <li>• Grouped by commodity type</li>
                        <li>• Used to create Bid Events</li>
                        <li>• Your "shopping list" for vendors</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Tip>
                    <strong>When to use which:</strong> Check Inventory to see what you have and what is short. Use Demand Rollup when preparing to send out bid requests to commodity vendors—it gives you the exact quantities to put in your RFQ.
                  </Tip>
                  
                  <SubSection title="Example Workflow">
                    <div className="bg-muted rounded-lg p-3 text-sm my-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                        <span className="text-foreground">Inventory shows you need 15 tons of AMS (short 15, have 2)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                        <span className="text-foreground">Demand Rollup shows: Corn needs 13.2 tons, Beans needs 3.95 tons</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                        <span className="text-foreground">Create Bid Event for 15 tons AMS, invite vendors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span>
                        <span className="text-foreground">Award bid, record purchase in Inventory</span>
                      </div>
                    </div>
                  </SubSection>
                  
                  <ProTip>Demand Rollup is your negotiating tool. Walk into a vendor meeting with exact quantities grouped by commodity—you look prepared and can negotiate volume discounts.</ProTip>
                </Section>

                <Section title="Commodity Specs" icon={Tag}>
                  <p className="text-muted-foreground mb-4">Define exact specifications for products multiple vendors can supply. Key to competitive bidding.</p>
                  <SubSection title="Why Specs Matter">
                    <p className="text-muted-foreground">AMS from Nutrien = AMS from CHS. A spec ensures everyone quotes identical products for true comparison.</p>
                  </SubSection>
                  <SubSection title="Creating a Spec">
                    <p className="text-muted-foreground mb-2">Navigate to Commodity Specs → + Add Spec. Enter:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li><strong>Spec Name:</strong> "AMS 21-0-0-24S"</li>
                      <li><strong>Category:</strong> Dry Fertilizer, Chemical, etc.</li>
                      <li><strong>Analysis:</strong> N-P-K-S values</li>
                      <li><strong>Unit:</strong> How priced (per ton, per gallon)</li>
                    </ul>
                  </SubSection>
                  <SubSection title="Linking Products to Specs">
                    <p className="text-muted-foreground">Go to Products → Edit → Link to Commodity Spec. Without a link, you can't include the product in a Bid Event.</p>
                  </SubSection>
                  <Tip>Set up specs once and reuse every year. Only prices change.</Tip>
                </Section>

                <Section title="Bid Events" icon={Gavel}>
                  <p className="text-muted-foreground mb-4">Request and compare quotes from multiple vendors for commodity needs.</p>
                  <SubSection title="Creating a Bid Event">
                    <Step number={1} title="Name & Date">e.g., "Spring 2026 Dry Fertilizer". Set due date and delivery window.</Step>
                    <Step number={2} title="Add Line Items">Select Commodity Specs and quantities (can auto-populate from Demand Rollup).</Step>
                    <Step number={3} title="Select Vendors">Choose which commodity vendors to invite.</Step>
                    <Step number={4} title="Send Requests">Generate bid sheets for each vendor (PDF/email).</Step>
                  </SubSection>
                  <SubSection title="Collecting & Comparing Quotes">
                    <p className="text-muted-foreground">As quotes return, enter them in the bid. The comparison view shows all vendors side-by-side with lowest price highlighted.</p>
                  </SubSection>
                  <SubSection title="Awarding">
                    <p className="text-muted-foreground">Select winning vendor per line item → Click "Award" → Price updates in your system → Optionally create purchase order.</p>
                  </SubSection>
                  <Tip>You can split awards—AMS from one vendor, Urea from another—based on best price for each.</Tip>
                </Section>

                <Section title="Price Book" icon={BookMarked}>
                  <p className="text-muted-foreground mb-4">Historical record of what you've paid. Built automatically from purchases and bid awards.</p>
                  <SubSection title="What It Shows">
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Product, Vendor, Price, Date, Season</li>
                      <li>Year-over-year trends</li>
                      <li>Vendor comparison over time</li>
                    </ul>
                  </SubSection>
                  <SubSection title="Using Price History">
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li><strong>Budgeting:</strong> Use last year's prices as starting point</li>
                      <li><strong>Negotiations:</strong> Know what you've paid before</li>
                      <li><strong>Trend analysis:</strong> Identify rising costs</li>
                    </ul>
                  </SubSection>
                </Section>
              </>
            )}

            {/* ===== ANALYSIS ===== */}
            {activeCategory === 'analysis' && (
              <>
                <Section title="Plan Sheet & Exports" icon={FileSpreadsheet} defaultOpen={true}>
                  <p className="text-muted-foreground mb-4">Comprehensive, printable view of your entire input plan.</p>
                  <SubSection title="Export Options">
                    <div className="grid grid-cols-3 gap-4 my-4">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="font-medium text-foreground">PDF</div>
                        <p className="text-xs text-muted-foreground">Print-ready</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="font-medium text-foreground">Excel</div>
                        <p className="text-xs text-muted-foreground">Editable</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <Download className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="font-medium text-foreground">CSV</div>
                        <p className="text-xs text-muted-foreground">Raw data</p>
                      </div>
                    </div>
                  </SubSection>
                  <ProTip>Generate Plan Sheet before ordering. Use quantities for vendor RFQs.</ProTip>
                </Section>

                <Section title="Plan vs. Actual" icon={Scale}>
                  <p className="text-muted-foreground mb-4">Compare budgeted vs. actual spending.</p>
                  <KeyConcept term="Planned Cost">Using planning prices when you built the plan.</KeyConcept>
                  <KeyConcept term="Actual Cost">Updated as purchases are recorded with real prices.</KeyConcept>
                  <KeyConcept term="Variance">Positive = under budget. Negative = over budget.</KeyConcept>
                  <ProTip>Review variance at season end. Products consistently over budget need updated planning prices.</ProTip>
                </Section>

                <Section title="Settings" icon={Settings}>
                  <SubSection title="Display">
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Dark Mode toggle</li>
                      <li>Decimal precision</li>
                      <li>Default view mode</li>
                    </ul>
                  </SubSection>
                  <SubSection title="Data Management">
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Export all data (backup)</li>
                      <li>Import from backup</li>
                      <li>Reset season</li>
                    </ul>
                  </SubSection>
                </Section>
              </>
            )}
          </div>
        </>
      )}

      {/* WORKFLOW TAB */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-6 border border-primary/20">
            <h3 className="text-lg font-bold text-foreground mb-2">🎯 The Power User Workflow</h3>
            <p className="text-muted-foreground">Follow this annual cycle to get maximum value from FarmCalc.</p>
          </div>

          {[
            { phase: 1, title: 'Planning Phase', when: 'Oct–Feb', color: 'amber',
              tasks: ['Create next year\'s season (clone from current)', 'Update acre allocations', 'Update product prices from quotes', 'Build application timings', 'Assign products to tiers', 'Evaluate trial results—promote winners'] },
            { phase: 2, title: 'Procurement Phase', when: 'Feb–Apr', color: 'blue',
              tasks: ['Run Demand Rollup', 'Link commodities to specs', 'Create Bid Events', 'Collect and compare quotes', 'Award bids', 'Order from specialty vendors', 'Record purchases as received', 'Check Plan Readiness weekly'] },
            { phase: 3, title: 'Execution Phase', when: 'Apr–Oct', color: 'emerald',
              tasks: ['Use Focus Phase view for current window', 'Verify inventory before each timing', 'Print Plan Sheet for shop', 'Document plan changes', 'Note trial observations', 'Record mid-season purchases'] },
            { phase: 4, title: 'Analysis Phase', when: 'Oct–Nov', color: 'purple',
              tasks: ['Review Plan vs. Actual', 'Analyze Price Book trends', 'Evaluate trial ROI', 'Inventory remaining product', 'Record carryover', 'Archive and create next season'] },
          ].map(({ phase, title, when, color, tasks }) => (
            <div key={phase} className="bg-background rounded-xl border border-border overflow-hidden">
              <div className={`px-5 py-3 border-b border-border ${
                color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' :
                color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' :
                color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                'bg-purple-50 dark:bg-purple-900/20'
              }`}>
                <h4 className={`font-bold flex items-center gap-2 ${
                  color === 'amber' ? 'text-amber-800 dark:text-amber-300' :
                  color === 'blue' ? 'text-blue-800 dark:text-blue-300' :
                  color === 'emerald' ? 'text-emerald-800 dark:text-emerald-300' :
                  'text-purple-800 dark:text-purple-300'
                }`}>
                  <span className={`w-6 h-6 rounded-full text-white text-sm flex items-center justify-center ${
                    color === 'amber' ? 'bg-amber-500' :
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'emerald' ? 'bg-emerald-500' :
                    'bg-purple-500'
                  }`}>{phase}</span>
                  {title} <span className="font-normal text-sm ml-2">({when})</span>
                </h4>
              </div>
              <div className="p-5 space-y-2">
                {tasks.map((task, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-muted rounded-xl p-6 border border-border">
            <h4 className="font-bold text-foreground mb-4 text-center">Annual Cycle</h4>
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {[
                { icon: ClipboardList, label: 'Plan', time: 'Oct–Feb' },
                { icon: ShoppingCart, label: 'Procure', time: 'Feb–Apr' },
                { icon: Droplets, label: 'Execute', time: 'Apr–Oct' },
                { icon: BarChart3, label: 'Analyze', time: 'Oct–Nov' },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mx-auto mb-2">
                      <item.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.time}</div>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GLOSSARY TAB */}
      {activeTab === 'glossary' && (
        <div className="space-y-3">
          <p className="text-muted-foreground mb-6">Quick reference for terms used in FarmCalc.</p>
          {[
            { term: 'Application Timing', def: 'A pass containing one or more products. Examples: "In Furrow", "V6 Foliar".' },
            { term: 'Bid Event', def: 'Formal request for quotes from multiple vendors for commodity products.' },
            { term: 'Blocking Item', def: 'Product shortage preventing plan execution.' },
            { term: 'Commodity Product', def: 'Standard product from multiple vendors. Worth bidding.' },
            { term: 'Commodity Spec', def: 'Standardized specification enabling apples-to-apples vendor comparison.' },
            { term: 'Core Tier', def: 'Products applied to 100% of acres.' },
            { term: 'Demand Rollup', def: 'Aggregated product needs across all crops and timings.' },
            { term: 'Plan Readiness', def: 'Status showing if inventory is sufficient for plan.' },
            { term: 'Planning Price', def: 'Estimated price used when building plans.' },
            { term: 'Price Book', def: 'Historical record of prices paid over time.' },
            { term: 'Purchase Price', def: 'Actual price paid. May differ from planning price.' },
            { term: 'Selective Tier', def: 'Products applied to ~60% of acres for validation.' },
            { term: 'Specialty Product', def: 'Proprietary product from specific vendor. Single source.' },
            { term: 'Trial Tier', def: 'Products applied to ~25% of acres for testing.' },
            { term: 'Variance', def: 'Difference between planned and actual costs.' },
          ].sort((a, b) => a.term.localeCompare(b.term)).map(({ term, def }) => (
            <div key={term} className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="font-semibold text-foreground min-w-[160px]">{term}</div>
              <div className="text-muted-foreground">{def}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">Need more help? Contact support or check video tutorials.</p>
      </div>
    </div>
  );
};

export default HowToPage;
