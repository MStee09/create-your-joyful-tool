import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Download, Package, Settings, BookOpen } from 'lucide-react';
import type { Season } from '@/types/farm';
import { generateId } from '@/utils/farmUtils';
import { HowToPage } from './HowToPage';

interface SettingsViewProps {
  seasons: Season[];
  onAddSeason: (season: Season) => void;
  onDeleteSeason: (seasonId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ seasons, onAddSeason, onDeleteSeason }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'howto'>('settings');
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear() + 1);
  const [newSeasonName, setNewSeasonName] = useState('Growing Season');

  const handleAddSeason = () => {
    const season: Season = {
      id: generateId(),
      year: newSeasonYear,
      name: newSeasonName,
      crops: [],
      createdAt: new Date(),
    };
    onAddSeason(season);
    setShowAddSeason(false);
    setNewSeasonYear(new Date().getFullYear() + 1);
    setNewSeasonName('Growing Season');
  };

  const handleExportAllData = () => {
    const data = localStorage.getItem('farmcalc-state');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmcalc_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        localStorage.setItem('farmcalc-state', JSON.stringify(data));
        window.location.reload();
      } catch (err) {
        console.error('Failed to import data:', err);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-background">
        <div className="px-8 pt-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-card text-foreground border border-border border-b-0'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('howto')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'howto'
                  ? 'bg-card text-foreground border border-border border-b-0'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              How To Guide
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'howto' ? (
          <HowToPage />
        ) : (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground">Settings</h2>
              <p className="text-muted-foreground mt-1">Manage seasons and app configuration</p>
            </div>

            {/* Seasons Management */}
            <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Seasons</h3>
                  <p className="text-sm text-muted-foreground">Manage your growing seasons</p>
                </div>
                <button
                  onClick={() => setShowAddSeason(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  New Season
                </button>
              </div>
              <div className="divide-y divide-border">
                {seasons.map(season => (
                  <div key={season.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{season.year} - {season.name}</p>
                        <p className="text-sm text-muted-foreground">{season.crops.length} crops</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteSeason(season.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      disabled={seasons.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Season Modal */}
            {showAddSeason && (
              <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
                <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-semibold text-lg">Create New Season</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                      <input
                        type="number"
                        value={newSeasonYear}
                        onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                      <input
                        type="text"
                        value={newSeasonName}
                        onChange={(e) => setNewSeasonName(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        placeholder="Growing Season"
                      />
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddSeason(false)}
                      className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSeason}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Create Season
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management */}
            <div className="bg-card rounded-xl shadow-sm border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Data Management</h3>
                <p className="text-sm text-muted-foreground">Import and export your data</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Your data is currently stored locally in your browser. Export your data regularly for backup.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleExportAllData}
                    className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                  >
                    <Download className="w-4 h-4" />
                    Export All Data
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted cursor-pointer">
                    <Package className="w-4 h-4" />
                    Import Data
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};