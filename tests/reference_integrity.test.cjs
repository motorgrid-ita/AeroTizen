'use strict';
// Protected functionality and original assets from the TV-tested V992.56.
// Any change to these bytes must be consciously reviewed, never silently merged.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const CORE = {
  'launcher/js/homewatch.js': '82c1c97c2fc111aea2f9f1d05f805f7b6e3c01fd'
};
const BRANDS = {
  'alexa-official.png': '7a4add14386bcf3d4ad2a583f3ec4d98d2ad2230',
  'disney-plus-official.png': '70c2d859c1201a550c7e5f89ddbf2eff2ef00fab',
  'luna-official.png': '991545ca1688fd0e65287d6a38c70996d0c68b98',
  'netflix-custom.png': '5ccdc2135ffa630e589dc464397ea98c711ead16',
  'now-official.png': 'b44f2dedb2182c0d71605836af71f86bd3c8541f',
  'qvc-plus-official.png': '525365d02061722997511b745404ef0efb3c29a3',
  'raiplay-official.png': '2776bec973f390be7dd3129f106315a9934e632e',
  'rakuten-tv-official.png': '7c49f8502fddd3f804b5f4b96a2a8d779c1ba162',
  'xbox-official.png': 'a97b0789be9a08e3be5a5f74c5d1953603f9a085'
};
const WEATHER = {
  'cloud.jpg': '85e2a9c4e16bb61f8efcc4a64e20bedf3af64fad',
  'fog.jpg': '0adf989a1f34f205d928bc6d9e9b96f112db229a',
  'night.jpg': 'd7a1b8c45569d45c48530342b907f3812f624e7a',
  'partly.jpg': '2e28a466969662762b18ee0c5f583f512d971709',
  'rain.jpg': '0c2f8214e9a22ae4c74c4c169bd5a4387fa6519f',
  'snow.jpg': '59be8ac339c2ee91cea17554ea84543f58fbf316',
  'storm.jpg': '8ee3db075040af357b717bb48d7fc97a415f5230',
  'sun.jpg': 'a6985a0d385ce2d4787c714bf6143ece1cad0a1f',
  'sunset.jpg': '60e0a08062e4a5df96c4d24b88cc0599a50b8a02'
};
function gitBlob(bytes) {
  return crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
}
function verifyFiles(files, folder) {
  for (const [name, expected] of Object.entries(files)) {
    const file = path.join(ROOT, folder || '', name);
    assert.equal(gitBlob(fs.readFileSync(file)), expected, name + ' differs from V992.56');
  }
}
test('original physical HOME client stays byte-identical', () => {
  verifyFiles(CORE, '');
});
test('original V992.56 relaunch remains byte-equivalent inside the Frame-only wrapper', () => {
  const source = fs.readFileSync(path.join(ROOT,'launcher/service/index.js'),'utf8');
  const match = source.match(/function launchOriginal\(why\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'the proven relaunch function must remain in the service');
  const canonical = match[0].replace('launchOriginal','launchSelf');
  assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),
    '31b87a6c260819220fbde3075c060b928e5713536ac5642e7c1916e1568e7b11');
  assert.match(source,/frameGate\.allow\(why, function \(\) \{ launchOriginal\(why\); \}\)/);
});

test('all nine original custom brand PNGs remain byte-identical', () => {
  verifyFiles(BRANDS, 'launcher/assets/brands');
});
test('all nine original photographic weather JPGs remain byte-identical', () => {
  verifyFiles(WEATHER, 'launcher/assets/weather');
});
test('installer manifest still registers auto-restarting boot-time HomeWatcher', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'launcher/config.xml'), 'utf8');
  assert.match(xml, /<tizen:application id="DclHome001\.Home" package="DclHome001"/);
  assert.match(xml, /<tizen:service id="DclHome001\.Watcher" on-boot="true" auto-restart="true">/);
  assert.match(xml, /<tizen:content src="service\/index\.js"\/>/);
});
test('HTML script order keeps HOME service before apps and key routing', () => {
  const html = fs.readFileSync(path.join(ROOT, 'launcher/index.html'), 'utf8');
  let previous = -1;
  ['js/homewatch.js', 'js/apps.js', 'js/inputs.js', 'js/home-screen.js', 'js/main.js']
    .forEach(file => {
      const next = html.indexOf('src="' + file + '"');
      assert.ok(next > previous, file + ' must follow earlier dependencies');
      previous = next;
    });
});
