(function () {
  'use strict';

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

  /* ── DOM refs ── */
  const $global = document.getElementById('global-toggle');
  const $site = document.getElementById('site-toggle');
  const $siteLabel = document.getElementById('site-label');
  const $shadows = document.getElementById('shadows-toggle');
  const $ambient = document.getElementById('ambient-toggle');
  const $shadowsSub = document.getElementById('shadows-sub');
  const $ambientSub = document.getElementById('ambient-sub');
  const $dirBtns = document.querySelectorAll('.dir-btn');

  const sliders = ['distance', 'speed', 'warmth', 'intensity', 'shadowIntensity', 'ambientIntensity'];
  const $sliders = {};
  const $vals = {};
  sliders.forEach((k) => {
    $sliders[k] = document.getElementById(k);
    $vals[k] = document.getElementById(k + '-val');
  });

  let currentHostname = '';
  let cfg = { ...DEFAULTS };

  /* ── debounced storage write ── */
  let saveTimer = null;
  let pending = {};
  function flushPending() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (Object.keys(pending).length) {
      browser.storage.local.set(pending);
      pending = {};
    }
  }
  function save(patch) {
    Object.assign(cfg, patch);
    Object.assign(pending, patch);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPending, 180);
  }
  window.addEventListener('beforeunload', flushPending);

  /* ── sync sub-slider disabled states ── */
  function syncSubStates() {
    $shadowsSub.classList.toggle('disabled', !cfg.shadows);
    $ambientSub.classList.toggle('disabled', !cfg.ambientFlicker);
  }

  /* ── init ── */
  async function init() {
    // load stored settings
    cfg = await browser.storage.local.get(DEFAULTS);

    // get active tab hostname
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        const resp = await browser.tabs.sendMessage(tab.id, { type: 'get-hostname' });
        if (resp && resp.hostname) {
          currentHostname = resp.hostname;
          $siteLabel.textContent = currentHostname || 'This site';
        }
      }
    } catch (_) {
      $siteLabel.textContent = 'This site';
    }

    // populate UI
    $global.checked = cfg.enabled;

    if (currentHostname && currentHostname in cfg.siteOverrides) {
      $site.checked = cfg.siteOverrides[currentHostname];
    } else {
      $site.checked = cfg.enabled;
    }

    $shadows.checked = cfg.shadows;
    $ambient.checked = cfg.ambientFlicker;

    $dirBtns.forEach((btn) => {
      if (cfg.directions.includes(btn.dataset.dir)) {
        btn.classList.add('active');
      }
    });

    sliders.forEach((k) => {
      $sliders[k].value = cfg[k];
      $vals[k].textContent = k === 'distance' ? cfg[k] + '%' : cfg[k];
    });

    syncSubStates();
  }

  /* ── event handlers ── */

  // global toggle
  $global.addEventListener('change', () => {
    save({ enabled: $global.checked });
    if (!(currentHostname in cfg.siteOverrides)) {
      $site.checked = $global.checked;
    }
  });

  // per-site toggle
  $site.addEventListener('change', () => {
    if (!currentHostname) return;
    const enabled = $site.checked;
    const overrides = { ...cfg.siteOverrides, [currentHostname]: enabled };
    save({ siteOverrides: overrides });
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        browser.tabs.sendMessage(tab.id, { type: 'toggle-site', enabled });
      }
    });
  });

  // shadows toggle
  $shadows.addEventListener('change', () => {
    save({ shadows: $shadows.checked });
    syncSubStates();
  });

  // ambient flicker toggle
  $ambient.addEventListener('change', () => {
    save({ ambientFlicker: $ambient.checked });
    syncSubStates();
  });

  // direction buttons (multi-select)
  $dirBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const dirs = [];
      $dirBtns.forEach((b) => {
        if (b.classList.contains('active')) dirs.push(b.dataset.dir);
      });
      save({ directions: dirs });
    });
  });

  // sliders
  sliders.forEach((k) => {
    $sliders[k].addEventListener('input', () => {
      const v = parseInt($sliders[k].value, 10);
      $vals[k].textContent = k === 'distance' ? v + '%' : v;
      save({ [k]: v });
    });
  });

  init();
})();
