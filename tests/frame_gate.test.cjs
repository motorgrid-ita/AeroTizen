'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const source = fs.readFileSync(path.join(__dirname,'../launcher/service/frame-gate.js'),'utf8');

function harness(initial = {FrameTVSupport:true,PowerState:'on'}) {
  const requests=[], artCalls=[], fresh=[], timeouts=[];
  let currentDevice=initial, artHooks, artStart=0, artStop=0;
  let leaving=false, safe=true, accepts=0, checks=0, ready=0;
  const http = {
    get(opts, cb) {
      const req = new EventEmitter();
      req.destroy = () => {};
      requests.push(opts.path);
      queueMicrotask(() => {
        const res = new EventEmitter();
        res.statusCode=200;
        cb(res);
        res.emit('data', JSON.stringify({device:currentDevice}));
        res.emit('end');
      });
      return req;
    }
  };
  const fakeTimers = new Map(); let timerId=0;
  const context=vm.createContext({
    module:{exports:{}},
    setTimeout(fn,ms){const id=++timerId;fakeTimers.set(id,{fn,ms});return id;},
    clearTimeout(id){fakeTimers.delete(id);},
    Date,
    Object
  });
  vm.runInContext(source,context);
  const gate=context.module.exports({
    http,
    createArtMode(opts){
      artHooks=opts;
      return {
        start(){artStart++},stop(){artStop++},
        fresh(cb){fresh.push(cb)}
      };
    },
    isLeaving(){return leaving},
    recheck(cb){checks++;cb(safe)},
    onReady(){ready++}
  });
  return {gate,requests,fresh,artCalls,
    setDevice(v){currentDevice=v},
    setLeaving(v){leaving=v},
    setSafe(v){safe=v},
    changeArt(v){artHooks.onChange(v)},
    activate(){gate.allow('test',()=>accepts++)},
    get accepts(){return accepts},
    get checks(){return checks},
    get ready(){return ready},
    get artStart(){return artStart},
    get artStop(){return artStop},
    get pendingTimers(){return fakeTimers.size}
  };
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};

test('ordinary non-Frame TV retains immediate V992.56 HOME relaunch', async()=>{
  const h=harness({FrameTVSupport:false,PowerState:'on'});
  h.gate.start(); await flush();
  assert.equal(h.gate.mode(),'normal');
  assert.equal(h.artStart,0);
  h.activate();
  assert.equal(h.accepts,1);
  assert.equal(h.checks,0);
  h.gate.stop();
});
test('older valid TV without Frame metadata follows normal path',async()=>{
  const h=harness({modelName:'Older Samsung TV',PowerState:'on'});
  h.gate.start();await flush();
  assert.equal(h.gate.mode(),'normal');
  h.activate(); assert.equal(h.accepts,1);
  h.gate.stop();
});
test('Frame device requires two fresh independent off confirmations and rechecks',async()=>{
  const h=harness();
  h.gate.start();await flush();
  assert.equal(h.gate.mode(),'frame');
  assert.equal(h.artStart,1);
  h.activate();
  assert.equal(h.accepts,0);
  assert.equal(h.fresh.length,1);
  h.fresh.shift()('off');
  assert.equal(h.checks,1);
  assert.equal(h.fresh.length,1);
  h.fresh.shift()('off');
  assert.equal(h.checks,2);
  assert.equal(h.accepts,0);
  await flush();
  assert.equal(h.accepts,1);
  h.gate.stop();
});
test('Frame Art Mode on or unknown denies launcher return',async()=>{
  for(const response of ['on','unknown']){
    const h=harness();h.gate.start();await flush();h.activate();
    h.fresh.shift()(response);
    assert.equal(h.accepts,0);
    assert.equal(h.gate.status().pending,false);
    h.gate.stop();
  }
});
test('Frame on event cancels a previously accepted off result',async()=>{
  const h=harness();h.gate.start();await flush();h.activate();
  h.fresh.shift()('off');
  assert.equal(h.fresh.length,1);
  h.changeArt('on');
  h.fresh.shift()('off');
  await flush();
  assert.equal(h.accepts,0);
  h.gate.stop();
});
test('watch, leave and Home rearm invalidate pending Frame relaunch',async()=>{
  const h=harness();h.gate.start();await flush();h.activate();
  h.gate.invalidate();
  h.fresh.shift()('off');
  assert.equal(h.accepts,0);
  h.setLeaving(true);
  h.activate();assert.equal(h.accepts,0);
  h.gate.stop();
});
test('Frame recheck blocks when another app or the launcher is visible',async()=>{
  const h=harness();h.gate.start();await flush();h.setSafe(false);h.activate();
  h.fresh.shift()('off');
  assert.equal(h.checks,1);
  assert.equal(h.fresh.length,0);
  assert.equal(h.accepts,0);
  h.gate.stop();
});
test('Frame standby and missing power state block final commit',async()=>{
  for(const power of ['standby',undefined]){
    const h=harness();h.gate.start();await flush();h.activate();
    h.fresh.shift()('off');
    h.fresh.shift()('off');
    h.setDevice({FrameTVSupport:true,PowerState:power});
    await flush();
    assert.equal(h.accepts,0);
    h.gate.stop();
  }
});
test('unsupported or malformed capability never guesses non-Frame',async()=>{
  for(const device of [null, {}, {FrameTVSupport:'maybe'}, {PowerState:'not-reported'}]){
    const h=harness(device);h.gate.start();await flush();
    assert.equal(h.gate.mode(),'unknown');
    h.activate();
    assert.equal(h.accepts,0);
    h.gate.stop();
  }
});
test('duplicate start and simultaneous Frame relaunch attempts are suppressed',async()=>{
  const h=harness();h.gate.start();h.gate.start();await flush();
  assert.equal(h.artStart,1);
  h.activate();h.activate();
  assert.equal(h.fresh.length,1);
  h.fresh.shift()('off');h.fresh.shift()('off');await flush();
  assert.equal(h.accepts,1);
  h.gate.stop();assert.equal(h.artStop,1);
});
