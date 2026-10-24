const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const nativeSource = fs.readFileSync(path.join(__dirname, '../launcher/js/native-navigation.js'), 'utf8');
const inputSource = fs.readFileSync(path.join(__dirname, '../launcher/js/inputs.js'), 'utf8');

function harness({ launchFails = false, noAppControl = false } = {}) {
  const http = [], launched = [], switched = [], shown = [], timers = [], toasts = [];
  function Request() {
    this.status = 0;
    this.open = (method, url) => { this.method = method; this.url = url; };
    this.send = () => { http.push(this); };
    this.resolve = status => {
      this.status = status;
      if (this.onload) this.onload();
    };
  }
  const tz = {
    ApplicationControl: function (operation) { this.operation = operation; },
    application: {
      launch(id, success, failure) {
        launched.push({ id, via: 'launch' });
        if (launchFails) failure({ name: 'Denied' }); else success();
      },
      launchAppControl(control, id, success) {
        launched.push({ id, via: 'app-control', control });
        success();
      }
    },
    tvwindow: {
      setSource(source, success, failure, windowName) {
        switched.push({ source, windowName });
        success();
      },
      show(success) { shown.push('embedded'); success(); },
      hide() {}
    },
    systeminfo: { addPropertyValueChangeListener() {} }
  };
  if (noAppControl) {
    delete tz.ApplicationControl;
    delete tz.application.launchAppControl;
  }
  const bodyClasses = [];
  const document = {
    hidden: true,
    body: { classList: { add(v) { bodyClasses.push(v); }, remove() {} } },
    documentElement: { style: {} }
  };
  const window = {
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
    Backgrounds: { hide() {} }
  };
  const A = {
    tizen: tz,
    config: { SERVICE_URL: 'http://127.0.0.1:47790' },
    homewatch: { useSamsungHome() {} },
    tiles: { ICONS: { tv: 'tv', hdmi: 'hdmi', box: 'box', pc: 'pc', game: 'game' } },
    settings: { inputNames: {}, showLiveTv: true, hideDisconnectedHdmi: false },
    toast(value) { toasts.push(value); },
    applyBackground() {}
  };
  window.AeroTizen = A;
  vm.runInNewContext(nativeSource, { window, document, XMLHttpRequest: Request });
  vm.runInNewContext(inputSource, { window, document, XMLHttpRequest: Request });
  return { A, http, launched, switched, shown, timers, toasts, document, bodyClasses };
}

test('Samsung Home waits for HomeWatcher /leave acknowledgement before launch', () => {
  const h = harness();
  h.A.homewatch.openSamsungHome();
  h.A.homewatch.openSamsungHome();
  assert.deepEqual(h.http.map(r => r.url), ['http://127.0.0.1:47790/leave']);
  assert.equal(h.launched.length, 0);
  h.http[0].resolve(200);
  assert.equal(h.launched.length, 1);
  assert.equal(h.launched[0].id, 'com.samsung.tv.csfs');
  assert.equal(h.http.length, 1, 'success must not immediately rearm the watcher');
});

test('Samsung Home failed /leave restores HomeWatcher without launching', () => {
  const h = harness();
  h.A.homewatch.openSamsungHome();
  h.http[0].resolve(503);
  assert.equal(h.launched.length, 0);
  assert.deepEqual(h.http.map(r => r.url), [
    'http://127.0.0.1:47790/leave', 'http://127.0.0.1:47790/home'
  ]);
  assert.match(h.toasts[0], /HomeWatcher HTTP 503/);
});

test('Samsung Home falls back to AppControl if normal launch is rejected', () => {
  const h = harness({ launchFails: true });
  h.A.homewatch.openSamsungHome();
  h.http[0].resolve(200);
  assert.deepEqual(h.launched.map(r => r.via), ['launch', 'app-control']);
  assert.equal(h.launched[1].id, 'com.samsung.tv.csfs');
});

test('Live TV selects native TV tuner after ACK, then launches Samsung viewer', () => {
  const h = harness();
  const raw = { type: 'TV', number: 1, editName: 'Digital TV' };
  h.A.inputs.show({ type: 'TV', number: 1, raw });
  assert.equal(h.launched.length, 0);
  assert.equal(h.switched.length, 0);
  h.http[0].resolve(200);
  assert.equal(h.switched.length, 1);
  assert.equal(h.switched[0].source, raw);
  assert.equal(h.switched[0].windowName, 'MAIN');
  assert.equal(h.launched[0].id, 'org.tizen.tv-viewer');
  assert.equal(h.shown.length, 0, 'native Live TV must not open the embedded TV window');
});

test('Live TV launch rejection falls back to viewer AppControl', () => {
  const h = harness({ launchFails: true });
  h.A.homewatch.openNativeLiveTV({ type: 'TV', number: 1 });
  h.http[0].resolve(200);
  assert.deepEqual(h.launched.map(r => r.via), ['launch', 'app-control']);
  assert.equal(h.launched[1].id, 'org.tizen.tv-viewer');
});

test('Live TV denied viewer AppControl rearms the launcher and reports error', () => {
  const h = harness({ launchFails: true, noAppControl: true });
  h.A.homewatch.openNativeLiveTV(null);
  h.http[0].resolve(200);
  assert.equal(h.launched.length, 1);
  assert.equal(h.http[1].url, 'http://127.0.0.1:47790/home');
  assert.match(h.toasts[0], /AppControl is unavailable/);
});

test('Live TV success callback does not imply foreground; recover if still visible', () => {
  const h = harness();
  h.document.hidden = false;
  h.A.homewatch.openNativeLiveTV(null);
  h.http[0].resolve(200);
  assert.equal(h.timers[0].delay, 2100);
  assert.equal(h.http.length, 1);
  h.timers[0].fn();
  assert.equal(h.http[1].url, 'http://127.0.0.1:47790/home');
  assert.match(h.toasts[0], /did not take focus/);
});

test('HDMI source activation still uses the original embedded TVWindow path', () => {
  const h = harness();
  const raw = { type: 'HDMI', number: 2 };
  h.A.inputs.show({ type: 'HDMI', number: 2, raw });
  assert.equal(h.http.length, 0, 'HDMI must not request /leave');
  assert.equal(h.launched.length, 0, 'HDMI must not start a Samsung system application');
  assert.equal(h.switched[0].source, raw);
  assert.equal(h.shown.length, 1);
  assert.ok(h.bodyClasses.includes('tv'));
});

test('loading order keeps native handoff available before the Inputs module', () => {
  const html = fs.readFileSync(path.join(__dirname, '../launcher/index.html'), 'utf8');
  const nativePos = html.indexOf('src="js/native-navigation.js"');
  assert.ok(nativePos > html.indexOf('src="js/homewatch.js"'));
  assert.ok(nativePos < html.indexOf('src="js/inputs.js"'));
});
