'use strict';
// Background watcher that makes the launcher behave like the TV's home screen.
//
// Hidden web apps are frozen on retail Samsung TVs, so this runs as a Tizen web service
// (Node.js runtime, started at boot). Every second it asks the TV's local API (port 8001)
// whether the launcher is on screen, and reclaims the screen when something it didn't
// choose covers it:
//   - Samsung Home at boot, or Home pressed on the launcher: the launcher is hidden but no
//     app was opened -> relaunch it.
//   - Home pressed inside an app the launcher opened: that app goes visible -> hidden while
//     the launcher is still hidden -> relaunch it.
//   - An app that starts on its own (a cast from a phone): it shows up as newly running ->
//     leave it alone and treat it like an app the launcher opened.
// Samsung's stock YouTube (Cobalt) always reports visible=false, so Home inside it can't be
// detected; Back still returns to the launcher.
// The launcher talks to this service over http://127.0.0.1:47790.

var http = require('http');
var createFrameGate = require('./frame-gate');
var createArtMode = require('./artmode');

var SELF = 'DclHome001.Home';
var PORT = 47790;
var state = {
  watched: null, seen: false, leaving: false,
  apps: [], running: {}, selfVisible: null, hiddenSince: 0, watchAt: 0, lastLaunch: 0, last: null
};

function get(path, cb) {
  var req = http.get({ host: '127.0.0.1', port: 8001, path: path, timeout: 1500 }, function (res) {
    var body = '';
    res.on('data', function (c) { body += c; });
    res.on('end', function () {
      var s = null; try { s = JSON.parse(body); } catch (e) {}
      cb(s && s.running !== undefined ? s : null);
    });
  });
  req.on('error', function () { cb(null); });
  req.on('timeout', function () { req.destroy(); });
}

function appStatus(id, cb) { get('/api/v2/applications/' + encodeURIComponent(id), cb); }

function snapshot(cb) {
  var out = {}, left = state.apps.length;
  if (!left) { return cb(out); }
  state.apps.forEach(function (id) {
    appStatus(id, function (s) {
      out[id] = !!(s && s.running);
      if (s && s.visible) { out.__visible = id; }
      if (--left === 0) { cb(out); }
    });
  });
}

// Original V992.56 relaunch code. The Frame-only authorization gate below
// never changes this function or its timeouts on a confirmed non-Frame TV.
function launchOriginal(why) {
  if (Date.now() - state.lastLaunch < 2000) { return; }
  state.lastLaunch = Date.now();
  state.watched = null;
  try {
    tizen.application.launch(SELF, function () { state.last = 'relaunched: ' + why; },
                             function (e) { state.last = 'relaunch failed: ' + (e && e.message); });
  } catch (e) {
    state.last = 'relaunch threw: ' + e.message;
  }
}

function frameRecheck(done) {
  if (state.leaving) { done(false); return; }
  var id = state.watched, seen = state.seen, inventory = state.apps.slice();
  appStatus(SELF, function (self) {
    if (state.leaving || !self || self.visible) { done(false); return; }
    function checkInventory() {
      var left = inventory.length, safe = true;
      if (!left) { done(true); return; }
      inventory.forEach(function (appId) {
        appStatus(appId, function (status) {
          // Frame models must not guess if the local application status API
          // is unavailable or another application becomes foreground.
          if (!status || typeof status.visible !== 'boolean' ||
              typeof status.running !== 'boolean' || status.visible ||
              (status.running && appId !== id && !state.running[appId])) {
            safe = false;
          }
          if (--left === 0) { done(safe && !state.leaving); }
        });
      });
    }
    if (!id) { checkInventory(); return; }
    if (!seen) { done(false); return; }
    appStatus(id, function (watched) {
      if (!watched || watched.visible || state.watched !== id ||
          state.leaving) { done(false); return; }
      checkInventory();
    });
  });
}

var bootDue = false, bootRetry = null;
var frameGate = createFrameGate({
  http: http, createArtMode: createArtMode,
  isLeaving: function () { return state.leaving; },
  recheck: frameRecheck,
  onReady: function () {
    // Preserve the original 3-second boot on ordinary TVs. A Frame that
    // resolves later cannot be launched until Art Mode is freshly off.
    if (bootDue && !state.leaving && !state.lastLaunch) { launchSelf('boot'); }
  }
});

function launchSelf(why) {
  if (Date.now() - state.lastLaunch < 2000) { return; }
  frameGate.allow(why, function () { launchOriginal(why); });
}

var busy = false;
function tick() {
  if (state.leaving || busy) { return; }
  busy = true;
  setTimeout(function () { busy = false; }, 2500);  // never stay stuck if a request hangs
  appStatus(SELF, function (me) {
    busy = false;
    if (!me) { return; }
    var now = Date.now();
    if (me.visible) {
      frameGate.invalidate();
      state.selfVisible = true; state.hiddenSince = 0; state.watched = null;
      if (now - (state.snapAt || 0) > 5000) { state.snapAt = now; snapshot(function (r) { state.running = r; }); }
      return;
    }
    if (state.selfVisible !== false) { state.hiddenSince = now; }
    state.selfVisible = false;

    if (state.watched) {
      appStatus(state.watched, function (s) {
        if (!s || !state.watched) { return; }
        if (s.visible) { state.seen = true; }
        else if (state.seen) { launchSelf('home pressed in ' + state.watched); }
      });
      return;
    }
    // Hidden and nothing opened by the launcher. Give the launcher a moment to report a
    // launch, then decide whether something legitimate started.
    // The launcher reports /watch before it opens an app, so a short grace is enough.
    if (now - state.hiddenSince < 250 || now - state.watchAt < 2500) { return; }
    snapshot(function (r) {
      if (r.__visible) {
        frameGate.invalidate();
        state.watched = r.__visible; state.seen = true; delete r.__visible; state.running = r;
        state.last = 'stand aside: ' + state.watched + ' is on screen';
        return;
      }
      for (var id in r) {
        if (r[id] && !state.running[id]) {
          frameGate.invalidate();
          state.watched = id; state.seen = false; state.running = r;
          state.last = 'stand aside: ' + id + ' started';
          return;
        }
      }
      state.running = r;
      launchSelf('covered without an app');
    });
  });
}

module.exports.onStart = function () {
  http.createServer(function (req, res) {
    var url = require('url').parse(req.url, true), q = url.query;
    if (url.pathname === '/watch') {
      frameGate.invalidate();
      state.watched = q.id || null; state.seen = false; state.leaving = false; state.watchAt = Date.now();
    } else if (url.pathname === '/apps') {
      frameGate.invalidate();
      state.apps = (q.ids || '').split(',').filter(Boolean);
    } else if (url.pathname === '/leave') {
      frameGate.invalidate();
      state.leaving = true; state.watched = null;
    } else if (url.pathname === '/home') {
      frameGate.invalidate();
      state.leaving = false; state.watched = null;
    }
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
  }).listen(PORT, '127.0.0.1');
  frameGate.start();
  setInterval(tick, 300);
  // Normal TVs keep the proven 3-second boot. On Frame, a fresh off reply
  // must authorize startup; retrying does not bypass the Art Mode guard.
  setTimeout(function () {
    bootDue = true;
    launchSelf('boot');
    bootRetry = setInterval(function () {
      if (!state.lastLaunch && !state.leaving) { launchSelf('boot'); }
    }, 3000);
  }, 3000);
};

module.exports.onRequest = function () {};
module.exports.onExit = function () {
  if (bootRetry) { clearInterval(bootRetry); bootRetry = null; }
  frameGate.stop();
};
