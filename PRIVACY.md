# Privacy Policy — Flicker

**Last updated:** February 7, 2026

## Overview

Flicker is a browser extension that adds a visual candlelight overlay to webpages. It is designed with privacy as a core principle. Flicker does not collect, transmit, or share any user data.

## Data Collection

**Flicker collects no data.** Specifically:

- No personal information is collected
- No browsing history is accessed or stored
- No analytics or telemetry data is gathered
- No cookies are set
- No network requests are made by the extension

## Local Storage

Flicker uses the browser's local storage API (`browser.storage.local`) to save your preferences, such as:

- Light direction, distance, speed, warmth, and intensity settings
- Shadow and ambient flicker toggle states and intensity
- Per-site enable/disable overrides
- Global enable/disable state

This data is stored **locally on your device only** and is never transmitted to any server.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save your settings locally in the browser |

Flicker does not request or require any host permissions, identity permissions, or access to browsing data beyond the active tab's hostname (used solely to support per-site toggle settings).

## Content Scripts

Flicker injects a content script into webpages to render the visual overlay. This script:

- Reads basic page element positions to apply distance-based text shadows
- Reads text color to determine shadow style (dark shadow vs. warm glow)
- Does **not** read, collect, or transmit any page content, form data, or user input

## Third Parties

Flicker does not integrate with any third-party services, analytics platforms, advertising networks, or remote APIs. The extension operates entirely offline.

## Updates

This privacy policy may be updated if the extension's functionality changes. Any updates will be reflected in this document with a revised date.

## Contact

If you have questions about this privacy policy, you can reach out via [Buy Me a Coffee](https://buymeacoffee.com/lennacodes).
