// Installed apps: discovery, launching, the app store, and the Fireplace tile.
(function (A) {
  'use strict';

  var cfg = A.config, tz = A.tizen;
  var apps = A.apps = { all: [], realIds: [] };

  function isRealApp(a) {
    return a.show !== false && (cfg.STORE_PACKAGE.test(a.packageId || '') || Object.prototype.hasOwnProperty.call(cfg.PRELOADED_APPS, a.id));
  }

  // Upstream compatibility: HbbTV wrapper apps launch through the shared
  // Tizen HbbTV host. This does not touch the tested YouTube/Home flows.
  function hbbtvLink(appId) {
    try {
      if (!tz.application.getAppMetaData) { return ''; }
      var metadata = tz.application.getAppMetaData(appId);
      for (var i = 0; metadata && i < metadata.length; i++) {
        var item = metadata[i];
        if (item && item.key === cfg.HBBTV_LINK_METADATA &&
            typeof item.value === 'string' && item.value.trim()) { return item.value; }
      }
    } catch (e) { /* Some TV firmware does not expose metadata. */ }
    return '';
  }

  apps.load = function (done) {
    if (!tz || !tz.application) {  // desktop browser preview
      apps.all = ['YouTube', 'Netflix', 'Stremio', 'Prime Video', 'Spotify - Music and Podcasts', 'TizenBrew', 'Disney+', 'Plex']
        .map(function (name, i) { return { id: 'demo' + i, name: name, icon: '' }; });
      return done();
    }
    tz.application.getAppsInfo(function (list) {
      apps.realIds = list.filter(function (a) { return (isRealApp(a) || a.id === cfg.HBBTV_APP_ID) && !/service|DclHome001/i.test(a.id); })
        .map(function (a) { return cfg.PRELOADED_APPS[a.id] || a.id; });
      apps.all = list.filter(function (a) { return isRealApp(a) && a.name && !cfg.HIDDEN_APPS.test(a.id) && !cfg.HIDDEN_APPS.test(a.name); })
        .map(function (a) { return { id: a.id, name: a.name, icon: a.iconPath || '' }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      done();
    }, function () { apps.all = []; done(); });
  };

  apps.byId = function (id) {
    for (var i = 0; i < apps.all.length; i++) { if (apps.all[i].id === id) { return apps.all[i]; } }
    return null;
  };

  apps.defaultHome = function () {
    var picked = [];
    cfg.DEFAULT_HOME_APPS.forEach(function (want) {
      apps.all.forEach(function (a) {
        if (picked.indexOf(a.id) < 0 && a.name.toLowerCase().indexOf(want) === 0) { picked.push(a.id); }
      });
    });
    return [cfg.FIREPLACE_ID].concat(picked);
  };

  // S90C V992.3: YouTube/Cobalt may report visible=false to the local Samsung API.
  // Wait for HomeWatcher /leave ACK BEFORE launching YouTube, otherwise the watcher
  // may consider the screen 'covered without an app' and immediately relaunch Home.
  // Other apps keep the original V992.2 launch/watch path unchanged.
  function launchYouTube(app, label) {
    if (!A.homewatch || !A.homewatch.suspendForExternal) {
      A.toast('HomeWatcher non disponibile: YouTube non avviato');
      return;
    }
    A.homewatch.suspendForExternal(function () {
      function failed(err) {
        // The launch failed: restore normal HomeWatcher behavior.
        A.homewatch.resume();
        A.toast('Impossibile aprire ' + label +
          (err && (err.name || err.message) ? ': ' + (err.name || err.message) : ''));
      }
      try {
        tz.application.launch(app.id, function () {
          // API accepted launch, but this does not guarantee that YouTube is visible.
          // Keep watcher suspended until AeroTizen returns to foreground.
        }, failed);
      } catch (e) { failed(e); }
    }, function (reason) {
      A.toast('YouTube non avviato: ' + reason);
    });
  }

  apps.launch = function (app) {
    var label = A.tiles.shortName(app.name);
    if (!tz || !tz.application) { return A.toast('Aprirei ' + label); }
    var link = hbbtvLink(app.id);
    if (link) {
      try {
        var data = [
          new tz.ApplicationControlData('tizenid', [app.id]),
          new tz.ApplicationControlData('hbbtv', [link]),
          new tz.ApplicationControlData('deeplink', ['true'])
        ];
        A.homewatch.watch(cfg.HBBTV_APP_ID);
        tz.application.launchAppControl(
          new tz.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data),
          cfg.HBBTV_APP_ID, null, function () { A.toast('Could not open ' + label); });
      } catch (e) { A.toast('Could not open ' + label); }
      return;
    }
    if (/^youtube$/i.test(String(app.name || '').replace(/^\s+|\s+$/g, ''))) {
      launchYouTube(app, label);
      return;
    }
    A.homewatch.watch(app.id);
    tz.application.launch(app.id, null, function () { A.toast('Impossibile aprire ' + label); });
  };

  // S90C V992.46: ingresso Ricerca Samsung per aggiungere app.
  // L'operazione tizen.application.launch() NON garantisce la visibilita' finale.
  var systemPagePending = false;
  var returnFromSamsung = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !returnFromSamsung) { return; }
    returnFromSamsung = false;
    apps.load(function () {
      if (A.settingsUi && A.settingsUi.isOpen()) {
        A.settingsUi.refreshApps();
      } else if (A.homeScreen) {
        A.homeScreen.render();
      }
    });
  });

  function openSamsungPage() {
    if (systemPagePending) { return; }
    if (!tz || !tz.application || !A.homewatch || !A.homewatch.suspendForExternal) {
      A.toast('Collegamento Samsung non disponibile');
      return;
    }
    systemPagePending = true;
    A.homewatch.suspendForExternal(function () {
      // Gli ID non sono stati verificati sulla S90C: nessun tentativo di Store legacy.
      var candidates = ['com.samsung.tv.coba.search', 'com.samsung.tv.searchall'];

      function tryNext() {
        var id = candidates.shift();
        if (!id) {
          systemPagePending = false;
          // Percorso sicuro: lo stesso tasto Home Samsung gia' collaudato.
          // Search: la lente a sinistra nella Home Samsung.
          if (A.homewatch.openSamsungHome) {
            A.homewatch.openSamsungHome();
          } else {
            A.homewatch.resume();
            A.toast('Home Samsung non disponibile');
          }
          return;
        }
        try {
          tz.application.launch(id, function () {
            systemPagePending = false;
            returnFromSamsung = true;
            // /leave rimane finche' AeroTizen non torna visibile.
          }, function () { tryNext(); });
        } catch (err) { tryNext(); }
      }
      tryNext();
    }, function (reason) {
      systemPagePending = false;
      A.toast('Accesso Samsung non disponibile: ' + reason);
    });
  }

  apps.openStore = function () { openSamsungPage(); };

  // Fireplace: a fireplace video in YouTube; the built-in animated fire as a fallback.
  apps.playFireplace = function () {
    var yt = null;
    apps.all.forEach(function (a) { if (!yt && /^youtube$/i.test(a.name)) { yt = a; } });
    if (!tz || !yt) { return window.Fireplace.open(); }
    A.homewatch.watch(yt.id);
    try {
      var data = [new tz.ApplicationControlData('PAYLOAD', [JSON.stringify({ values: 'v=' + cfg.FIREPLACE_VIDEO })])];
      tz.application.launchAppControl(new tz.ApplicationControl('http://tizen.org/appcontrol/operation/view', null, null, null, data),
        yt.id, null, function () { window.Fireplace.open(); });
    } catch (e) {
      window.Fireplace.open();
    }
  };
})(window.AeroTizen);
