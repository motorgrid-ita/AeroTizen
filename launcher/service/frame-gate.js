'use strict';

// Optional Frame-only Art Mode gate for the original V992.56 HomeWatcher.
// Never replaces its non-Frame HOME/YouTube/TV logic. An unknown TV type or
// unknown Art Mode status is NOT permission to reclaim a hidden launcher.
module.exports = function createFrameGate(options) {
  var http = options.http;
  var art = options.createArtMode({ onChange: function (status) {
    if (mode === 'frame' && status !== 'off') { invalidate(); }
  } });
  var mode = 'unknown', pending = null, epoch = 0, retry = null;
  var nextAttempt = 0, startCalled = false, closed = false;
  var resolved = false, onReady = options.onReady || function () {};

  function invalidate() {
    epoch += 1;
    if (pending) { clearTimeout(pending.timer); pending = null; }
  }

  function readDevice(done) {
    var finished = false, req, body = '';
    var timer = setTimeout(function () {
      finish(null);
      if (req && typeof req.destroy === 'function') { req.destroy(); }
    }, 1800);
    function finish(device) {
      if (finished) { return; }
      finished = true; clearTimeout(timer); done(device);
    }
    try {
      req = http.get({ host: '127.0.0.1', port: 8001, path: '/api/v2/' }, function (res) {
        if (res.statusCode !== 200) { finish(null); return; }
        res.on('data', function (chunk) {
          body += chunk;
          if (body.length > 65536) { finish(null); if (req) { req.destroy(); } }
        });
        res.on('error', function () { finish(null); });
        res.on('end', function () {
          var result;
          try { result = JSON.parse(body); } catch (e) { return finish(null); }
          finish(result && result.device && typeof result.device === 'object' ?
            result.device : null);
        });
      });
      req.on('error', function () { finish(null); });
    } catch (e) { finish(null); }
  }

  function detect() {
    if (closed || resolved) { return; }
    readDevice(function (device) {
      if (closed || resolved) { return; }
      var flag = device && device.FrameTVSupport;
      var validIdentity = device && (
        (typeof device.modelName === 'string' && device.modelName.length > 0) ||
        (typeof device.model === 'string' && device.model.length > 0) ||
        device.PowerState === 'on' || device.PowerState === 'standby' ||
        device.PowerState === 'off'
      );
      // Absent optional capability flag on an otherwise valid TV follows the
      // same legacy-device compatibility path as upstream.
      if (flag === true || flag === 'true') { mode = 'frame'; resolved = true; art.start(); }
      else if (flag === false || flag === 'false' || (
        validIdentity && !Object.prototype.hasOwnProperty.call(device, 'FrameTVSupport'))) {
        mode = 'normal'; resolved = true;
      }
      else { retry = setTimeout(detect, 5000); return; }
      onReady(mode);
    });
  }

  function start() {
    if (startCalled) { return; }
    startCalled = true;
    detect();
  }

  function current(token) {
    return !closed && mode === 'frame' && pending === token &&
      token.epoch === epoch && !options.isLeaving();
  }

  function allow(reason, ready) {
    if (closed || options.isLeaving()) { return; }
    if (mode === 'normal') { ready(); return; }  // V992.56 fast path unchanged.
    if (mode !== 'frame' || pending || Date.now() < nextAttempt) { return; }
    var token = { epoch: epoch, timer: null };
    pending = token;
    nextAttempt = Date.now() + 3000;
    token.timer = setTimeout(function () { invalidate(); }, 6000);

    function confirm(phase) {
      art.fresh(function (value) {
        if (!current(token)) { return; }
        if (value !== 'off') { invalidate(); return; }
        options.recheck(function (safe) {
          if (!current(token)) { return; }
          if (!safe) { invalidate(); return; }
          if (phase === 1) {
            confirm(2);
            return;
          }
          // A Frame must still be awake and report its Frame identity before
          // the final decision. Art-on events invalidate the token as they arrive.
          readDevice(function (device) {
            if (!current(token)) { return; }
            if (!device || device.PowerState !== 'on' ||
                !(device.FrameTVSupport === true || device.FrameTVSupport === 'true')) {
              invalidate();
              return;
            }
            clearTimeout(token.timer);
            pending = null;
            ready();
          });
        });
      });
    }
    confirm(1);
  }

  function stop() {
    closed = true;
    invalidate();
    clearTimeout(retry); retry = null;
    art.stop();
  }

  return {
    start: start, stop: stop, allow: allow, invalidate: invalidate,
    mode: function () { return mode; },
    status: function () { return { mode: mode, pending: !!pending, epoch: epoch }; }
  };
};
