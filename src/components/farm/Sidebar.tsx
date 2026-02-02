import React from 'react';
import { 
  Leaf, 
  BarChart3, 
  FlaskConical, 
  Building2, 
  Warehouse, 
  Settings, 
  User, 
  ShoppingCart, 
  ClipboardCheck,
  MapPin,
  GitCompare,
  Beaker,
  ClipboardList,
  TrendingUp,
  Droplets,
  Wrench,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  seasons: { id: string; year: number; name: string }[];
  currentSeasonId: string | null;
  onSeasonChange: (id: string) => void;
}

const planNavItems = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'crops', icon: Leaf, label: 'Crop Plans' },
  { id: 'fields', icon: MapPin, label: 'Fields' },
  { id: 'field-comparison', icon: GitCompare, label: 'Field Comparison' },
];

const productsNavItems = [
  { id: 'products', icon: FlaskConical, label: 'All Products' },
  { id: 'tank-mixes', icon: Beaker, label: 'Tank Mixes' },
  { id: 'vendors', icon: Building2, label: 'Vendors' },
];

const toolsNavItems = [
  { id: 'mix-calculator', icon: Droplets, label: 'Mix Calculator' },
  { id: 'record-application', icon: ClipboardList, label: 'Record Application' },
];

const reportsNavItems = [
  { id: 'application-variance', icon: TrendingUp, label: 'Application Variance' },
  { id: 'nutrient-efficiency', icon: Leaf, label: 'Nutrient Efficiency' },
  { id: 'application-history', icon: FileSpreadsheet, label: 'Application History' },
];

const procurementNavItems = [
  { id: 'orders', icon: ShoppingCart, label: 'Orders' },
  { id: 'plan-readiness', icon: ClipboardCheck, label: 'Plan Readiness' },
  { id: 'inventory', icon: Warehouse, label: 'Inventory' },
];

const settingsNavItems = [
  { id: 'equipment', icon: Wrench, label: 'Equipment' },
  { id: 'settings', icon: Settings, label: 'Preferences' },
];

interface NavSectionProps {
  title: string;
  items: { id: string; icon: React.ElementType; label: string }[];
  activeView: string;
  onViewChange: (view: string) => void;
}

const NavSection: React.FC<NavSectionProps> = ({ title, items, activeView, onViewChange }) => (
  <div className="pt-4 first:pt-0">
    <p className="px-4 text-xs text-sidebar-foreground/50 uppercase tracking-wider mb-2">{title}</p>
    {items.map(item => (
      <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
          activeView === item.id
            ? 'bg-primary text-primary-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}
      >
        <item.icon className="w-4 h-4" />
        <span className="font-medium text-sm">{item.label}</span>
      </button>
    ))}
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  seasons,
  currentSeasonId,
  onSeasonChange,
}) => {
  return (
    <div className="w-60 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">FarmCalc</h1>
            <p className="text-xs text-sidebar-foreground/60">In-Furrow Planner</p>
          </div>
        </div>
      </div>

      {/* Season Selector */}
      <div className="p-3 border-b border-sidebar-border">
        <label className="text-xs text-sidebar-foreground/60 uppercase tracking-wider mb-1.5 block">Season</label>
        <select
          value={currentSeasonId || ''}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="w-full bg-sidebar-accent border border-sidebar-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-sidebar-foreground"
        >
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.year} - {s.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavSection title="Plan" items={planNavItems} activeView={activeView} onViewChange={onViewChange} />
        
        <div className="border-t border-sidebar-border my-3" />
        <NavSection title="Products" items={productsNavItems} activeView={activeView} onViewChange={onViewChange} />
        
        <div className="border-t border-sidebar-border my-3" />
        <NavSection title="Tools" items={toolsNavItems} activeView={activeView} onViewChange={onViewChange} />
        
        <div className="border-t border-sidebar-border my-3" />
        <NavSection title="Reports" items={reportsNavItems} activeView={activeView} onViewChange={onViewChange} />
        
        <div className="border-t border-sidebar-border my-3" />
        <NavSection title="Procurement" items={procurementNavItems} activeView={activeView} onViewChange={onViewChange} />
        
        <div className="border-t border-sidebar-border my-3" />
        <NavSection title="Settings" items={settingsNavItems} activeView={activeView} onViewChange={onViewChange} />
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Farm User</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">farmer@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
