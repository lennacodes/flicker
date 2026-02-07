# Flicker

A Firefox extension that adds a warm, customizable candlelight overlay to any webpage. Simulates the organic flicker of multiple candle sources along the edges of your screen, with adaptive text shadows and ambient room lighting effects.

## Features

- **Directional Light Sources** — Enable candlelight from any combination of edges (top, bottom, left, right), each with 7 independently flickering sources
- **Organic Flicker** — Hash-based value noise produces natural, non-repetitive candle animations that never loop
- **Adaptive Text Shadows** — Distance-dependent shadows cast from text, automatically detecting light/dark text and applying the appropriate shadow style
- **Ambient Flicker** — Subtle whole-page brightness fluctuation simulating distant candlelight on a wall
- **Per-Site Control** — Enable or disable the effect on individual websites
- **Lightweight** — Targets 30fps with GPU-composited overlays, pauses completely on background tabs

## Customization

| Setting | Description |
|---|---|
| **Distance** | How far the light reaches from the edge |
| **Flicker Speed** | Speed of the candle animation |
| **Warmth** | Color temperature of the light |
| **Intensity** | Brightness of the light sources |
| **Shadow Intensity** | Strength of text shadows |
| **Ambient Intensity** | Strength of the whole-page flicker effect |

## Installation

### From Source

1. Clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select any file in the project directory (e.g., `manifest.json`)

### Permanent Install

1. Package the extension as a `.zip` file
2. Submit to [Firefox Add-ons](https://addons.mozilla.org/) for signing
3. Install the signed `.xpi` file

## Permissions

- **`storage`** — Saves your preferences locally in the browser. No data is sent anywhere.

This extension requires no host permissions, does not collect any data, and makes no network requests. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Tech

- Manifest V3 (Firefox)
- Vanilla JavaScript — no dependencies, no build step
- CSS radial-gradient overlay with per-frame noise-driven animation
- `requestAnimationFrame` render loop with visibility API pause
- `browser.storage.local` for settings persistence

## Support

If you enjoy Flicker, consider supporting development:

[Buy Me a Coffee](https://buymeacoffee.com/lennacodes)

## License

All rights reserved.
