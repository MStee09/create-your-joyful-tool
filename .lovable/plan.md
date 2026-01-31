

# Improve Physical Quantity Visual Organization

## The Problem
The lbs/gal values currently blend into the nutrient analysis line:
```
• N 67.0 | P 0.0 | K 22.0 | S 27.6 · 240 lbs · 0.0 gal
```

Everything uses the same color, size, and weight - your eyes can't distinguish between nutrient analysis (lbs N/P/K/S per acre) and total physical product (lbs and gal of actual product).

---

## Proposed Solution: Separate Visual Block

Move physical quantities to their own distinct display, styled differently from nutrients.

### Visual Hierarchy (Before vs After)

**Before:**
```
Core 5 products  • N 67.0 | P 0.0 | K 22.0 | S 27.6 · 240 lbs · 0.0 gal
                   Ratios N:S 2.4:1 · N:K 3.0:1
```

**After:**
```
Core 5 products  • N 67.0 | P 0.0 | K 22.0 | S 27.6
                   Ratios N:S 2.4:1 · N:K 3.0:1

                   [240 lbs]   (dry)   [— gal]   (liquid)
                   └── styled as pills/badges with distinct color
```

---

## Design Options

### Option A: Pill/Badge Style (Recommended)
Display as small colored badges, similar to the tier badges (Core/Building/Trial):

```
                   ┌─────────────────┐
  240 lbs  dry     │  bg-stone-100   │  ← warm neutral for dry
                   └─────────────────┘
  12.5 gal liquid  │  bg-sky-100     │  ← cool blue for liquid
                   └─────────────────┘
```

- **Dry products**: Stone/warm neutral badge (`bg-stone-100/50 text-stone-700`)
- **Liquid products**: Sky/water blue badge (`bg-sky-100/50 text-sky-700`)
- Only show non-zero values (hide `0.0 gal` if no liquid products)
- Position: Below the nutrient ratios line, or inline after ratios with clear separation

### Option B: Inline with Icon Differentiation
Keep inline but add icons and bolder styling:
```
• N 67.0 | P 0.0 | K 22.0 | S 27.6
  Ratios N:S 2.4:1 · N:K 3.0:1  •  📦 240 lbs  •  💧 12.5 gal
```

### Option C: Side-aligned Summary Block
Position on the right side of the header, vertically stacked:
```
                                                    240 lbs
                                                    12.5 gal
```

---

## Recommended Implementation (Option A)

### Visual Treatment
```tsx
{/* Physical quantity badges - separate from nutrient line */}
<div className="flex items-center gap-2 mt-1">
  {summary.physicalQuantity.totalDryLbs > 0 && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
      <span className="font-semibold">{formatNumber(totalDryLbs, 0)}</span>
      <span className="text-stone-500">lbs</span>
    </span>
  )}
  {summary.physicalQuantity.totalLiquidGal > 0 && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-medium">
      <span className="font-semibold">{formatNumber(totalLiquidGal, 1)}</span>
      <span className="text-sky-500">gal</span>
    </span>
  )}
</div>
```

### Key Changes
1. **Remove** the inline physical quantity from the nutrient line (lines 361-372)
2. **Add** a new row below the ratios line with distinct badge styling
3. **Only show non-zero** values (no more "0.0 gal" clutter)
4. **Color coding**: Stone/brown for dry (earthy), Sky/blue for liquid (water)
5. **Font weight**: Make the number bold, unit muted

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/PassCard.tsx` | Remove inline display, add new badge-style display below nutrients |

---

## Result Preview

```
TOPDRESS
V5 → V6 ⏱

Uniform   Uptake   Water / Adj   ⏰ 4                    $65.28/ac
                                                        $8,617.33 total
Core  5 products  • N 67.0 | P 0.0 | K 22.0 | S 27.6
                    Ratios N:S 2.4:1 · N:K 3.0:1
                    
                    [240 lbs]     ← stone/warm badge
```

When there's both dry and liquid:
```
                    [180 lbs]  [12.5 gal]
                    ↑ stone    ↑ sky blue
```

This creates clear visual separation - nutrients are analysis data (N-P-K-S contributions), physical quantities are logistics data (what you're actually hauling/mixing).

