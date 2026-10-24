// App tiles: Android-TV-style banners (brand background + official logo) and icons.
(function (A) {
  'use strict';

  // match: lower-case name prefix; logo: Simple Icons slug from logos.js; fill: logo colour;
  // text: wordmark beside the logo (null = the logo is the wordmark); big: oversized logo.
  var BRANDS = [
    { match: 'youtube', bg: '#ffffff', logo: 'youtube', fill: '#ff0000', text: 'YouTube', ink: '#0f0f0f' },
    { match: 'netflix', bg: 'linear-gradient(135deg,#e50914,#8a0610)', logo: 'netflix', fill: '#ffffff', text: null },
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
    { match: 'disney', bg: 'linear-gradient(135deg,#1a3fa3,#06102e)', logo: null, text: 'Disney+', ink: '#ffffff' },
    { match: 'tizenbrew', bg: 'linear-gradient(135deg,#ff9e1b,#7a2c00)', logo: null, text: 'TizenBrew', ink: '#ffffff', useIcon: true }
  ];

  function svg(viewBoxContent, className) {
    return '<svg' + (className ? ' class="' + className + '"' : '') + ' viewBox="0 0 24 24">' + viewBoxContent + '</svg>';
  }
  var BADGE = '<rect width="24" height="24" rx="5" fill="#2c2c30"/>';
  var ICONS = {
    flame: svg('<path fill="#ffd27a" d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.5 0 2.2-1.2 2-3 2.3 1.9 3.7 4.3 3.7 7A6.5 6.5 0 0 1 12 22.5 6.5 6.5 0 0 1 5.5 16c0-4.6 3.6-7.4 4.8-10.4C11 4.2 11.6 3 12 2z"/>', 'flame'),
    plus: svg('<circle cx="12" cy="12" r="10.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>', 'logo'),
    hdmi: svg(BADGE + '<path fill="#fff" d="M5 9h14v3l-2 3H7l-2-3zM8 11v1h1v-1zm3 0v1h2v-1zm4 0v1h1v-1z"/>'),
    tv: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M5 8h14v9H5zM9 5l3 3 3-3"/>'),
    game: svg(BADGE + '<path fill="#fff" d="M7.5 8h9a3.5 3.5 0 0 1 3.4 4.3l-.8 3.2a2 2 0 0 1-3.4.9L14.3 15H9.7l-1.4 1.4a2 2 0 0 1-3.4-.9l-.8-3.2A3.5 3.5 0 0 1 7.5 8zM8 10v1H7v1h1v1h1v-1h1v-1H9v-1zm7.5.3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6zm-1.6 1.6a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z"/>'),
    pc: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M5 6.5h14v9H5zM9 19h6M12 15.5V19"/>'),
    box: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M4.5 10h15v5h-15z"/><circle cx="16.5" cy="12.5" r="1" fill="#fff"/>')
  };

  function shortName(name) { return name.replace(/ - .*/, '').replace(/NextGeneration$/, ''); }

  function brandFor(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) { if (n.indexOf(BRANDS[i].match) === 0) { return BRANDS[i]; } }
    // Unknown apps: a stable colour derived from the name, plus the app's own icon.
    var h = 0;
    for (var j = 0; j < n.length; j++) { h = (h * 31 + n.charCodeAt(j)) % 360; }
    return { bg: 'linear-gradient(135deg,hsl(' + h + ',55%,42%),hsl(' + ((h + 40) % 360) + ',65%,14%))',
             logo: null, text: shortName(name), ink: '#ffffff', useIcon: true };
  }

  function logoSvg(slug, fill) {
    var d = window.LOGOS && window.LOGOS[slug];
    return d ? svg('<path fill="' + fill + '" d="' + d + '"/>', 'logo') : '';
  }

  // A banner tile for an app; `onSelect` runs when the tile is chosen.
  // Priorita': icona originale Tizen, mantenuta a colori.
  // Se manca, mostriamo un riquadro nei colori originali del marchio.
  function iconPalette(name) {
    var n = name.toLowerCase();
    var brands = [
      ['youtube', '#ff0033', '#ffffff'],
      ['netflix', '#141414', '#e50914'],
      ['prime video', '#00a8e1', '#ffffff'],
      ['stremio', '#7458ed', '#ffffff'],
      ['spotify', '#1ed760', '#121212'],
      ['disney', '#1745ac', '#ffffff'],
      ['apple tv', '#252525', '#ffffff'],
      ['plex', '#181818', '#e5a00d'],
      ['max', '#3522a8', '#ffffff'],
      ['twitch', '#9146ff', '#ffffff'],
      ['crunchyroll', '#f47521', '#ffffff'],
      ['paramount', '#0064ff', '#ffffff'],
      ['hulu', '#1ce783', '#101010'],
      ['jellyfin', '#7044a8', '#ffffff'],
      ['tubi', '#6b30d9', '#ffffff'],
      ['tizenbrew', '#c5680d', '#ffffff']
    ];
    for (var i = 0; i < brands.length; i++) {
      if (n.indexOf(brands[i][0]) === 0) {
        return { bg: brands[i][1], fg: brands[i][2] };
      }
    }
    // Le app sconosciute mantengono un accento cromatico distinto.
    var hash = 0;
    for (var j = 0; j < n.length; j++) { hash = (hash * 31 + n.charCodeAt(j)) % 360; }
    return { bg: 'hsl(' + hash + ',58%,37%)', fg: '#ffffff' };
  }

  /* S90C PREMIUM ICONS V8 */
  function s90cPremiumIcon(name) {
    var n = String(name || '').toLowerCase();
    var slug = '';
    var bg = '';
    var fg = '';
    var x = 0, y = 0, scale = 1;
    if (n.indexOf('youtube') === 0) {
      slug = 'youtube'; bg = '#f50031'; fg = '#fff'; x = 32; y = 32; scale = 7.333;
    } else if (n.indexOf('netflix') === 0) {
      slug = 'netflix'; bg = '#17171c'; fg = '#e50914'; x = 36; y = 36; scale = 7;
    } else if (n.indexOf('prime video') === 0) {
      slug = 'primevideo'; bg = '#0578b9'; fg = '#fff'; x = 18; y = 10; scale = 8.5;
    } else if (n.indexOf('stremio') === 0) {
      slug = 'stremio'; bg = '#6f49ea'; fg = '#fff'; x = 48; y = 48; scale = 6;
    } else if (n.indexOf('spotify') === 0) {
      slug = 'spotify'; bg = '#1ed760'; fg = '#101813'; x = 48; y = 48; scale = 6;
    } else { return ''; }
    var path = window.LOGOS && window.LOGOS[slug];
    if (!path) { return ''; }
    // Le coordinate di SVG sono costanti locali, non provengono da app/Tizen.
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true">';
    if (slug === 'stremio') {
      s += '<defs><linearGradient id="s90c-premium-stremio" x1="0" x2="1" y1="1" y2="0">' +
           '<stop offset="0" stop-color="#342ba2"/><stop offset="1" stop-color="#9260f4"/>' +
           '</linearGradient></defs>';
      bg = 'url(#s90c-premium-stremio)';
    }
    s += '<rect width="240" height="240" rx="40" fill="' + bg + '"/>';
    s += '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
         '<path fill="' + fg + '" d="' + path + '"/></g></svg>';
    return s;
  }

  function banner(app, extraClass, onSelect) {
    var premium = s90cPremiumIcon(app.name);
    if (premium) {
      var special = A.el('div', 'tile app-icon-tile s90c-premium-tile' + (extraClass ? ' ' + extraClass : ''));
      var artwork = A.el('span', 's90c-premium-icon');
      artwork.innerHTML = premium;
      special.appendChild(artwork);
      special.appendChild(A.el('div', 'name', shortName(app.name)));
      special.onclick = onSelect;
      return special;
    }

    var b = brandFor(app.name);
    var tile = A.el('div', 'tile app-icon-tile' + (extraClass ? ' ' + extraClass : ''));

    function addFallbackLogo() {
      var palette = iconPalette(app.name);
      var mark = A.el('span', 'brand-mark');
      mark.style.background = palette.bg;
      if (b.logo && window.LOGOS && window.LOGOS[b.logo]) {
        mark.innerHTML = logoSvg(b.logo, palette.fg);
      } else {
        // Non inventiamo un logo: per app senza risorsa disponibile usiamo le iniziali.
        var text = b.text || shortName(app.name);
        var initials = (text === 'Disney+' ? 'D+' : text.slice(0, 2).toUpperCase());
        mark.appendChild(A.el('span', 'brand-letters', initials));
      }
      tile.insertBefore(mark, tile.firstChild);
    }

    if (app.icon) {
      var img = new Image();
      img.className = 'logo';
      img.alt = '';
      img.onerror = function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
        addFallbackLogo();
      };
      tile.appendChild(img);
      img.src = app.icon;
    } else {
      addFallbackLogo();
    }

    tile.appendChild(A.el('div', 'name', shortName(app.name)));
    tile.onclick = onSelect;
    return tile;
  }

  // A compact card (icon + label), used for inputs.
  function card(label, iconSvg, onSelect) {
    var tile = A.el('div', 'tile');
    tile.innerHTML = iconSvg;
    tile.appendChild(A.el('div', 'name', label));
    tile.onclick = onSelect;
    return tile;
  }

  A.tiles = { ICONS: ICONS, banner: banner, card: card, shortName: shortName };
})(window.AeroTizen);
