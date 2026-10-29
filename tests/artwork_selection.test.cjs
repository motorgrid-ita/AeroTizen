const test=require('node:test');const assert=require('node:assert/strict');
const {loadTypeScript:load}=require('./helpers/load_typescript.cjs');
const {selectArtwork,verifiedArtwork}=load('launcher/src/shared/artwork/selectArtwork.ts');
const app={id:'demo.App',name:'Renamed'};const native=['/samsung/304.png','/samsung/250.png'];
const square={src:'assets/artwork-local/square.png',width:1024,height:1024};
const rectangle={src:'assets/artwork-local/rectangle.png',width:1280,height:720};
const profile={'demo.App':{square,rectangle}};
test('public registry contains no uncleared brand files',()=>assert.deepEqual(Object.keys(verifiedArtwork),[]));
test('independent shape selection uses exact app IDs and retains native fallbacks',()=>{
 for(const shape of ['square','rectangle'])assert.deepEqual(selectArtwork(app,native,shape,true,[],profile).sources,[profile[app.id][shape].src,...native]);
 assert.deepEqual(selectArtwork({...app,id:'other',name:'demo.App'},native,'square',true,[],profile).sources,native);
});
test('disabled mode and per-app opt-out are reversible and preserve the native order',()=>{
 for(const [enabled,disabled] of [[false,[]],[true,[app.id]]])assert.deepEqual(selectArtwork(app,native,'square',enabled,disabled,profile).sources,native);
 assert.equal(selectArtwork(app,native,'square',true,[],profile).origin,'local');
});
test('missing shape never stretches the other shape; invalid sources cannot escape the pack',()=>{
 assert.deepEqual(selectArtwork(app,native,'rectangle',true,[],{[app.id]:{square}}).sources,native);
 for(const src of ['https://example.org/x.png','../x.png','assets/artwork-local/../x.png','data:image/svg+xml,test'])assert.deepEqual(selectArtwork(app,native,'square',true,[],{[app.id]:{square:{...square,src}}}).sources,native);
 for(const width of [0,99999,NaN])assert.deepEqual(selectArtwork(app,native,'square',true,[],{[app.id]:{square:{...square,width}}}).sources,native);
});
test('only own IDs can select overrides; verified entry follows local and sources deduplicate',()=>{
 assert.deepEqual(selectArtwork({id:'constructor',name:'x'},native,'square',true,[],profile).sources,native);
 const bundled={[app.id]:{square:{...square,src:'assets/artwork-verified/example.png'}}};
 assert.equal(selectArtwork(app,native,'square',true,[],{},bundled).origin,'verified');
 assert.equal(selectArtwork(app,native,'square',true,[],profile,bundled).origin,'local');
 assert.equal(selectArtwork(app,[native[0],native[0]],'square',false,[]).sources.length,1);
});
