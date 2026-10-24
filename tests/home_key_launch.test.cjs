const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const get = file => fs.readFileSync(path.join(__dirname, '../launcher/js', file), 'utf8');
function setup({ failLaunch = false } = {}) {
  const requests = [], launched = [], toasts = [], listeners = {};
  function XMLHttpRequest() {
    const x = this;
    x.open = (verb, url) => { x.url = url; };
    x.send = () => { requests.push(x); };
    x.resolve = status => {
      x.status = status;
      if (x.onload) x.onload();
    };
  }
  const tizen = {
    ApplicationControl: function (operation) { this.operation = operation; },
    application: {
      launch(id, success, failure) {
        launched.push(id);
        if (failLaunch) { failure({ name: 'Denied' }); }
        else if (success) { success(); }
      },
      launchAppControl() {},
      getAppMetaData() { return []; },
      getCurrentApplication() { return { exit() {} }; }
    }
  };
  const A = {
    tizen,
    config: {
      SERVICE_URL: 'http://127.0.0.1:47790',
      SERVICE_ID: 'DclHome001.Watcher',
      STORE_PACKAGE: /^[A-Za-z0-9]{10}$/,
      HIDDEN_APPS: /service/i,
      HBBTV_APP_ID: 'org.tizen.hbbtv',
      HBBTV_LINK_METADATA: 'http://samsung.com/tv/metadata/hbbtv.link',
      DEFAULT_HOME_APPS: [],
      FIREPLACE_ID: '__fire',
      STORE_APP_IDS: []
    },
    catalog: { preloadedStoreId(id) {
      return id === '9Ur5IzDKqV.TizenYouTube' ? '111299001912' : null;
    }},
    tiles: { shortName: value => value },
    toast: value => toasts.push(value)
  };
  const document = { hidden: false, addEventListener(name, fn) { listeners[name] = fn; } };
  const context = { window: { AeroTizen: A }, document, XMLHttpRequest };
  vm.runInNewContext(get('homewatch.js'), context);
  vm.runInNewContext(get('apps.js'), context);
  return { A, requests, launched, toasts, listeners };
}

test('Cobalt YouTube must not launch until watcher has acknowledged registration', () => {
  const h = setup();
  h.A.apps.launch({ id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube' });
  assert.equal(h.launched.length, 0);
  assert.match(h.requests[0].url, /\/watch\?id=111299001912$/);
  h.requests[0].resolve(200);
  assert.deepEqual(h.launched, ['9Ur5IzDKqV.TizenYouTube']);
});

test('repeated watcher callbacks cannot launch YouTube twice', () => {
  const h = setup();
  h.A.apps.launch({ id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube' });
  h.requests[0].resolve(200);
  h.requests[0].resolve(200);
  assert.equal(h.launched.length, 1);
});

test('watcher unavailable falls back to the original launch path', () => {
  const h = setup();
  h.A.apps.launch({ id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube' });
  h.requests[0].resolve(503);
  assert.equal(h.launched.length, 1, 'YouTube should not be blocked on older TVs');
  assert.equal(h.requests.length, 2);
  assert.match(h.requests[1].url, /\/watch\?id=111299001912$/);
});

test('non-YouTube apps preserve standard fire-and-forget launch behaviour', () => {
  const h = setup();
  h.A.apps.launch({ id: 'org.tizen.netflix-app', name: 'Netflix' });
  assert.deepEqual(h.launched, ['org.tizen.netflix-app']);
  assert.equal(h.requests.length, 1);
  assert.match(h.requests[0].url, /\/watch\?id=org.tizen.netflix-app$/);
});

test('a denied launch rearms watcher instead of leaving a stale tracked app', () => {
  const h = setup({ failLaunch: true });
  h.A.apps.launch({ id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube' });
  h.requests[0].resolve(200);
  assert.deepEqual(h.launched, ['9Ur5IzDKqV.TizenYouTube']);
  assert.match(h.requests[1].url, /\/home$/);
  assert.match(h.toasts[0], /Could not open YouTube/);
});

test('watcher is rearmed when the launcher regains foreground', () => {
  const h = setup();
  h.listeners.visibilitychange();
  assert.match(h.requests[0].url, /\/home$/);
});

test('explicit Samsung Home escape retains original /leave functionality', () => {
  const h = setup();
  h.A.homewatch.useSamsungHome();
  assert.match(h.requests[0].url, /\/leave$/);
  assert.equal(h.A.homewatch.isLeaving(), true);
});
