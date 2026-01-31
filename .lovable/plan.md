
# Bug Fix: Incorrect Acres Display in Pass Coverage Groups

## Problem Identified

The issue is in `src/lib/cropCalculations.ts` where the `acresTreated` value for coverage groups is being **incorrectly accumulated** by summing each product's treated acres.

**Current buggy logic (lines 289 and 540):**
```typescript
group.acresTreatedSum += crop.totalAcres * (actualAcresPercentage / 100);
```

This sums acres across all products in the tier. With 5 products at 100% on 130 acres:
- 130 + 130 + 130 + 130 + 130 = **650 ac** (displayed incorrectly)

**Correct logic:**
The "treated acres" for a coverage tier should be the physical field area receiving that coverage level:
- 130 acres at 100% = **130 ac**

---

## Impact Assessment

| Area | Affected? | Details |
|------|-----------|---------|
| PassCard tier display | YES | Shows wrong acres (e.g., "650 ac" instead of "130 ac") |
| Cost calculations | NO | Costs use separate correct per-product logic |
| Nutrient calculations | NO | Uses separate weighting logic |
| All crops / all passes | YES | Bug is in shared calculation functions |
| ProductRowReadable | NO | Calculates its own `acresTreated` correctly |

---

## Technical Solution

### Fix Location
`src/lib/cropCalculations.ts` - Two functions need updating:
1. `calculateCoverageGroups()` (lines 250-318)
2. `calculateCoverageGroupsWithPriceBook()` (lines 495-574)

### Change Details

**Remove the accumulation loop for acresTreatedSum** since it's producing the wrong value, and instead compute it correctly when building the result array:

1. Remove lines that accumulate `acresTreatedSum` inside the forEach loop
2. In the final `.map()`, calculate `acresTreated` directly from the bucket percentage:

```typescript
// BEFORE (wrong):
acresTreated: acresTreatedSum,

// AFTER (correct):
acresTreated: crop.totalAcres * (acresPercentage / 100),
```

Where `acresPercentage` is the display bucket (100, 60, 25, etc.).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/cropCalculations.ts` | Fix `acresTreated` calculation in both coverage group functions |

---

## Verification Checklist

After fix, confirm:
- [ ] Barley (130 ac) shows "Core 100% · 130 ac" in pass headers
- [ ] All crops display correct tier acres matching `crop.totalAcres × percentage`
- [ ] Costs and nutrients remain unchanged (already using correct logic)
- [ ] Multi-tier passes (e.g., Core + Trial) each show their correct acre footprint
