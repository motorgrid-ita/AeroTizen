'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const launcher = path.join(__dirname, '..', 'launcher');
function read(file) { return fs.readFileSync(path.join(launcher, file), 'utf8'); }
function setup() {
  const requests = [], launches = [], controls = [], toasts = [], listeners = {};
  const application = {
    launch(id, ok, failed) { launches.push({id, ok, failed}); },
    launchAppControl(ctrl, id, ok, failed) { controls.push({ctrl, id, ok, failed}); },
    getAppMetaData() { return []; },
    getCurrentApplication() { return { exit() {} }; }
  };
  function XMLHttpRequest() {
    const self = this;
    self.open = (_method, url) => { self.url = url; };
    self.send = () => requests.push(self);
    self.resolve = status => { self.status = status; if (self.onload) self.onload(); };
  }
  const A = {
    tizen: {
      application,
      ApplicationControl: function(operation, uri, mime, cat, data) { this.operation=operation; this.data=data; },
      ApplicationControlData: function(key, value) { this.key=key; this.value=value; }
    },
    tiles: { shortName: x => x },
    toast: x => toasts.push(x),
    settings: { inputNames: {} },
    settingsUi: { isOpen: () => false },
    homeScreen: { render() {} }
  };
  const window = { AeroTizen: A, addEventListener(name, fn) { (listeners['window:' + name] ||= []).push(fn); } };
  const document = { hidden: false, addEventListener(name, fn) { (listeners[name] ||= []).push(fn); } };
  const context = vm.createContext({ window, AeroTizen: A, document, XMLHttpRequest, setTimeout(){} });
  for (const file of ['js/config.js', 'js/homewatch.js', 'js/apps.js']) vm.runInContext(read(file), context);
  return { A, requests, launches, controls, toasts, listeners };
}

test('reference service registers boot-time watcher and keeps exact installed app identity', () => {
  const xml = read('config.xml');
  assert.match(xml, /<tizen:application id="DclHome001.Home" package="DclHome001"/);
  assert.match(xml, /<tizen:service id="DclHome001.Watcher" on-boot="true" auto-restart="true">/);
  assert.match(xml, /<tizen:content src="service\/index.js"\/>/);
});
test('YouTube waits for the original confirmed /leave before launch', () => {
  const h = setup();
  h.A.apps.launch({id:'yt.app', name:'YouTube'});
  assert.equal(h.launches.length, 0);
  assert.match(h.requests[0].url, /\/leave$/);
  h.requests[0].resolve(200);
  assert.deepEqual(h.launches.map(x=>x.id), ['yt.app']);
});
test('other apps retain the original /watch registration and immediate launch', () => {
  const h=setup();
  h.A.apps.launch({id:'netflix.app',name:'Netflix'});
  assert.deepEqual(h.launches.map(x=>x.id),['netflix.app']);
  assert.match(h.requests[0].url,/\/watch\?id=netflix.app$/);
});
test('native Samsung Home waits for /leave ACK and does not exit the launcher', () => {
  const h=setup();
  h.A.homewatch.openSamsungHome();
  assert.equal(h.launches.length,0);
  assert.match(h.requests[0].url,/\/leave$/);
  h.requests[0].resolve(200);
  assert.equal(h.launches[0].id,'com.samsung.tv.csfs');
});
test('native Live TV selects tuner only after /leave ACK', () => {
  const h=setup(); const selections=[];
  h.A.tizen.tvwindow={setSource(source,ok,_fail,target){selections.push({source,target});ok();}};
  const tv={type:'TV',number:1};
  h.A.homewatch.openNativeLiveTV(tv);
  assert.equal(selections.length,0);
  h.requests[0].resolve(200);
  assert.equal(selections[0].source,tv);
  assert.equal(selections[0].target,'MAIN');
  assert.equal(h.launches[0].id,'org.tizen.tv-viewer');
});
test('when launcher returns, reference watcher rearms via /home', () => {
  const h=setup();
  h.listeners['window:load'].forEach(fn => fn());
  assert.match(h.requests[0].url,/\/home$/);
  h.listeners.visibilitychange.forEach(fn => fn());
  assert.match(h.requests[1].url,/\/home$/);
});
test('upstream HbbTV wrapper opens through shared host without changing HomeWatcher', () => {
  const h=setup();
  h.A.tizen.application.getAppMetaData=()=>[{key:h.A.config.HBBTV_LINK_METADATA,value:'https://hbbtv.example.invalid/app'}];
  h.A.apps.launch({id:'wrapper.tv',name:'Channel'});
  assert.equal(h.launches.length,0);
  assert.match(h.requests[0].url,/\/watch\?id=org.tizen.hbbtv$/);
  assert.equal(h.controls[0].id,'org.tizen.hbbtv');
  assert.equal(h.controls[0].ctrl.operation,'http://tizen.org/appcontrol/operation/default');
  assert.deepEqual(Array.from(h.controls[0].ctrl.data,d=>d.key),['tizenid','hbbtv','deeplink']);
});
test('unavailable HbbTV metadata never changes Netflix and YouTube launches', () => {
  const h=setup();
  h.A.tizen.application.getAppMetaData=()=>{throw new Error('unsupported');};
  h.A.apps.launch({id:'netflix.app',name:'Netflix'});
  h.A.apps.launch({id:'yt.app',name:'YouTube'});
  assert.deepEqual(h.launches.map(x=>x.id),['netflix.app']);
  assert.match(h.requests[1].url,/\/leave$/);
  h.requests[1].resolve(200);
  assert.deepEqual(h.launches.map(x=>x.id),['netflix.app','yt.app']);
});

test('YouTube never fetches HbbTV metadata before the tested HomeWatcher handoff', () => {
  const h=setup(); let reads=0;
  h.A.tizen.application.getAppMetaData=()=>{reads++; throw Error('should never run')};
  h.A.apps.launch({id:'yt.app',name:'YouTube'});
  assert.equal(reads,0);
  assert.equal(h.launches.length,0);
  assert.match(h.requests[0].url,/\/leave$/);
});
