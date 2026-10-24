/* AeroTizen V992.47: lightweight automatic Samsung language selection.
   No settings or per-frame polling. Original Italian copy is preserved as a source;
   the English pack is applied to visible UI nodes only, leaving app/device names intact. */
(function (A) {
  'use strict';
  var dict = window.AeroTizenEnglish || {};
  var reverse = {};
  Object.keys(dict).forEach(function (it) { if (!reverse[dict[it]]) { reverse[dict[it]] = it; } });
  var listener = -1, obs = null;
  function normalized(tag) {
    tag = String(tag || '').toLowerCase().replace(/_/g, '-').trim();
    if (/^it(?:a)?(?:-|$)/.test(tag)) { return 'it'; }
    if (/^en(?:g)?(?:-|$)/.test(tag)) { return 'en'; }
    // International fallback: English for all unsupported languages.
    return 'en';
  }
  var lang = normalized(navigator.language || (navigator.languages && navigator.languages[0]) || 'en');
  function translate(value) {
    if (typeof value !== 'string' || lang === 'it') { return value; }
    var match = /^(\s*)([\s\S]*?)(\s*)$/.exec(value);
    var key = match[2];
    if (Object.prototype.hasOwnProperty.call(dict,key)) { return match[1] + dict[key] + match[3]; }
    // Controlled dynamic status strings; never translate the appended user device name.
    var prefixes = [
      ['Località: ', 'Location: '],
      ['Stato sorgente: ', 'Source status: '],
      ['Volume ', 'Volume '],
      ['Azioni per ', 'Actions for '],
      ['Home Samsung non avviabile: ', 'Unable to open Samsung Home: '],
      ['HDMI 1  ·  Sempre visibile','HDMI 1  ·  Always visible'],
      ['HDMI 2  ·  Sempre visibile','HDMI 2  ·  Always visible'],
      ['HDMI 3  ·  Sempre visibile','HDMI 3  ·  Always visible'],
      ['HDMI 4  ·  Sempre visibile','HDMI 4  ·  Always visible']
    ];
    for (var i=0;i<prefixes.length;i++) {
      if (key.indexOf(prefixes[i][0])===0) { return match[1]+prefixes[i][1]+key.slice(prefixes[i][0].length)+match[3]; }
    }
    // HDMI status overrides include port number but never an app name.
    return value.replace(/\b([345]) per riga\b/g,'$1 per row')
      .replace(/\((12|24) ore\)/g,'($1-hour)')
      .replace(/(HDMI \d+\s+·\s+)Automatico\b/g,'$1Automatic')
      .replace(/(HDMI \d+\s+·\s+)Sempre visibile\b/g,'$1Always visible')
      .replace(/(\d+:\d{2}\s+)(\(12 ore\)|\(24 ore\))/g,function(_,t,f){return t+dict[f];});
  }
  function localizeText(node) {
    if (!node || !node.parentNode) { return; }
    var parent = node.parentNode, tag=parent.nodeName;
    if (tag==='SCRIPT' || tag==='STYLE' || tag==='TEXTAREA' || parent.isContentEditable) { return; }
    // App-provided names are not UI strings. "Caminetto" is our one virtual app.
    var tile = parent.closest ? parent.closest('.tile') : null;
    if (tile && (parent.classList && parent.classList.contains('name'))) {
      // The built-in Live TV tile is localisable UI text; app names and user-set
      // source names are deliberately left exactly as they were configured.
      if (tile.classList.contains('s90c-source-card')) {
        if (tile.dataset.aeroTranslateLiveTv !== 'yes') { return; }
      } else if (node.nodeValue !== 'Caminetto' && node.nodeValue !== 'Fireplace' &&
                 node.nodeValue !== 'Aggiungi app' && node.nodeValue !== 'Add app') { return; }
    }
    var original = node._aeroOriginalIt;
    if (original === undefined || (node.nodeValue !== node._aeroLastTranslation && node.nodeValue !== original)) {
      original = node.nodeValue; node._aeroOriginalIt = original;
    }
    var next = lang==='it' ? original : translate(original);
    node._aeroLastTranslation = next;
    if (node.nodeValue !== next) { node.nodeValue = next; }
  }
  var attrs=['placeholder','title','aria-label'];
  function localizeAttr(node, attr) {
    if (!node.getAttribute || !node.hasAttribute(attr)) { return; }
    var val=node.getAttribute(attr), originals=node._aeroLangAttrs || (node._aeroLangAttrs={});
    var entry=originals[attr];
    if (!entry || (entry.last !== val && entry.source !== val)) { entry={source:val,last:val}; originals[attr]=entry; }
    var next=lang==='it'?entry.source:translate(entry.source);
    entry.last=next;
    if (val!==next) { node.setAttribute(attr,next); }
  }
  function visit(root) {
    if (!root) { return; }
    if (root.nodeType===3) { localizeText(root); return; }
    if (root.nodeType!==1 && root.nodeType!==9 && root.nodeType!==11) { return; }
    if (root.nodeType===1) {
      // Static settings headings are inspected by the original menu builder.
      if (root.id==='editor' && !root.classList.contains('s90c-settings-ready')) { return; }
      if (root.closest && root.closest('#editor') && !document.getElementById('editor').classList.contains('s90c-settings-ready')) { return; }
      for(var a=0;a<attrs.length;a++){localizeAttr(root,attrs[a]);}
    }
    var children=root.childNodes;
    for(var i=0;i<children.length;i++){visit(children[i]);}
  }
  function setLocale(value) {
    var next=normalized(value);
    if (lang===next) { return; }
    lang=next;
    document.documentElement.lang=lang;
    visit(document.body);
    if (lang==='en') { startObserving(); }
    else if (obs) { obs.disconnect(); obs=null; }
    if (A.clock && A.clock.tick) { A.clock.tick(); }
    // The large clock will tick via its existing wrapper; the weather label
    // is translated when the cached reading is next rendered (no new network IO).
  }
  function readSamsungLocale() {
    var t=window.tizen;
    if(!t || !t.systeminfo || !t.systeminfo.getPropertyValue) {return;}
    try {t.systeminfo.getPropertyValue('LOCALE', function (info) {
      if (info && info.language) {setLocale(info.language);}
    }, function () { /* browser locale is the fallback */ });} catch(e) {}
  }
  A.i18n = {
    get language(){return lang;},
    t:translate,
    source:function(value){return reverse[value] || value;},
    matches:function(value,italian){return value===italian || value===dict[italian];},
    detect:readSamsungLocale
  };
  document.documentElement.lang=lang;
  if (lang==='en') { visit(document.body); }
  // A single mutation pass localizes only nodes actually added/changed. No
  // full-screen repaint, timer, backdrop blur, or repeated grid rendering.
  function startObserving() {
    if (obs || !window.MutationObserver) { return; }
    obs=new MutationObserver(function (events) {
      for(var i=0;i<events.length;i++) {
        var e=events[i];
        if(e.type==='attributes') {localizeAttr(e.target,e.attributeName);}
        else for(var j=0;j<e.addedNodes.length;j++){visit(e.addedNodes[j]);}
      }
    });
    obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:attrs});
  }
  if (lang==='en') { startObserving(); }
  if (A.clock && A.clock.tick) { A.clock.tick(); }
  readSamsungLocale();
  try {
    if (window.tizen && tizen.systeminfo && tizen.systeminfo.addPropertyValueChangeListener) {
      listener=tizen.systeminfo.addPropertyValueChangeListener('LOCALE',function(info){
        if(info && info.language){setLocale(info.language);}
      });
    }
  } catch(e) {listener=-1;}
  document.addEventListener('visibilitychange',function(){if(!document.hidden){readSamsungLocale();}});
})(window.AeroTizen);
