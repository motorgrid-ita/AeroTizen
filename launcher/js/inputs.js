// TV inputs: every HDMI port like the TV's own Source list, named by the user or the TV,
// shown full screen inside the launcher.
(function (A) {
  'use strict';

  var tz = A.tizen, ICONS = A.tiles.ICONS;
  var inputs = A.inputs = { sources: [], watching: false };

  inputs.portName = function (s) { return s.type === 'TV' ? 'TV in diretta' : s.type + ' ' + s.number; };

  inputs.label = function (s) { return A.settings.inputNames[inputs.portName(s)] || s.editName || inputs.portName(s); };

  // V992.13: pure presentation icons; no change to HDMI/TV switching code.
  // Inline SVGs: lightweight, monochromatic and available offline.
  function sourceIcon(paths) {
    return '<span class="s90c-source-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
      paths + '</svg></span>';
  }

  function iconFor(s, label) {
    var n = String(label || '').toLowerCase();
    if (s.type === 'TV') {
      return sourceIcon('<rect x="3.5" y="5.5" width="17" height="12.5" rx="2"/>' +
        '<path d="M8 21h8M12 18v3"/>');
    }
    if (/xbox|playstation|ps\d|switch|nintendo|game|console/.test(n)) {
      return sourceIcon('<path d="M7.5 8h9a3.5 3.5 0 0 1 3.4 2.8l1 5a2 2 0 0 1-3.3 1.9L15 15H9l-2.6 2.7a2 2 0 0 1-3.3-1.9l1-5A3.5 3.5 0 0 1 7.5 8z"/>' +
        '<path d="M7.5 10.5v4m-2-2h4"/><circle cx="15.5" cy="11.2" r=".7" fill="currentColor" stroke="none"/><circle cx="17.5" cy="13.1" r=".7" fill="currentColor" stroke="none"/>');
    }
    if (/pc|computer|mac|laptop/.test(n)) {
      return sourceIcon('<rect x="3" y="4.5" width="18" height="13" rx="1.8"/>' +
        '<path d="M8 21h8m-4-3.5V21"/>');
    }
    if (/cable|box|roku|fire|apple|shield|chromecast|blu|dvd|satellite/.test(n)) {
      return sourceIcon('<rect x="3.5" y="7" width="17" height="10" rx="2.3"/>' +
        '<circle cx="17" cy="12" r=".75" fill="currentColor" stroke="none"/>');
    }
    return sourceIcon('<path d="M6 8.5h12v4.3l-2 2.7H8l-2-2.7z"/>' +
      '<path d="M9 11v1.5m3-1.5v1.5m3-1.5v1.5"/>');
  }

  // The Tizen VIDEOSOURCE disconnected list can contain ports with sleeping devices.
  // Keep the UI safe: respect a user override and the TVWindow current source.
  inputs.alwaysVisible = function (s) {
    var overrides = A.settings.hdmiKeepVisible || {};
    return s && s.type === 'HDMI' && overrides[String(s.number)] === true;
  };

  // Samsung can identify an HDMI device even when it is sleeping. On the S90C,
  // VIDEOSOURCE.disconnected contains e.g. HDMI 1 with editName="PlayStation 5".
  // The raw Samsung editName is evidence of a configured/recognized device, NOT
  // proof of a physically attached cable. Do not use user-set AeroTizen inputNames.
  inputs.hasRecognizedDevice = function (s) {
    if (!s || s.type !== 'HDMI' || typeof s.editName !== 'string') { return false; }
    var name = s.editName.replace(/\s+/g, ' ').trim();
    if (!name) { return false; }
    var ordinary = name.toLowerCase().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
    // Samsung's generic port names and unknown placeholders are not devices.
    if (/^(?:hdmi(?: \d+)?|ingresso(?: hdmi)?(?: \d+)?|source(?: hdmi)?(?: \d+)?|input(?: hdmi)?(?: \d+)?|sorgente(?: hdmi)?(?: \d+)?|unknown(?: device)?|unrecognized(?: device)?|unrecognised(?: device)?|dispositivo sconosciuto|sconosciuto|non riconosciuto|nessun dispositivo|no device|not connected|non collegato|disconnected)$/i.test(ordinary)) { return false; }
    return true;
  };

  inputs.isVisible = function (s) {
    if (s.type === 'TV') { return A.settings.showLiveTv !== false; }
    if (s.type !== 'HDMI' || A.settings.hideDisconnectedHdmi !== true) { return true; }
    return s.connected === true || s.active === true ||
      inputs.hasRecognizedDevice(s) || inputs.alwaysVisible(s);
  };

  inputs.render = function () {
    var row = A.$('inputs');
    row.textContent = '';
    inputs.sources.forEach(function (s) {
      // Upstream main: controls affect only whether tiles are listed.
      // Never change the native Samsung Live TV launcher or HDMI switching.
      if (!inputs.isVisible(s)) { return; }
      var label = inputs.label(s), port = inputs.portName(s);
      // Preserve the existing card element and click handler: remote focus uses .tile.
      var tile = A.tiles.card(label, iconFor(s, label), function () { inputs.show(s); });
      tile.classList.add('s90c-source-card');
      // V992.51: the built-in Live TV label is UI copy, not an app/device name.
      // Do not translate a label explicitly customised by the TV owner.
      if (s.type === 'TV' && label === port && !(A.settings.inputNames || {})[port]) {
        tile.dataset.aeroTranslateLiveTv = 'yes';
      }
      // State is derived ONLY from Tizen's report; a Samsung-recognized device
      // may be asleep, so never advertise it as an active HDMI signal.
      var status = '';
      var statusClass = '';
      if (s.type === 'TV') {
        status = 'TV LIVE'; statusClass = 's90c-source-live';
      } else if (s.connected === true) {
        status = 'COLLEGATA'; statusClass = 's90c-source-connected';
      } else if (s.active === true) {
        status = 'IN USO'; statusClass = 's90c-source-active';
      } else if (inputs.hasRecognizedDevice(s)) {
        status = 'RICONOSCIUTA'; statusClass = 's90c-source-recognized';
      } else if (inputs.alwaysVisible(s)) {
        status = 'FISSATA'; statusClass = 's90c-source-forced';
      }
      if (status) {
        tile.classList.add(statusClass);
        var indicator = A.el('span', 's90c-source-status', status);
        indicator.setAttribute('aria-label', 'Stato sorgente: ' + status);
        tile.appendChild(indicator);
      }
      var name = tile.querySelector('.name');
      if (name) {
        var recognized = inputs.hasRecognizedDevice(s) && s.connected === false;
        var subtitle = s.type === 'TV' ? 'Sintonizzatore' :
          recognized ? (label !== port ? port : 'Dispositivo riconosciuto') :
          (label !== port ? port : inputs.alwaysVisible(s) && !s.connected ?
           'Visibile manualmente' : s.active && !s.connected ?
           'Sorgente selezionata' : s.connected ? 'Ingresso HDMI' : 'Stato non rilevato');
        name.appendChild(A.el('div', 'sub', subtitle));
      }
      // Never dim a source the user explicitly kept, or the current source.
      if (s.connected === false && !s.active && !inputs.alwaysVisible(s) &&
          !inputs.hasRecognizedDevice(s)) { tile.classList.add('off'); }
      row.appendChild(tile);
    });
    // Only the empty slots disappear in filtered mode. Each visible card retains
    // the full-width five-source dimensions (354 x 120 px). No scaling.
    var filtered = A.settings.hideDisconnectedHdmi === true;
    var count = row.children.length;
    row.classList.toggle('s90c-dock-compact', filtered && count > 0 && count <= 4);
    var section = row.parentNode;
    if (section && section.classList && section.classList.contains('inputs-wrap')) {
      section.hidden = count === 0;
    }
    A.homeScreen.buildRows();
  };

  inputs.load = function () {
    if (!tz || !tz.systeminfo) {  // desktop browser preview
      inputs.sources = [
        { type: 'HDMI', number: 1, editName: 'Xbox', connected: true }, { type: 'HDMI', number: 2, connected: false },
        { type: 'HDMI', number: 3, editName: 'PC', connected: false }, { type: 'TV', number: 1, connected: true }
      ];
      return inputs.render();
    }
    try {
      tz.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        // getSource() reads the CURRENT video input. It is not a cable-presence
        // sensor, but it keeps the selected HDMI reachable even on stale reports.
        var current = null;
        try { if (tz.tvwindow && tz.tvwindow.getSource) { current = tz.tvwindow.getSource('MAIN'); } }
        catch (e) { /* TVs may reject it when no video window is available */ }
        function tag(list, connected) {
          return (list || []).filter(function (s) { return s.type !== 'MEDIA'; }).map(function (s) {
            var active = !!(current && s.type === 'HDMI' && current.type === 'HDMI' &&
              Number(current.number) === Number(s.number));
            return { type: s.type, number: s.number, editName: s.editName,
              connected: connected || s.signal === true, active: active, raw: s };
          });
        }
        // If firmware duplicates a port in both arrays, the connected record wins.
        var discovered = tag(info.connected, true).concat(tag(info.disconnected, false));
        var unique = {};
        discovered.forEach(function (s) {
          var id = String(s.type) + ':' + String(s.number), prior = unique[id];
          if (!prior) { unique[id] = s; return; }
          var preferred = (!prior.connected && s.connected) ? s : prior;
          var alternate = preferred === s ? prior : s;
          // Keep the original raw source for tvwindow.setSource(). Only carry
          // Samsung's recognized label when the preferred entry lacks one.
          if (!inputs.hasRecognizedDevice(preferred) && inputs.hasRecognizedDevice(alternate)) {
            preferred.editName = alternate.editName;
          }
          unique[id] = preferred;
        });
        inputs.sources = Object.keys(unique).map(function (id) { return unique[id]; }).sort(function (a, b) {
          return (a.type === 'TV') - (b.type === 'TV') || (Number(b.connected) - Number(a.connected)) || a.number - b.number;
        });
        inputs.render();
      }, inputs.render);
    } catch (e) { inputs.render(); }
  };

  /* S90C NATIVE LIVE TV V8.5 */
  // La sorgente TV apre il visualizzatore Samsung a schermo intero.
  // La modalita' TVWindow rimane disponibile per le sorgenti HDMI.
  inputs.show = function (s) {
    if (s && s.type === 'TV') {
      if (A.homewatch && A.homewatch.openNativeLiveTV) {
        return A.homewatch.openNativeLiveTV(s.raw || s);
      }
      A.toast('Apertura TV Samsung non disponibile');
      return;
    }
    return inputs.showEmbedded(s);
  };

  // Vecchia modalita' invariata: HDMI e fallback su TV nativa non avviabile.
  inputs.showEmbedded = function (s) {
    if (!tz || !tz.tvwindow) { return A.toast('Passerei a ' + inputs.label(s)); }
    try {
      tz.tvwindow.setSource(s.raw || s, function () {
        tz.tvwindow.show(function () {
          inputs.watching = true;
          document.body.classList.add('tv');
          document.documentElement.style.background = 'transparent';
          window.Backgrounds.hide();
        }, function () { A.toast('Impossibile visualizzare ' + inputs.label(s)); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
      }, function () { A.toast('Impossibile cambiare sorgente'); }, 'MAIN');
    } catch (e) { A.toast('Impossibile cambiare sorgente'); }
  };

  inputs.leave = function () {
    inputs.watching = false;
    document.body.classList.remove('tv');
    A.applyBackground();
    try { tz.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) { /* already hidden */ }
  };

  if (tz && tz.systeminfo) {
    try { tz.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', inputs.load); } catch (e) { /* not supported */ }
    // Re-read connection state when the launcher becomes visible again.
    if (document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && !inputs.watching) { inputs.load(); }
      });
    }
  }
})(window.AeroTizen);
