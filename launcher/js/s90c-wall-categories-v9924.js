/* AeroTizen S90C V992.4 — SOLO presentazione categorie sfondi.
   Non cambia preferenze, controlli Samsung, rendering delle immagini o app.
   Riusa i pulsanti originali e la navigazione della V992.3. */
(function (A) {
  'use strict';
  if (!A || !A.settingsSections || !A.settingsUi) { return; }
  var ss = A.settingsSections;
  var priorRows = ss.rows;
  var selected = 'weather';
  function currentCategory() {
    if (A.settings.aeroWeatherMode && A.settings.aeroWeatherMode !== 'off') { return 'weather'; }
    var id = A.settings.background;
    if (id === 'black') { return 'solid'; }
    var list = (window.Backgrounds && window.Backgrounds.list) || [];
    for (var i=0; i<list.length; i++) {
      if (list[i].id === id) { return list[i].anim ? 'animated' : 'gradient'; }
    }
    return 'gradient';
  }
  var pane = null;
  var tabs = [];
  var ready = false;
  var categories = [
    { id: 'weather', title: 'Meteo', subtitle: 'Foto realistiche e condizioni attuali' },
    { id: 'solid', title: 'Tinta unita', subtitle: 'Colori semplici e puliti' },
    { id: 'gradient', title: 'Gradiente', subtitle: 'Sfumature e tonalità' },
    { id: 'animated', title: 'Animati classici', subtitle: 'Aurora, stelle, onde e altri effetti' }
  ];
  function one(selector, parent) { return (parent || document).querySelector(selector); }
  function children(id) {
    var el = document.getElementById(id);
    return el ? Array.prototype.slice.call(el.children) : [];
  }
  function pushChunks(rows, childrenList, count) {
    for (var i = 0; i < childrenList.length; i += count) {
      rows.push(childrenList.slice(i, i + count));
    }
  }
  function heading(text) {
    var all = pane.querySelectorAll('h3');
    for (var i = 0; i < all.length; i++) {
      if ((all[i].textContent.replace(/^\s+|\s+$/g,'') === text || (A.i18n && A.i18n.matches(all[i].textContent.replace(/^\s+|\s+$/g,''),text)))) { return all[i]; }
    }
    return null;
  }
  function panel(id, items) {
    var p = document.createElement('div');
    p.className = 'aero-wall-panel';
    p.dataset.wallPanel = id;
    for (var i=0; i<items.length; i++) { if (items[i]) { p.appendChild(items[i]); } }
    return p;
  }
  function makeTab(entry) {
    var btn = document.createElement('div');
    btn.className = 'aero-wall-tab';
    btn.dataset.key = 'wallcat:' + entry.id;
    btn.dataset.wallTab = entry.id;
    btn.setAttribute('role','button');
    btn.setAttribute('aria-label',entry.title);
    var visual = document.createElement('span');
    visual.className = 'aero-wall-tab-visual aero-wall-visual-' + entry.id;
    btn.appendChild(visual);
    var words = document.createElement('span');
    words.className = 'aero-wall-tab-text';
    var title = document.createElement('strong'); title.textContent = entry.title;
    var subtitle = document.createElement('small'); subtitle.textContent = entry.subtitle;
    words.appendChild(title); words.appendChild(subtitle);
    btn.appendChild(words);
    btn.onclick = function () { choose(entry.id); };
    return btn;
  }
  function build() {
    if (ready) { return true; }
    pane = one('#editor [data-section-pane="wall"]');
    if (!pane) { return false; }
    var photoH = heading('Sfondo meteo realistico');
    var animH = heading('Sfondi animati');
    var stillH = heading('Sfondi statici');
    var weather = document.getElementById('aero-weather-modes');
    var anim = document.getElementById('bg-anim');
    var speed = document.getElementById('speed-row');
    var still = document.getElementById('bg-still');
    if (!photoH || !animH || !stillH || !weather || !anim || !speed || !still) {
      return false;
    }
    // Keep the exact original controls, IDs, event handlers and render paths.
    var selectorHeading = document.createElement('h3');
    selectorHeading.className = 'aero-wall-pick-title';
    selectorHeading.textContent = 'Scegli il tipo di sfondo';
    var cards = document.createElement('div');
    cards.className = 'aero-wall-tabs';
    for (var i=0; i<categories.length; i++) {
      var card = makeTab(categories[i]);
      tabs.push(card); cards.appendChild(card);
    }
    pane.insertBefore(cards, pane.firstChild);
    pane.insertBefore(selectorHeading, cards);
    var groupWeather = panel('weather',[photoH,weather]);
    var groupStatic = panel('static',[stillH,still]);
    var hint = document.createElement('p');
    hint.className='aero-wall-solid-hint';
    hint.textContent='Nella versione attuale la tinta uniforme disponibile e il nero OLED.';
    groupStatic.appendChild(hint);
    var groupAnimated = panel('animated',[animH,anim,speed]);
    pane.appendChild(groupWeather);
    pane.appendChild(groupStatic);
    pane.appendChild(groupAnimated);
    selected = currentCategory();
    ready = true;
    show();
    return true;
  }
  function show() {
    if (!ready) { return; }
    pane.dataset.wallCategory = selected;
    var label = one('.aero-wall-panel[data-wall-panel="static"] h3',pane);
    if (label) { label.textContent = selected === 'solid' ? 'Tinta unita' : 'Gradienti'; }
    for (var i=0; i<tabs.length; i++) {
      var on = tabs[i].dataset.wallTab === selected;
      tabs[i].classList.toggle('on',on);
      tabs[i].setAttribute('aria-pressed',on ? 'true' : 'false');
    }
  }
  function choose(id) {
    for (var i=0; i<categories.length; i++) {
      if (categories[i].id === id) {
        selected = id;
        show();
        // V992.6: le categorie sono soltanto filtri di navigazione.
        // Non toccare lo sfondo, le impostazioni salvate o il meteo.
        // Lo sfondo cambia SOLO premendo OK su un'opzione nella categoria.
        // The native settingsUI stores focusKey, so refresh focus only.
        // Never call render()/open() here: that reflows all settings rows.
        if (A.settingsUi.isOpen()) { A.settingsUi.focus(); }
        return;
      }
    }
  }
  ss.rows = function () {
    var old = priorRows();
    // Do not alter anything when other sections or collapsed navigation are active.
    if (!ss.isActive() || !ss.isExpanded || !ss.isExpanded() || ss.activeIndex() !== 2) {
      return old;
    }
    if (!build()) { return old; }
    var rows = old.slice(0,ss.navCount());
    pushChunks(rows,tabs,2);
    if (selected === 'weather') {
      pushChunks(rows,children('aero-weather-modes'),4);
    } else if (selected === 'solid') {
      var solid = children('bg-still').filter(function (el) { return el.dataset.key === 'bg:black'; });
      pushChunks(rows,solid,5);
    } else if (selected === 'gradient') {
      var gradients = children('bg-still').filter(function (el) { return el.dataset.key !== 'bg:black'; });
      pushChunks(rows,gradients,5);
    } else {
      pushChunks(rows,children('bg-anim'),5);
      var speed = document.getElementById('speed-row');
      if (speed && !speed.hidden) { rows.push(children('speed-row')); }
    }
    return rows;
  };
  // The category tab state stays local to the settings presentation.
  // All persisted selections continue to be managed by V992.3.
})(window.AeroTizen);
