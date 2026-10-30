const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');
const {loadTypeScript}=require('./helpers/load_typescript.cjs');const {inspectPng}=loadTypeScript('launcher/src/shared/artwork/usbArtwork.ts');
const root='docs/artwork/examples/';const register=JSON.parse(fs.readFileSync(root+'provenance.json','utf8'));
test('original complete-card examples have exact provenance, HD dimensions and bounded PNG sizes',()=>{
 assert.equal(register.files.length,6);
 for(const entry of register.files){const png=fs.readFileSync(root+entry.file),svg=fs.readFileSync(root+entry.source);
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),entry.sha256);
  assert.equal(crypto.createHash('sha256').update(svg).digest('hex'),entry.source_sha256);
  assert.deepEqual(inspectPng(png),{width:entry.width,height:entry.height});assert.ok(entry.bytes<2*1024*1024);
  assert.deepEqual([entry.width,entry.height],entry.file.includes('square')?[1024,1024]:[1920,1080]);
  assert.equal(entry.license,'MIT');assert.equal(entry.third_party_marks,false);
 }
 assert.equal(fs.readFileSync(root+'LICENSE.txt','utf8'),fs.readFileSync('LICENSE','utf8'));
});
