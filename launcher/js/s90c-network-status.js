/* S90C V9.6: network status using Samsung's 1..5 Wi-Fi level when available.
   Do not interpret an unavailable level as a weak connection.
   Loaded after the original network.js, before main.js. */
(function (A) {
  'use strict';
  if (!A) { return; }
  var SYSTEM = A.tizen && A.tizen.systeminfo;
  var el = A.$('network');
  if (!el) { return; }
  var started = false, serial = 0, last = '';
  var icon = {
    ethernet: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M8 3h8v5h4v7h-4v6H8v-6H4V8h4zM8 8h8M8 12h8M10 17h4"/>',
    offline: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 3l18 18M4 11a13 13 0 0 1 15-2.5M7 15a8 8 0 0 1 7-1M12 20h.01"/>',
    unknown: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" fill="none" stroke="currentColor" stroke-width="1.5"/>'
  };
  function wifi(level) {
    // Symbols are connection marks unless Samsung supplies a valid numeric reading.
    var lit = level == null ? 3 : level >= 4 ? 3 : level >= 2 ? 2 : 1;
    var p = [
      '<circle cx="12" cy="20" r="1.65" fill="currentColor"/>',
      '<path d="M7 15.2a7.1 7.1 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
      '<path d="M3.1 11a12.6 12.6 0 0 1 17.8 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'
    ];
    return p.map(function (path, i) {
      return '<g opacity="' + (i < lit ? '1' : '.24') + '">' + path + '</g>';
    }).join('');
  }
  function show(type, level, text) {
    var key = type + '|' + String(level) + '|' + text;
    if (key === last) { return; }
    last = key;
    el.innerHTML = type === 'wifi' ? wifi(level) : (icon[type] || icon.unknown);
    el.setAttribute('aria-label', text);
    el.setAttribute('title', text);
    el.classList.toggle('offline', type === 'offline');
    el.setAttribute('data-net-kind', type);
    el.setAttribute('data-net-level', level == null ? 'unknown' : String(level));
  }
  function wifiLevel() {
    try {
      var n = window.webapis && window.webapis.network;
      if (n && typeof n.getWiFiSignalStrengthLevel === 'function') {
        var v = Number(n.getWiFiSignalStrengthLevel());
        if (isFinite(v) && v >= 1 && v <= 5 && Math.floor(v) === v) { return v; }
      }
    } catch (e) { /* Samsung API unavailable/permission denied: never call it weak */ }
    return null;
  }
  function reportWifi() {
    var level = wifiLevel();
    var label = level == null ? 'Wi-Fi connesso (intensita non disponibile)' : 'Wi-Fi connesso, livello TV ' + level + '/5';
    show('wifi', level, label);
  }
  function refresh() {
    var seq = ++serial;
    if (!SYSTEM || typeof SYSTEM.getPropertyValue !== 'function') {
      show(navigator.onLine === false ? 'offline' : 'unknown', null,
        navigator.onLine === false ? 'Rete offline' : 'Rete connessa (tipo non disponibile)');
      return;
    }
    try {
      SYSTEM.getPropertyValue('NETWORK', function (net) {
        if (seq !== serial) { return; }
        var type = net && net.networkType;
        if (type === 'ETHERNET') { show('ethernet', null, 'Ethernet connesso'); }
        else if (type === 'WIFI') { reportWifi(); }
        else if (type === 'NONE') { show('offline', null, 'Rete offline'); }
        else { show('unknown', null, 'Connessione di tipo non disponibile'); }
      }, function () {
        if (seq === serial) {
          show(navigator.onLine === false ? 'offline' : 'unknown', null,
            navigator.onLine === false ? 'Rete offline' : 'Stato rete non disponibile');
        }
      });
    } catch (e) { show('unknown', null, 'Stato rete non disponibile'); }
  }
  function updateVisibility() {
    // SVG hidden needs attribute on Tizen WebKit; CSS also enforces it.
    if (A.settings.showNetwork===false) { el.setAttribute('hidden',''); }
    else { el.removeAttribute('hidden'); }
  }
  A.network = {
    updateVisibility:updateVisibility,
    start: function () {
      if (started) { return; }
      started = true;
      updateVisibility();
      show('unknown', null, 'Verifica rete');
      refresh();
      if (SYSTEM && typeof SYSTEM.addPropertyValueChangeListener === 'function') {
        try { SYSTEM.addPropertyValueChangeListener('NETWORK', refresh); } catch (e) {}
      }
      setInterval(refresh, 60000);
    },
    refresh: refresh
  };
})(window.AeroTizen);
