
# Fix: Crop-Specific Growth Stages - COMPLETED ✅

## Problem Identified
- Crops with undefined `cropType` field were defaulting to Corn stages
- "Edible Beans" was showing "V8 - Eighth leaf collar" (Corn) instead of Dry Beans stages

## Solution Implemented

### 1. Added `inferCropTypeFromName()` function
**File: `src/lib/growthStages.ts`**
- Auto-infers crop type from the crop's name
- Maps: corn/maize → corn, soybean → soybeans, edible bean/dry bean/pinto/kidney/etc → dry_beans, wheat/barley/oat/rye → small_grains, sunflower → sunflowers

### 2. Updated `normalizeCropType()` function
**File: `src/lib/growthStages.ts`**
- Now accepts optional `cropName` parameter for fallback inference
- Falls back to name-based inference when `cropType` is undefined

### 3. Updated TimingEditorPopover
**File: `src/components/farm/TimingEditorPopover.tsx`**
- Added `cropName` prop
- Passes to `normalizeCropType(cropType, cropName)`

### 4. Updated PassCard
**File: `src/components/farm/PassCard.tsx`**
- Passes `crop.name` to TimingEditorPopover

## Result
| Before | After |
|--------|-------|
| "Edible Beans" shows Corn stages | "Edible Beans" shows Dry Beans stages |
| User must manually select crop type | Crop type auto-inferred from name |

## Crop Name to Type Mapping
| Crop Name Contains | Inferred Type |
|-------------------|---------------|
| corn, maize | `corn` |
| soybean, soy bean | `soybeans` |
| edible bean, dry bean, black turtle, field pea, small red, pinto, navy bean, kidney, bean | `dry_beans` |
| wheat, barley, oat, rye | `small_grains` |
| sunflower | `sunflowers` |
| (anything else) | `other` |
