'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const source = file => fs.readFileSync(path.join(__dirname, '../launcher', file), 'utf8');

function harness(enabled = false, reading = null) {
  const calls = [];
  const photo = {
    hidden: true,
    className: 'weather-photo',
    style: { backgroundImage: '' }
  };
  const A = {
    settings: { photoWeather: enabled },
    applyBackground() { calls.push('reapply'); }
  };
  const doc = {
    hidden: false,
    body: { classList: { contains() { return false; } } },
    getElementById(id) { return id === 'weather-photo' ? photo : null; }
  };
  const timers = [];
  const window = {
    AeroTizen: A,
    Backgrounds: { apply(type) { calls.push(type); } },
    Weather: { currentReading() { return reading; } }
  };
  vm.runInNewContext(source('js/photo-weather.js'), {
    window, document: doc, setInterval(fn, delay) { timers.push({ fn, delay }); },
    Date, isFinite
  });
  return { A, photo, calls, timers, doc, setReading(r) { reading = r; } };
}
const sample = (code, day = 1, extra = {}) =>
  ({ code, day, at: Date.now(), solar: [], ...extra });

test('existing background remains unchanged unless photo mode was enabled', () => {
  const h = harness(false, sample(0));
  assert.equal(h.A.photoWeather.update(), false);
  assert.equal(h.photo.hidden, true);
  assert.deepEqual(h.calls, []);
});

test('V992.56 WMO weather code mapping matches all eight standard photo types', () => {
  const h = harness(true);
  for (const [code, scene] of [[0,'sun'],[2,'partly'],[3,'cloud'],[45,'fog'],
    [61,'rain'],[73,'snow'],[95,'storm']]) {
    assert.equal(h.A.photoWeather.autoScene(sample(code), Date.now()), scene);
  }
  assert.equal(h.A.photoWeather.autoScene(sample(95, 0), Date.now()), 'night');
});

test('V992.56 sunset uses UTC epoch boundaries and protects storm scenes', () => {
  const h = harness(true);
  const set = Date.parse('2026-10-24T17:00:00Z');
  const w = sample(0,1,{ at:set-7200000,
    solar: [{ sunrise:set-11*3600000, sunset:set }] });
  assert.equal(h.A.photoWeather.autoScene(w,set-30*60000),'sunset');
  assert.equal(h.A.photoWeather.autoScene(w,set+30*60000),'night');
  w.code=95;
  assert.equal(h.A.photoWeather.autoScene(w,set-30*60000),'storm');
});

test('a valid local photo is static and suspends original animations', () => {
  const h = harness(true, sample(63));
  assert.equal(h.A.photoWeather.update(),true);
  assert.match(h.photo.style.backgroundImage, /assets\/weather\/rain\.jpg/);
  assert.deepEqual(h.calls,['graphite']);
  h.A.photoWeather.update();
  assert.deepEqual(h.calls,['graphite'],'do not restart background on each update');
});

test('no valid weather reading preserves the user-selected background', () => {
  const h = harness(true);
  assert.equal(h.A.photoWeather.update(),false);
  assert.equal(h.calls.length,0);
});

test('changing the scene changes only the JPEG, without a transition loop', () => {
  const h=harness(true,sample(0));
  h.A.photoWeather.update();
  h.setReading(sample(71));
  h.A.photoWeather.update();
  assert.match(h.photo.style.backgroundImage,/snow\.jpg/);
  assert.deepEqual(h.calls,['graphite']);
});

test('turning the mode off immediately clears the photograph', () => {
  const h=harness(true,sample(0));
  h.A.photoWeather.update();
  h.A.settings.photoWeather=false;
  h.A.photoWeather.update();
  assert.equal(h.photo.hidden,true);
  assert.equal(h.photo.style.backgroundImage,'');
});

test('updates are once per minute and do not draw behind an invisible page', () => {
  const h=harness(true,sample(0));
  h.A.photoWeather.start();
  h.A.photoWeather.start();
  assert.equal(h.timers.length,1);
  assert.equal(h.timers[0].delay,60000);
  h.doc.hidden=true;
  h.timers[0].fn();
  assert.deepEqual(h.calls,[]);
  h.doc.hidden=false;
  h.timers[0].fn();
  assert.deepEqual(h.calls,['reapply']);
});

test('new forecast fields reuse the current Open-Meteo request', () => {
  const w=source('js/weather.js');
  assert.match(w,/weather_code,is_day&daily=sunrise,sunset&timezone=UTC/);
  assert.match(w,/fetch: s\.showWeather !== false \|\| s\.photoWeather === true/);
  assert.match(w,/currentReading: function/);
  assert.match(w,/solar: parseSolar\(m\.daily\)/);
});

test('all nine bundled photos are unmodified Git blobs from the reference', () => {
  const expected = {
    'cloud.jpg':'85e2a9c4e16bb61f8efcc4a64e20bedf3af64fad',
    'fog.jpg':'0adf989a1f34f205d928bc6d9e9b96f112db229a',
    'night.jpg':'d7a1b8c45569d45c48530342b907f3812f624e7a',
    'partly.jpg':'2e28a466969662762b18ee0c5f583f512d971709',
    'rain.jpg':'0c2f8214e9a22ae4c74c4c169bd5a4387fa6519f',
    'snow.jpg':'59be8ac339c2ee91cea17554ea84543f58fbf316',
    'storm.jpg':'8ee3db075040af357b717bb48d7fc97a415f5230',
    'sun.jpg':'a6985a0d385ce2d4787c714bf6143ece1cad0a1f',
    'sunset.jpg':'60e0a08062e4a5df96c4d24b88cc0599a50b8a02'
  };
  for(const [name,sha] of Object.entries(expected)){
    const buf=fs.readFileSync(path.join(__dirname,'../launcher/assets/weather',name));
    const id=crypto.createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');
    assert.equal(id,sha,name);
  }
});

test('Settings and CSS wire the optional photograph without canvas animation', () => {
  const html=source('index.html');
  const settings=source('js/settings-ui.js');
  const styles=source('css/photo-weather.css');
  assert.match(html,/id="weather-photo"/);
  assert.match(html,/id="weather-photo-choice"/);
  assert.match(settings,/S\.photoWeather = enabled/);
  assert.match(settings,/kids\('weather-photo-choice'\)/);
  assert.match(styles,/#weather-photo\.weather-photo/);
  assert.doesNotMatch(styles,/@keyframes/);
});
