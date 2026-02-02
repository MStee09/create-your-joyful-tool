
# Phase 1: Fields + Equipment Implementation ✅ COMPLETE

## Overview

This phase creates the foundation for field-level planning by implementing:
1. **Fields** - Persistent field records with soil data, Harvest Profit import, and crop history tracking
2. **Equipment** - Equipment profiles with tank sizes for Mix Calculator (Phase 3)

---

# Phase 2: Field Comparison View ✅ COMPLETE

## Overview

Compares costs, nutrients, and history across fields with the same crop assignment in the current season.

## Features Implemented

- **Filter by Crop**: Dropdown to filter fields by current season crop assignment
- **Summary Cards**: Total fields, acres, avg $/ac, and total cost
- **Crop Group Cards**: Fields grouped by crop with:
  - Crop average stats ($/ac, total cost, N-P-K-S nutrients, N:S and N:K ratios)
  - Field comparison table with: Field Name, Farm, Soil Type, Acres, $/ac, Variance %, Total Cost, Nutrients
- **Variance Indicators**: Color-coded badges showing over/under crop average
- **Navigation**: Click field row to navigate to Field Detail view

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/fieldComparisonUtils.ts` | Calculation utilities for field-level costs, nutrients, and grouping |
| `src/components/farm/fields/FieldComparisonView.tsx` | Main comparison view component |

## Navigation

- Added "Field Comparison" item to sidebar Plan section with GitCompare icon
- Route: `field-comparison`

---

# Phase 1: Fields + Equipment Implementation (Details)

---

## Database Schema

### 1. Create `fields` table

```sql
CREATE TABLE fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acres NUMERIC NOT NULL DEFAULT 0,
  farm TEXT,
  soil_type TEXT,
  ph NUMERIC,
  organic_matter NUMERIC,
  cec NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own fields" ON fields FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fields" ON fields FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fields" ON fields FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fields" ON fields FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_fields_user_id ON fields(user_id);
CREATE INDEX idx_fields_farm ON fields(farm);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fields_updated_at 
  BEFORE UPDATE ON fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Create `field_assignments` table

```sql
CREATE TABLE field_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  acres NUMERIC NOT NULL DEFAULT 0,
  yield_goal NUMERIC,
  yield_unit TEXT DEFAULT 'bu/ac',
  actual_yield NUMERIC,
  previous_crop_id TEXT,
  previous_crop_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE field_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own assignments" ON field_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assignments" ON field_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assignments" ON field_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assignments" ON field_assignments FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_field_assignments_field_id ON field_assignments(field_id);
CREATE INDEX idx_field_assignments_season_id ON field_assignments(season_id);
CREATE INDEX idx_field_assignments_user_id ON field_assignments(user_id);
```

### 3. Create `equipment` table

```sql
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sprayer',
  tank_size NUMERIC NOT NULL DEFAULT 0,
  tank_unit TEXT NOT NULL DEFAULT 'gal',
  default_carrier_gpa NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own equipment" ON equipment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own equipment" ON equipment FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own equipment" ON equipment FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own equipment" ON equipment FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_equipment_user_id ON equipment(user_id);

-- Updated_at trigger
CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## TypeScript Types

### Create `src/types/field.ts`

```typescript
export type SoilType = 
  | 'sandy' 
  | 'sandy-loam' 
  | 'loam' 
  | 'silt-loam' 
  | 'clay-loam' 
  | 'clay' 
  | 'heavy-clay' 
  | 'organic';

export const SOIL_TYPE_LABELS: Record<SoilType, string> = {
  'sandy': 'Sandy',
  'sandy-loam': 'Sandy Loam',
  'loam': 'Loam',
  'silt-loam': 'Silt Loam',
  'clay-loam': 'Clay Loam',
  'clay': 'Clay',
  'heavy-clay': 'Heavy Clay',
  'organic': 'Organic/Muck',
};

