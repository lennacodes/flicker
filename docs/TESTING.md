# Manual Testing Checklist

Use this checklist before each release to verify all features work correctly.

## Global Toggle

- [ ] Enable Flicker globally — confirm the candlelight overlay appears
- [ ] Disable Flicker globally — confirm the overlay fades out
- [ ] Toggle off and on again — confirm the overlay restores smoothly
- [ ] Verify the toolbar badge shows "OFF" when disabled and clears when enabled

## Per-Site Toggle

- [ ] Enable Flicker globally, then disable it on a specific site — confirm it turns off on that site only
- [ ] Navigate to a different site — confirm Flicker is still active there
- [ ] Return to the disabled site — confirm it remains off
- [ ] Re-enable on the disabled site — confirm the overlay reappears
- [ ] Disable globally, then enable on a specific site — confirm it only runs on that site

## Light Direction

- [ ] Enable "Top" only — confirm light comes from the top edge
- [ ] Enable "Bottom" only — confirm light comes from the bottom edge
- [ ] Enable "Left" only — confirm light comes from the left edge
- [ ] Enable "Right" only — confirm light comes from the right edge
- [ ] Enable multiple directions (e.g., Top + Left) — confirm light sources from both edges
- [ ] Enable all four directions — confirm light from all edges
- [ ] Disable all directions — confirm the overlay goes blank (no light sources)

## Sliders

### Distance
- [ ] Set to minimum (10%) — confirm light only reaches a small area near the edges
- [ ] Set to maximum (100%) — confirm light reaches the center of the page
- [ ] Adjust while overlay is visible — confirm real-time update

### Flicker Speed
- [ ] Set to minimum (5) — confirm slow, gentle candle movement
- [ ] Set to maximum (80) — confirm fast, energetic flicker
- [ ] Adjust while overlay is visible — confirm real-time update

### Warmth
- [ ] Set to minimum (0) — confirm a lighter, more orange tone
- [ ] Set to maximum (100) — confirm a deeper, redder tone
- [ ] Adjust while overlay is visible — confirm real-time update

### Intensity
- [ ] Set to minimum (5) — confirm very faint overlay
- [ ] Set to maximum (80) — confirm bright, prominent overlay
- [ ] Adjust while overlay is visible — confirm real-time update

## Shadows

- [ ] Enable shadows toggle — confirm text shadows appear on nearby text elements
- [ ] Disable shadows toggle — confirm text shadows disappear
- [ ] Verify shadow direction matches the active light direction
- [ ] Verify shadows are stronger on elements closer to the light source
- [ ] Verify dark text gets dark drop shadows
- [ ] Verify light text on dark backgrounds gets warm glow shadows
- [ ] Adjust shadow intensity slider — confirm shadow strength changes in real time
- [ ] Verify shadows are disabled (grayed out slider) when shadows toggle is off

## Ambient Flicker

- [ ] Enable ambient flicker — confirm subtle whole-page brightness fluctuation
- [ ] Disable ambient flicker — confirm the fluctuation stops
- [ ] Adjust ambient intensity slider — confirm effect strength changes
- [ ] Verify ambient slider is disabled (grayed out) when ambient toggle is off

## Performance

- [ ] Verify smooth animation (~30fps) on a typical webpage
- [ ] Switch to a background tab — confirm animation pauses (check CPU usage)
- [ ] Switch back to the tab — confirm animation resumes
- [ ] Test on a page with many text elements (e.g., Wikipedia) — confirm no visible lag
- [ ] Verify element classification cap (5000 elements) doesn't cause issues on large pages

## Persistence

- [ ] Adjust all settings, close the popup, reopen — confirm all values persist
- [ ] Restart Firefox — confirm settings persist and overlay activates on startup
- [ ] Verify per-site overrides persist across browser restarts

## Edge Cases

- [ ] Load extension on `about:debugging` page — confirm no errors (content scripts don't run on privileged pages)
- [ ] Test on a page with no text elements — confirm overlay still works (shadows have nothing to target)
- [ ] Test on a very dark page — confirm light text glow shadows work correctly
- [ ] Test on a very light page — confirm dark drop shadows work correctly
- [ ] Rapidly toggle settings — confirm no visual glitches or errors in console

## Popup UI

- [ ] Verify all sliders show correct current values
- [ ] Verify direction buttons highlight correctly for active directions
- [ ] Verify the site label shows the current site's hostname
- [ ] Click "Support Me" — confirm it opens buymeacoffee.com/lennacodes in a new tab
- [ ] Verify toggle switches animate smoothly
- [ ] Verify sub-sliders gray out when their parent toggle is off
