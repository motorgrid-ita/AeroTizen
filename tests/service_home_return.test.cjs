'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const url = require('node:url');
const script = fs.readFileSync(path.join(__dirname,'../launcher/service/index.js'),'utf8');
function setup(){
  let now=100000; let tick, handler;
  const launches=[];
  const statuses={
    'DclHome001.Home': {running:true,visible:true},
    'Netflix.App': {running:true,visible:false}
  };
  const http={
    get(opts,cb){
      const request = new EventEmitter();
      request.destroy=()=>{};
      queueMicrotask(()=>{
        const response=new EventEmitter(); response.statusCode=200;
        cb(response);
        response.emit('data',JSON.stringify(statuses[decodeURIComponent(opts.path.split('/').pop())] || {}));
        response.emit('end');
      });
      return request;
    },
    createServer(fn){handler=fn;return {listen(){}};}
  };
  const context=vm.createContext({
    require(name){if(name==='http')return http;if(name==='url')return url;throw Error(name)},
    module:{exports:{}},
    Date:{now:()=>now},
    setTimeout(){},
    setInterval(fn){tick=fn},
    tizen:{application:{launch(id,ok){launches.push(id);if(ok)ok()}}}
  });
  vm.runInContext(script,context);context.module.exports.onStart();
  function request(route){let result;handler({url:route},{writeHead(){},end(s){result=JSON.parse(s)}});return result}
  async function advance(ms){now+=ms;tick();await new Promise(resolve=>setImmediate(resolve))}
  return {statuses,launches,request,advance};
}
test('physical HOME from a watched visible application returns to AeroTizen',async()=>{
  const h=setup();h.request('/watch?id=Netflix.App');
  h.statuses['DclHome001.Home'].visible=false;
  h.statuses['Netflix.App'].visible=true;
  await h.advance(350);
  assert.equal(h.request('/').seen,true);
  h.statuses['Netflix.App'].visible=false;
  await h.advance(350);
  assert.deepEqual(h.launches,['DclHome001.Home']);
});
test('explicit /leave suppresses watcher reclaim until /home rearm',async()=>{
  const h=setup();h.request('/leave');
  h.statuses['DclHome001.Home'].visible=false;
  await h.advance(5000);
  assert.deepEqual(h.launches,[]);
  assert.equal(h.request('/').leaving,true);
  h.request('/home');
  assert.equal(h.request('/').leaving,false);
});
test('background service still listens on the expected loopback port',()=>{
  assert.match(script,/http\.createServer\(function \(req, res\)/);
  assert.match(script,/\.listen\(PORT, '127\.0\.0\.1'\)/);
});
