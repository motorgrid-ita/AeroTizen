/* S90C V9.1 - two layouts: unchanged Premium V8; original AeroTizen brand banners.
   Settings/navigation only. This module never communicates with Samsung services. */
(function (A) {
  'use strict';
  var STORAGE = 's90c.theme.preview.v9';  // preserve V9 preferences
  var state = { mode: 'classic', cols: 3, labels: true };
  try {
    var prior = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    // Deleted OLED mode is migrated to safe original V8.
    if (prior.mode === 'classic' || prior.mode === 'brand') { state.mode = prior.mode; }
    if (prior.cols === 3 || prior.cols === 4 || prior.cols === 5) { state.cols = prior.cols; }
    // Legacy labels=false is intentionally ignored: BOX always shows its labels;
    // ICONA displays names only if the Samsung artwork is missing.
  } catch (e) { /* invalid or unavailable settings: use defaults */ }

  function applyClasses() {
    var html = document.documentElement;
    html.classList.toggle('v9-brand', state.mode === 'brand');
    html.classList.toggle('v9-classic', state.mode === 'classic');
    html.classList.remove('v9-rect', 'v9-oled');
    html.classList.remove('v9-nolabels'); // migrate saved No to always-on names
    html.classList.toggle('v9-columns-4', state.cols === 4);
    html.classList.toggle('v9-columns-5', state.cols === 5);
    html.style.setProperty('--v9-cols', String(state.cols));
    html.style.setProperty('--v9-v8-cell-width', ((1792 - (state.cols - 1) * 20) / state.cols).toFixed(2) + 'px');
    html.style.setProperty('--v9-brand-cell-width', ((1792 - (state.cols - 1) * 24) / state.cols).toFixed(2) + 'px');
    html.style.setProperty('--v9-brand-cell-height',
      ((1792 - (state.cols - 1) * 24) / state.cols * 300 / 576).toFixed(2) + 'px');
    A.config.GRID_COLUMNS = state.cols; // all modes, including Originale V8
  }

  function choose(key, value, rerender) {
    state[key] = value;
    applyClasses();
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (e) {}
    if (A.homeScreen && A.homeScreen.render) { A.homeScreen.render(); }
    if (typeof rerender === 'function') { rerender(); }
  }

  // Original AeroTizen banner metadata, adapted from its MIT-licensed brands.js.
  // Use bundled Simple Icons paths: no download, external image request or tracking.
  var BRANDS = [
    { match: 'youtube', bg: '#ffffff', logo: 'youtube', fill: '#ff0000', text: 'YouTube', ink: '#0f0f0f' },
    { match: 'netflix', bg: '#000000', custom: 'netflix_custom', logo: 'netflix', fill: '#e50914', text: null, ink: '#ffffff' },
    { match: 'prime video', bg: 'linear-gradient(135deg,#1a98ff,#0f4c81)', logo: 'primevideo', fill: '#ffffff', text: null, big: true },
    { match: 'spotify', bg: 'linear-gradient(135deg,#1ed760,#0f8a3c)', logo: 'spotify', fill: '#000000', text: 'Spotify', ink: '#000000' },
    { match: 'stremio', bg: 'linear-gradient(135deg,#7b5bf5,#2b1d68)', logo: 'stremio', fill: '#ffffff', text: 'Stremio', ink: '#ffffff' },
    { match: 'max', bg: '#002be7', logo: 'max', fill: '#ffffff', text: null },
    { match: 'hulu', bg: '#1ce783', logo: 'hulu', fill: '#0b0c0f', text: null },
    { match: 'apple tv', bg: 'linear-gradient(135deg,#4a4a4f,#1c1c1e)', logo: 'appletv', fill: '#ffffff', text: null },
    { match: 'plex', bg: '#1f1f1f', logo: 'plex', fill: '#ebaf00', text: null },
    { match: 'twitch', bg: '#9146ff', logo: 'twitch', fill: '#ffffff', text: 'Twitch', ink: '#ffffff' },
    { match: 'crunchyroll', bg: '#f47521', logo: 'crunchyroll', fill: '#ffffff', text: 'Crunchyroll', ink: '#ffffff' },
    { match: 'paramount', bg: '#0064ff', logo: 'paramountplus', fill: '#ffffff', text: null },
    { match: 'tubi', bg: '#7408ff', logo: 'tubi', fill: '#ffffff', text: null },
    { match: 'jellyfin', bg: 'linear-gradient(135deg,#aa5cc3,#00a4dc)', logo: 'jellyfin', fill: '#ffffff', text: 'Jellyfin', ink: '#ffffff' },
    { match: 'disney', bg: '#052e43', custom: 'disney_plus', text: null, ink: '#ffffff' },
    { match: 'raiplay', bg: '#05061e', logo: null, text: null, ink: '#ffffff', custom: 'raiplay_official' },
    // V992.15: riquadri orizzontali per app che esponevano una piccola icona Tizen.
    // Nessun logo remoto e nessuna modifica alle app o ai loro ID.
    { match: 'amazon luna', bg: '#7431e6', custom: 'luna', text: null, ink: '#ffffff' },
    { match: 'luna', bg: '#7431e6', custom: 'luna', text: null, ink: '#ffffff' },
    { match: 'amazon alexa', bg: '#ffffff', custom: 'alexa', text: null, ink: '#009dce' },
    { match: 'alexa', bg: '#ffffff', custom: 'alexa', text: null, ink: '#009dce' },
    { match: 'now', bg: '#006d6f', custom: 'now', text: null, ink: '#ffffff' },
    { match: 'rakuten tv', bg: '#bb0000', custom: 'rakuten_tv', text: null, ink: '#ffffff' },
    { match: 'rakuten', bg: '#bb0000', custom: 'rakuten_tv', text: null, ink: '#ffffff' },
    { match: 'qvc', bg: '#29364f', custom: 'qvc_plus', text: null, ink: '#ffffff' },
    { match: 'xbox', bg: '#057013', custom: 'xbox', text: null, ink: '#ffffff' },
    { match: 'samsung internet', bg: 'linear-gradient(125deg,#1755a5,#092954)', text: 'Internet', kicker: 'SAMSUNG', ink: '#ffffff' },

    { match: 'tizenbrew', bg: 'linear-gradient(135deg,#ff9e1b,#7a2c00)', logo: null, text: 'TizenBrew', ink: '#ffffff', useIcon: true }
  ];
  function brandFor(name) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) {
      if (n.indexOf(BRANDS[i].match) === 0) { return BRANDS[i]; }
    }
    var hue = 0;
    for (var j = 0; j < n.length; j++) { hue = (hue * 31 + n.charCodeAt(j)) % 360; }
    // App non mappate: nome per esteso al posto della piccola icona quadrata.
    // Manteniamo lo stesso colore deterministico della versione precedente.
    return { bg: 'linear-gradient(135deg,hsl(' + hue + ',55%,42%),hsl(' + ((hue + 40) % 360) + ',65%,14%))',
             logo: null, text: String(name || 'App').trim(), ink: '#ffffff' };
  }
  function initials(name) {
    var s = String(name || 'App').replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/ +/);
    return (s.length >= 2 ? s[0].charAt(0) + s[1].charAt(0) : s[0].slice(0, 2)).toUpperCase();
  }
  function decorate(tile, app) {
    if (state.mode !== 'brand' || !tile || !app) { return; }
    var b = brandFor(app.name);
    while (tile.firstChild) { tile.removeChild(tile.firstChild); }
    tile.className = 'tile v9-brand-card' + (!b.text && !b.custom ? ' logo-only' : '') + (b.big ? ' logo-big' : '') + (b.className ? ' ' + b.className : '');
    tile.style.background = b.bg;
    tile.style.setProperty('--v9-brand-bg', b.bg);
    // V992.15: i banner senza logo vettoriale diventano wordmark full-width,
    // non un'icona Tizen quadrata con il testo tagliato a fianco.
    if (b.text && !b.logo && !b.custom && !b.useIcon) {
      var nameLength = String(b.text).length;
      tile.className += ' s90c-full-banner' +
        (nameLength > 17 ? ' s90c-banner-xlong' : nameLength > 10 ? ' s90c-banner-long' : '');
      if (b.kicker) {
        tile.appendChild(A.el('div', 's90c-banner-kicker', b.kicker));
      }
    }
    // V992.16: provided brand artwork; local assets, Brand only, no app ID changes.
    var officialAssets = {
      netflix_custom: 'netflix-custom.png',
      disney_plus: 'disney-plus-official.png',
      xbox: 'xbox-official.png',
      luna: 'luna-official.png',
      now: 'now-official.png',
      rakuten_tv: 'rakuten-tv-official.png',
      alexa: 'alexa-official.png',
      qvc_plus: 'qvc-plus-official.png'
    };
    if (b.custom && officialAssets[b.custom]) {
      tile.className += ' s90c-official-banner';
      var officialLogo = new Image();
      officialLogo.className = 's90c-official-banner-image';
      officialLogo.alt = b.text || app.name;
      officialLogo.onerror = function () {
        if (officialLogo.parentNode) { officialLogo.parentNode.removeChild(officialLogo); }
        var label = A.el('div', 'name', app.name);
        label.style.color = b.ink || '#ffffff';
        tile.appendChild(label);
      };
      tile.appendChild(officialLogo);
      officialLogo.src = 'assets/brands/' + officialAssets[b.custom];
      return;
    }

    // S90C V9.2.3 – official RaiPlay bitmap from the user-provided PNG.
    // Applied exclusively to Brand rettangolare, not to Originale V8.
    if (b.custom === 'raiplay_official') {
      tile.className += ' raiplay-official';
      var official = new Image();
      official.className = 'raiplay-official-image';
      official.alt = 'RaiPlay';
      official.onerror = function () {
        if (official.parentNode) { official.parentNode.removeChild(official); }
        tile.appendChild(A.el('div', 'raiplay-official-fallback', 'RaiPlay'));
      };
      tile.appendChild(official);
      official.src = 'assets/brands/raiplay-official.png';
      return;
    }

    if (b.logo && window.LOGOS && window.LOGOS[b.logo]) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'logo'); svg.setAttribute('viewBox', '0 0 24 24');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', b.fill); path.setAttribute('d', window.LOGOS[b.logo]);
      svg.appendChild(path); tile.appendChild(svg);
    } else if (b.useIcon && app.icon) {
      var img = new Image(); img.alt = ''; img.className = 'logo';
      img.onerror = function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
        var fallback = A.el('span', 'v9-brand-fallback', initials(app.name));
        tile.insertBefore(fallback, tile.firstChild);
      };
      tile.appendChild(img); img.src = app.icon;
    }
    if (b.text) {
      var label = A.el('div', 'name', b.text);
      label.style.color = b.ink;
      tile.appendChild(label);
    }
  }

  function button(label, key, active, cb) {
    var element = A.el('div', 'pill unit' + (active ? ' on' : ''), label);
    element.dataset.key = key;
    element.onclick = cb;
    return element;
  }
  function renderOptions(refresh) {
    var modes = A.$('v9-mode-picks'), columns = A.$('v9-col-picks');
    if (!modes || !columns) { return; }
    modes.textContent = ''; columns.textContent = '';
    [['classic', 'Quadrato'], ['brand', 'Rettangolo']].forEach(function (o) {
      modes.appendChild(button(o[1], 'v9:mode:' + o[0], state.mode === o[0], function () {
        choose('mode', o[0], refresh);
      }));
    });
    [3, 4, 5].forEach(function (n) {
      columns.appendChild(button(n + ' per riga', 'v9:cols:' + n, state.cols === n, function () {
        choose('cols', n, refresh);
      }));
    });
    columns.style.opacity = '1';
  }

  applyClasses();
  A.v9Theme = { decorate: decorate, renderOptions: renderOptions, get: function () { return state; } };
})(window.AeroTizen);
