

# UX & QA Deep Analysis — FarmCalc

## What's Working Well

1. **Comprehension-first crop planning** — The storyboard model with phase-grouped passes (Pre-Plant → At Planting → In-Season → Post-Harvest), visual weight bars, and role chips delivers on the "understand a season in 60 seconds" goal. Three view modes (Full, Focus, Compact) serve different workflows well.

2. **Unified pricing engine** — The 4-tier price hierarchy (Price Book → Vendor Offering → Estimated → Legacy) with purchase blending is solid architecture. Cost snapshots and trend sparklines on the dashboard give real decision-making context.

3. **Sidebar organization** — Clean Plan/Procurement/Products/Inventory/Review/Tools grouping follows a logical operational cycle. Navigation is intuitive.

4. **Entry Mode side panel** — Local, temporary editing keeps users in "thinking mode" by default. Click row → edit → save/ESC is low-friction.

5. **Order Status (Plan Readiness)** — The readiness engine with READY/ON_ORDER/BLOCKING states, coverage-by-value metrics, and the dashboard progress bar widget give strong procurement visibility.

---

## Bugs & Issues Found

### Critical
1. **Console warning: refs on function components** — `ProductRowReadable` passes refs to Radix Tooltip components incorrectly, causing React warnings on every render. Not breaking, but pollutes console and signals fragile code.

2. **Scroll-to-hide header resets on tab switch** — When switching between "Passes" and "By Field" tabs in CropPlanningView, the `headerOffset` doesn't reset, leaving the header in a partially hidden state that confuses the scroll physics.

3. **`skipAuth` dead code** — `App` component has `skipAuth` state and `onSkipAuth` handler, but `AppWithAuth` always shows `<AuthPage />` when no user. The skip-auth path is unreachable — confusing dead code.

### Moderate
4. **Purchases filter by `seasonId` vs `seasonYear`** — `PurchasesView` filters by `seasonId` (line 49), but the pricing engine in `cropCalculations.ts` filters by `seasonYear`. If IDs and years drift (e.g., multiple seasons for the same year), these will disagree silently.

5. **Field Comparison view doesn't pass `purchases`** — `FieldComparisonView` gets `productMasters` and `priceBook` but NOT `purchases` (line 1636-1647 of FarmCalcApp). This means field-level cost comparisons ignore booked purchase prices entirely — contradicts the unified pricing goal.

6. **Inventory view receives `purchases` but doesn't use them for cost display** — The prop is passed but the component doesn't leverage it for showing purchase-weighted inventory values.

7. **Dashboard crop table rows not clickable** — The crop summary table shows cost/acre, trend, total, acres, passes — but clicking a row doesn't navigate to that crop plan. This is a dead-end; users have to go back to sidebar → Crop Plans → select crop.

---

## UX Gaps (High-Value Upgrades)

### Tier 1 — Quick Wins
| Issue | Impact | Effort |
|-------|--------|--------|
| **Dashboard crop rows not clickable** — Add `onClick` to navigate to crop plan | Users waste clicks navigating | 15 min |
| **No "back to crops" from crop plan** — No breadcrumb or back button when viewing a specific crop | Users must use sidebar | 15 min |
| **Add timing button below all passes** — The "+ Add Application Timing" button is easy to miss at the bottom of a long list | Discoverability | 10 min |
| **Empty state for Purchases** — No guidance when there are zero purchases recorded | Onboarding friction | 15 min |

### Tier 2 — Moderate Lifts
| Issue | Impact | Effort |
|-------|--------|--------|
| **No inline product search in passes** — Adding a product to a pass requires opening a modal, but there's no quick-search shortcut | Workflow speed | 1-2 hr |
| **Pricing source indicator missing** — Users can't tell WHERE a cost came from (purchase avg? price book? estimate?) | Trust & transparency | 1-2 hr |
| **No bulk status update for purchases** — Can't mark multiple purchases as "received" at once | Efficiency during delivery season | 1-2 hr |
| **Mobile sidebar has no visual indicator of current view** — The mobile hamburger opens sidebar but active state might not be visible | Mobile UX | 30 min |

### Tier 3 — Strategic
| Issue | Impact | Effort |
|-------|--------|--------|
| **No season-to-season comparison** — Can't compare 2025 vs 2026 crop plans side-by-side | Planning decisions | 4-6 hr |
| **No notifications/alerts for price changes** — When a vendor offering updates, no alert fires to crop plans | Awareness | 2-3 hr |
| **FarmCalcApp.tsx is 2100+ lines** — Monolithic component with all routing, state, handlers. Fragile, hard to maintain | Tech debt | 6-8 hr |

---

## Recommended Priority Actions

**Phase 1 — Fix & Polish (do now):**
1. Fix `ProductRowReadable` ref warning (wrap Tooltip triggers in `forwardRef`)
2. Reset `headerOffset` to 0 on tab switch in CropPlanningView
3. Pass `purchases` to `FieldComparisonView` for pricing parity
4. Make dashboard crop rows clickable → navigate to crop plan
5. Add pricing source indicator badge (tiny "Bid" / "Est" / "Avg" label next to costs)

**Phase 2 — Workflow Upgrades (next sprint):**
6. Add breadcrumb navigation in crop plan views
7. Add empty states with CTAs for Purchases, Inventory, Fields
8. Bulk purchase status updates
9. Remove `skipAuth` dead code

**Phase 3 — Architecture (when ready):**
10. Extract FarmCalcApp.tsx into smaller route/feature modules
11. Season comparison view
12. Price change notification system

