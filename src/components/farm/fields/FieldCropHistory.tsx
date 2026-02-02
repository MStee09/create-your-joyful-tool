import React, { useMemo } from 'react';
import type { FieldAssignment, FieldCropHistoryEntry } from '@/types/field';
import type { Season } from '@/types';

interface FieldCropHistoryProps {
  fieldId: string;
  fieldAssignments: FieldAssignment[];
  seasons: Season[];
}

export const FieldCropHistory: React.FC<FieldCropHistoryProps> = ({
  fieldId,
  fieldAssignments,
  seasons,
}) => {
  // Build crop history entries from field assignments
  const history = useMemo((): FieldCropHistoryEntry[] => {
    // Get assignments for this field
    const assignments = fieldAssignments.filter(fa => fa.fieldId === fieldId);
    
    if (assignments.length === 0) return [];

    // Map to history entries with season year
    const entries: FieldCropHistoryEntry[] = [];
    
    for (const assignment of assignments) {
      const season = seasons.find(s => s.id === assignment.seasonId);
      if (!season) continue;

      // Find crop name from the season's crops array
      const crop = season.crops?.find(c => c.id === assignment.cropId);
      const cropName = crop?.name || assignment.cropId;

      entries.push({
        year: season.year,
        seasonId: assignment.seasonId,
        cropName,
        cropId: assignment.cropId,
        acres: assignment.acres,
        actualYield: assignment.actualYield,
        yieldUnit: assignment.yieldUnit,
      });
    }

    // Sort by year descending (most recent first)
    return entries.sort((a, b) => b.year - a.year);
  }, [fieldId, fieldAssignments, seasons]);

  if (history.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No crop history recorded for this field.
      </p>
    );
  }

  // Compact inline display: "2025: Soybeans · 2024: Corn · 2023: Corn"
  return (
    <div className="text-foreground">
      {history.map((entry, index) => (
        <span key={`${entry.year}-${entry.cropId}`}>
          <span className="font-medium">{entry.year}:</span>{' '}
          <span>{entry.cropName}</span>
          {entry.actualYield !== undefined && (
            <span className="text-muted-foreground text-sm ml-1">
              ({entry.actualYield} {entry.yieldUnit || 'bu/ac'})
            </span>
          )}
          {index < history.length - 1 && (
            <span className="text-muted-foreground mx-2">·</span>
          )}
        </span>
      ))}
    </div>
  );
};
