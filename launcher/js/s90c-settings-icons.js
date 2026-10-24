/* S90C SETTINGS ICONS V8.6.1
 * NON modifica A.tiles.banner, settings-ui.js, la Home o la TV.
 * Migliora SOLTANTO la lista #all-apps delle Impostazioni.
 */
(function () {
  'use strict';
  var scope = document.getElementById('all-apps');
  if (!scope) { return; }
  var badgeClass = 's90c-app-icon-fallback';
  var styleId = 's90c-settings-icon-style';

  function addStyles() {
    if (document.getElementById(styleId)) { return; }
    var style = document.createElement('style');
    style.id = styleId;
    style.type = 'text/css';
    style.textContent =
      '#all-apps .tile.s90c-settings-fallback{gap:13px;padding-left:12px;padding-right:12px;}' +
      '#all-apps .s90c-app-icon-fallback{box-sizing:border-box;display:flex;' +
      'align-items:center;justify-content:center;flex:0 0 80px;width:80px;height:80px;' +
      'border-radius:20px;font-family:SamsungOne,Roboto,Arial,sans-serif;font-size:30px;' +
      'font-weight:800;letter-spacing:.5px;color:#fff;text-shadow:0 2px 5px rgba(0,0,0,.4);' +
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.28),0 6px 15px rgba(0,0,0,.23);}' +
      '#all-apps .tile.s90c-settings-fallback .name{font-size:27px;line-height:1.16;' +
      'max-width:calc(100% - 100px);min-width:0;text-align:left;overflow-wrap:break-word;' +
      'word-wrap:break-word;}' +
      '#all-apps .tile.s90c-settings-fallback .s90c-app-name{display:block;}';
    document.head.appendChild(style);
  }

  function getName(tile) {
    var key = tile.getAttribute('data-key') || '';
    var id = key.indexOf('app:') === 0 ? key.substring(4) : tile.getAttribute('data-id');
    var apps = window.AeroTizen && window.AeroTizen.apps && window.AeroTizen.apps.all;
    var i;
    if (id && apps) {
      for (i = 0; i < apps.length; i++) {
        if (apps[i].id === id) { return apps[i].name || id; }
      }
    }
    var name = tile.querySelector('.name');
    return (name && name.textContent) || id || 'App';
  }

  function initials(name) {
    var parts = String(name).replace(/[^a-zA-Z0-9\u00c0-\u024f]+/g, ' ')
                   .replace(/^\s+|\s+$/g, '').split(/\s+/);
    var s = '';
    for (var i = 0; i < parts.length && s.length < 2; i++) {
      if (parts[i]) { s += parts[i].charAt(0); }
    }
    return (s || '?').toUpperCase();
  }

  function tint(name) {
    var n = 0;
    for (var i = 0; i < name.length; i++) { n = (n * 31 + name.charCodeAt(i)) % 360; }
    return 'linear-gradient(140deg,hsl(' + n + ',60%,48%),hsl(' +
           ((n + 28) % 360) + ',60%,25%))';
  }

  function removeFallback(tile) {
    var badge = tile.querySelector('.' + badgeClass);
    if (badge && badge.parentNode) { badge.parentNode.removeChild(badge); }
    var title = tile.querySelector('.s90c-app-name');
    if (title && title.parentNode) { title.parentNode.removeChild(title); }
    if (tile.classList.contains('s90c-settings-fallback')) {
      tile.classList.remove('s90c-settings-fallback');
    }
  }

  function ensureFallback(tile, name) {
    if (tile.querySelector('.' + badgeClass)) { return; }
    var badge = document.createElement('span');
    badge.className = badgeClass;
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = initials(name);
    badge.style.background = tint(name);
    var title = tile.querySelector('.name');
    tile.insertBefore(badge, title || tile.firstChild);
    tile.classList.add('s90c-settings-fallback');
    if (!title) {
      title = document.createElement('div');
      title.className = 'name s90c-app-name';
      title.textContent = name;
      tile.appendChild(title);
    }
  }

  function scan() {
    var tiles = scope.querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      if (tile.classList.contains('addapps') || tile.getAttribute('data-key') === 'add') {
        continue;
      }
      var svg = tile.querySelector('svg');
      var validSvg = svg && svg.querySelector('path,rect,circle,polygon,ellipse,image');
      var images = tile.querySelectorAll('img');
      var ready = false;
      for (var j = 0; j < images.length; j++) {
        var img = images[j];
        if (!img.__s90cIconBound) {
          img.__s90cIconBound = true;
          img.__s90cPrevDisplay = img.style.display || '';
          img.addEventListener('load', function () {
            this.style.display = this.__s90cPrevDisplay;
            schedule();
          }, false);
          img.addEventListener('error', function () {
            this.style.display = 'none';
            schedule();
          }, false);
        }
        if (img.complete && img.naturalWidth > 0) {
          img.style.display = img.__s90cPrevDisplay;
          ready = true;
        } else {
          img.style.display = 'none'; // Icona in caricamento o non accessibile: niente simbolo rotto.
        }
      }
      if (validSvg || ready) { removeFallback(tile); }
      else { ensureFallback(tile, String(getName(tile))); }
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) { return; }
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      scan();
    }, 0);
  }

  addStyles();
  new MutationObserver(schedule).observe(scope, {childList: true, subtree: true});
  scan();
})();
