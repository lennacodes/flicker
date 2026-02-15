// Pure functions extracted from the extension source code for testing.
// These are copied from the IIFE-wrapped content.js so they can be imported.

// From content.js:63-69
// Integer hash function used as the basis for the value noise system.
// Takes an integer, returns a float in [0, 1).
function hash(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 0xffffffff;
}

// From content.js:72-77
// 1D value noise with smooth interpolation. Used to drive candle flicker.
// t = time position, seed = offset to get different patterns per source.
function noise(t, seed) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed) * (1 - u) + hash(i + 1 + seed) * u;
}

// From content.js:80-86
// 3-octave noise function that simulates organic candle flicker.
// Returns a value roughly in [0.35, 1.0] — never fully dark.
function candle(t, seed) {
  const raw =
    0.45 * noise(t * 1.8, seed) +
    0.35 * noise(t * 4.6, seed + 137) +
    0.20 * noise(t * 11.5, seed + 293);
  return 0.35 + 0.65 * Math.sqrt(raw);
}

// From content.js:95-97
// Converts a warmth value (0-100) to an RGB array.
// Higher warmth = deeper red/orange, lower = lighter orange.
function warmRGB(w) {
  return [255, Math.round(180 - w * 1.2), Math.round(50 - w * 0.4)];
}

module.exports = { hash, noise, candle, warmRGB };
