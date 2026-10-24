'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

function read(filename) {
  return fs.readFileSync(path.join(__dirname,'../launcher',filename),'utf8');
}
function harness(mode) {
  const calls={artwork:0,created:0};
  function element(type, className, text) {
    const e = {
      tagName: type.toUpperCase(), className: className || '',
      children: [], style: {}, hidden: undefined,
      parentNode: null, textContent: text || '', dataset: {},
      setAttribute() {},
      appendChild(child) { child.parentNode=this;this.children.push(child);return child; },
      removeChild(child) {
        const index=this.children.indexOf(child);
        if(index>=0)this.children.splice(index,1);
        child.parentNode=null;
      }
    };
    e.classList = {
      add(...names) { e.className += ' '+names.join(' '); },
      contains(name) { return e.className.split(' ').includes(name); }
    };
    return e;
  }
  function Image() {
    calls.created++;
    this.parentNode=null;
    this.className='';
  }
  const A={
    settings:{homeCardMode:mode},
    el:element,
    catalog:{brand(){return null;}},
    artwork:{sources(){calls.artwork++;return [];}}
  };
  const context=vm.createContext({
    window:{AeroTizen:A,LOGOS:{}},Image,
    setTimeout(){},clearTimeout(){}
  });
  vm.runInContext(read('js/brands.js'),context);
  return {A,calls};
}

test('Square mode retains the original Samsung artwork candidate path',()=>{
  const h=harness('square');
  const card=h.A.tiles.app({id:'yt',name:'YouTube',icon:'icon.png'},'home-display',()=>{});
  assert.equal(h.calls.artwork,1);
  assert.equal(card.classList.contains('brand-rectangle'),false);
});

test('Rectangle mode suppresses square Samsung artwork and native icon probes',()=>{
  const h=harness('rectangle');
  const card=h.A.tiles.app({id:'unknown',name:'Unknown Streaming',icon:'icon.png'},'home-display',()=>{});
  assert.equal(h.calls.artwork,0);
  assert.equal(h.calls.created,0);
  assert.equal(card.classList.contains('brand-rectangle'),true);
  assert.equal(card.children[0].children.length,1,'readable fallback title must remain');
});

test('all nine original local banners are used for their brand',()=>{
  const expected=[
    ['Netflix','netflix-custom.png'],['Disney+','disney-plus-official.png'],
    ['Xbox','xbox-official.png'],['Amazon Luna','luna-official.png'],
    ['Amazon Alexa','alexa-official.png'],['NOW','now-official.png'],
    ['Rakuten TV','rakuten-tv-official.png'],['QVC+','qvc-plus-official.png'],
    ['RaiPlay','raiplay-official.png']
  ];
  const h=harness('rectangle');
  for(const [name,file] of expected){
    const tile=h.A.tiles.app({id:name,name,icon:''},'home-display',()=>{});
    assert.equal(tile.children[1].src,'assets/brands/'+file,name);
    assert.equal(tile.classList.contains('brand-original-banner'),true,name);
    tile.children[1].onload();
    assert.equal(tile.children[0].hidden,true,name);
    if(name==='RaiPlay') assert.equal(tile.classList.contains('brand-raiplay'),true);
  }
  assert.equal(h.calls.artwork,0);
});

test('missing custom PNG keeps a readable label and launch handler',()=>{
  const h=harness('rectangle');
  let launched=0;
  const card=h.A.tiles.app({id:'n',name:'Netflix',icon:''},'home-display',()=>launched++);
  card.children[1].onerror();
  assert.equal(card.children[0].hidden,false);
  assert.equal(card.children.length,1);
  card.onclick();
  assert.equal(launched,1);
});

test('Settings app pickers retain their Square artwork irrespective of Home preference',()=>{
  const h=harness('rectangle');
  h.A.tiles.app({id:'netflix',name:'Netflix',icon:''},'',()=>{});
  assert.equal(h.calls.artwork,1);
});

test('Home and All Apps respect three, four and five remote-control columns',()=>{
  const s=read('js/home-screen.js');
  assert.match(s,/COLS = explicit \? requested : cfg\.CARD_COLUMNS\[size\]/);
  assert.match(s,/A\.chunk\(gridTiles\(\), COLS\)/);
  assert.match(s,/stepMove\(-COLS\)/);
  assert.match(s,/stepMove\(COLS\)/);
  assert.match(s,/A\.tiles\.app\(app, 'home-display'/);
});

test('Settings exposes selectable modes and all column choices to D-pad',()=>{
  const s=read('js/settings-ui.js');
  const html=read('index.html');
  assert.match(s,/renderCardLayout\(\)/);
  assert.match(s,/kids\('card-shapes'\)/);
  assert.match(s,/kids\('card-columns'\)/);
  assert.match(s,/S\.homeCardColumns = choice\[0\]/);
  assert.match(html,/id="card-shapes"/);
  assert.match(html,/id="card-columns"/);
});

test('opt-in Rectangle mode preserves the original Square default',()=>{
  const s=read('js/config.js');
  assert.match(s,/homeCardMode: 'square'/);
  assert.match(s,/homeCardColumns: null/);
});

test('3D focus remains lightweight and uses one focus ring',()=>{
  const css=read('css/card-layout.css');
  assert.match(css,/translate3d\(0,-7px,0\) scale\(1\.065\)/);
  assert.match(css,/box-shadow:/);
  assert.doesNotMatch(css,/perspective\s*:/);
  assert.match(css,/brand-raiplay[\s\S]*object-fit: contain/);
});

test('original brand assets are copied as identical Git blobs',()=>{
  const expected={
    'alexa-official.png':'7a4add14386bcf3d4ad2a583f3ec4d98d2ad2230',
    'disney-plus-official.png':'70c2d859c1201a550c7e5f89ddbf2eff2ef00fab',
    'luna-official.png':'991545ca1688fd0e65287d6a38c70996d0c68b98',
    'netflix-custom.png':'5ccdc2135ffa630e589dc464397ea98c711ead16',
    'now-official.png':'b44f2dedb2182c0d71605836af71f86bd3c8541f',
    'qvc-plus-official.png':'525365d02061722997511b745404ef0efb3c29a3',
    'raiplay-official.png':'2776bec973f390be7dd3129f106315a9934e632e',
    'rakuten-tv-official.png':'7c49f8502fddd3f804b5f4b96a2a8d779c1ba162',
    'xbox-official.png':'a97b0789be9a08e3be5a5f74c5d1953603f9a085'
  };
  for(const [file,sha] of Object.entries(expected)){
    const buf=fs.readFileSync(path.join(__dirname,'../launcher/assets/brands',file));
    const hash=crypto.createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');
    assert.equal(hash,sha,file);
  }
});
