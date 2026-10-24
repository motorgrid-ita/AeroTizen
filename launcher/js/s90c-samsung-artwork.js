/* S90C V992.31 — artwork e fallback proporzionali + Samsung artwork PR #11.
 * Based on helalaou/AeroTizen commit 30bf74c (#11).
 * Artwork is read from the TV's own cache; no Samsung images are distributed.
 * Fallback: existing Simple Icons SVGs; otherwise Tizen native icon + label.
 * BOX/Premium, HomeWatcher, application launching and remote navigation are untouched.
 */
(function (A) {
  'use strict';

  // App ID <-> Samsung store ID pairs checked in upstream PR #11.
  // Unverified services are deliberately not assigned guessed IDs.
  var CATALOG = [
    { ids: ['9Ur5IzDKqV.TizenYouTube'], names: ['youtube'], store: '111299001912' },
    { ids: ['org.tizen.netflix-app'], names: ['netflix'], store: '3201907018807' },
    { ids: ['org.tizen.primevideo'], names: ['prime video', 'amazon prime video'], store: '3201910019365' },
    { ids: ['IkWsFHtOY9.Stremio'], names: ['stremio'], store: '3202306031311' },
    { ids: ['MCmYXNxgcu.DisneyPlus'], names: ['disney+'], store: '3201901017640' },
    { ids: ['DqEoaplKlw.bbchybrid'], names: ['bbc iplayer'], store: '3201601007670' },
    { ids: ['GR7TWEBh5d.BBCSounds'], names: ['bbc sounds'], store: '3202003020365' },
    { ids: ['OEvCiupaFR.ITVHub'], names: ['itvx', 'itv hub'], store: '121299000089' },
    { ids: ['OCaxbgg9v6.chfourctv'], names: ['channel 4', 'all 4'], store: '111299002148' },
    { ids: ['VQr0RGkyS9.UKTVPlay'], names: ['uktv play'], store: '3201806016432' },
    { ids: ['EkzyZtmneG.My5'], names: ['my5'], store: '121299000612' },
    { ids: [], names: ['spotify'], store: '3202007021175' },
    { ids: [], names: ['samsung tv plus'], store: '3202405035480' }
  ];

  function shortName(name) {
    return String(name || 'App').replace(/ - .*/, '').replace(/NextGeneration$/, '').trim();
  }
  function validStore(value) { return /^\d{6,16}$/.test(String(value || '')); }

  function cacheFromIcon(icon) {
    // Samsung may return either /opt/... or file:///opt/... through iconPath.
    var match = String(icon || '').match(/^(?:file:\/\/)?(\/opt\/share\/webappservice\/apps_icon\/(?:all|FirstScreen)\/(\d+)\/[^?#]+)(?:[?#].*)?$/i);
    return match ? { path: match[1], store: match[2] } : null;
  }

  // A Samsung artwork filename proves its file source, not that the store
  // mapping matches the installed app. Keep the origin of the store-ID lookup.
  function resolveStore(app) {
    if (!app) { return null; }
    var id = String(app.id || ''), cached = cacheFromIcon(app.icon), i, entry;
    if (validStore(app.storeId)) { return {store:String(app.storeId), method:'tv-store-id'}; }
    if (cached && validStore(cached.store)) { return {store:cached.store, method:'tv-icon-cache-id'}; }
    if (validStore(id)) { return {store:id, method:'tv-app-id'}; }
    var preloaded = A.config.PRELOADED_APPS && A.config.PRELOADED_APPS[id];
    if (validStore(preloaded)) { return {store:String(preloaded), method:'preloaded-map'}; }
    for (i = 0; i < CATALOG.length; i++) {
      entry = CATALOG[i];
      if (entry.ids.indexOf(id) !== -1) { return {store:entry.store, method:'catalog-app-id'}; }
    }
    var name = shortName(app.name).toLowerCase();
    for (i = 0; i < CATALOG.length; i++) {
      entry = CATALOG[i];
      if (entry.names.indexOf(name) !== -1) {
        return {store:entry.store, method:'catalog-name-unverified-on-this-tv'};
      }
    }
    return null;
  }

  function sources(app) {
    if (!A.tizen || !app) { return []; }
    var result = [], idInfo = resolveStore(app);
    var store = idInfo && idInfo.store;
    function add(value) {
      if (value && result.indexOf(value) === -1) { result.push(value); }
    }
    if (validStore(store)) {
      // These are the only two Samsung tile-cache assets displayed in ICONA.
      add('/opt/share/webappservice/apps_icon/all/' + store + '/304x304.png');
      add('/opt/share/webappservice/apps_icon/FirstScreen/' + store + '/250x250.png');
      if (String(app.icon || '').indexOf('file:///opt/') === 0) {
        add('file:///opt/share/webappservice/apps_icon/all/' + store + '/304x304.png');
        add('file:///opt/share/webappservice/apps_icon/FirstScreen/' + store + '/250x250.png');
      }
    }
    // Commit #11 also tries the TV-provided cache path, when it is from
    // Samsung's apps_icon cache. Do not display other local/custom images.
    var cached = cacheFromIcon(app.icon);
    if (cached) { add(app.icon); }
    return result;
  }


  // Find unusually wide, unused borders *inside* Samsung/native PNGs.
  // No image data are sent anywhere. Readback can be denied for file: images
  // on some Tizen builds; failure is harmless and uses the original image.
  function visibleArea(pixels, w, h) {
    var i, x, y, p, alpha = false, count = 0, l = w, t = h, r = -1, b = -1;
    for (i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 180) { alpha = true; break; }
    }
    var bg = null;
    if (!alpha) {
      var coords = [[3,3],[w-4,3],[3,h-4],[w-4,h-4]], samples = [];
      for (i = 0; i < coords.length; i++) {
        p = (coords[i][1] * w + coords[i][0]) * 4;
        samples.push([pixels[p],pixels[p+1],pixels[p+2]]);
      }
      for (i = 1; i < samples.length; i++) {
        if (Math.abs(samples[0][0]-samples[i][0])+
            Math.abs(samples[0][1]-samples[i][1])+
            Math.abs(samples[0][2]-samples[i][2]) > 32) { return null; }
      }
      bg = samples[0];
      // A uniform corner isn't enough: landscapes/images must not be cropped.
      var edge = 0, similar = 0;
      for (x = 0; x < w; x += 4) {
        for (y = 0; y < h; y += 4) {
          if (x > 3 && x < w - 4 && y > 3 && y < h - 4) { continue; }
          p = (y*w+x)*4; edge++;
          if (Math.abs(pixels[p]-bg[0])+Math.abs(pixels[p+1]-bg[1])+
              Math.abs(pixels[p+2]-bg[2]) < 40) { similar++; }
        }
      }
      if (!edge || similar / edge < 0.80) { return null; }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        p = (y*w+x)*4;
        var foreground = alpha ? pixels[p+3] > 48 :
          (Math.abs(pixels[p]-bg[0]) + Math.abs(pixels[p+1]-bg[1]) +
           Math.abs(pixels[p+2]-bg[2]) > 68);
        if (foreground) {
          count++;
          if (x < l) {l=x;} if (x > r) {r=x;}
          if (y < t) {t=y;} if (y > b) {b=y;}
        }
      }
    }
    if (r < l || count / (w*h) < 0.016 || count / (w*h) > 0.85) { return null; }
    var span = Math.max((r-l+1)/w,(b-t+1)/h);
    if (span > 0.84 || span < 0.22) { return null; }
    // Zoom bounded to keep logos with large baked-in margins legible.
    // Only when canvas detected a genuinely flat/transparent surround.
    var zoom = Math.min(2.70, 0.94 / span);
    if (zoom < 1.06) { return null; }
    return {
      zoom: zoom,
      x: (0.5 - ((l+r+1)/2)/w) * zoom * 100,
      y: (0.5 - ((t+b+1)/2)/h) * zoom * 100
    };
  }

  // V992.31: preserve the *whole* Samsung/Tizen PNG.
  // V992.29's automated 2.70x scaling could crop letters or spill outside a card.
  function fitInternalPadding(img, isNative) {
    img.style.transform = 'none';
    img.style.transformOrigin = 'center center';
  }

  // Mirrors PR #11 app-catalog fallback branding. The SVG path data are
  // already bundled in js/logos.js (generated from Simple Icons).
  // Resolve verified IDs before legacy name-prefix matches, as upstream does.
  var FALLBACK_BRANDS = [
    {ids:['9Ur5IzDKqV.TizenYouTube','111299001912'], match:['youtube'], bg:'#ffffff', slug:'youtube', fg:'#ff0000', label:'YouTube', ink:'#0f0f0f'},
    {ids:['org.tizen.netflix-app','3201907018807'], match:['netflix'], bg:'linear-gradient(135deg,#e50914,#8a0610)', slug:'netflix', fg:'#ffffff', label:null},
    {ids:['org.tizen.primevideo','3201910019365'], match:['prime video'], bg:'linear-gradient(135deg,#1a98ff,#0f4c81)', slug:'primevideo', fg:'#ffffff', label:null, large:true},
    {ids:['3202007021175'], match:['spotify'], bg:'linear-gradient(135deg,#1ed760,#0f8a3c)', slug:'spotify', fg:'#000000', label:'Spotify', ink:'#000000'},
    {ids:['IkWsFHtOY9.Stremio','3202306031311'], match:['stremio'], bg:'linear-gradient(135deg,#7b5bf5,#2b1d68)', slug:'stremio', fg:'#ffffff', label:'Stremio'},
    {ids:[], match:['max'], bg:'#002be7', slug:'max', fg:'#ffffff', label:null},
    {ids:[], match:['hulu'], bg:'#1ce783', slug:'hulu', fg:'#0b0c0f', label:null},
    {ids:[], match:['apple tv'], bg:'linear-gradient(135deg,#4a4a4f,#1c1c1e)', slug:'appletv', fg:'#ffffff', label:null},
    {ids:[], match:['plex'], bg:'#1f1f1f', slug:'plex', fg:'#ebaf00', label:null},
    {ids:[], match:['twitch'], bg:'#9146ff', slug:'twitch', fg:'#ffffff', label:'Twitch'},
    {ids:[], match:['crunchyroll'], bg:'#f47521', slug:'crunchyroll', fg:'#ffffff', label:'Crunchyroll'},
    {ids:[], match:['paramount'], bg:'#0064ff', slug:'paramountplus', fg:'#ffffff', label:null},
    {ids:[], match:['tubi'], bg:'#7408ff', slug:'tubi', fg:'#ffffff', label:null},
    {ids:[], match:['jellyfin'], bg:'linear-gradient(135deg,#aa5cc3,#00a4dc)', slug:'jellyfin', fg:'#ffffff', label:'Jellyfin'},
    {ids:['MCmYXNxgcu.DisneyPlus','3201901017640'], match:['disney'], bg:'linear-gradient(135deg,#1a3fa3,#06102e)', slug:null, label:'Disney+'},
    {ids:[], match:['tizenbrew'], bg:'linear-gradient(135deg,#ff9e1b,#7a2c00)', slug:null, label:'TizenBrew'}
  ];

  function fallbackBrand(app) {
    var id=String(app.id||''), name=String(app.name||'').toLowerCase(), i, j;
    for (i=0; i<FALLBACK_BRANDS.length; i++) {
      if (FALLBACK_BRANDS[i].ids.indexOf(id)!==-1) {return FALLBACK_BRANDS[i];}
    }
    for (i=0; i<FALLBACK_BRANDS.length; i++) {
      for (j=0; j<FALLBACK_BRANDS[i].match.length; j++) {
        if (name.indexOf(FALLBACK_BRANDS[i].match[j])===0) {return FALLBACK_BRANDS[i];}
      }
    }
    return null;
  }

  function backgroundFor(app) {
    var id=String(app.id||app.name||'App'), hash=0;
    for (var i=0;i<id.length;i++) {hash=(hash*31+id.charCodeAt(i))%360;}
    return 'linear-gradient(135deg,hsl('+hash+',55%,42%),hsl('+((hash+40)%360)+',65%,14%))';
  }

  function renderFallback(app, tile, fallback) {
    var b=fallbackBrand(app), label=shortName(app.name), logoData=null;
    if (b && b.slug && window.LOGOS) {logoData=window.LOGOS[b.slug]||null;}
    tile.style.setProperty('--s90c-brand-bg', b ? b.bg : backgroundFor(app));
    if (logoData) {
      // Exact SVG path data from Simple Icons, already present offline.
      var svg=A.el('span','s90c-simpleicons-mark');
      svg.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="'+b.fg+'" d="'+logoData+'"/></svg>';
      fallback.appendChild(svg);
      fallback.classList.add('s90c-has-simpleicon');
      if (!b.label) {fallback.classList.add('s90c-logo-only');}
      if (b.large) {fallback.classList.add('s90c-large-logo');}
      tile.dataset.s90cFallback='simple-icons';
    } else {
      // PR #11: unknown brands fall back to their original Tizen icon+name.
      // This asset is used ONLY when the Samsung artwork could not be loaded.
      tile.dataset.s90cFallback='text';
      if (app.icon) {
        var img=new Image(); img.className='s90c-native-fallback-icon'; img.alt='';
        img.onerror=function () {
          img.onerror=null;
          tile.classList.remove('s90c-native-ready');
          if (img.parentNode) {img.parentNode.removeChild(img);}
          tile.dataset.s90cFallback='text';
          tile.dataset.s90cDisplayed='text';
        };
        img.onload=function () {
          // Some Samsung apps (NOW, RaiPlay, QVC+) expose an iconPath
          // but their store ID is absent from the verified artwork catalog.
          // A loaded Tizen image is therefore rendered edge-to-edge,
          // rather than as a small icon over a second coloured tile.
          // It remains correctly labelled as a *Tizen* source in diagnostics.
          if (tile.dataset.s90cArtworkState === 'found') { return; }
          tile.classList.add('s90c-native-ready');
          tile.dataset.s90cFallback='tizen-icon-fullbleed';
          tile.dataset.s90cDisplayed='tizen-icon';
          fitInternalPadding(img, false);
        };
        fallback.appendChild(img);
        // Samsung artwork is the first choice. Give its local cached image a
        // short head start before decoding a second full-size native bitmap.
        // If the Samsung image is missing, the native icon still loads normally.
        setTimeout(function () {
          if (tile.dataset.s90cArtworkState !== 'found') { img.src=app.icon; }
        }, 150);
      }
    }
    // Follow upstream: a logo-only card doesn't need an extra name line;
    // labeled logos and native fallback icons do show an app name.
    if (!logoData || b.label) {
      var name=A.el('div','name',logoData&&b.label?b.label:label);
      if (b && b.ink) {fallback.style.color=b.ink;}
      fallback.appendChild(name);
    }
  }

  // V992.51: share Samsung artwork discovery between Home / All Apps. A single
  // app can appear in both tabs; duplicate 5-second missing-file probes caused
  // extra image work on the square layout. Cache both positive and negative
  // results for the current launcher session. Original Samsung paths/priority
  // and native fallback behaviour remain unchanged.
  var artworkJobs = {};
  function discoverArtwork(candidates, callback) {
    if (!candidates.length) { callback(null, null); return; }
    var key = candidates.join('\n');
    var job = artworkJobs[key];
    if (job) {
      if (job.pending) { job.listeners.push(callback); }
      else { callback(job.src, null); }
      return;
    }
    job = { pending: true, src: null, listeners: [callback] };
    artworkJobs[key] = job;
    var index = 0;
    function resolve(src, image) {
      job.pending = false;
      job.src = src;
      var listeners = job.listeners;
      job.listeners = [];
      for (var i = 0; i < listeners.length; i++) {
        // The first tile takes ownership of the original loaded image; other
        // tiles load only the confirmed path, hitting the browser image cache.
        listeners[i](src, i === 0 ? image : null);
      }
    }
    function attempt() {
      if (index >= candidates.length) { resolve(null, null); return; }
      var src = candidates[index++], artwork = new Image(), timer = null, finished = false;
      function clean() {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        artwork.onload = artwork.onerror = null;
      }
      function failed() {
        if (finished) { return; }
        finished = true;
        clean();
        attempt();
      }
      artwork.onload = function () {
        if (finished) { return; }
        var w = artwork.naturalWidth, h = artwork.naturalHeight;
        // The PR #11 Samsung square-artwork validation is unchanged.
        if (w && h && (w < 180 || h < 180 || w / h < 0.80 || w / h > 1.25)) {
          failed(); return;
        }
        finished = true;
        clean();
        resolve(src, artwork);
      };
      artwork.onerror = failed;
      timer = setTimeout(failed, 5000);
      artwork.src = src;
    }
    attempt();
  }

  function card(app, onSelect) {
    var name = shortName(app.name);
    var tile = A.el('div', 'tile app-tile s90c-standard-card');
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', name);
    tile.title = name;
    tile.onclick = onSelect;
    tile.dataset.s90cArtworkState = 'searching';
    var identity = resolveStore(app);
    tile.dataset.s90cArtworkLookup = identity ? identity.method : 'none';
    tile.dataset.s90cArtworkStore = identity ? identity.store : '';
    tile.dataset.s90cArtworkAppId = String(app.id || '');
    var fallback = A.el('div', 's90c-app-fallback');
    renderFallback(app, tile, fallback);
    tile.appendChild(fallback);

    var candidates = sources(app);
    discoverArtwork(candidates, function (src, loaded) {
      if (!src) { tile.dataset.s90cArtworkState = 'missing'; return; }
      var artwork = loaded || new Image(), timer = null, finished = false;
      function clean() {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        artwork.onload = artwork.onerror = null;
      }
      function success() {
        if (finished) { return; }
        finished = true;
        clean();
        artwork.className = 's90c-samsung-artwork';
        artwork.alt = '';
        tile.style.background = 'transparent';
        fallback.hidden = true;
        tile.classList.remove('s90c-native-ready');
        tile.classList.add('s90c-samsung-ready');
        tile.dataset.s90cArtworkState = 'found';
        tile.dataset.s90cDisplayed = 'samsung-cache';
        tile.dataset.s90cArtworkSource = src;
        tile.appendChild(artwork);
        fitInternalPadding(artwork, false);
      }
      function failed() {
        if (finished) { return; }
        finished = true;
        clean();
        tile.dataset.s90cArtworkState = 'missing';
      }
      if (loaded) { success(); }
      else {
        artwork.onload = success;
        artwork.onerror = failed;
        timer = setTimeout(failed, 5000);
        artwork.src = src;
      }
    });
    return tile;
  }

  A.s90cSamsungArtwork = { sources: sources, card: card, visibleArea: visibleArea, resolveStore: resolveStore };
})(window.AeroTizen);
