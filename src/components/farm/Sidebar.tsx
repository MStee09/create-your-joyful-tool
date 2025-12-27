import React from 'react';
import { Leaf, BarChart3, FlaskConical, Building2, Warehouse, FileSpreadsheet, Settings, User, BookOpen } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  seasons: { id: string; year: number; name: string }[];
  currentSeasonId: string | null;
  onSeasonChange: (id: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'crops', icon: Leaf, label: 'Crop Plans' },
  { id: 'products', icon: FlaskConical, label: 'Products' },
  { id: 'vendors', icon: Building2, label: 'Vendors' },
  { id: 'inventory', icon: Warehouse, label: 'Inventory' },
  { id: 'exports', icon: FileSpreadsheet, label: 'Export' },
  { id: 'howto', icon: BookOpen, label: 'How To' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  seasons,
  currentSeasonId,
  onSeasonChange,
}) => {
  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">FarmCalc</h1>
            <p className="text-xs text-sidebar-foreground/60">In-Furrow Planner</p>
          </div>
        </div>
      </div>

      {/* Season Selector */}
      <div className="p-4 border-b border-sidebar-border">
        <label className="text-xs text-sidebar-foreground/60 uppercase tracking-wider mb-2 block">Season</label>
        <select
          value={currentSeasonId || ''}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="w-full bg-sidebar-accent border border-sidebar-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-sidebar-foreground"
        >
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.year} - {s.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
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
