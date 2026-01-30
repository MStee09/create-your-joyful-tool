
# Fix: Crop-Specific Growth Stages Not Matching Selected Crop

## Problem Identified
Looking at your screenshot, I can see the issue:
- The crop is named **"Edible Beans"** but the dropdown shows **"Select crop..."** (placeholder text)
- This means the `cropType` field is **undefined** for this crop
- When undefined, the system defaults to **Corn** stages (V8 - "Eighth leaf collar")
- You should be seeing **Dry Beans** stages (V1 - "First trifoliate", R2 - "Beginning pod", etc.)

The growth stages are correctly defined in the code - the issue is that the crop type hasn't been set yet.

---

## Solution: Auto-Infer Crop Type from Crop Name

When creating or displaying crops, automatically infer the crop type from the crop name if not explicitly set.

---

## Implementation

### 1. Add Crop Name to Type Inference Function

**File: `src/lib/growthStages.ts`**

Add a new function to infer crop type from the crop name:

```typescript
export function inferCropTypeFromName(name: string): CropType {
  const lower = name.toLowerCase();
  
  if (lower.includes('corn') || lower.includes('maize')) return 'corn';
  if (lower.includes('soybean') || lower.includes('soy bean')) return 'soybeans';
  if (lower.includes('edible bean') || lower.includes('dry bean') || 
      lower.includes('black turtle') || lower.includes('field pea') || 
      lower.includes('small red') || lower.includes('pinto') ||
      lower.includes('navy bean') || lower.includes('kidney')) return 'dry_beans';
  if (lower.includes('wheat') || lower.includes('barley') || 
      lower.includes('oat') || lower.includes('rye')) return 'small_grains';
  if (lower.includes('sunflower')) return 'sunflowers';
  
  return 'other';
}
```

### 2. Update Normalization to Use Inferred Type

**File: `src/lib/growthStages.ts`**

Update `normalizeCropType` to optionally accept a crop name for inference:

```typescript
export function normalizeCropType(
  cropType: string | undefined, 
  cropName?: string
): CropType {
  // If cropType is explicitly set, use it
  if (cropType) {
    if (cropType === 'wheat') return 'small_grains';
    if (cropType === 'edible_beans') return 'dry_beans';
    return cropType as CropType;
  }
  
  // If no cropType but we have a name, infer from name
  if (cropName) {
    return inferCropTypeFromName(cropName);
  }
  
  // Default fallback
  return 'corn';
}
```

### 3. Update TimingEditorPopover to Use Crop Name

**File: `src/components/farm/TimingEditorPopover.tsx`**

Accept optional `cropName` prop for inference:

```typescript
interface TimingEditorPopoverProps {
  timing: ApplicationTiming;
  cropType?: CropType;
  cropName?: string;  // NEW: for inference
  onUpdate: (timing: ApplicationTiming) => void;
  children?: React.ReactNode;
}

// In the component:
const normalizedCropType = normalizeCropType(cropType, cropName);
```

### 4. Update PassCard to Pass Crop Name

**File: `src/components/farm/PassCard.tsx`**

Pass the crop name to TimingEditorPopover:

```typescript
<TimingEditorPopover
  timing={timing}
  cropType={crop.cropType}
  cropName={crop.name}  // NEW
  onUpdate={onUpdateTiming}
>
```

### 5. Auto-Set cropType When Creating/Loading Crops

**File: `src/components/farm/CropPlanningView.tsx`** (or where crops are managed)

When a crop is created or loaded without a cropType, auto-set it:

```typescript
// When crop loads or is created
if (!crop.cropType) {
  const inferredType = inferCropTypeFromName(crop.name);
  onUpdate({ ...crop, cropType: inferredType });
}
```

---

## Result

| Before | After |
|--------|-------|
| "Edible Beans" shows "V8 - Eighth leaf collar" (Corn stages) | "Edible Beans" shows "V1 - First trifoliate" (Dry Beans stages) |
| User must manually select crop type | Crop type auto-inferred from name |
| Fallback to Corn always | Smart fallback based on crop name |

---

## Crop Name to Type Mapping

| Crop Name Contains | Inferred Type |
|-------------------|---------------|
| corn, maize | `corn` |
| soybean | `soybeans` |
| edible bean, dry bean, black turtle, field pea, small red, pinto, navy, kidney | `dry_beans` |
| wheat, barley, oat, rye | `small_grains` |
| sunflower | `sunflowers` |
| (anything else) | `other` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/growthStages.ts` | Add `inferCropTypeFromName()` function, update `normalizeCropType()` to accept optional crop name |
| `src/components/farm/TimingEditorPopover.tsx` | Add `cropName` prop, pass to `normalizeCropType()` |
| `src/components/farm/PassCard.tsx` | Pass `crop.name` to `TimingEditorPopover` |
| `src/components/farm/CropPlanningView.tsx` | Auto-set `cropType` on load if undefined |
