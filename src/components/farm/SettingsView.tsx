import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Settings, BookOpen, RotateCcw } from 'lucide-react';
import type { Season } from '@/types/farm';
import { generateId } from '@/utils/farmUtils';
import { HowToPage } from './HowToPage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettingsViewProps {
  seasons: Season[];
  onAddSeason: (season: Season) => void;
  onDeleteSeason: (seasonId: string) => void;
  onResetData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ seasons, onAddSeason, onDeleteSeason, onResetData }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'howto'>('settings');
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear() + 1);
  const [newSeasonName, setNewSeasonName] = useState('Growing Season');
  const [seasonToDelete, setSeasonToDelete] = useState<string | null>(null);

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

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-background">
        <div className="px-4 sm:px-8 pt-6">
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
          <div className="p-4 sm:p-8">
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
                      onClick={() => setSeasonToDelete(season.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      disabled={seasons.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Season Confirmation */}
            <AlertDialog open={!!seasonToDelete} onOpenChange={(open) => !open && setSeasonToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Season</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this season? All crop plans within this season will be permanently removed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (seasonToDelete) {
                        onDeleteSeason(seasonToDelete);
                        setSeasonToDelete(null);
                      }
                    }}
                  >
                    Delete Season
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
                <p className="text-sm text-muted-foreground">Your data is stored securely in the cloud</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your data is synced to the cloud and available on any device where you sign in. No manual backups needed.
                  </p>
                </div>
                
                {onResetData && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Reset to Default Data</p>
                        <p className="text-sm text-muted-foreground">Restore all products, vendors, and crop plans to original values.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Reset all data to default values? This cannot be undone.')) {
                            onResetData();
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
