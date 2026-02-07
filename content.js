(function () {
  'use strict';

  /* ── defaults ── */
  const DEFAULTS = {
    enabled: true,
    shadows: true,
    siteOverrides: {},
    directions: ['top'],
    distance: 60,
    speed: 30,
    warmth: 50,
    intensity: 25,
    shadowIntensity: 50,
    ambientFlicker: true,
    ambientIntensity: 30,
  };

  const ID = 'flicker-overlay';
  const MIN_FRAME_MS = 33;           // ~30 fps — plenty smooth for candle flicker
  const BANDS = 6;                   // 0 = no shadow … 5 = full strength
  const MAX_TRACKED = 5000;          // cap classified elements
  const NVARS = 4;                   // shadow variation groups
  const CLASSIFY_COOLDOWN = 200;     // ms between classify passes

  let cfg = { ...DEFAULTS };
  let el = null;
  let ambEl = null;
  let styleEl = null;
  let raf = null;
  let t0 = 0;
  let lastFrame = 0;
  let frameCount = 0;
  let lastShadowCSS = '';
  let needsClassify = true;
  let classifyTimer = 0;
  let trackedEls = [];

  // cached color (updated in apply())
  let cR = 255, cG = 120, cB = 30, cRGB = '255,120,30';

  const hostname = location.hostname;
  const root = document.documentElement;

  /* ── pre-built shadow selectors (direction × band × variation) ── */
  const SHADOW_SELS = {};
  const DIR_CHARS = ['t', 'b', 'l', 'r'];
  for (let di = 0; di < 4; di++) {
    const dc = DIR_CHARS[di];
    const bands = [];
    for (let b = 1; b < BANDS; b++) {
      const vars = [];
      for (let v = 0; v < NVARS; v++) {
        vars[v] = '[data-flk-d="' + dc + '"][data-flk="' + b + '"][data-flk-v="' + v + '"]';
      }
      bands[b] = vars;
    }
    SHADOW_SELS[dc] = bands;
  }

  /* ── noise-based candle flicker ── */

  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return (n >>> 0) / 0xffffffff;
  }

  function noise(t, seed) {
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);
    return hash(i + seed) * (1 - u) + hash(i + 1 + seed) * u;
  }

  /* 3 octaves (was 4) — the 27 Hz micro-flicker was imperceptible */
  function candle(t, seed) {
    const raw =
      0.45 * noise(t * 1.8, seed) +
      0.35 * noise(t * 4.6, seed + 137) +
      0.20 * noise(t * 11.5, seed + 293);
    return 0.35 + 0.65 * Math.sqrt(raw);
  }

  /* ── helpers ── */

  function active() {
    if (hostname in cfg.siteOverrides) return cfg.siteOverrides[hostname];
    return cfg.enabled;
  }

  function warmRGB(w) {
    return [255, Math.round(180 - w * 1.2), Math.round(50 - w * 0.4)];
  }

  /* ── light sources (gradient overlay) ── */

  const SOURCES = {
    top: [
      [4,  0, 100, 0.70], [18, 0, 200, 1.00], [33, 0, 300, 0.80],
      [48, 0, 400, 1.10], [62, 0, 500, 0.75], [79, 0, 550, 1.05],
      [95, 0, 580, 0.85],
    ],
    bottom: [
      [6,  100, 600, 0.80], [22, 100, 700, 1.05], [36, 100, 750, 0.70],
      [52, 100, 800, 1.10], [66, 100, 850, 0.85], [81, 100, 900, 1.00],
      [94, 100, 950, 0.75],
    ],
    left: [
      [0, 5,  1100, 0.75], [0, 19, 1200, 1.00], [0, 34, 1250, 0.80],
      [0, 49, 1300, 1.10], [0, 63, 1350, 0.70], [0, 78, 1400, 1.05],
      [0, 94, 1450, 0.85],
    ],
    right: [
      [100, 6,  1600, 0.85], [100, 21, 1650, 1.00], [100, 35, 1700, 0.75],
      [100, 50, 1750, 1.10], [100, 64, 1800, 0.80], [100, 79, 1850, 1.05],
      [100, 93, 1900, 0.70],
    ],
  };

  const SHADOW_DIR = {
    top:    [0,  1],
    bottom: [0, -1],
    left:   [1,  0],
    right:  [-1, 0],
  };

  /* ── shadow: element classification ──
   *  Text elements are tagged with data-flk="0"…"5" based on their
   *  viewport proximity to the nearest active light edge.  Classification
   *  runs on scroll / resize / settings change — never during the hot
   *  render path.  Capped at MAX_TRACKED elements.
   */

  const SHADOW_SEL =
    'p,h1,h2,h3,h4,h5,h6,li,td,th,dt,dd,span,a,' +
    'blockquote,figcaption,pre,label,summary,article';

  /** Quick luminance check: true if the element's text color is light. */
  function isLightText(te) {
    const c = getComputedStyle(te).color;
    const m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return false;
    return (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) > 140;
  }

  function classifyElements() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const reach = cfg.distance / 100;
    const dirs = cfg.directions;

    const allEls = document.querySelectorAll(SHADOW_SEL);
    const len = Math.min(allEls.length, MAX_TRACKED);

    // clean up previously tracked elements beyond new cap
    for (let i = len; i < trackedEls.length; i++) {
      const te = trackedEls[i];
      if (te.dataset.flk) {
        te.removeAttribute('data-flk');
        te.removeAttribute('data-flk-d');
        te.removeAttribute('data-flk-l');
        te.removeAttribute('data-flk-v');
      }
    }
    trackedEls = allEls;

    for (let i = 0; i < len; i++) {
      const te = allEls[i];

      // skip our own overlay
      if (te === el || te === styleEl) continue;

      const rect = te.getBoundingClientRect();

      // off-screen → band 0, skip color check
      if (rect.bottom < -50 || rect.top > vh + 50 ||
          rect.right < -50 || rect.left > vw + 50) {
        if (te.dataset.flk !== '0') te.dataset.flk = '0';
        continue;
      }

      const cy = (rect.top + rect.bottom) * 0.5;
      const cx = (rect.left + rect.right) * 0.5;
      let maxStr = 0;
      let maxDir = dirs[0];

      for (let d = 0; d < dirs.length; d++) {
        let prox;
        if (dirs[d] === 'bottom')     prox = cy / vh;
        else if (dirs[d] === 'top')   prox = 1 - cy / vh;
        else if (dirs[d] === 'right') prox = cx / vw;
        else                          prox = 1 - cx / vw;

        const str = reach > 0 ? Math.max(0, (prox - (1 - reach)) / reach) : 0;
        if (str > maxStr) { maxStr = str; maxDir = dirs[d]; }
      }

      const band = Math.min(BANDS - 1, Math.floor(maxStr * BANDS));
      const bs = String(band);
      if (te.dataset.flk !== bs) te.dataset.flk = bs;

      if (band > 0) {
        const dc = maxDir[0];
        if (te.dataset.flkD !== dc) te.dataset.flkD = dc;

        const v = String((Math.floor(cy * 0.07) + Math.floor(cx * 0.05)) & 3);
        if (te.dataset.flkV !== v) te.dataset.flkV = v;

        const light = isLightText(te);
        if (light && !te.hasAttribute('data-flk-l')) {
          te.setAttribute('data-flk-l', '');
        } else if (!light && te.hasAttribute('data-flk-l')) {
          te.removeAttribute('data-flk-l');
        }
      }
    }

    needsClassify = false;
  }

  function requestClassify() {
    if (classifyTimer) return;
    needsClassify = true;
    classifyTimer = setTimeout(function () { classifyTimer = 0; }, CLASSIFY_COOLDOWN);
  }

  /* ── shadow stylesheet ── */

  function mountStyle() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = ID + '-shadows';
    (document.head || root).appendChild(styleEl);
  }

  function unmountStyle() {
    if (styleEl) { styleEl.remove(); styleEl = null; }
    for (let i = 0; i < trackedEls.length; i++) {
      trackedEls[i].removeAttribute('data-flk');
      trackedEls[i].removeAttribute('data-flk-d');
      trackedEls[i].removeAttribute('data-flk-l');
      trackedEls[i].removeAttribute('data-flk-v');
    }
    trackedEls = [];
    lastShadowCSS = '';
  }

  function clearShadow() {
    if (lastShadowCSS === '') return;
    lastShadowCSS = '';
    if (styleEl) styleEl.textContent = '';
  }

  /* ── overlay lifecycle ── */

  function mount() {
    if (el) return;
    el = document.createElement('div');
    el.id = ID;
    var s = el.style;
    s.position = 'fixed';
    s.top = '0';
    s.left = '0';
    s.width = '100vw';
    s.height = '100vh';
    s.pointerEvents = 'none';
    s.zIndex = '2147483647';
    s.transition = 'opacity 0.3s ease';
    s.opacity = '0';
    s.willChange = 'opacity';
    root.appendChild(el);
    ambEl = document.createElement('div');
    ambEl.id = ID + '-ambient';
    var ab = ambEl.style;
    ab.position = 'fixed';
    ab.top = '0';
    ab.left = '0';
    ab.width = '100vw';
    ab.height = '100vh';
    ab.pointerEvents = 'none';
    ab.zIndex = '2147483646';
    ab.background = 'rgb(0,0,0)';
    ab.opacity = '0';
    ab.willChange = 'opacity';
    root.appendChild(ambEl);
    mountStyle();
    window.addEventListener('scroll', requestClassify, { passive: true });
    window.addEventListener('resize', requestClassify, { passive: true });
    needsClassify = true;
  }

  function unmount() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (el) { el.remove(); el = null; }
    if (ambEl) { ambEl.remove(); ambEl = null; }
    window.removeEventListener('scroll', requestClassify);
    window.removeEventListener('resize', requestClassify);
    unmountStyle();
  }

  /* ── render loop ── */

  function render(ts) {
    raf = requestAnimationFrame(render);

    if (ts - lastFrame < MIN_FRAME_MS) return;
    lastFrame = ts;
    frameCount++;

    if (!el) return;

    if (!active()) {
      el.style.opacity = '0';
      if (ambEl) ambEl.style.opacity = '0';
      clearShadow();
      return;
    }

    if (!t0) t0 = ts;
    var t = (ts - t0) * 0.001 * (cfg.speed / 30);

    /* ── ambient flicker (whole-page distant candlelight) ── */
    if (cfg.ambientFlicker && ambEl) {
      var ambRaw =
        0.45 * noise(t * 0.6, 8000) +
        0.30 * noise(t * 1.7, 8137) +
        0.25 * noise(t * 4.3, 8293);
      ambEl.style.opacity = (ambRaw * cfg.ambientIntensity * 0.007).toFixed(3);
    } else if (ambEl) {
      ambEl.style.opacity = '0';
    }

    var dirs = cfg.directions;

    if (!dirs.length) {
      el.style.opacity = '0';
      clearShadow();
      return;
    }

    /* ── classify elements (reads only — before any writes) ── */
    if (cfg.shadows && needsClassify) classifyElements();

    /* ── gradient overlay ── */

    var dist = cfg.distance;
    var baseAlpha = cfg.intensity * 0.0038; // intensity / 100 * 0.38
    var parts = [];
    var dirFlk = {};

    for (var d = 0; d < dirs.length; d++) {
      var dir = dirs[d];
      var sources = SOURCES[dir];
      var horiz = dir === 'top' || dir === 'bottom';
      var dirSum = 0;

      for (var si = 0; si < sources.length; si++) {
        var ox = sources[si][0], oy = sources[si][1],
            seed = sources[si][2], sizeMul = sources[si][3];
        var flick = candle(t, seed);
        dirSum += flick;

        var sway = (noise(t * 0.7, seed + 51) - 0.5) * 10;
        var breathe = 0.55 + 0.9 * noise(t * 1.2, seed + 73);
        var spread = (dist + 15) * sizeMul * breathe;
        var px = horiz ? ox + sway : ox;
        var py = horiz ? oy : oy + sway;

        // wider morphing range compensates for removed lobe gradients
        var asp = noise(t * 0.35, seed + 97);
        var w = horiz ? spread * (0.40 + asp * 0.90) : spread * (0.18 + (1 - asp) * 0.60);
        var h = horiz ? spread * (0.18 + (1 - asp) * 0.60) : spread * (0.40 + asp * 0.90);

        var a = Math.round(baseAlpha * flick * 1000) / 1000;

        parts.push(
          'radial-gradient(ellipse ' +
          Math.round(w) + '% ' + Math.round(h) + '% at ' +
          Math.round(px) + '% ' + Math.round(py) + '%,' +
          'rgba(' + cRGB + ',' + a + ') 0%,transparent 100%)'
        );
      }

      dirFlk[dir] = dirSum / sources.length;
    }

    el.style.opacity = '1';
    el.style.background = parts.join(',');

    /* ── dynamic text shadows (per-direction × band × variation) ──
     *  Updated every 4th frame (~7.5 updates/sec at 30 fps).
     *  Uses pre-built selector strings.  Deduplication prevents DOM
     *  writes when rounded values haven't changed.
     */

    if (frameCount % 4 !== 0 || !styleEl || !cfg.shadows) {
      if (!cfg.shadows) clearShadow();
      return;
    }

    var sScale = cfg.intensity * 0.01;
    var shScale = cfg.shadowIntensity * 0.01;

    // per-variation jitter: 4 groups, each drifts independently
    var jx0 = (noise(t * 1.8, 5000) - 0.5) * 2.4;
    var jx1 = (noise(t * 1.8, 5137) - 0.5) * 2.4;
    var jx2 = (noise(t * 1.8, 5274) - 0.5) * 2.4;
    var jx3 = (noise(t * 1.8, 5411) - 0.5) * 2.4;
    var jy0 = (noise(t * 1.8, 5100) - 0.5) * 2.4;
    var jy1 = (noise(t * 1.8, 5237) - 0.5) * 2.4;
    var jy2 = (noise(t * 1.8, 5374) - 0.5) * 2.4;
    var jy3 = (noise(t * 1.8, 5511) - 0.5) * 2.4;
    var jb0 = 0.8 + 0.4 * noise(t * 1.4, 5200);
    var jb1 = 0.8 + 0.4 * noise(t * 1.4, 5337);
    var jb2 = 0.8 + 0.4 * noise(t * 1.4, 5474);
    var jb3 = 0.8 + 0.4 * noise(t * 1.4, 5611);
    var JX = [jx0, jx1, jx2, jx3];
    var JY = [jy0, jy1, jy2, jy3];
    var JB = [jb0, jb1, jb2, jb3];

    // global tremor
    var tremX = (noise(t * 3.3, 9997) - 0.5) * 0.7;
    var tremY = (noise(t * 3.3, 9998) - 0.5) * 0.7;

    var cssParts = [];

    for (var di = 0; di < dirs.length; di++) {
      var sdir = dirs[di];
      var sdx = SHADOW_DIR[sdir][0], sdy = SHADOW_DIR[sdir][1];
      var df = dirFlk[sdir];
      var dc = sdir[0];
      var selBands = SHADOW_SELS[dc];

      var dirMag = (2.5 + 3.0 * df) * (0.6 + sScale * 4.0);
      var dirBaseX = sdx * dirMag + tremX;
      var dirBaseY = sdy * dirMag + tremY;
      var dirBlur = 3.0 + 4.5 * df;
      var dirAlpha = (0.15 + sScale * 0.35) * (0.4 + 0.6 * df) * shScale;
      var dirGlow = (0.30 + sScale * 0.55) * (0.4 + 0.6 * df) * shScale;

      for (var b = 1; b < BANDS; b++) {
        var frac = b / (BANDS - 1);
        var selVars = selBands[b];

        for (var v = 0; v < NVARS; v++) {
          var bx = Math.round((dirBaseX + JX[v]) * frac * 10) / 10;
          var by = Math.round((dirBaseY + JY[v]) * frac * 10) / 10;
          var sel = selVars[v];

          // dark text → dark shadow
          var db = Math.round(dirBlur * JB[v] * frac * 10) / 10;
          var da = Math.round(dirAlpha * frac * 1000) / 1000;
          cssParts.push(
            sel + '{text-shadow:' +
            bx + 'px ' + by + 'px ' + db + 'px rgba(0,0,0,' + da + ') !important}'
          );

          // light text → warm tight glow + diffuse halo
          var g1b = Math.round(dirBlur * JB[v] * frac * 0.8 * 10) / 10;
          var g1a = Math.round(dirGlow * frac * 1000) / 1000;
          var g2b = Math.round(dirBlur * JB[v] * frac * 2.5 * 10) / 10;
          var g2a = Math.round(dirGlow * frac * 0.5 * 1000) / 1000;
          cssParts.push(
            '[data-flk-l]' + sel + '{text-shadow:' +
            bx + 'px ' + by + 'px ' + g1b + 'px rgba(' +
            cR + ',' + cG + ',' + cB + ',' + g1a + '),' +
            bx + 'px ' + by + 'px ' + g2b + 'px rgba(' +
            cR + ',' + cG + ',' + cB + ',' + g2a + ') !important}'
          );
        }
      }
    }

    var css = cssParts.join('');
    if (css !== lastShadowCSS) {
      lastShadowCSS = css;
      styleEl.textContent = css;
    }
  }

  function start() {
    mount();
    if (!raf && !document.hidden) { t0 = 0; raf = requestAnimationFrame(render); }
  }

  /* ── settings ── */

  function apply(s) {
    cfg = { ...DEFAULTS, ...s };
    // cache color values so warmRGB() isn't called every frame
    var rgb = warmRGB(cfg.warmth);
    cR = rgb[0]; cG = rgb[1]; cB = rgb[2];
    cRGB = cR + ',' + cG + ',' + cB;
    needsClassify = true;
    active() ? start() : unmount();
  }

  browser.storage.local.get(DEFAULTS).then(apply);

  browser.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    var patch = {};
    for (var k in changes) patch[k] = changes[k].newValue;
    apply({ ...cfg, ...patch });
  });

  /* ── pause when tab is not visible ── */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    } else if (active() && el) {
      needsClassify = true;
      if (!raf) { t0 = 0; raf = requestAnimationFrame(render); }
    }
  });

  browser.runtime.onMessage.addListener(function (msg) {
    if (msg.type === 'get-hostname') return Promise.resolve({ hostname: hostname });
    if (msg.type === 'toggle-site') {
      var o = { ...cfg.siteOverrides, [hostname]: msg.enabled };
      cfg.siteOverrides = o;
      browser.storage.local.set({ siteOverrides: o });
      msg.enabled ? start() : unmount();
    }
  });
})();
