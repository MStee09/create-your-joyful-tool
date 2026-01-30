

# Update Small Grains Feekes Scale with Groupings

## Overview
Based on your Feekes scale diagram, I'll:
1. Fix the F8 and F9 descriptions ("Flag leaf" instead of "Last leaf")
2. Add Feekes phase groupings to organize the stages visually in dropdowns

---

## Changes to Stage Descriptions

| Stage | Current Description | Updated Description |
|-------|---------------------|---------------------|
| F8 | Last leaf just visible | Flag leaf just visible |
| F9 | Ligule of last leaf visible | Ligule of flag leaf visible |

---

## Feekes Groupings (from your diagram)

| Group | Stages | Description |
|-------|--------|-------------|
| **Seedling** | F1 | One shoot |
| **Tillering** | F2-F3 | Tillering begins through tillers formed |
| **Stem Extension** | F4-F5 | Leaf sheaths lengthen/erected (sometimes grouped with Jointing) |
| **Jointing** | F6-F7 | First and second node visible |
| **Boot** | F8-F10 | Flag leaf visible through in boot |
| **Heading** | F10.1-F10.5.2 | Head emergence through flowering |
| **Ripening** | F11-F11.4 | Milk through harvest ready |

---

## Implementation Approach

### Option 1: Add `group` field to stage objects (Recommended)
Add a `group` property to each stage that can be used for display grouping:

```typescript
interface GrowthStage {
  stage: string;
  description: string;
  order: number;
  group?: string; // NEW: Feekes grouping
}

// Example:
{ stage: 'F1', description: 'One shoot', order: 0, group: 'Seedling' },
{ stage: 'F2', description: 'Tillering begins', order: 1, group: 'Tillering' },
{ stage: 'F6', description: 'First node visible', order: 5, group: 'Jointing' },
{ stage: 'F8', description: 'Flag leaf just visible', order: 7, group: 'Boot' },
```

### Update Dropdown UI
Show group headers in the Select dropdown:

```
── Seedling ──
F1 - One shoot

── Tillering ──
F2 - Tillering begins
F3 - Tillers formed

── Stem Extension ──
F4 - Leaf sheaths lengthen
F5 - Leaf sheaths strongly erected

── Jointing ──
F6 - First node visible
F7 - Second node visible

── Boot ──
F8 - Flag leaf just visible
F9 - Ligule of flag leaf visible
F10 - In boot

── Heading ──
F10.1 - Heading
F10.5 - Flowering
...

── Ripening ──
F11 - Ripening
F11.1 - Milk
...
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/growthStages.ts` | Update F8/F9 descriptions, add `group` field to GrowthStage interface, add groups to small_grains stages |
| `src/components/farm/TimingEditorPopover.tsx` | Update dropdown to show group headers for small grains (only when groups are present) |

---

## Complete Updated Small Grains Data

```typescript
small_grains: [
  // Seedling
  { stage: 'F1', description: 'One shoot', order: 0, group: 'Seedling' },
  
  // Tillering
  { stage: 'F2', description: 'Tillering begins', order: 1, group: 'Tillering' },
  { stage: 'F3', description: 'Tillers formed', order: 2, group: 'Tillering' },
  
  // Stem Extension
  { stage: 'F4', description: 'Leaf sheaths lengthen', order: 3, group: 'Stem Extension' },
  { stage: 'F5', description: 'Leaf sheaths strongly erected', order: 4, group: 'Stem Extension' },
  
  // Jointing
  { stage: 'F6', description: 'First node visible', order: 5, group: 'Jointing' },
  { stage: 'F7', description: 'Second node visible', order: 6, group: 'Jointing' },
  
  // Boot
  { stage: 'F8', description: 'Flag leaf just visible', order: 7, group: 'Boot' },
  { stage: 'F9', description: 'Ligule of flag leaf visible', order: 8, group: 'Boot' },
  { stage: 'F10', description: 'In boot', order: 9, group: 'Boot' },
  
  // Heading
  { stage: 'F10.1', description: 'Heading', order: 10, group: 'Heading' },
  { stage: 'F10.5', description: 'Flowering', order: 11, group: 'Heading' },
  { stage: 'F10.5.1', description: 'Beginning flowering', order: 12, group: 'Heading' },
  { stage: 'F10.5.2', description: 'Flowering complete', order: 13, group: 'Heading' },
  
  // Ripening
  { stage: 'F11', description: 'Ripening', order: 14, group: 'Ripening' },
  { stage: 'F11.1', description: 'Milk', order: 15, group: 'Ripening' },
  { stage: 'F11.2', description: 'Soft dough', order: 16, group: 'Ripening' },
  { stage: 'F11.3', description: 'Hard dough', order: 17, group: 'Ripening' },
  { stage: 'F11.4', description: 'Harvest ready', order: 18, group: 'Ripening' },
]
```

---

## Visual Result

The dropdown for Small Grains will show organized groups:

**Before:**
```
F1 - One shoot
F2 - Tillering begins
F3 - Tillers formed
F4 - Leaf sheaths lengthen
...
```

**After:**
```
── Seedling ──
F1 - One shoot

── Tillering ──
F2 - Tillering begins
F3 - Tillers formed

── Stem Extension ──
F4 - Leaf sheaths lengthen
F5 - Leaf sheaths strongly erected

── Jointing ──
F6 - First node visible
F7 - Second node visible

── Boot ──
F8 - Flag leaf just visible
F9 - Ligule of flag leaf visible
F10 - In boot
...
```

This makes it much easier to find the right stage, especially for users less familiar with Feekes numbering.

