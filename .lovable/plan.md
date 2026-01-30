

# Improve Acres Percentage Clarity with Tier Labels

## Problem
The current coverage distribution display shows only raw percentages like `100% (4) · 90% (1) · 50% (1) · 25% (1)`. Not everyone understands that:
- 100% = Core (full commitment)
- 50-60% = Building/Selective (gaining confidence)
- 25% = Trial (testing)

## Solution
Add human-readable tier labels to the coverage distribution display in the pass header, making the strategy behind each percentage bucket immediately clear.

---

## Visual Change

**Before:**
```
100% (4) · 90% (1) · 50% (1) · 25% (1)
```

**After:**
```
Core 100% (4) · Core 90% (1) · Building 50% (1) · Trial 25% (1)
```

Or with color-coded badges for better scanning:
```
[Core] 100% (4) · [Core] 90% (1) · [Building] 50% (1) · [Trial] 25% (1)
```

---

## Technical Implementation

### File: `src/components/farm/PassCard.tsx`

#### 1. Add Coverage Label Helper Function
Add a helper function (similar to the one in `ProductRowReadable.tsx`) to get the tier label from percentage:

```typescript
// Coverage label based on percentage (matching ProductRowReadable logic)
const getCoverageLabel = (percentage: number): 'Core' | 'Building' | 'Trial' => {
  if (percentage >= 90) return 'Core';
  if (percentage >= 50) return 'Building';
  return 'Trial';
};

// Tier badge styles (matching existing pattern)
const TIER_LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  'Core': { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  'Building': { bg: 'bg-amber-500/15', text: 'text-amber-600' },
  'Trial': { bg: 'bg-violet-500/15', text: 'text-violet-600' },
};
```

#### 2. Update `CoverageDistribution` Component
Modify lines 53-80 to include tier labels with color-coding:

```tsx
const CoverageDistribution: React.FC<{ 
  coverageGroups: CoverageGroup[]; 
  totalProducts: number;
}> = ({ coverageGroups, totalProducts }) => {
  if (coverageGroups.length === 0) return null;
  
  if (coverageGroups.length === 1) {
    const group = coverageGroups[0];
    const label = getCoverageLabel(group.acresPercentage);
    const style = TIER_LABEL_STYLES[label];
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
          {label}
        </span>
        {formatNumber(group.acresPercentage, 0)}% → {group.applications.length} product{group.applications.length !== 1 ? 's' : ''}
      </span>
    );
  }
  
  // Multiple tiers - compact display with labels
  return (
    <span className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
      {coverageGroups.map((g, i) => {
        const label = getCoverageLabel(g.acresPercentage);
        const style = TIER_LABEL_STYLES[label];
        return (
          <span key={g.acresPercentage} className="flex items-center gap-1">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
              {label}
            </span>
            <span className="text-foreground/80">{formatNumber(g.acresPercentage, 0)}%</span>
            <span className="text-muted-foreground/70">({g.applications.length})</span>
          </span>
        );
      })}
    </span>
  );
};
```

---

## Result
Users will immediately understand the strategic meaning of each coverage bucket:
- **Core** = Confident, full coverage products
- **Building** = Gaining confidence, expanding coverage
- **Trial** = Testing on limited acres

The color-coding (green/amber/violet) provides instant visual hierarchy matching the existing pattern in the expanded view.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/PassCard.tsx` | Add `getCoverageLabel` helper, add `TIER_LABEL_STYLES`, update `CoverageDistribution` component to show tier labels with badges |

