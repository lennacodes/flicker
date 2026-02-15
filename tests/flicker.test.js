const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hash, noise, candle, warmRGB } = require('./helpers');

// === hash ===
// Integer hash function that maps an integer to a float in [0, 1).
// Source: content.js:63-69

describe('hash', () => {
  it('returns a number between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const val = hash(i);
      assert.ok(val >= 0 && val < 1, `hash(${i}) = ${val} is out of range`);
    }
  });

  it('returns consistent results for the same input', () => {
    assert.equal(hash(42), hash(42));
    assert.equal(hash(0), hash(0));
    assert.equal(hash(999), hash(999));
  });

  it('returns different results for different inputs', () => {
    const values = new Set();
    for (let i = 0; i < 50; i++) {
      values.add(hash(i));
    }
    // All 50 values should be unique (hash collisions are extremely unlikely)
    assert.equal(values.size, 50);
  });

  it('handles negative inputs', () => {
    const val = hash(-1);
    assert.ok(val >= 0 && val < 1);
  });

  it('handles large inputs', () => {
    const val = hash(1000000);
    assert.ok(val >= 0 && val < 1);
  });
});

// === noise ===
// 1D value noise with smooth interpolation between hash values.
// Source: content.js:72-77

describe('noise', () => {
  it('returns values between 0 and 1', () => {
    for (let t = 0; t < 10; t += 0.3) {
      const val = noise(t, 0);
      assert.ok(val >= 0 && val <= 1, `noise(${t}, 0) = ${val} is out of range`);
    }
  });

  it('returns exact hash values at integer points', () => {
    // At integer t, fractional part is 0, so noise should equal hash(t + seed)
    assert.equal(noise(5, 0), hash(5));
    assert.equal(noise(10, 100), hash(110));
  });

  it('interpolates smoothly between integer points', () => {
    const seed = 0;
    const a = noise(3.0, seed);
    const mid = noise(3.5, seed);
    const b = noise(4.0, seed);
    // Mid should be between a and b (or at least close to that range)
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    assert.ok(mid >= lo - 0.01 && mid <= hi + 0.01,
      `noise(3.5) = ${mid} not between noise(3) = ${a} and noise(4) = ${b}`);
  });

  it('produces different patterns for different seeds', () => {
    const v1 = noise(5.5, 0);
    const v2 = noise(5.5, 100);
    assert.notEqual(v1, v2);
  });

  it('is continuous (nearby inputs produce nearby outputs)', () => {
    const a = noise(7.0, 0);
    const b = noise(7.01, 0);
    assert.ok(Math.abs(a - b) < 0.1, `Jump too large: ${a} vs ${b}`);
  });
});

// === candle ===
// 3-octave noise that simulates organic candle flicker.
// Output is roughly in [0.35, 1.0] — never fully dark.
// Source: content.js:80-86

describe('candle', () => {
  it('returns values in the expected range [0.35, 1.0]', () => {
    for (let t = 0; t < 20; t += 0.5) {
      const val = candle(t, 0);
      assert.ok(val >= 0.34 && val <= 1.01,
        `candle(${t}, 0) = ${val} is out of expected range`);
    }
  });

  it('never goes fully dark (minimum is above 0.35)', () => {
    let min = 1;
    for (let t = 0; t < 100; t += 0.1) {
      min = Math.min(min, candle(t, 0));
    }
    assert.ok(min >= 0.34, `Minimum candle value ${min} is too low`);
  });

  it('produces different patterns for different seeds', () => {
    const v1 = candle(5.0, 0);
    const v2 = candle(5.0, 500);
    assert.notEqual(v1, v2);
  });

  it('varies over time (not constant)', () => {
    const values = new Set();
    for (let t = 0; t < 5; t += 0.5) {
      values.add(Math.round(candle(t, 0) * 1000));
    }
    assert.ok(values.size > 1, 'candle should produce varying values over time');
  });

  it('returns consistent results for the same inputs', () => {
    assert.equal(candle(3.7, 42), candle(3.7, 42));
  });
});

// === warmRGB ===
// Converts a warmth value (0-100) to an [R, G, B] array.
// R is always 255. G and B decrease as warmth increases (deeper red).
// Source: content.js:95-97

describe('warmRGB', () => {
  it('returns [255, 180, 50] at warmth 0 (lightest)', () => {
    assert.deepEqual(warmRGB(0), [255, 180, 50]);
  });

  it('returns [255, 60, 10] at warmth 100 (deepest)', () => {
    assert.deepEqual(warmRGB(100), [255, 60, 10]);
  });

  it('returns correct mid-range value at warmth 50', () => {
    assert.deepEqual(warmRGB(50), [255, 120, 30]);
  });

  it('always has R = 255', () => {
    for (let w = 0; w <= 100; w += 10) {
      assert.equal(warmRGB(w)[0], 255);
    }
  });

  it('G decreases as warmth increases', () => {
    const g0 = warmRGB(0)[1];
    const g50 = warmRGB(50)[1];
    const g100 = warmRGB(100)[1];
    assert.ok(g0 > g50 && g50 > g100, `G should decrease: ${g0}, ${g50}, ${g100}`);
  });

  it('B decreases as warmth increases', () => {
    const b0 = warmRGB(0)[2];
    const b50 = warmRGB(50)[2];
    const b100 = warmRGB(100)[2];
    assert.ok(b0 > b50 && b50 > b100, `B should decrease: ${b0}, ${b50}, ${b100}`);
  });

  it('returns an array of 3 integers', () => {
    const rgb = warmRGB(25);
    assert.equal(rgb.length, 3);
    rgb.forEach(v => assert.equal(v, Math.round(v)));
  });
});