export interface Field {
  id: string;
  name: string;
  acres: number;
  farm?: string;
  soilType?: SoilType;
  pH?: number;
  organicMatter?: number;
  cec?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldAssignment {
  id: string;
  seasonId: string;
  fieldId: string;
  cropId: string;
  acres: number;
  yieldGoal?: number;
  yieldUnit?: 'bu/ac' | 'lbs/ac' | 'tons/ac';
  actualYield?: number;
  previousCropId?: string;
  previousCropName?: string;
  createdAt: string;
}

export type EquipmentType = 
  | 'sprayer' 
  | 'planter-fert' 
  | 'sidedress' 
  | 'spreader' 
  | 'other';

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  'sprayer': 'Sprayer',
  'planter-fert': 'Planter/Fert',
  'sidedress': 'Side-dress',
  'spreader': 'Spreader',
  'other': 'Other',
};

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  tankSize: number;
  tankUnit: 'gal';
  defaultCarrierGPA?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// For crop history display on field detail
export interface FieldCropHistoryEntry {
  year: number;
  seasonId: string;
  cropName: string;
  cropId: string;
  acres: number;
  actualYield?: number;
  yieldUnit?: string;
}
```

---

## Components to Create

### Fields Components

| File | Purpose |
|------|---------|
| `src/components/farm/fields/FieldsListView.tsx` | Main fields list with table view, farm grouping, total acres summary |
| `src/components/farm/fields/FieldDetailView.tsx` | Field detail page with soil attributes + crop history |
| `src/components/farm/fields/FieldEditModal.tsx` | Add/edit field form (name, acres, farm, soil data) |
| `src/components/farm/fields/FieldImportModal.tsx` | CSV/Excel import with column mapping for Harvest Profit |
| `src/components/farm/fields/FieldCropHistory.tsx` | Multi-year crop history timeline component |

### Equipment Components

| File | Purpose |
|------|---------|
| `src/components/farm/equipment/EquipmentListView.tsx` | Equipment list in Settings section |
| `src/components/farm/equipment/EquipmentEditModal.tsx` | Add/edit equipment (name, type, tank size, default GPA) |

---

## Component Details

### FieldsListView.tsx

Features:
- Table with columns: Field Name, Farm, Acres, Soil Type, pH
- Optional grouping by Farm
- Total acres summary row at bottom
- Search/filter by name or farm
- "Add Field" button opens FieldEditModal
- "Import" button opens FieldImportModal
- Click row to navigate to FieldDetailView

UI Pattern (follows ProductsListView):
```text
+--------------------------------------------------+
| Fields                                    [Import] [+ Add Field] |
| Manage your farm fields                                          |
+--------------------------------------------------+
| Search: [___________]  Farm: [All ▼]  Soil: [All ▼]             |
+--------------------------------------------------+
| Field Name    | Farm       | Acres | Soil Type   | pH   |
|---------------|------------|-------|-------------|------|
| North 80      | Home Farm  | 80    | Clay Loam   | 6.8  |
| River Bottom  | Home Farm  | 120   | Silt Loam   | 6.5  |
| Section 22 W  | Wheeler    | 160   | Sandy Loam  | 7.1  |
|---------------|------------|-------|-------------|------|
| TOTAL         |            | 360 ac|             |      |
+--------------------------------------------------+
```

### FieldDetailView.tsx

Features:
- Header with field name, farm, total acres
- Edit button opens FieldEditModal
- Soil Attributes section (type, pH, OM, CEC)
- Crop History section showing multi-year history from field_assignments
- Current season assignment info (if assigned)

Layout:
```text
+--------------------------------------------------+
| ← Back to Fields                                 |
+--------------------------------------------------+
| North 80                              [Edit]     |
| Home Farm · 80 acres                             |
+--------------------------------------------------+
| SOIL ATTRIBUTES                                  |
| +----------------+----------------+              |
| | Soil Type      | pH             |              |
| | Clay Loam      | 6.8            |              |
| +----------------+----------------+              |
| | Organic Matter | CEC            |              |
| | 3.2%           | 18             |              |
| +----------------+----------------+              |
+--------------------------------------------------+
| CROP HISTORY                                     |
| 2025: Soybeans · 2024: Corn · 2023: Corn         |
| · 2022: Soybeans                                 |
+--------------------------------------------------+
| NOTES                                            |
| Tile outlet on west side, wet spot SE corner     |
+--------------------------------------------------+
```

### FieldEditModal.tsx

Form fields:
- Name (required)
- Acres (required, numeric > 0)
- Farm (optional text, autocomplete from existing farms)
- Soil Type (dropdown from SoilType enum)
- pH (numeric, 0-14 range)
- Organic Matter % (numeric)
- CEC (numeric)
- Notes (textarea)

### FieldImportModal.tsx

Features:
- Drag-drop zone for CSV/Excel files
- Preview table showing first 5-10 rows
- Column mapping UI if headers don't match expected names
- Expected columns: Field Name, Acres, Farm, Soil Type, pH, OM%, CEC
- Import button to create fields in bulk
- Validation errors shown inline

### FieldCropHistory.tsx

Compact timeline showing crop rotation history:
```text
2025: Soybeans · 2024: Corn · 2023: Corn · 2022: Soybeans
```

Queries `field_assignments` for the given `fieldId` and groups by season year.

### EquipmentListView.tsx

Simple table in Settings section:
```text
+--------------------------------------------------+
| Equipment                          [+ Add Equipment] |
| Configure sprayers and application equipment        |
+--------------------------------------------------+
| Name              | Type      | Tank Size | Default GPA |
|-------------------|-----------|-----------|-------------|
| John Deere R4045  | Sprayer   | 1200 gal  | 15 GPA      |
| Case Planter      | Planter   | 300 gal   | 5 GPA       |
| Y-Drop Bar        | Side-dress| 500 gal   | 10 GPA      |
+--------------------------------------------------+
```

### EquipmentEditModal.tsx

Form fields:
- Name (required)
- Type (dropdown: Sprayer, Planter/Fert, Side-dress, Spreader, Other)
- Tank Size (numeric, required)
- Tank Unit (gal - fixed for now)
- Default Carrier GPA (optional numeric)
- Notes (textarea)

---

## Data Layer Changes

### Extend `useSupabaseData.ts`

Add new state fields:
```typescript
interface SupabaseDataState {
  // ... existing fields
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  equipment: Equipment[];
}
```

Add DB-to-type mappers:
```typescript
const dbFieldToField = (row: any): Field => ({
  id: row.id,
  name: row.name,
  acres: Number(row.acres) || 0,
  farm: row.farm,
  soilType: row.soil_type,
  pH: row.ph ? Number(row.ph) : undefined,
  organicMatter: row.organic_matter ? Number(row.organic_matter) : undefined,
  cec: row.cec ? Number(row.cec) : undefined,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const dbEquipmentToEquipment = (row: any): Equipment => ({
  id: row.id,
  name: row.name,
  type: row.type || 'sprayer',
  tankSize: Number(row.tank_size) || 0,
  tankUnit: 'gal',
  defaultCarrierGPA: row.default_carrier_gpa ? Number(row.default_carrier_gpa) : undefined,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
```

Add CRUD operations following existing patterns:
- `updateFields(fields: Field[])`
- `addField(field: Field)`
- `updateField(field: Field)`
- `deleteField(fieldId: string)`
- `updateFieldAssignments(assignments: FieldAssignment[])`
- `updateEquipment(equipment: Equipment[])`
- `addEquipment(equipment: Equipment)`
- `updateEquipmentItem(equipment: Equipment)`
- `deleteEquipment(equipmentId: string)`

---

## Navigation Changes

### Update Sidebar in `FarmCalcApp.tsx`

Add "Fields" to PLAN section:
```typescript
{/* PLAN section */}
<div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Plan</div>
<NavButton id="dashboard" label="Dashboard" icon={BarChart3} />
<NavButton id="crops" label="Crop Plans" icon={Leaf} />
<NavButton id="fields" label="Fields" icon={MapPin} />  {/* NEW */}
```

Add "Equipment" to bottom section (near Settings):
```typescript
{/* Bottom section */}
<div className="pt-4 mt-4 border-t border-stone-700">
  <NavButton id="equipment" label="Equipment" icon={Truck} />  {/* NEW */}
  <NavButton id="assistant" label="Assistant" icon={StickyNote} />
  <NavButton id="settings" label="Settings" icon={Settings} />
</div>
```

### Add Routes in `FarmCalcApp.tsx`

```typescript
case 'fields':
  return (
    <FieldsListView
      fields={fields}
      fieldAssignments={fieldAssignments}
      seasons={state.seasons}
      onSelectField={(fieldId) => setActiveView(`field-${fieldId}`)}
      onAddField={addField}
      onUpdateFields={updateFields}
    />
  );

case 'equipment':
  return (
    <EquipmentListView
      equipment={equipment}
      onAddEquipment={addEquipment}
      onUpdateEquipment={updateEquipmentItem}
      onDeleteEquipment={deleteEquipment}
    />
  );

// Field detail view (pattern: field-{id})
if (activeView.startsWith('field-')) {
  const fieldId = activeView.replace('field-', '');
  const field = fields.find(f => f.id === fieldId);
  if (field) {
    return (
      <FieldDetailView
        field={field}
        fieldAssignments={fieldAssignments.filter(fa => fa.fieldId === fieldId)}
        seasons={state.seasons}
        onUpdateField={updateField}
        onBack={() => setActiveView('fields')}
      />
    );
  }
}
```

---

## Import Mapper

### Add to `src/lib/importMappers.ts`

```typescript
export interface FieldImportRow {
  name: string;
  acres: number;
  farm?: string;
  soilType?: SoilType;
  pH?: number;
  organicMatter?: number;
  cec?: number;
}

export function parseFieldsCSV(csvText: string): FieldImportRow[] {
  // Parse CSV, handle column name variations:
  // "Field Name" | "Name" | "field_name"
  // "Acres" | "Total Acres" | "acres"
  // "Farm" | "Farm Name" | "farm"
  // "Soil Type" | "soil_type" | "Soil"
  // "pH" | "PH" | "ph"
  // "OM%" | "Organic Matter" | "organic_matter"
  // "CEC" | "cec"
}
```

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/types/field.ts` | Field, FieldAssignment, Equipment type definitions |
| `src/components/farm/fields/FieldsListView.tsx` | Fields list with table, grouping, import |
| `src/components/farm/fields/FieldDetailView.tsx` | Field detail with soil data + crop history |
| `src/components/farm/fields/FieldEditModal.tsx` | Add/edit field form |
| `src/components/farm/fields/FieldImportModal.tsx` | CSV/Excel import modal |
| `src/components/farm/fields/FieldCropHistory.tsx` | Multi-year crop history display |
| `src/components/farm/equipment/EquipmentListView.tsx` | Equipment list |
| `src/components/farm/equipment/EquipmentEditModal.tsx` | Add/edit equipment form |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Export field types |
| `src/hooks/useSupabaseData.ts` | Add fields, fieldAssignments, equipment state + CRUD |
| `src/FarmCalcApp.tsx` | Add navigation items + routes for fields and equipment |
| `src/lib/importMappers.ts` | Add field CSV parser |

---

## Implementation Order

1. **Database Migration** - Create all three tables with RLS and indexes
2. **Types** - Create `src/types/field.ts` with all type definitions
3. **Data Hooks** - Extend `useSupabaseData.ts` with field/equipment fetchers and CRUD
4. **Equipment UI** - Simpler scope, good warm-up (EquipmentListView, EquipmentEditModal)
5. **Fields List** - FieldsListView with table and basic CRUD
6. **Field Edit** - FieldEditModal for add/edit
7. **Field Detail** - FieldDetailView with soil attributes
8. **Crop History** - FieldCropHistory component querying field_assignments
9. **Field Import** - FieldImportModal for Harvest Profit CSV
10. **Navigation** - Wire up routes and sidebar

---

## Estimated Effort

- Database migration: 1 step
- Types file: 1 file
- Data hooks: ~100 lines of additions
- Equipment components: 2 components (~200 lines)
- Fields components: 5 components (~600 lines)
- Navigation updates: ~50 lines

Total new code: ~1,000 lines across 8 new files + modifications to 3 existing files.
