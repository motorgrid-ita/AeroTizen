// Talks to the background service (service/index.js) that reclaims the screen from
// Samsung Home. Hidden web apps are frozen on retail TVs, so the watching happens there;
// the launcher only reports what it opens and when it's back in front.
(function (A) {
  'use strict';

  var cfg = A.config, tz = A.tizen;
  var leaving = false;

  function tell(path) {
    if (!tz) { return; }
    var x = new XMLHttpRequest();
    x.open('GET', cfg.SERVICE_URL + path);
    x.timeout = 1500;
    x.onerror = x.ontimeout = start;  // not running (first boot, crash): start it
    x.send();
  }

  function start() {
    if (!tz) { return; }
    try {
      tz.application.launchAppControl(new tz.ApplicationControl('http://tizen.org/appcontrol/operation/service'),
        cfg.SERVICE_ID, null, null);
    } catch (e) { /* service unavailable: Home simply goes to Samsung's screen */ }
  }

  /* S90C SAMSUNG HOME SHORTCUT V8.4.1 */
  var samsungLaunchPending = false;
  function openNativeSamsungHome() {
    if (samsungLaunchPending) { return; }
    if (!tz || !tz.application || !tz.ApplicationControl) {
      A.toast('Disponibile solo sulla TV Samsung');
      return;
    }
    samsungLaunchPending = true;

    function resumeOnError(detail) {
      samsungLaunchPending = false;
      // If Samsung refused the launch, reactivate the normal watchdog.
      var back = new XMLHttpRequest();
      try { back.open('GET', cfg.SERVICE_URL + '/home', true); back.timeout = 1500; back.send(); }
      catch (ignored) { /* a restarted service will follow the normal page load */ }
      A.toast('Home Samsung non avviabile: ' + detail);
    }
    function onSuccess() {
      samsungLaunchPending = false;
      // Remain in /leave while Samsung Home is visible. Home physical now opens AeroTizen.
    }
    function attemptAppControl() {
      try {
        var control = new tz.ApplicationControl('http://tizen.org/appcontrol/operation/main');
        tz.application.launchAppControl(control, 'com.samsung.tv.csfs', onSuccess,
          function (err) { resumeOnError((err && (err.name || err.message)) || 'accesso negato'); });
      } catch (err) {
        resumeOnError((err && (err.name || err.message)) || 'errore app-control');
      }
    }
    function attemptLaunch() {
      try {
        tz.application.launch('com.samsung.tv.csfs', onSuccess,
          function () { attemptAppControl(); });
      } catch (err) { attemptAppControl(); }
    }

    // ACK from the HomeWatcher service is essential. Otherwise it may instantly
    // reclaim the screen before Samsung Home becomes visible.
    var req = new XMLHttpRequest();
    try {
      req.open('GET', cfg.SERVICE_URL + '/leave', true);
      req.timeout = 1500;
      req.onload = function () {
        if (req.status >= 200 && req.status < 300) { attemptLaunch(); }
        else { resumeOnError('HomeWatcher non disponibile (' + req.status + ')'); }
      };
      req.onerror = req.ontimeout = function () { resumeOnError('HomeWatcher non raggiungibile'); };
      req.send();
    } catch (err) { resumeOnError('richiesta a HomeWatcher non riuscita'); }
  }

  /* S90C NATIVE LIVE TV V8.5 */
  // A differenza di tvwindow, la TV nativa controlla autonomamente i canali.
  // /leave deve ricevere conferma PRIMA dell'avvio per evitare che il watcher
  // riporti subito AeroTizen in primo piano.
  var liveTVLaunchPending = false;
  function openNativeLiveTV(videoSource) {
    if (liveTVLaunchPending) { return; }
    if (!tz || !tz.application || typeof tz.application.launch !== 'function') {
      A.toast('Visualizzatore TV Samsung non disponibile');
      return;
    }
    liveTVLaunchPending = true;
    var finished = false;

    function rearmAndReport(reason) {
      if (finished) { return; }
      finished = true;
      liveTVLaunchPending = false;
      try {
        var rearm = new XMLHttpRequest();
        rearm.open('GET', cfg.SERVICE_URL + '/home', true);
        rearm.timeout = 1500;
        rearm.send();
      } catch (ignored) {}
      A.toast('TV nativa non avviabile: ' + reason);
    }

    function launchAccepted() {
      if (finished) { return; }
      finished = true;
      liveTVLaunchPending = false;
      // La callback attesta che l'API accetta la richiesta, non che il
      // visualizzatore sia effettivamente passato in primo piano.
      window.setTimeout(function () {
        if (!document.hidden) {
          try {
            var rearm = new XMLHttpRequest();
            rearm.open('GET', cfg.SERVICE_URL + '/home', true);
            rearm.timeout = 1500;
            rearm.send();
          } catch (ignored) {}
          A.toast('La TV nativa non e\' passata in primo piano');
        }
      }, 2100);
    }

    function fallbackAppControl() {
      if (finished) { return; }
      try {
        if (!tz.ApplicationControl || !tz.application.launchAppControl) {
          return rearmAndReport('app-control non disponibile');
        }
        var control = new tz.ApplicationControl('http://tizen.org/appcontrol/operation/main');
        tz.application.launchAppControl(control, 'org.tizen.tv-viewer',
          launchAccepted, function (e) {
            rearmAndReport((e && (e.name || e.message)) || 'avvio negato');
          });
      } catch (e) {
        rearmAndReport((e && (e.name || e.message)) || 'errore app-control');
      }
    }

    function launchViewer() {
      try {
        tz.application.launch('org.tizen.tv-viewer', launchAccepted,
          function () { fallbackAppControl(); });
      } catch (e) { fallbackAppControl(); }
    }

    function tuneThenLaunch() {
      // Il viewer nativo mostra la sorgente TV selezionata: partiamo
      // proprio dal tuner TV, anche se prima era attivo un ingresso HDMI.
      // Tizen fornisce il descriptor TV tramite SystemInfo.VIDEOSOURCE.
      if (!videoSource || !tz.tvwindow || !tz.tvwindow.setSource) {
        launchViewer();
        return;
      }
      try {
        tz.tvwindow.setSource(videoSource, launchViewer,
          function (e) {
            rearmAndReport('selezione tuner TV fallita: ' +
              ((e && (e.name || e.message)) || 'errore sorgente'));
          }, 'MAIN');
      } catch (e) {
        rearmAndReport('selezione tuner TV non disponibile');
      }
    }

    var request = new XMLHttpRequest();
    try {
      request.open('GET', cfg.SERVICE_URL + '/leave', true);
      request.timeout = 1500;
      request.onload = function () {
        if (request.status >= 200 && request.status < 300) {
          tuneThenLaunch();
        } else { rearmAndReport('HomeWatcher HTTP ' + request.status); }
      };
      request.onerror = request.ontimeout = function () {
        rearmAndReport('HomeWatcher non raggiungibile');
      };
      request.send();
    } catch (e) { rearmAndReport('errore comunicazione HomeWatcher'); }
  }

  // Passaggio temporaneo ad app di sistema non monitorate (Store Samsung).
  // Non modificare i percorsi già collaudati per Home Samsung e TV in diretta.
  function suspendForExternal(ready, failed) {
    if (!tz) { failed('Tizen non disponibile'); return; }
    var request = new XMLHttpRequest(), settled = false;
    function fail(reason) {
      if (settled) { return; }
      settled = true;
      // Un timeout puo' avvenire DOPO che /leave ha avuto effetto sul servizio.
      // Riattivarlo evita che resti sospeso per un errore di trasporto.
      tell('/home');
      failed(reason);
    }
    try {
      request.open('GET', cfg.SERVICE_URL + '/leave', true);
      request.timeout = 1800;
      request.onload = function () {
        if (settled) { return; }
        if (request.status < 200 || request.status >= 300) {
          fail('HomeWatcher HTTP ' + request.status);
          return;
        }
        settled = true;
        ready();
      };
      request.onerror = request.ontimeout = function () {
        fail('HomeWatcher non raggiungibile');
      };
      request.send();
    } catch (e) { fail('comunicazione HomeWatcher fallita'); }
  }

  A.homewatch = {
    suspendForExternal: suspendForExternal,
    resume: function () { tell('/home'); },
    start: start,
    // The launcher is about to open `appId`; Home inside it should come back here.
    watch: function (appId) { tell('/watch?id=' + encodeURIComponent(cfg.PRELOADED_APPS[appId] || appId)); },
    // Every real app, so the service can tell a cast/launch from elsewhere apart from Home.
    reportApps: function (ids) { tell('/apps?ids=' + ids.map(encodeURIComponent).join(',')); },
    // The tucked-away escape: hand the TV back to Samsung Home until the launcher is reopened.
    useSamsungHome: function () {
      leaving = true;
      tell('/leave');
      try { tz.application.getCurrentApplication().exit(); } catch (e) { A.toast('Premi Home per aprire la schermata Samsung'); }
    },
    openSamsungHome: openNativeSamsungHome,
    openNativeLiveTV: openNativeLiveTV,
    isLeaving: function () { return leaving; }
  };

  /* S90C LIVE TV HANDOFF V8.2 */
  // Una riapertura da Samsung Apps puo' avviare una pagina nuova senza
  // evento visibilitychange. Riattiviamo sempre il controllo del launcher.
  window.addEventListener('load', function () { tell('/home'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tell('/home'); } });
})(window.AeroTizen);
