(function () {
  'use strict';

  function updateBadge(enabled) {
    browser.action.setBadgeText({ text: enabled ? '' : 'OFF' });
    browser.action.setBadgeBackgroundColor({ color: '#555' });
  }

  browser.storage.local.get({ enabled: true }).then(({ enabled }) => {
    updateBadge(enabled);
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) {
      updateBadge(changes.enabled.newValue);
    }
  });
})();
