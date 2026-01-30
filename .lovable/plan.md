

# Complete Crop-Specific Growth Stages with Descriptions

## Overview
Update the growth stage system with **complete stage lists** and descriptions for each crop type:
- **Corn** - Full V1-V18 + VT + R1-R6
- **Small Grains** (Barley, Wheat, Oats) - Feekes scale F1-F11.4
- **Dry Beans** - VE through R9 (from your PDF guide)
- **Soybeans** - VE through R8
- **Sunflowers** - VE through R9

---

## Complete Stage Lists

### Corn (All Vegetative + Reproductive Stages)
| Stage | Description |
|-------|-------------|
| VE | Emergence |
| V1 | First leaf collar |
| V2 | Second leaf collar |
| V3 | Third leaf collar |
| V4 | Fourth leaf collar |
| V5 | Fifth leaf collar |
| V6 | Sixth leaf collar |
| V7 | Seventh leaf collar |
| V8 | Eighth leaf collar |
| V9 | Ninth leaf collar |
| V10 | Tenth leaf collar |
| V11 | Eleventh leaf collar |
| V12 | Twelfth leaf collar |
| V13 | Thirteenth leaf collar |
| V14 | Fourteenth leaf collar |
| V15 | Fifteenth leaf collar |
| V16 | Sixteenth leaf collar |
| V17 | Seventeenth leaf collar |
| V18 | Eighteenth leaf collar |
| VT | Tasseling |
| R1 | Silking |
| R2 | Blister |
| R3 | Milk |
| R4 | Dough |
| R5 | Dent |
| R6 | Maturity |

### Soybeans (All Stages)
| Stage | Description |
|-------|-------------|
| VE | Emergence |
| VC | Cotyledon |
| V1 | First node |
| V2 | Second node |
| V3 | Third node |
| V4 | Fourth node |
| V5 | Fifth node |
| V6 | Sixth node |
| V7 | Seventh node |
| V8 | Eighth node |
| R1 | Beginning bloom |
| R2 | Full bloom |
| R3 | Beginning pod |
| R4 | Full pod |
| R5 | Beginning seed |
| R6 | Full seed |
| R7 | Beginning maturity |
| R8 | Full maturity |

### Dry Beans (From Your PDF Guide)
| Stage | Description |
|-------|-------------|
| VE | Emergence |
| VC | Unifoliate |
| V1 | First trifoliate |
| V2 | Second trifoliate |
| V3 | Third trifoliate |
| V4 | Fourth trifoliate |
| V5 | Flower buds visible |
| R1 | Beginning bloom |
| R2 | Beginning pod (pin bean) |
| R3 | 50% bloom |
| R4 | Full pod |
| R5 | Beginning seed |
| R6 | 50% seed |
| R7 | Full seed |
| R8 | Beginning maturity |
| R8.5 | Mid maturity |
| R9 | Full maturity |

### Small Grains - Feekes Scale (Complete)
| Stage | Description |
|-------|-------------|
| F1 | One shoot |
| F2 | Tillering begins |
| F3 | Tillers formed |
| F4 | Leaf sheaths lengthen |
| F5 | Leaf sheaths strongly erected |
| F6 | First node visible |
| F7 | Second node visible |
| F8 | Last leaf just visible |
| F9 | Ligule of last leaf visible |
| F10 | In boot |
| F10.1 | Heading |
| F10.5 | Flowering |
| F10.5.1 | Beginning flowering |
| F10.5.2 | Flowering complete |
| F11 | Ripening |
| F11.1 | Milk |
| F11.2 | Soft dough |
| F11.3 | Hard dough |
| F11.4 | Harvest ready |

### Sunflowers (Complete)
| Stage | Description |
|-------|-------------|
| VE | Emergence |
| V1 | First true leaves |
| V2 | Two true leaves |
| V3 | Three true leaves |
| V4 | Four true leaves |
| V5 | Five true leaves |
| V6 | Six true leaves |
| V8 | Eight true leaves |
| V10 | Ten true leaves |
| V12 | Twelve true leaves |
| V14 | Fourteen true leaves |
| V16 | Sixteen true leaves |
| R1 | Bud visible |
| R2 | Bud elongation |
| R3 | Bud opening |
| R4 | Inflorescence begins |
| R5 | Beginning flowering |
| R5.1 | 10% flowering |
| R5.5 | 50% flowering |
| R5.9 | 90% flowering |
| R6 | Flowering complete |
| R7 | Back of head pale yellow |
| R8 | Back of head yellow |
| R9 | Physiological maturity |

---

## Technical Implementation

### Data Structure Change
Update stage objects from:
```typescript
{ stage: string; order: number }
```
To:
```typescript
{ stage: string; description: string; order: number }
```

### Crop Type Updates
| Current | New | Notes |
|---------|-----|-------|
| `corn` | `corn` | Keep |
| `soybeans` | `soybeans` | Keep |
| `wheat` | Remove | Merge into small_grains |
| `small_grains` | `small_grains` | Feekes scale |
| `edible_beans` | `dry_beans` | Rename |
| - | `sunflowers` | Add new |
| `other` | `other` | Keep |

### UI Update
Dropdown will show:
```
V5 - Fifth leaf collar
V6 - Sixth leaf collar
V7 - Seventh leaf collar
...
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/growthStages.ts` | Update CropType, add sunflowers, rename edible_beans to dry_beans, add description to ALL stages, add complete stage lists, add getStageDisplay helper |
| `src/types/farm.ts` | Update CropType to match |
| `src/components/farm/TimingEditorPopover.tsx` | Update dropdown to show "Stage - Description" format |

---

## Backward Compatibility
Code will map legacy values:
- `wheat` -> `small_grains`
- `edible_beans` -> `dry_beans`

