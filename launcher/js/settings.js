// User preferences, persisted in localStorage (per-TV, survives app updates).
(function (A) {
  'use strict';

  var cfg = A.config;
  var settings = A.settings = {};
  // Distinguish first launch from an intentionally empty favourites grid.
  settings.hasPersistedHome = false;

  function defaults() { return JSON.parse(JSON.stringify(cfg.DEFAULTS)); }

  settings.load = function () {
    var data = defaults();
    try {
      var raw = localStorage.getItem(cfg.STORAGE_KEY);
      for (var i = 0; !raw && i < cfg.LEGACY_STORAGE_KEYS.length; i++) {
        raw = localStorage.getItem(cfg.LEGACY_STORAGE_KEYS[i]);
      }
      var saved = raw ? JSON.parse(raw) : {};
      if (saved.favorites && !Object.prototype.hasOwnProperty.call(saved, 'home')) { saved.home = saved.favorites; }  // earlier field name
      settings.hasPersistedHome = Array.isArray(saved.home);
      Object.keys(data).forEach(function (k) { if (saved[k] !== undefined) { data[k] = saved[k]; } });
    } catch (e) { /* corrupt or unavailable storage: keep defaults */ }
    Object.keys(data).forEach(function (k) { settings[k] = data[k]; });
  };

  settings.save = function () {
    var out = {};
    Object.keys(cfg.DEFAULTS).forEach(function (k) { out[k] = settings[k]; });
    try {
      localStorage.setItem(cfg.STORAGE_KEY, JSON.stringify(out));
      settings.hasPersistedHome = true;
    } catch (e) { /* storage full or blocked */ }
  };
})(window.AeroTizen);
