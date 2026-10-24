const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('signed launcher manifest still registers the boot-time HomeWatcher service', () => {
  const xml = read('launcher/config.xml');
  assert.match(xml, /<tizen:service id="DclHome001.Watcher" on-boot="true" auto-restart="true">/);
  assert.match(xml, /<tizen:content src="service\/index.js"\/>/);
  assert.match(xml, /http:\/\/tizen.org\/privilege\/application.launch/);
  assert.match(xml, /http:\/\/tizen.org\/privilege\/application.info/);
  assert.match(xml, /hwkey-event="enable"/);
});

test('native Home handoff loads before Apps and Live TV but after watcher API', () => {
  const html = read('launcher/index.html');
  const order = [
    'js/homewatch.js', 'js/native-navigation.js', 'js/apps.js',
    'js/inputs.js', 'js/home-screen.js', 'js/settings-ui.js',
    'js/glass-ui.js', 'js/main.js'
  ];
  let cursor = -1;
  for (const script of order) {
    const pos = html.indexOf('src="' + script + '"');
    assert.ok(pos > cursor, script + ' should follow the previous dependency');
    cursor = pos;
  }
});

test('Samsung Home button calls native route while retaining legacy fallback', () => {
  const code = read('launcher/js/home-screen.js');
  assert.match(code, /id === 'TV'|samsung-home-shortcut/);
  assert.match(code, /A\.homewatch\.openSamsungHome\(\)/);
  assert.match(code, /A\.homewatch\.useSamsungHome\(\)/);
});

test('native tuner and HDMI paths remain independent', () => {
  const code = read('launcher/js/inputs.js');
  assert.match(code, /s\.type === 'TV'/);
  assert.match(code, /A\.homewatch\.openNativeLiveTV\(s\.raw \|\| s\)/);
  assert.match(code, /tz\.tvwindow\.setSource\(s\.raw \|\| s/);
  assert.match(code, /tz\.tvwindow\.show\(/);
});

test('watched native viewer is armed before launch while native Home remains escape', () => {
  const code = read('launcher/js/native-navigation.js');
  assert.match(code, /watchBeforeLaunch\('org\.tizen\.tv-viewer', selectTuner, failed\)/);
  assert.match(code, /leaveBeforeLaunch\(nativeLaunch, failed\)/);
  assert.match(code, /addEventListener\('load', rearmWatcher\)/);
});

test('native Home foreground observations cannot skip Frame Art Mode protection', () => {
  const code = read('launcher/service/index.js');
  assert.match(code, /HOME_STABLE = 800/);
  assert.match(code, /state\.homeSeenSince/);
  assert.match(code, /homeForeground: homeForeground === true/);
  assert.match(code, /freshOff\(function \(value\)/);
  assert.match(code, /freshOff\(function \(finalValue\)/);
  assert.match(code, /native Home disappeared before commit/);
});

test('Cobalt startup requires watcher acknowledgement without hijacking other apps', () => {
  const apps = read('launcher/js/apps.js');
  const homewatch = read('launcher/js/homewatch.js');
  assert.match(apps, /if \(isYouTube && A\.homewatch\.watchReady\)/);
  assert.match(apps, /A\.homewatch\.watchReady\(app\.id, launchApp/);
  assert.match(apps, /A\.homewatch\.watch\(app\.id\)/);
  assert.match(homewatch, /function watchReady\(appId, ready, failed\)/);
});
