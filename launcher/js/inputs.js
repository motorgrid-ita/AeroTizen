// TV inputs, named by the user or the TV, with visibility settings for Live TV and HDMI ports.
// Selected inputs are shown full screen inside the launcher.
(function (A) {
  'use strict';

  var tz = A.tizen;
  var inputs = A.inputs = { sources: [], watching: false };

  inputs.portName = function (s) { return s.type === 'TV' ? 'Live TV' : s.type + ' ' + s.number; };

  inputs.label = function (s) {
    var custom = A.settings.inputNames[inputs.portName(s)];
    if (custom) { return custom; }
    if (s.type === 'TV') {
      return s.editName && s.editName !== 'TV' && s.editName !== 'Live TV' ? s.editName : A.i18n.t('Live TV');
    }
    return s.editName || inputs.portName(s);
  };

  // Source icon markup ported from the independently tested glass dock.
  // Each tile keeps its original A.tiles.card click and D-pad handlers.
  function sourceIcon(paths) {
    return '<span class="aero-source-icon" aria-hidden="true">' +
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

  // A configured device can appear in VIDEOSOURCE.disconnected while asleep.
  // Use the TV-provided editName, never a custom AeroTizen input name, as evidence.
  inputs.hasRecognizedDevice = function (s) {
    if (!s || s.type !== 'HDMI' || typeof s.editName !== 'string') { return false; }
    var name = s.editName.replace(/\s+/g, ' ').trim();
    if (!name) { return false; }
    var ordinary = name.toLowerCase().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
    // The exact placeholder filter used in the reference HDMI implementation.
    if (/^(?:hdmi(?: \d+)?|ingresso(?: hdmi)?(?: \d+)?|source(?: hdmi)?(?: \d+)?|input(?: hdmi)?(?: \d+)?|sorgente(?: hdmi)?(?: \d+)?|unknown(?: device)?|unrecognized(?: device)?|unrecognised(?: device)?|dispositivo sconosciuto|sconosciuto|non riconosciuto|nessun dispositivo|no device|not connected|non collegato|disconnected)$/i.test(ordinary)) { return false; }
    return true;
  };

  inputs.isVisible = function (s) {
    if (s.type === 'TV') { return A.settings.showLiveTv !== false; }
    if (s.type !== 'HDMI' || A.settings.hideDisconnectedHdmi !== true) { return true; }
    var manual = A.settings.hdmiKeepVisible || {};
    return s.connected === true || s.active === true ||
      inputs.hasRecognizedDevice(s) || manual[String(s.number)] === true;
  };

  inputs.render = function () {
    var row = A.$('inputs');
    row.textContent = '';
    inputs.sources.forEach(function (s) {
      // Keep TV-recognised HDMI devices visible while in standby; empty ports
      // still follow the existing Hide disconnected setting.
      if (!inputs.isVisible(s)) { return; }
      var label = inputs.label(s), port = inputs.portName(s);
      var tile = A.tiles.card(label, iconFor(s, label), function () { inputs.show(s); });
      tile.classList.add('aero-source-card');
      // Badges describe TV-reported state only, never infer a live signal
      // from a saved input name or a standby-device label.
      var recognised = A.inputs.hasRecognizedDevice && A.inputs.hasRecognizedDevice(s);
      var status = '', statusClass = '';
      if (s.type === 'TV') {
        status = 'LIVE'; statusClass = 'aero-source-live';
      } else if (s.connected === true) {
        status = 'CONNECTED'; statusClass = 'aero-source-connected';
      } else if (s.active === true) {
        status = 'ACTIVE'; statusClass = 'aero-source-active';
      } else if (recognised) {
        status = 'RECOGNISED'; statusClass = 'aero-source-recognised';
      }
      if (status) {
        tile.classList.add(statusClass);
        var indicator = A.el('span', 'aero-source-status', status);
        indicator.setAttribute('aria-label', 'Source status: ' + status);
        tile.appendChild(indicator);
      }
      var title = tile.querySelector('.name');
      if (title) {
        var subtitle = s.type === 'TV' ? 'TV tuner' :
          label !== port ? port : s.active ? 'Selected source' :
          recognised ? 'Recognised device' : s.connected ? 'HDMI input' : '';
        if (subtitle) { title.appendChild(A.el('div', 'sub', subtitle)); }
      }
      if (s.connected === false && s.active !== true && !recognised) {
        tile.classList.add('off');
      }
      row.appendChild(tile);
    });
    // Empty ports disappear in filtered mode without shrinking the cards
    // of recognised devices: the tested dock has 354px-wide slots.
    row.classList.toggle('aero-dock-compact',
      A.settings.hideDisconnectedHdmi === true &&
      row.children.length > 0 && row.children.length <= 4);
    A.homeScreen.buildRows();
  };

  // Connected ports first, then empty ones; Live TV last. Refreshes when something is plugged in.
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
        // A selected HDMI may be reported disconnected while the TV is
        // switching sources. Reading the selected source does not imply a cable.
        var current = null;
        try { if (tz.tvwindow && tz.tvwindow.getSource) { current = tz.tvwindow.getSource('MAIN'); } }
        catch (e) { /* firmware may deny this while no video window is active */ }
        function tag(list, connected) {
          return (list || []).filter(function (s) { return s.type !== 'MEDIA'; }).map(function (s) {
            var active = !!(current && s.type === 'HDMI' && current.type === 'HDMI' &&
              Number(current.number) === Number(s.number));
            return { type: s.type, number: s.number, editName: s.editName,
              connected: connected || s.signal === true, active: active, raw: s };
          });
        }
        // Keep one tile per port if firmware reports it in both lists.
        // The connected record wins; preserve a TV-recognised label if needed.
        var discovered = tag(info.connected, true).concat(tag(info.disconnected, false));
        var unique = {};
        discovered.forEach(function (s) {
          var id = String(s.type) + ':' + String(s.number), prior = unique[id];
          if (!prior) { unique[id] = s; return; }
          var preferred = (!prior.connected && s.connected) ? s : prior;
          var alternate = preferred === s ? prior : s;
          if (!inputs.hasRecognizedDevice(preferred) && inputs.hasRecognizedDevice(alternate)) {
            preferred.editName = alternate.editName;
          }
          unique[id] = preferred;
        });
        inputs.sources = Object.keys(unique).map(function (id) { return unique[id]; }).sort(function (a, b) {
          return (a.type === 'TV') - (b.type === 'TV') ||
            (Number(b.connected) - Number(a.connected)) || a.number - b.number;
        });
        inputs.render();
      }, inputs.render);
    } catch (e) { inputs.render(); }
  };

  inputs.show = function (s) {
    // Native Live TV owns channel selection and remote control, unlike the
    // upstream embedded TVWindow. If unsupported, preserve TVWindow fallback.
    if (s && s.type === 'TV' && A.homewatch &&
        typeof A.homewatch.openNativeLiveTV === 'function' &&
        A.homewatch.openNativeLiveTV(s.raw || s) !== false) { return; }
    if (!tz || !tz.tvwindow) { return A.toast('Would switch to ' + inputs.label(s)); }
    try {
      tz.tvwindow.setSource(s.raw || s, function () {
        tz.tvwindow.show(function () {
          inputs.watching = true;
          document.body.classList.add('tv');
          document.documentElement.style.background = 'transparent';
          window.Backgrounds.hide();
        }, function () { A.toast('Could not show ' + inputs.label(s)); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
      }, function () { A.toast('Could not switch input'); }, 'MAIN');
    } catch (e) { A.toast('Could not switch input'); }
  };

  inputs.leave = function () {
    inputs.watching = false;
    document.body.classList.remove('tv');
    A.applyBackground();
    try { tz.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) { /* already hidden */ }
  };

  if (tz && tz.systeminfo) {
    try { tz.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', inputs.load); } catch (e) { /* not supported */ }
  }
})(window.AeroTizen);
