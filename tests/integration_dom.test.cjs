// Complete browser DOM boot with the actual script order. Tizen, time and network
// are simulated; this cannot establish real TV layout or native API acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../launcher');
function boot() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://launcher.test', runScripts: 'outside-only' });
  const w = dom.window;
  w.setInterval = () => 1; w.setTimeout = () => 1;
  w.requestAnimationFrame = () => 1;
  w.XMLHttpRequest = class { open() {} send() { if (this.onerror) this.onerror(); } };
  // jsdom has no layout engine: provide only visibility and stable row geometry.
  Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() {
    return this.closest('[hidden]') || this.style.display === 'none' ? null : this.parentNode;
  }});
  for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
    w.eval(fs.readFileSync(path.join(root, match[1]), 'utf8'));
  }
  return { w, A: w.AeroTizen, d: w.document, close: () => w.close() };
}

test('combined boot retains upstream catalogue, all settings controls, artwork and native service API', () => {
  const h = boot();
  try {
    h.A.settingsUi.open();
    assert.ok(h.A.catalog);
    assert.equal(typeof h.A.homewatch.resume, 'function');
    for (const id of ['home-card-modes', 'home-card-columns', 'clock-layouts',
      'clock-style-section', 'weather-photo-choice', 'hdmi-force-visibility']) {
      const el = h.d.getElementById(id);
      assert.ok(el && el.closest('.aero-section-pane'), id);
      assert.equal(h.d.querySelectorAll('#' + id).length, 1, id + ' must not be duplicated');
    }
    assert.equal(h.d.getElementById('clock-layouts').closest('.aero-section-pane').dataset.sectionPane, 'status');
    assert.equal(h.d.getElementById('hdmi-force-visibility').closest('.aero-section-pane').dataset.sectionPane, 'sources');
  } finally { h.close(); }
});

test('wallpaper categories preserve preferences, controls and the live background until an option is selected', () => {
  const h = boot();
  try {
    h.A.settingsUi.open(); h.A.glassUI.activate('wallpaper');
    const before = h.w.localStorage.getItem(h.A.config.STORAGE_KEY);
    const bg = h.A.settings.background, photo = h.A.settings.weatherPhoto;
    const first = h.d.querySelector('#bg-anim [data-key]');
    let saves = 0; const save = h.A.settings.save;
    h.A.settings.save = () => { saves++; };
    for (const category of ['photo', 'solid', 'gradient', 'animated']) {
      h.d.querySelector('[data-category="' + category + '"]').onclick();
      assert.equal(h.A.settings.background, bg);
      assert.equal(h.A.settings.weatherPhoto, photo);
      assert.equal(h.d.querySelector('#bg-anim [data-key]'), first);
    }
    assert.equal(saves, 0);
    assert.equal(h.w.localStorage.getItem(h.A.config.STORAGE_KEY), before);
    h.A.settings.save = save;
    h.A.settings.weatherPhoto = true;
    first.onclick();
    assert.equal(h.A.settings.weatherPhoto, false, 'choosing an animation exits photo mode');
    assert.equal(h.A.settings.background, first.dataset.key.slice(3));
    h.d.querySelector('[data-category="solid"]').onclick();
    const visible = [...h.d.querySelectorAll('#bg-still [data-key]')].filter(el => !el.hidden);
    assert.deepEqual(visible.map(el => el.dataset.key), ['bg:black']);
  } finally { h.close(); }
});

test('all five Settings categories are reachable using only the D-pad and Back', () => {
  const h = boot();
  try {
    h.A.settingsUi.open();
    const event = { preventDefault() {} }, key = h.A.config.KEY;
    for (const id of ['appearance', 'apps', 'wallpaper', 'status', 'sources']) {
      assert.equal(h.A.glassUI.activeId(), id);
      h.A.settingsUi.keydown(key.RIGHT, event);
      assert.ok(h.d.querySelector('.focused'));
      h.A.settingsUi.keydown(key.BACK, event);
      assert.ok(h.d.querySelector('.focused').dataset.sectionMenu);
      h.A.settingsUi.keydown(key.DOWN, event);
    }
  } finally { h.close(); }
});

test('Samsung Home escape in combined Settings uses the acknowledged native route', () => {
  const h = boot();
  try {
    // The escape is a block below the app grid; jsdom otherwise reports top=0 for every node.
    h.d.getElementById('escape').getBoundingClientRect = () => ({ top: 1000, bottom: 1060, left: 0, width: 300, height: 60 });
    let native = 0, legacy = 0;
    h.A.homewatch.openSamsungHome = () => { native++; };
    h.A.homewatch.useSamsungHome = () => { legacy++; };
    const event = { preventDefault() {} }, key = h.A.config.KEY;
    h.A.settingsUi.open();
    h.A.settingsUi.keydown(key.DOWN, event);
    h.A.settingsUi.keydown(key.RIGHT, event);
    for (let i = 0; i < 30; i++) h.A.settingsUi.keydown(key.DOWN, event);
    assert.equal(h.d.querySelector('.focused').id, 'escape');
    h.A.settingsUi.keydown(key.ENTER, event);
    assert.equal(native, 1); assert.equal(legacy, 0);
  } finally { h.close(); }
});
