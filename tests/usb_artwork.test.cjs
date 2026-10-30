const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadTypeScript } = require('./helpers/load_typescript.cjs');
const { createUsbArtwork, inspectPng, isUsbPath, readArtworkState, ARTWORK_STORAGE_KEY, MAX_LIBRARY_BYTES } = loadTypeScript('launcher/src/shared/artwork/usbArtwork.ts');
const { selectArtwork } = loadTypeScript('launcher/src/shared/artwork/selectArtwork.ts');
const png = fs.readFileSync('tests/fixtures/artwork/neutral-square.png');
const prepared = { data: png.toString('base64'), width: 1024, height: 1024, bytes: png.length };
function mock() {
 const values = new Map(), files = new Map([['wgt-private',null],['removable_sda1',null],['removable_sda1/art',null],['removable_sda1/art/test.png',png]]);
 const calls = []; let mounted = true, listener, write, failStorage = false;
 function file(path, mode='r') {
  if (!files.has(path)) throw { name:'NotFoundError' };
  return {
   name:path.split('/').pop(),fullPath:path,isFile:files.get(path)!==null,isDirectory:files.get(path)===null,
   get fileSize(){return files.get(path)?.length;},toURI:()=> 'file:///private/'+path,
   resolve:name=>file(path+'/'+name,mode),
   createDirectory(name){assert.equal(mode,'rw');files.set(path+'/'+name,null);return file(path+'/'+name,mode);},
   createFile(name){assert.equal(mode,'rw');assert.equal(files.has(path+'/'+name),false);files.set(path+'/'+name,Buffer.alloc(0));return file(path+'/'+name,mode);},
   listFiles(done){done([...files.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(p=>file(p,mode)));},
   deleteFile(name,done){assert.equal(mode,'rw');assert.equal(name.startsWith('wgt-private/aerotizen-artwork/'),true);files.delete(name);done?.();},
   openStream(access,done){
    let offset=0;
    const stream={close(){},readBytes:n=>{const result=[...files.get(path).subarray(offset,offset+n)];offset+=result.length;return result;},readBase64:n=>files.get(path).subarray(0,n).toString('base64'),writeBase64:data=>{assert.equal(mode,'rw');files.set(path,Buffer.from(data,'base64'));}};
    if(access==='w'&&write)write(()=>done(stream));else done(stream);
   }
  };
 }
 const api={resolve(path,done,failed,mode){calls.push([path,mode]);if(path.startsWith('removable_')&&!mounted)return failed({name:'NotFoundError'});try{done(file(path,mode));}catch(e){failed(e);}},listStorages:done=>done([{label:'removable_sda1',type:'EXTERNAL',state:mounted?'MOUNTED':'REMOVED'},{label:'wgt-private',type:'INTERNAL',state:'MOUNTED'}]),addStorageStateChangeListener(changed){listener=changed;return 42;},removeStorageStateChangeListener(id){assert.equal(id,42);listener=undefined;}};
 const storage={getItem:key=>values.get(key)||null,setItem(key,value){if(failStorage)throw new Error('QuotaExceededError');values.set(key,value);}};
 return {api,storage,files,values,calls,removeUsb(){mounted=false;listener?.({});},holdWrite(fn){write=fn;},failStorage(){failStorage=true;}};
}
test('USB paths cannot escape the removable root or accept URLs and traversal',()=>{
 for(const p of ['removable_sda1','removable_sda1/My artwork/card.png'])assert.equal(isUsbPath(p),true);
 for(const p of ['wgt-private/a.png','/removable_sda1/a.png','file:///etc/passwd','removable_sda1/../a.png','removable_sda1/./a.png','removable_sda1/a\\b','removable_sda1/a\0.png','https://host/a'])assert.equal(isUsbPath(p),false,p);
});
test('PNG validation checks signatures, dimensions, complete chunks and animation before decoding',()=>{
 assert.deepEqual(inspectPng(png),{width:1024,height:1024});
 for(const bytes of [Buffer.from('<svg/>'),png.subarray(0,40),Buffer.concat([png,Buffer.from('x')])])assert.throws(()=>inspectPng(bytes));
 const huge=Buffer.from(png);huge.writeUInt32BE(20000,16);assert.throws(()=>inspectPng(huge),/megapixel/);
 const animated=Buffer.from(png);animated.write('acTL',37);assert.throws(()=>inspectPng(animated),/animated/);
});
test('persisted metadata never authorizes arbitrary paths or invalid sizes',()=>{
 const images=JSON.parse('{"__proto__":{"square":{}},"demo.App":{"square":{"name":"../../home.png","width":2,"height":2,"bytes":3}}}');
 assert.deepEqual(Object.keys(readArtworkState(JSON.stringify({images})).images),[]);
 assert.deepEqual(readArtworkState('invalid').disabled,[]);
});
test('only mounted removable drives and PNGs are listed, read-only',async()=>{
 const m=mock(),lib=createUsbArtwork(m.api,m.storage,async bytes=>{inspectPng(bytes);return prepared;});
 assert.deepEqual(await lib.list(),[{name:'removable_sda1',path:'removable_sda1',directory:true}]);
 assert.equal((await lib.list('removable_sda1'))[0].name,'art');
 assert.equal((await lib.list('removable_sda1/art'))[0].name,'test.png');
 await lib.prepare('removable_sda1/art/test.png','square');
 assert.equal(m.calls.filter(c=>c[0].startsWith('removable_')).every(c=>c[1]==='r'),true);
 assert.equal(m.values.size,0);
});
test('save copies to private storage, restores after reload and survives USB removal',async()=>{
 const m=mock(),lib=createUsbArtwork(m.api,m.storage,async()=>prepared);
 await lib.save('demo.App','square',prepared);
 const selected=lib.getSnapshot().profile['demo.App'].square;
 assert.match(selected.src,/^file:\/\/\/private\/wgt-private\/aerotizen-artwork\/[a-f0-9]{32}\.png$/);
 m.removeUsb();const loaded=createUsbArtwork(m.api,m.storage,async()=>prepared);await loaded.ready;
 assert.deepEqual(loaded.getSnapshot().profile,lib.getSnapshot().profile);
 const result=selectArtwork({id:'demo.App'},['native.png'],'square',false,[],{},undefined,selected);
 assert.equal(result.origin,'usb');assert.equal(result.sources[0],selected.src);
 assert.equal(selectArtwork({id:'demo.App'},['native.png'],'rectangle',false,[],{},undefined,loaded.getSnapshot().profile['demo.App'].rectangle).origin,'samsung');
});
test('shape reset preserves the other shape and forces Samsung ahead of packaged overrides',async()=>{
 const m=mock(),lib=createUsbArtwork(m.api,m.storage,async()=>prepared);
 await lib.save('demo.App','square',prepared);
 const rect={...prepared,width:720,height:720};await lib.save('demo.App','rectangle',rect);
 await lib.reset('demo.App','square');
 assert.equal(lib.getSnapshot().profile['demo.App'].square,undefined);assert.ok(lib.getSnapshot().profile['demo.App'].rectangle);
 assert.ok(lib.getSnapshot().disabled.includes('demo.App:square'));
 const local={'demo.App':{square:{src:'assets/artwork-local/test.png',width:10,height:10}}};
 assert.deepEqual(selectArtwork({id:'demo.App'},['native.png'],'square',true,[],local,undefined,undefined,true).sources,['native.png']);
 const loaded=createUsbArtwork(m.api,m.storage);await loaded.ready;assert.ok(loaded.getSnapshot().disabled.includes('demo.App:square'));
});
test('quota failure and a cancelled in-flight write preserve old selection and remove new bytes',async()=>{
 const m=mock(),lib=createUsbArtwork(m.api,m.storage,async()=>prepared);await lib.save('demo.App','square',prepared);
 const old=m.values.get(ARTWORK_STORAGE_KEY),before=[...m.files.keys()];
 let release,current=true;m.holdWrite(fn=>{release=fn;});
 const pending=lib.save('demo.App','square',prepared,()=>current);
 while(!release)await new Promise(r=>setImmediate(r));current=false;release();
 await assert.rejects(pending,/cancelled/);assert.equal(m.values.get(ARTWORK_STORAGE_KEY),old);assert.deepEqual([...m.files.keys()],before);
 m.holdWrite(undefined);m.failStorage();await assert.rejects(lib.save('demo.App','square',prepared),/Quota/);
 assert.equal(m.values.get(ARTWORK_STORAGE_KEY),old);assert.deepEqual([...m.files.keys()],before);
});
test('unavailable or removed drives fail without changing preferences; watchers detach',async()=>{
 const m=mock(),lib=createUsbArtwork(m.api,m.storage,async()=>prepared);let changes=0;
 const stop=lib.watch(()=>changes++);m.removeUsb();assert.equal(changes,1);stop();m.removeUsb();assert.equal(changes,1);
 assert.deepEqual(await lib.list(),[]);await assert.rejects(lib.prepare('removable_sda1/art/test.png','square'),/unavailable/);
 assert.equal(m.values.size,0);
 const absent=createUsbArtwork(undefined,m.storage);assert.equal(absent.available,false);await assert.rejects(absent.list(),/unavailable/);
});
test('corrupt, missing and oversized PNGs are rejected before writing',async()=>{
 const m=mock();let optimised=0;const lib=createUsbArtwork(m.api,m.storage,async()=>{optimised++;return prepared;});
 m.files.set('removable_sda1/bad.png',Buffer.from('bad'));await assert.rejects(lib.prepare('removable_sda1/bad.png','square'));
 m.files.set('removable_sda1/large.png',Buffer.alloc(7*1024*1024));await assert.rejects(lib.prepare('removable_sda1/large.png','square'));
 assert.equal(optimised,0);assert.equal(m.values.size,0);
});

test('large PNG input is read in bounded chunks and malformed prepared metadata is rejected',async()=>{
 const m=mock();const large=fs.readFileSync('docs/artwork/examples/cinema-square.png');m.files.set('removable_sda1/large-valid.png',large);let read=0;
 const lib=createUsbArtwork(m.api,m.storage,async bytes=>{read=bytes.length;inspectPng(bytes);return prepared;});
 await lib.prepare('removable_sda1/large-valid.png','square');assert.equal(read,large.length);
 await assert.rejects(lib.save('demo.App','square',{...prepared,width:99999}),/Invalid prepared/);assert.equal(m.values.size,0);
});

test('the private selector rejects remote file hosts and non-managed private paths',()=>{
 for(const src of ['file://server/secret.png','file:///etc/passwd','file:///private/aerotizen-artwork/not-owned.png','https://host/a.png']){
  const result=selectArtwork({id:'demo.App'},['native.png'],'square',false,[],{},undefined,{src,width:1024,height:1024});assert.deepEqual(result.sources,['native.png']);
 }
});
