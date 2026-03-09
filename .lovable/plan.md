

# Full UX/UI Audit Report

## Navigation and Routing

### Working Correctly
- **Dashboard** -- Renders correctly with Quick Actions, cost summary, readiness widget, crop table, nutrient cards
- **Crop Plans** -- Sidebar crop list + CropPlanningView detail, add/delete crops works
- **Fields** -- List view with search/filters, click-through to FieldDetailView via dynamic routing
- **Field Comparison** -- Renders with back button to fields
- **Order Status (Plan Readiness)** -- Renders with filter tabs, math explainer drawer
- **Purchases** -- Renders with add/edit/delete modals, status filtering
- **Vendor Spend** -- Renders with expandable vendor rows
- **Product Catalog** -- List view with click-through to detail (chemical vs standard routing)
- **Vendors** -- List view with click-through to VendorDetailView
- **Pricing (Price History)** -- Renders with price record management
- **Inventory (On Hand)** -- Renders with on-hand/ordered tabs, add/edit/delete
- **Actual vs. Plan** -- ApplicationVarianceView renders
- **Nutrient Efficiency** -- NutrientEfficiencyView renders
- **Application History** -- ApplicationHistoryView renders
- **Record Application** -- Sidebar button opens modal (intercepted in onViewChange)
- **Mix Calculator** -- MixCalculatorView renders
- **Equipment** -- EquipmentListView renders with add/edit/delete
- **Assistant** -- Renders with deterministic Q&A + optional API mode
- **Settings** -- Season management, data export/import, reset, How To Guide tab

### Issues Found

#### 1. Settings "Export All Data" reads from localStorage, not cloud (Medium)
**File:** `src/components/farm/SettingsView.tsx` lines 34-47
The "Export All Data" button reads `localStorage.getItem('farmcalc-state')` and the "Import Data" button writes to localStorage then reloads. Since data is now stored in the cloud, both buttons are **non-functional** -- Export produces nothing (or stale data), and Import writes to localStorage which is never read.

**Fix:** Either remove these buttons (since cloud sync handles persistence) or implement proper export/import that reads from and writes to the database.

#### 2. Settings "Data stored locally" copy is misleading (Low)
**File:** `src/components/farm/SettingsView.tsx` line 204
The text says "Your data is currently stored locally in your browser" but the app uses cloud storage. This should say "Your data is stored securely in the cloud."

#### 3. `onNavigateToVendor` ignores vendorId (Low-Medium)
**File:** `src/FarmCalcApp.tsx` line 1643
The handler is `() => setActiveView('vendors')` -- clicking a vendor name from a product detail page goes to the vendors list but does NOT select/open that specific vendor. Similarly, `onNavigateToProduct` on line 1659 ignores the productId.

**Fix:** Pass the ID to pre-select the vendor/product: `(vendorId) => { setActiveView('vendors'); /* set selected vendor state */ }`. This requires lifting selected vendor state or using a URL param pattern.

#### 4. No mobile responsiveness (High)
The entire app uses a fixed `w-64` sidebar with `flex h-screen`. On mobile screens, the sidebar takes up most of the viewport and there is no hamburger menu, collapse toggle, or responsive breakpoint. The app is essentially unusable on screens under ~768px.

**Fix:** Add a collapsible sidebar with a hamburger toggle on mobile. Use the shadcn Sidebar component or add responsive classes with a mobile overlay.

#### 5. Sidebar has no scrollbar indicator (Very Low)
The nav section has `overflow-y-auto` which works functionally, but there's no visual hint that more items exist below the fold on smaller screens. The nav has 17+ items across 6 sections.

#### 6. Delete season has no confirmation dialog (Low)
**File:** `src/components/farm/SettingsView.tsx` line 138
Clicking the trash icon on a season deletes it immediately with no confirmation. Other destructive actions (like Reset Data) do have confirmation.

**Fix:** Add a confirmation dialog before deleting a season.

#### 7. `renderView()` default case returns `null` -- blank screen (Low)
**File:** `src/FarmCalcApp.tsx` line 1951
If `activeView` is set to an unrecognized string (e.g., via a stale sessionStorage value or a code path that sets a bad view name), the user sees a completely blank main content area with no feedback.

**Fix:** Return a fallback component (e.g., redirect to dashboard or show "Page not found").

#### 8. Crop plan "Navigate to Mix Calculator" loses context (Low)
**File:** `src/FarmCalcApp.tsx` line 1575-1577
The handler receives `fieldId` and `acres` but discards them: `setActiveView('mix-calculator')`. The Mix Calculator opens empty rather than pre-filled.

#### 9. Dashboard crop table crashes if `season` is null but `cropSummaries` accessed (Very Low)
**File:** `src/components/farm/DashboardView.tsx` line 225
`season!.crops[idx]` uses a non-null assertion. If season is somehow null while cropSummaries has entries (theoretically impossible due to the useMemo guard), this would crash.

#### 10. QuickActionsCard layout on narrow screens (Low)
The 3-column grid (`grid-cols-3`) doesn't wrap on narrow viewports. Buttons get squished with text truncation below ~500px content width.

**Fix:** Use `grid-cols-1 sm:grid-cols-3` for responsiveness.

---

## Summary Priority Matrix

| Priority | Issue | Impact |
|----------|-------|--------|
| **High** | No mobile responsiveness | App unusable on phones/tablets |
| **Medium** | Export/Import buttons broken (localStorage vs cloud) | User expects backup functionality, gets nothing |
| **Medium** | `onNavigateToVendor`/`onNavigateToProduct` ignores IDs | Poor cross-navigation UX |
| **Low** | Delete season has no confirmation | Accidental data loss risk |
| **Low** | "Data stored locally" misleading copy | User confusion |
| **Low** | Default renderView returns null (blank screen) | Edge case bad UX |
| **Low** | Mix Calculator loses field context | Minor feature gap |
| **Low** | QuickActionsCard doesn't wrap on narrow screens | Visual squish |

---

## Recommended Implementation Order

1. **Fix Settings export/import** -- remove localStorage references, either implement cloud export or remove buttons and update the copy
2. **Add renderView fallback** -- default case redirects to dashboard instead of returning null
3. **Add delete season confirmation** -- wrap in AlertDialog
4. **Fix cross-navigation** -- pass vendorId/productId through to pre-select on navigation
5. **Mobile sidebar** -- add responsive collapse/hamburger (largest effort, highest impact)

