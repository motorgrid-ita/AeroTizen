/* S90C V9.4 - left-hand settings categories (LTvLauncher-inspired).
   Pure settings presentation: does not change preferences, app launchers, or TV APIs.
   Compatible with AeroTizen settings-ui and V9.2.3 brand theme. */
(function (A) {
  'use strict';
  var editor = A.$('editor');
  if (!editor || !A.settingsUi) { return; }
  var state = { built: false, active: 'home', nav: [], pane: {}, menu: null, content: null, glider: null, contentGlider: null, contentGliderSection: null };
  var groups = [
    { id: 'home', title: 'Aspetto Home', icon: '\u25a6', subtitle: 'Stile, disposizione e rete' },
    { id: 'apps', title: 'Applicazioni', icon: '\u25a3', subtitle: 'App visibili e Home Samsung' },
    { id: 'wall', title: 'Sfondi', icon: '\u25a7', subtitle: 'Colori e animazioni' },
    { id: 'status', title: 'Meteo e orologio', icon: '\u2600', subtitle: 'Meteo, ora e data' },
    { id: 'sources', title: 'Sorgenti', icon: '\u25a1', subtitle: 'TV in diretta e HDMI' }
  ];
  var headingGroups = {
    'Stile della Home': 'home', 'Home: aspetto (V9 test)': 'home',
    'App per riga': 'home',
    'Applicazioni nella Home': 'apps',
    'Sfondo meteo realistico': 'wall',
    'Sfondi animati': 'wall', 'Sfondi statici': 'wall',
    'Visibilità meteo': 'status', 'Mostra Wi-Fi': 'home',
    'Temperatura': 'status', 'Località meteo': 'status', 'Mostra località meteo': 'status', 'Impaginazione orologio': 'status', 'Stile orologio': 'status', 'Data e ora': 'status',
    'TV in diretta': 'sources', 'Ingressi HDMI': 'sources',
    'HDMI sempre visibili': 'sources', 'Nomi delle sorgenti': 'sources'
  };
  function el(tag, className, content) {
    var n = document.createElement(tag);
    if (className) { n.className = className; }
    if (content) { n.textContent = content; }
    return n;
  }
  function titleFor(id) {
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === id) { return groups[i].title; }
    }
    return 'Impostazioni';
  }
  function create() {
    if (state.built) { return; }
    var current = [].slice.call(editor.children);
    var heading = current[0] && current[0].tagName === 'H2' ? current[0] : el('h2', '', 'Impostazioni');
    var frame = el('div', 's90c-settings-frame');
    var sidebar = el('div', 's90c-settings-sidebar');
    var nav = el('div', 's90c-settings-menu');
    // V992.53: exactly one light, translating focus plate, like the tile action menu.
    var glider = el('div', 's90c-settings-glider');
    glider.setAttribute('aria-hidden', 'true');
    nav.appendChild(glider);
    var content = el('div', 's90c-settings-main');
    var meta = el('div', 's90c-settings-meta');
    meta.appendChild(el('div', 's90c-settings-kicker', 'AEROTIZEN'));
    sidebar.appendChild(meta);
    sidebar.appendChild(heading);
    sidebar.appendChild(el('div', 's90c-settings-line'));
    for (var g = 0; g < groups.length; g++) {
      var section = groups[g];
      var button = el('div', 's90c-section-entry');
      button.dataset.key = 'section:' + section.id;
      button.dataset.sectionMenu = section.id;
      button.appendChild(el('span', 's90c-section-icon', section.icon));
      var label = el('span', 's90c-section-label');
      label.appendChild(el('strong', '', section.title));
      label.appendChild(el('small', '', section.subtitle));
      button.appendChild(label);
      button.appendChild(el('span', 's90c-section-chevron', '\u203a'));
      (function (id) { button.onclick = function () { activate(id); }; })(section.id);
      nav.appendChild(button);
      state.nav.push(button);
      var pane = el('div', 's90c-section-pane');
      pane.dataset.sectionPane = section.id;
      pane.hidden = true;
      state.pane[section.id] = pane;
    }
    sidebar.appendChild(nav);
    sidebar.appendChild(el('div', 's90c-settings-help', '\u2191\u2193 Sezione   \u2192 Apri   \u2190 Indietro'));
    var contentHead = el('div', 's90c-settings-content-head');
    contentHead.appendChild(el('span', 's90c-settings-content-kicker', 'PERSONALIZZAZIONE'));
    contentHead.appendChild(el('h2', 's90c-settings-active-title', 'Aspetto Home'));
    var dismiss = el('div', 's90c-settings-close', '\u00d7');
    dismiss.title = 'Chiudi impostazioni';
    dismiss.onclick = function () { A.settingsUi.close(); };
    contentHead.appendChild(dismiss);
    content.appendChild(contentHead);
    var scroller = el('div', 's90c-settings-scroll');
    // A separate glider follows focus INSIDE each category; it never changes
    // the actual options, their dimensions, click handlers or remote hit boxes.
    var contentGlider = el('div', 's90c-content-glider');
    contentGlider.setAttribute('aria-hidden', 'true');
    scroller.appendChild(contentGlider);
    for (var i = 0; i < groups.length; i++) { scroller.appendChild(state.pane[groups[i].id]); }
    content.appendChild(scroller);
    frame.appendChild(sidebar);
    frame.appendChild(content);
    editor.appendChild(frame);
    editor.classList.add('s90c-settings-ready');
    var selected = 'apps';
    for (var c = 1; c < current.length; c++) {
      var node = current[c];
      if (node.id === 'escape') { selected = 'apps'; }
      else if (node.tagName === 'H3') {
        var name = node.textContent.replace(/^\s+|\s+$/g, '');
        selected = headingGroups[name] || headingGroups[A.i18n ? A.i18n.source(name) : name] || 'system';
      }
      state.pane[selected].appendChild(node);
    }
    editor.addEventListener('click', function (event) {
      if (event.target === editor && A.settingsUi) { A.settingsUi.close(); }
    });
    state.menu = nav;
    state.glider = glider;
    state.contentGlider = contentGlider;
    state.content = scroller;
    state.title = contentHead.querySelector('.s90c-settings-active-title');
    state.built = true;
    organizeStatus();
    moveNetworkToHome();
    activate('home');
  }
  /* V992.32 — Visual grouping only. All existing controls and their
     data-key/onclick handlers are moved intact into more legible cards. */
  function organizeStatus() {
    var pane = state.pane.status;
    if (!pane || pane.dataset.s90cOrganized === 'yes') { return; }
    var ids = ['weather-display', 'weather-location', 'weather-results',
      'weather-visibility', 'units', 'aero-clock-layouts', 'aero-clock-styles', 'time-formats',
      'date-formats'];
    var elements = {};
    for (var i = 0; i < ids.length; i++) { elements[ids[i]] = A.$(ids[i]); }
    var content = el('div', 's90c-status-content');
    function card(title, summary, type) {
      var wrapper = el('section', 's90c-status-card s90c-status-' + type);
      var head = el('div', 's90c-status-card-head');
      head.appendChild(el('h4', '', title));
      head.appendChild(el('p', '', summary));
      wrapper.appendChild(head);
      content.appendChild(wrapper);
      return wrapper;
    }
    function field(parent, label, controlIds, note) {
      var wrapper = el('div', 's90c-status-field');
      wrapper.appendChild(el('h3', '', label));
      if (note) { wrapper.appendChild(el('p', 's90c-status-field-hint', note)); }
      for (var i = 0; i < controlIds.length; i++) {
        if (elements[controlIds[i]]) { wrapper.appendChild(elements[controlIds[i]]); }
      }
      parent.appendChild(wrapper);
    }
    var weather = card('Meteo', 'Previsioni e località', 'weather');
    field(weather, 'Visualizzazione', ['weather-display']);
    field(weather, 'Località', ['weather-location', 'weather-results']);
    field(weather, 'Mostra nome località', ['weather-visibility']);
    field(weather, 'Temperatura', ['units']);
    var clock = card('Orologio e data', 'Aspetto e formati di visualizzazione', 'clock');
    field(clock, 'Impaginazione', ['aero-clock-layouts']);
    field(clock, 'Stile orologio', ['aero-clock-styles']);
    clock.lastElementChild.classList.add('s90c-clock-style-field');
    field(clock, 'Ora', ['time-formats']);
    field(clock, 'Data', ['date-formats']);
    pane.textContent = '';
    pane.appendChild(content);
    pane.dataset.s90cOrganized = 'yes';
  }

  // V992.46: The same showNetwork setting now belongs to Aspetto Home.
  // Move the original element rather than cloning it, so focus/handlers persist.
  function moveNetworkToHome() {
    var pane = state.pane.home;
    var ctrl = A.$('network-visibility');
    if (!pane || !ctrl || ctrl.parentNode === pane) { return; }
    var heading = el('h3', '', 'Mostra Wi-Fi');
    pane.appendChild(heading);
    pane.appendChild(ctrl);
  }

  function activate(id) {
    if (!state.built) { create(); }
    if (!state.pane[id]) { return; }
    var changed = state.active !== id;
    state.active = id;
    if (changed && state.contentGlider) {
      // Jumping categories should not animate an outline across unrelated panes.
      state.contentGlider.classList.remove('is-visible');
      state.contentGliderSection = null;
    }
    for (var i = 0; i < groups.length; i++) {
      var key = groups[i].id;
      var pane = state.pane[key];
      pane.hidden = key !== id;
      state.nav[i].classList.toggle('s90c-current-section', key === id);
      if (key !== id) { pane.classList.remove('s90c-pane-arriving'); }
    }
    state.title.textContent = titleFor(id);
    state.content.scrollTop = 0;
    if (changed) {
      var nextPane = state.pane[id];
      // Re-trigger the entrance only for an actual category switch.
      nextPane.classList.remove('s90c-pane-arriving');
      state.title.classList.remove('s90c-title-arriving');
      // V9.8: avoid synchronous layout flush on every category switch.
      nextPane.classList.add('s90c-pane-arriving');
      state.title.classList.add('s90c-title-arriving');
    }
  }
  function kids(id) {
    var node = A.$(id);
    if (!node) { return []; }
    return [].slice.call(node.children).filter(function (child) {
      // Informational notes are not selectable. The remote must never land
      // on an inert element with no data-key or actionable handler.
      return child.dataset && child.dataset.key && !child.hidden && child.offsetParent !== null;
    });
  }
  function include(rows, arr) {
    // Never create a focusable row containing a missing element. This build has
    // no legacy #escape tile; old code added [null] after the Apps grid.
    arr = arr.filter(function (item) { return !!item; });
    if (arr.length) { rows.push(arr); }
  }
  function chunks(rows, id, per) {
    var k = kids(id);
    if (k.length) { Array.prototype.push.apply(rows, A.chunk(k, per)); }
  }
  // Flex layouts may wrap differently when a source name or label grows.
  // Follow actual visible row positions (max 4 HDMI + 3 small control groups),
  // rather than assuming 2 columns and skipping an off-screen item.
  function visualRows(rows, id, per) {
    var items = kids(id), line = [], lastTop = null;
    for (var i = 0; i < items.length; i++) {
      var top = items[i].offsetTop;
      if (line.length && (top !== lastTop || line.length >= per)) {
        rows.push(line); line = [];
      }
      line.push(items[i]); lastTop = top;
    }
    if (line.length) { rows.push(line); }
  }

  /* V9.5: decorate only the existing buttons. Keep their data-key and onclick
     handlers, so saved theme values ('classic'/'brand') remain untouched. */
  function decorateStyleChoices() {
    var modes = A.$('v9-mode-picks');
    if (!modes) { return; }
    var buttons = [].slice.call(modes.children);
    for (var n = 0; n < buttons.length; n++) {
      var btn = buttons[n];
      if (btn.dataset.s90cPreview === 'yes') { continue; }
      var key = btn.dataset.key || '';
      var iconMode = key === 'v9:mode:classic';
      var boxMode = key === 'v9:mode:brand';
      if (!iconMode && !boxMode) { continue; }
      btn.textContent = '';
      btn.dataset.s90cPreview = 'yes';
      btn.classList.add('s90c-style-choice');
      var mini = el('div', 's90c-mini-layout ' + (iconMode ? 's90c-mini-icons' : 's90c-mini-boxes'));
      var miniNames = iconMode ? ['N', '\u25b6', 'S'] : ['\u25b6', 'N', '\u266b'];
      for (var j = 0; j < 3; j++) {
        var cell = el('div', 's90c-mini-tile s90c-mini-tile-' + j);
        cell.appendChild(el('span', '', miniNames[j]));
        mini.appendChild(cell);
      }
      btn.appendChild(mini);
      var details = el('div', 's90c-style-details');
      details.appendChild(el('strong', '', iconMode ? 'Quadrato' : 'Rettangolo'));
      details.appendChild(el('span', '', iconMode ? 'Visualizzazione classica Standard.' : 'Stile Moderno con effetti 3D.'));
      btn.appendChild(details);
      btn.appendChild(el('span', 's90c-style-check', '\u2713'));
    }
  }

  function rows() {
    decorateStyleChoices();
    var r = [];
    for (var i = 0; i < state.nav.length; i++) { r.push([state.nav[i]]); }
    if (state.active === 'home') {
      visualRows(r, 'v9-mode-picks', 4);
      visualRows(r, 'v9-col-picks', 5);
      visualRows(r, 'network-visibility', 2);
    } else if (state.active === 'apps') {
      visualRows(r, 'all-apps', 4);
    } else if (state.active === 'wall') {
      chunks(r, 'aero-weather-modes', 4);
      chunks(r, 'bg-anim', 5);
      var speed = A.$('speed-row');
      if (speed && !speed.hidden) { include(r, kids('speed-row')); }
      chunks(r, 'bg-still', 5);
    } else if (state.active === 'status') {
      // Must match the visible CSS grid, including rows wrapped by the seven date formats.
      visualRows(r, 'weather-display', 2);
      visualRows(r, 'weather-location', 1);
      visualRows(r, 'weather-results', 1);
      visualRows(r, 'weather-visibility', 2);
      visualRows(r, 'units', 3);
      visualRows(r, 'aero-clock-layouts', 2);
      if (A.settings.clockLayout !== 'classic') { visualRows(r, 'aero-clock-styles', 4); }
      visualRows(r, 'time-formats', 3);
      visualRows(r, 'date-formats', 3);
    } else if (state.active === 'sources') {
      visualRows(r, 'live-tv-visibility', 2);
      visualRows(r, 'input-visibility', 2);
      visualRows(r, 'hdmi-force-visibility', 4);
      visualRows(r, 'input-names', 4);
    }
    return r;
  }
  // Move a single plate between the settings categories.  The real focused
  // element still receives the remote events; this is visual only. The glider
  // moves by GPU translation, never by changing the sidebar's dimensions.
  function updateHighlight(focused) {
    if (!state.built || !state.menu || !state.glider) { return; }
    var inMenu = !!(focused && focused.dataset && focused.dataset.sectionMenu);
    var target = focused;
    if (!inMenu) {
      for (var n = 0; n < state.nav.length; n++) {
        if (state.nav[n].dataset.sectionMenu === state.active) { target = state.nav[n]; break; }
      }
    }
    if (!target) { return; }
    var plate = state.glider;
    plate.style.height = target.offsetHeight + 'px';
    plate.style.transform = 'translate3d(0,' + target.offsetTop + 'px,0)';
    plate.classList.add('is-visible');
    plate.classList.toggle('is-content', !inMenu);
    updateContentHighlight(inMenu ? null : focused);
  }
  function updateContentHighlight(target) {
    var plate = state.contentGlider;
    var scroller = state.content;
    if (!plate || !scroller || !target || !target.dataset || !target.dataset.key ||
        !state.pane[state.active] || !state.pane[state.active].contains(target)) {
      if (plate) { plate.classList.remove('is-visible'); }
      return;
    }
    // Content may be scrolled or wrapped; measure the actual DOM rather than
    // guessing how many options fit on a row. One measurement per remote press.
    var bounds = target.getBoundingClientRect();
    var viewport = scroller.getBoundingClientRect();
    if (!bounds.width || !bounds.height) { plate.classList.remove('is-visible'); return; }
    var left = bounds.left - viewport.left + scroller.scrollLeft;
    var top = bounds.top - viewport.top + scroller.scrollTop;
    var kind = state.active;
    if (state.contentGliderSection !== kind) {
      plate.classList.remove('is-visible');
      plate.classList.add('no-motion');
      state.contentGliderSection = kind;
    } else { plate.classList.remove('no-motion'); }
    // Keep this as a light border over the real option; the option remains
    // fully readable, and only transform/colour animate between neighbours.
    plate.style.width = Math.max(1, Math.round(bounds.width)) + 'px';
    plate.style.height = Math.max(1, Math.round(bounds.height)) + 'px';
    // V992.56: the glider takes the focused control's corner geometry.
    // This avoids a square outline on a rounded option (and vice versa),
    // without changing the target's bounds, event handlers or layout.
    var radius = '17px';
    try {
      if (typeof window.getComputedStyle === 'function') {
        var computed = window.getComputedStyle(target);
        if (computed && computed.borderRadius) { radius = computed.borderRadius; }
      }
    } catch (e) { /* Older WebKit/Tizen: default to the menu plate radius. */ }
    plate.style.borderRadius = radius;
    plate.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
    plate.classList.add('is-visible');
  }
  function scrollTo(el) {
    if (!el || !state.built) { return; }
    var inMenu = !!el.dataset.sectionMenu;
    var scroller = inMenu ? state.menu : state.content;
    var childRect = el.getBoundingClientRect();
    var outer = scroller.getBoundingClientRect();
    // When returning to the first choice of a status card, bring its TITLE
    // back too. Otherwise the button is visible while the panel head is clipped.
    if (!inMenu && state.active === 'status') {
      var card = el.closest ? el.closest('.s90c-status-card') : null;
      var group = el.parentNode, first = group && group.firstElementChild;
      if (card && (el === first || (first && first.nextElementSibling === el)) &&
          group.className && String(group.className).indexOf('units') >= 0 &&
          group === card.querySelector('.units')) {
        var cardTop = card.getBoundingClientRect().top;
        if (cardTop < outer.top + 28) {
          scroller.style.scrollBehavior = 'auto';
          scroller.scrollTop = Math.max(0, scroller.scrollTop + cardTop - outer.top - 22);
          return;
        }
      }
    }
    // Keep focused items away from the fixed section title and the clipping edge.
    // A real margin (rather than 18 px) is especially important when going UP.
    var topInset = inMenu ? 22 : 76;
    var bottomInset = inMenu ? 22 : 54;
    var safeTop = outer.top + topInset, safeBottom = outer.bottom - bottomInset;
    var correction = 0;
    if (childRect.top < safeTop) {
      correction = childRect.top - safeTop;
    } else if (childRect.bottom > safeBottom) {
      correction = childRect.bottom - safeBottom;
    }
    if (correction) {
      var limit = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      var next = Math.max(0, Math.min(limit, scroller.scrollTop + correction));
      // Programmatic D-pad scrolling must not enqueue smooth-scroll animations.
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollTop = next;
    }
  }
  A.settingsSections = {
    create: create,
    activate: activate,
    rows: rows,
    decorateStyleChoices: decorateStyleChoices,
    scrollTo: scrollTo,
    updateHighlight: updateHighlight,
    navCount: function () { return state.nav.length; },
    activeIndex: function () {
      for (var i = 0; i < state.nav.length; i++) {
        if (state.nav[i].dataset.sectionMenu === state.active) { return i; }
      }
      return 0;
    },
    isActive: function () { return state.built && document.body.classList.contains('editing'); }
  };
})(window.AeroTizen);
