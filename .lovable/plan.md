

# Smoother Scroll-to-Hide Header in Crop Planning

## Problem
The current scroll-to-hide behavior uses a binary show/hide with `maxHeight` and `opacity` transitions. This creates a jarring jump — the header either fully shows or fully hides based on a scroll threshold, and the 300ms CSS transition on `maxHeight: 600px → 0` doesn't feel smooth because `maxHeight` transitions are notoriously janky (the browser doesn't know the actual height, so it animates from an arbitrary large value).

## Solution
Replace the `maxHeight`/`opacity` approach with a **CSS `transform: translateY()` slide** driven by scroll position. This gives:
- GPU-accelerated animation (transforms are composited, no layout recalculation)
- Smooth, proportional hiding as you scroll (not binary)
- Instant response to scroll direction changes

### Changes to `CropPlanningView.tsx`:

1. **Measure the header height** using a `useRef` + `useEffect` with `ResizeObserver` so we know the exact pixel height to translate.

2. **Replace the binary `headerHidden` state** with a numeric `headerOffset` (0 to headerHeight). On scroll down, increase the offset proportionally to scroll delta. On scroll up, decrease it. Clamp between 0 and headerHeight.

3. **Apply `transform: translateY(-${headerOffset}px)`** to the collapsible header div, and add a **negative `marginBottom`** equal to `-headerOffset` so the content below smoothly fills the space without a gap.

4. **Use `will-change: transform`** on the header for GPU compositing.

5. **Keep SeasonOverviewBar always visible** (pinned above the sliding header, unchanged).

6. **Add a small shadow** to the SeasonOverviewBar when header is partially/fully hidden, giving a visual cue that content is scrolled underneath.

### Technical Details
```
// Instead of:
style={{ maxHeight: headerHidden ? 0 : 600, opacity: headerHidden ? 0 : 1 }}

// Use:
const headerRef = useRef<HTMLDivElement>(null);
const [headerHeight, setHeaderHeight] = useState(0);
const headerOffsetRef = useRef(0);
const [headerOffset, setHeaderOffset] = useState(0);

// On scroll:
headerOffsetRef.current = clamp(headerOffsetRef.current + delta, 0, headerHeight);
setHeaderOffset(headerOffsetRef.current);

// Style:
style={{
  transform: `translateY(-${headerOffset}px)`,
  marginBottom: `-${headerOffset}px`,
}}
```

### Files Modified
- `src/components/farm/CropPlanningView.tsx` — replace binary hide with smooth transform-based slide

