

# Auto-Hide Header on Scroll in Crop Planning View

## What Changes

When you scroll down in the passes section, the Cost/Acre Trend chart and the Timeline Navigation Bar (view toggle + phase buttons) will slide up and hide, giving the passes section the full screen height. The moment you scroll back up even slightly, they slide back into view.

The `SeasonOverviewBar` at the very top stays pinned -- it's compact and always useful.

## Technical Approach

**In `CropPlanningView.tsx`:**

1. Add a `useRef` on the scrollable passes container (`div.flex-1.overflow-y-auto`) and track scroll direction with `onScroll`.
2. Add a `headerHidden` state boolean. Set `true` when `scrollTop` increases (scrolling down) and the user has scrolled past a threshold (~50px). Set `false` when `scrollTop` decreases (scrolling up).
3. Wrap the CostTrendCard and Timeline Navigation Bar in a single `div` with a CSS transition:
   - Default: `max-height: 500px; opacity: 1; overflow: hidden; transition: max-height 0.3s ease, opacity 0.2s ease`
   - Hidden: `max-height: 0; opacity: 0; padding: 0; margin: 0`
4. Store `lastScrollTop` in a ref to compare direction on each scroll event.

```text
┌─────────────────────────────────┐
│ SeasonOverviewBar (always)      │  ← stays pinned
├─────────────────────────────────┤
│ CostTrendCard                   │  ← slides away
│ Timeline Nav (toggles + phases) │  ← slides away
├─────────────────────────────────┤
│ Passes (scrollable)             │  ← gets more room
│  ...                            │
└─────────────────────────────────┘
```

**Key details:**
- Use `requestAnimationFrame` or a small debounce to avoid jittery toggling
- Add a scroll threshold (minimum 30px scroll delta) before toggling, so tiny scrolls don't cause flicker
- The transition uses `max-height` + `opacity` for a smooth collapse/expand feel
- No layout shift -- the passes container is `flex-1` so it naturally fills the freed space

**Files modified:** `src/components/farm/CropPlanningView.tsx` only.

