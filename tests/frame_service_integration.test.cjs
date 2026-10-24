'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const url = require('node:url');

const serviceSource = fs.readFileSync(path.join(__dirname,'../launcher/service/index.js'),'utf8');
const frameSource = fs.readFileSync(path.join(__dirname,'../launcher/service/frame-gate.js'),'utf8');
const SELF = 'DclHome001.Home';

function rig(frame = false) {
  let now = 1000000, serial = 0;
  const queue = new Map(), requests=[], launches=[], artWaiters=[], art = {starts:0, stops:0};
  const statuses = new Map([[SELF,{running:false,visible:false}]]);
  let device = {FrameTVSupport:frame,PowerState:'on',modelName:'Test Samsung'};
  let control, artHooks;
  function timer(fn,ms,interval) {
    const id=++serial;
    queue.set(id,{at:now+ms,fn,interval});
    return id;
  }
  function advance(ms){
    const target=now+ms;
    let iterations=0;
    for(;;){
      let entry;
      for(const [id,value] of queue){
        if(value.at<=target && (!entry || value.at<entry.value.at))entry={id,value};
      }
      if(!entry)break;
      assert.ok(++iterations<50000,'mock timer must settle');
      now=entry.value.at;
      if(entry.value.interval)entry.value.at+=entry.value.interval;
      else queue.delete(entry.id);
      entry.value.fn();
    }
    now=target;
  }
  const http = {
    get(opts,cb) {
      const req=new EventEmitter();
      req.destroy=()=>{};
      requests.push(opts.path);
      timer(()=>{
        const res=new EventEmitter();
        const id=opts.path.startsWith('/api/v2/applications/') ?
          decodeURIComponent(opts.path.slice('/api/v2/applications/'.length)) : null;
        const value=id ? statuses.get(id) : {device};
        res.statusCode=value===undefined?404:200;
        cb(res);
        res.emit('data',JSON.stringify(value||{}));
        res.emit('end');
      },0,false);
      return req;
    },
    createServer(handler){control=handler;return {listen(){}};}
  };
  function createFrameGate(options){
    const context=vm.createContext({
      module:{exports:{}},
      setTimeout:(fn,ms)=>timer(fn,ms,false),
      clearTimeout:id=>queue.delete(id),
      Date:{now:()=>now},Object
    });
    vm.runInContext(frameSource,context);
    return context.module.exports(options);
  }
  const context=vm.createContext({
    module:{exports:{}},
    require(name){
      if(name==='http')return http;
      if(name==='url')return url;
      if(name==='./frame-gate')return createFrameGate;
      if(name==='./artmode')return options=>{
        artHooks=options;
        return {
          start(){art.starts++},stop(){art.stops++},
          fresh(cb){artWaiters.push(cb)}
        };
      };
      throw Error(name);
    },
    tizen:{application:{launch(id,ok){launches.push(id);
      statuses.set(SELF,{running:true,visible:true});if(ok)ok();}}},
    Date:{now:()=>now},
    setTimeout:(fn,ms)=>timer(fn,ms,false),
    clearTimeout:id=>queue.delete(id),
    setInterval:(fn,ms)=>timer(fn,ms,true),
    clearInterval:id=>queue.delete(id)
  });
  vm.runInContext(serviceSource,context);
  context.module.exports.onStart();
  function request(route){
    let state;
    control({url:route},{writeHead(){},end(content){state=JSON.parse(content)}});
    return state;
  }
  return {
    advance,request,statuses,launches,requests,artWaiters,art,
    artStatus(status){artHooks.onChange(status)},
    replyArt(status){assert.ok(artWaiters.length,'pending fresh Art read required');artWaiters.shift()(status)},
    setDevice(next){device=next},
    stop(){context.module.exports.onExit()}
  };
}

test('on non-Frame Samsung, original 3-second HOME boot still works',()=>{
  const h=rig(false);
  h.advance(2999);assert.equal(h.launches.length,0);
  h.advance(1);assert.deepEqual(h.launches,[SELF]);
  assert.equal(h.art.starts,0);
  h.advance(6000);assert.equal(h.launches.length,1,'no repeated boot relaunches');
  h.stop();
});

test('Frame refuses to launch during Art Mode until fresh status is off',()=>{
  const h=rig(true);h.advance(3000);
  assert.equal(h.launches.length,0);
  assert.ok(h.art.starts===1);
  assert.equal(h.artWaiters.length,1);
  h.replyArt('on');
  h.advance(9000);
  assert.equal(h.launches.length,0);
  h.stop();
});

test('Frame boot needs two fresh off replies and a fresh power-on check',()=>{
  const h=rig(true);h.advance(3000);
  assert.equal(h.artWaiters.length,1);
  h.replyArt('off');h.advance(0);
  assert.equal(h.artWaiters.length,1,'second Art status required');
  h.replyArt('off');h.advance(0);
  assert.deepEqual(h.launches,[SELF]);
  h.stop();
});

test('Frame /leave cancellation prevents unwanted HOME interception',()=>{
  const h=rig(true);h.advance(3000);
  assert.equal(h.artWaiters.length,1);
  h.request('/leave');
  h.replyArt('off');h.advance(6000);
  assert.equal(h.launches.length,0);
  assert.equal(h.request('/').leaving,true);
  h.stop();
});

test('non-Frame watched app still returns to AeroTizen after physical HOME',()=>{
  const h=rig(false);h.advance(3000);
  h.statuses.set('Netflix',{running:true,visible:true});
  h.statuses.set(SELF,{running:true,visible:false});
  h.request('/watch?id=Netflix');
  h.advance(600);
  assert.equal(h.request('/').seen,true);
  h.statuses.set('Netflix',{running:true,visible:false});
  h.advance(500);
  assert.equal(h.launches.length,2);
  h.stop();
});

test('Frame watched app return is guarded by Art Mode on every invocation',()=>{
  const h=rig(true);h.advance(3000);
  h.replyArt('off');h.advance(0);h.replyArt('off');h.advance(0);
  assert.equal(h.launches.length,1);
  h.statuses.set('Netflix',{running:true,visible:true});
  h.statuses.set(SELF,{running:true,visible:false});
  h.request('/watch?id=Netflix');h.advance(600);
  assert.equal(h.request('/').seen,true);
  h.statuses.set('Netflix',{running:true,visible:false});
  h.advance(500);
  assert.equal(h.launches.length,1);
  assert.equal(h.artWaiters.length,1);
  h.replyArt('off');h.advance(0);h.replyArt('off');h.advance(0);
  assert.equal(h.launches.length,2);
  h.stop();
});
