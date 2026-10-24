// The home screen: settings gear, the app grid (3 per row), and inputs, navigated with the
// remote. Holding OK on an app opens context actions (issue #22).
(function (A) {
  'use strict';

  var cfg = A.config, COLS = cfg.GRID_COLUMNS;
  var rows = [], row = 1, col = [], scrollY = 0;
  var activeTab = 'home';
  var moving = null;
  var tileMenu = null;  // { element, tileId, tab, choices, selected }
  // V992.27: transitions are one-shot; focus/remote never wait for animations.
  var tabCache = { home: null, all: null };
  var tabDirection = 'right';
  function motionOff() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function positionTabGlass() {
    var active = A.$(activeTab === 'home' ? 's90c-tab-home' : 's90c-tab-all');
    var highlight = A.$('s90c-tab-indicator');
    if (!active || !highlight) { return; }
    highlight.style.width = active.offsetWidth + 'px';
    highlight.style.transform = 'translate3d(' + active.offsetLeft + 'px,0,0)';
  }
  // V992.55: the same moving glass focus used by the small action menu.
  // The indicator is visual only: the Gear and Samsung Home handlers stay unchanged.
  function positionActionFocus(el) {
    var plate = A.$('s90c-action-focus');
    var gear = A.$('gear'), samsung = A.$('samsung-home-shortcut');
    if (!plate) { return; }
    if (el !== gear && el !== samsung) {
      plate.classList.remove('is-visible');
      return;
    }
    plate.style.width = el.offsetWidth + 'px';
    plate.style.height = el.offsetHeight + 'px';
    plate.style.transform = 'translate3d(' + el.offsetLeft + 'px,' + el.offsetTop + 'px,0)';
    plate.classList.add('is-visible');
  }
  function positionTabFocus(el) {
    var home = A.$('s90c-tab-home'), all = A.$('s90c-tab-all');
    var focusIndicator = A.$('s90c-tab-focus-indicator');
    if (!focusIndicator) { return; }
    if (el !== home && el !== all) {
      focusIndicator.style.opacity = '0';
      return;
    }
    focusIndicator.style.width = el.offsetWidth + 'px';
    focusIndicator.style.transform = 'translate3d(' + el.offsetLeft + 'px,0,0)';
    focusIndicator.style.opacity = '1';
  }
  function clearGridMotion() {
    A.$('grid').classList.remove('s90c-tab-enter');
  }
  function settleTabSwitch() {
    // Tab switching is synchronous in V992.46: there is no pending timer.
  }
  var CHEVRONS = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7' };

  function gridTiles() { return [].slice.call(A.$('grid').children); }
  function changeTab(tab) {
    if (tab !== 'home' && tab !== 'all') { return; }
    if (moving || tileMenu) { return; }
    if (tab === activeTab) {
      settleTabSwitch();
      return;
    }
    // Move the current tiles off-DOM without destroying their Samsung artwork.
    // No blocking timeout and no repeated app-card construction on a tab change.
    clearGridMotion();
    var grid = A.$('grid'), parked = document.createDocumentFragment();
    while (grid.firstChild) { parked.appendChild(grid.firstChild); }
    tabCache[activeTab] = parked;
    tabDirection = tab === 'all' ? 'right' : 'left';
    activeTab = tab;
    row = 0; col[0] = tab === 'all' ? 3 : 2; scrollY = 0;
    A.$('rows').style.transform = 'translate3d(0,0,0)';
    render(true);
    if (!motionOff()) { grid.classList.add('s90c-tab-enter'); }
  }
  function renderTabs() {
    var home = A.$('s90c-tab-home'), all = A.$('s90c-tab-all');
    if (!home || !all) { return; }
    home.classList.toggle('on',activeTab === 'home');
    all.classList.toggle('on',activeTab === 'all');
    home.setAttribute('aria-pressed',String(activeTab === 'home'));
    all.setAttribute('aria-pressed',String(activeTab === 'all'));
    document.body.classList.toggle('s90c-all-apps', activeTab === 'all');
    home.onclick = function(){changeTab('home');};
    all.onclick = function(){changeTab('all');};
    positionTabGlass();
  }

  function render(fromTabSwitch) {
    if (!fromTabSwitch) { tabCache.home = null; tabCache.all = null; clearGridMotion(); }
    if (tileMenu) { closeTileMenu(false); }
    var grid = A.$('grid'), home = A.settings.home;
    grid.textContent = '';
    renderTabs();
    // On a pure tab switch, reuse the already created tiles and artwork.
    if (fromTabSwitch && tabCache[activeTab]) {
      grid.appendChild(tabCache[activeTab]);
      tabCache[activeTab] = null;
      buildRows();
      return;
    }
    // Preserve the HOME favourites, ordering and Fireplace; All Apps is only a view.
    home = home.filter(function (id) { return id === cfg.FIREPLACE_ID || A.apps.byId(id); });
    if(activeTab==='home'){A.settings.home=home;}
    var displayed=activeTab==='home'?home:A.apps.all.map(function(a){return a.id;});
    // V992.51: detach work while building both artwork-heavy square cards and
    // rectangular banners. One append rather than per-app live DOM mutations.
    var batch = document.createDocumentFragment();
    displayed.forEach(function (id) {
      var tile;
      if (id === cfg.FIREPLACE_ID) {
        tile = A.el('div', 'tile fire');
        tile.innerHTML = [
          '<span class="fireplace-icon" aria-hidden="true">',
          '<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">',
          '<defs>',
          '<linearGradient id="s90cFireBg" x1="0" y1="0" x2="1" y2="1">',
          '<stop offset="0" stop-color="#321c28"/>',
          '<stop offset="1" stop-color="#a32d1b"/>',
          '</linearGradient>',
          '<linearGradient id="s90cFireMain" x1="0" y1="1" x2="0.65" y2="0">',
          '<stop offset="0" stop-color="#ff771e"/>',
          '<stop offset="0.58" stop-color="#ffc247"/>',
          '<stop offset="1" stop-color="#ffeaa0"/>',
          '</linearGradient>',
          '</defs>',
          '<rect width="128" height="128" rx="25" fill="url(#s90cFireBg)"/>',
          '<path d="M65 17 C73 33 56 43 62 57 C74 51 80 41 78 31 C99 52 108 74 99 91 C92 107 77 113 62 113 C40 113 26 99 26 80 C26 64 36 51 46 39 C43 55 47 64 53 66 C64 56 59 39 65 17 Z" fill="url(#s90cFireMain)"/>',
          '<path d="M65 63 C71 75 66 81 75 86 C81 81 81 75 79 68 C92 82 90 100 77 106 C60 115 45 103 45 91 C45 81 53 72 65 63 Z" fill="#fff2b6"/>',
          '</svg>',
          '</span>'
        ].join('');
        tile.appendChild(A.el('div', 'name', 'Caminetto'));
        tile.onclick = A.apps.playFireplace;
      } else {
        var app = A.apps.byId(id);
        if (A.v9Theme && A.v9Theme.get().mode !== 'classic') {
          tile = A.el('div', 'tile');
          tile.onclick = function () { A.apps.launch(app); };
          A.v9Theme.decorate(tile, app);
        } else {
          // PR #11 square Samsung cards in BOTH Home and Tutte le app.
          tile = A.s90cSamsungArtwork.card(app, function () { A.apps.launch(app); });
        }
      }
      tile.dataset.id = id;
      batch.appendChild(tile);
    });
    grid.appendChild(batch);
    buildRows();
  }

  function buildRows() {
    COLS = cfg.GRID_COLUMNS;  // V9: numero di colonne scelto nelle impostazioni
    // One horizontal focus row: Gear <- Samsung Home <- Home <- Tutte le app.
    rows = [[A.$('gear'), A.$('samsung-home-shortcut'), A.$('s90c-tab-home'), A.$('s90c-tab-all')]].concat(A.chunk(gridTiles(), COLS));
    // All Apps is strictly the app catalogue: no source dock or hidden source focus.
    if (activeTab === 'home') { rows.push([].slice.call(A.$('inputs').children)); }
    for (var r = 0; r < rows.length; r++) { if (col[r] === undefined) { col[r] = 0; } }
    focus();
  }

  function focus() {
    if (A.settingsUi.isOpen()) { return; }
    A.clearFocus();
    row = Math.max(0, Math.min(row, rows.length - 1));
    while (row > 0 && !rows[row].length) { row--; }
    col[row] = Math.max(0, Math.min(col[row] || 0, rows[row].length - 1));
    var el = rows[row][col[row]];
    el.classList.add('focused');
    positionTabFocus(el);
    positionActionFocus(el);
    // V992.15: le app scorrono sotto l'header FISSO e svaniscono vicino
    // all'orologio. Il focus selezionato resta al di sotto della fascia sfumata.
    var rect = el.getBoundingClientRect();
    if (row === 0) {
      scrollY = 0;
    } else if (rect.bottom > 1020) {
      scrollY += rect.bottom - 1020;
    } else if (rect.top < (A.settings.clockLayout === 'classic' ? 178 : 385)) {
      var safeTop = A.settings.clockLayout === 'classic' ? 178 : 385;
      scrollY = Math.max(0, scrollY - (safeTop - rect.top));
    }
    A.$('rows').style.transform = 'translate3d(0,' + (-scrollY) + 'px,0)';
    var viewport = A.$('s90c-home-viewport');
    if (viewport) { viewport.classList.toggle('s90c-scrolled', scrollY > 2); }
  }

  function moveFocus(dRow, dCol) {
    if (dCol) { col[row] += dCol; return focus(); }
    var c = col[row] || 0, r = row + dRow;
    while (r > 0 && r < rows.length && !rows[r].length) { r += dRow; }
    if (r < 0 || r >= rows.length) { return; }
    // Up from first app row focuses the active tab, then LEFT reaches
    // Samsung Home and Settings. Down from tabs enters the first app row.
    if (r === 0) { c = activeTab === 'all' ? 3 : 2; }
    else if (row === 0 && r === 1) { c = 0; }
    row = r; col[row] = c; focus();
  }

  function current() { return rows[row] && rows[row][col[row]]; }

  // ---- issue #22: context menu from a held OK, different in Home / All Apps ----
  function isAppTile(el) {
    return !!(el && el.parentNode === A.$('grid') && el.dataset && el.dataset.id);
  }

  function menuLabel(id) {
    if (id === cfg.FIREPLACE_ID) { return 'Caminetto'; }
    var app = A.apps.byId(id);
    return app ? app.name : 'Applicazione';
  }

  // Glass menu glyphs echo the outlined Home / Tutte le app tab icons.
  function tileMenuIcon(action) {
    var paths = {
      move: '<path d="M12 3v18M3 12h18M8.5 6.5 12 3l3.5 3.5M8.5 17.5 12 21l3.5-3.5M6.5 8.5 3 12l3.5 3.5M17.5 8.5 21 12l-3.5 3.5"/>',
      add: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
      remove: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[action] || '') + '</svg>';
  }

  function updateMenuSelection() {
    if (!tileMenu) { return; }
    var buttons = tileMenu.element.querySelectorAll('.s90c-tile-menu-action');
    for (var i = 0; i < buttons.length; i++) {
      var on = i === tileMenu.selected;
      buttons[i].classList.toggle('selected', on);
      buttons[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    // Fixed-size menu rows: GPU-only translation, no offsetTop/offsetHeight
    // reads on every remote keypress (which forced layout on the S90C).
    if (tileMenu.glider) {
      tileMenu.glider.style.transform = 'translate3d(0,' + (tileMenu.selected * 64) + 'px,0)';
    }
  }

  function removeMenuElements(menu, backdrop) {
    if (menu && menu.parentNode) { menu.parentNode.removeChild(menu); }
    if (backdrop && backdrop.parentNode) { backdrop.parentNode.removeChild(backdrop); }
  }

  function closeTileMenu(restoreFocus) {
    if (!tileMenu) { return; }
    var old = tileMenu;
    tileMenu = null;
    if (old.element.id === 's90c-tile-menu') { old.element.removeAttribute('id'); }
    if (old.backdrop.id === 's90c-tile-menu-backdrop') { old.backdrop.removeAttribute('id'); }
    if (motionOff()) { removeMenuElements(old.element, old.backdrop); }
    else {
      old.element.classList.remove('is-open');
      old.element.classList.add('is-closing');
      old.backdrop.classList.remove('is-open');
      old.backdrop.classList.add('is-closing');
      setTimeout(function () { removeMenuElements(old.element, old.backdrop); }, 150);
    }
    if (restoreFocus) { focus(); }
  }

  function openTileMenu(el) {
    if (!isAppTile(el) || tileMenu || moving) { return false; }
    var id = el.dataset.id;
    var onHome = activeTab === 'home';
    var favourite = A.settings.home.indexOf(id) >= 0;
    var choices = onHome
      ? [{ action: 'move', label: 'Sposta' }, { action: 'remove', label: 'Rimuovi dalla Home' }]
      : [{ action: favourite ? 'remove' : 'add', label: favourite ? 'Rimuovi dalla Home' : 'Aggiungi alla Home' }];
    // Clean up an exiting menu from a rapid BACK / hold sequence.
    var stale = document.querySelectorAll('.s90c-tile-menu.is-closing, .s90c-tile-menu-backdrop.is-closing');
    for (var j = 0; j < stale.length; j++) {
      if (stale[j].parentNode) { stale[j].parentNode.removeChild(stale[j]); }
    }
    var backdrop = A.el('div', 's90c-tile-menu-backdrop');
    backdrop.id = 's90c-tile-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.onclick = function () { closeTileMenu(true); };
    var menu = A.el('div', 's90c-tile-menu');
    menu.id = 's90c-tile-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Azioni per ' + menuLabel(id));
    var glider = A.el('div', 's90c-tile-menu-glider');
    glider.setAttribute('aria-hidden', 'true');
    menu.appendChild(glider);
    choices.forEach(function (choice, i) {
      var opt = A.el('div', 's90c-tile-menu-action');
      var icon = A.el('span', 's90c-tile-menu-action-icon');
      icon.innerHTML = tileMenuIcon(choice.action);
      opt.appendChild(icon);
      opt.appendChild(A.el('span', 's90c-tile-menu-action-label', choice.label));
      opt.setAttribute('role', 'menuitem');
      opt.onclick = function () { chooseMenuAction(i); };
      menu.appendChild(opt);
    });
    document.body.appendChild(backdrop);
    document.body.appendChild(menu);
    var tileRect = el.getBoundingClientRect();
    // Fixed footprint = menu padding (24px) + rows (64px each).
    // Avoid two synchronous layout reads immediately after creating the overlay.
    var ww = window.innerWidth || 1920, wh = window.innerHeight || 1080;
    var w = Math.min(382, ww - 48), h = 24 + choices.length * 64;
    var x = tileRect.right + 20;
    if (x + w > ww - 24) { x = tileRect.left - w - 20; }
    menu.style.left = Math.max(24, Math.min(ww - w - 24, x)) + 'px';
    menu.style.top = Math.max(24, Math.min(wh - h - 24, tileRect.top + 10)) + 'px';
    tileMenu = { element: menu, backdrop: backdrop, glider: glider, tileId: id, tab: activeTab, choices: choices, selected: 0 };
    el.classList.add('focused');
    updateMenuSelection();
    // Start the entrance transition only AFTER position + selection have settled.
    // Do not queue focus/key changes: the remote always remains responsive.
    var show = function () {
      if (tileMenu && tileMenu.element === menu) {
        backdrop.classList.add('is-open');
        menu.classList.add('is-open');
      }
    };
    if (motionOff()) { show(); }
    else if (window.requestAnimationFrame) { window.requestAnimationFrame(show); }
    else { setTimeout(show, 16); }
    return true;
  }

  function chooseMenuAction(i) {
    if (!tileMenu || !tileMenu.choices[i]) { return; }
    var choice = tileMenu.choices[i], id = tileMenu.tileId;
    var originTab = tileMenu.tab;
    var oldTiles = gridTiles();
    var oldIndex = oldTiles.findIndex(function (el) { return el.dataset.id === id; });
    closeTileMenu(false);
    if (choice.action === 'move') { startMove(); return; }
    var home = A.settings.home.slice();
    if (choice.action === 'add') {
      if (home.indexOf(id) < 0) { home.push(id); }
    } else if (choice.action === 'remove') {
      home = home.filter(function (appId) { return appId !== id; });
    }
    A.settings.home = home;
    A.settings.save();
    render();
    if (originTab === 'home' && choice.action === 'remove') {
      // Next tile, or previous if removed the last; never land on an empty row.
      var remaining = gridTiles().length;
      if (remaining) {
        var ix = Math.min(Math.max(0, oldIndex), remaining - 1);
        row = 1 + Math.floor(ix / COLS);
        col[row] = ix % COLS;
      } else {
        // Inputs if present, otherwise the Home tab.
        var inputRow = rows.length - 1;
        if (rows[inputRow] && rows[inputRow].length) {
          row = inputRow; col[row] = 0;
        } else { row = 0; col[0] = 2; }
      }
    } else if (originTab === 'all') {
      // Keep the same app selected in All Apps; it never disappears from this view.
      var ixAll = gridTiles().findIndex(function (el) { return el.dataset.id === id; });
      if (ixAll >= 0) { row = 1 + Math.floor(ixAll / COLS); col[row] = ixAll % COLS; }
    }
    focus();
  }

  // ---- existing move controls, now entered ONLY after choosing 'Sposta' --------
  function showArrows() {
    var old = document.querySelectorAll('.move-arrow');
    for (var i = 0; i < old.length; i++) { old[i].parentNode.removeChild(old[i]); }
    if (!moving) { return; }
    var tiles = gridTiles(), at = tiles.indexOf(moving), n = tiles.length;
    var can = { left: at > 0, right: at < n - 1, up: at - COLS >= 0, down: at + COLS < n };
    Object.keys(can).forEach(function (dir) {
      if (!can[dir]) { return; }
      var arrow = A.el('div', 'move-arrow ' + dir);
      arrow.innerHTML = '<svg viewBox="0 0 24 24"><path fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="' + CHEVRONS[dir] + '"/></svg>';
      moving.appendChild(arrow);
    });
  }

  function startMove() {
    var el = current();
    if (activeTab !== 'home' || !el || el.parentNode !== A.$('grid')) { return false; }
    moving = el;
    moving.classList.add('moving');
    showArrows();
    A.toast('Usa le frecce per spostare, OK per confermare');
    return true;
  }

  function stepMove(delta) {
    var tiles = gridTiles(), from = tiles.indexOf(moving);
    var to = Math.max(0, Math.min(tiles.length - 1, from + delta));
    if (to === from) { return; }
    var grid = A.$('grid');
    grid.removeChild(moving);
    grid.insertBefore(moving, gridTiles()[to] || null);
    row = 1 + Math.floor(to / COLS); col[row] = to % COLS;
    buildRows();
    moving.classList.add('moving');
    showArrows();
  }

  function endMove() {
    A.settings.home = gridTiles().map(function (t) { return t.dataset.id; });
    moving.classList.remove('moving');
    moving = null;
    showArrows();
    A.settings.save();
    A.hideToast();
  }

  // ---- remote keys: a held OK must NEVER activate a menu option on release ----
  var KEY = cfg.KEY, pressTimer = null, enterDown = false;

  function keydown(k, e) {
    settleTabSwitch();
    if (tileMenu) {
      if (k === KEY.BACK || k === KEY.ESC) {
        e.preventDefault(); closeTileMenu(true); return;
      }
      if (k === KEY.UP || k === KEY.DOWN || k === KEY.LEFT || k === KEY.RIGHT) {
        e.preventDefault();
        var step = k === KEY.UP || k === KEY.LEFT ? -1 : 1;
        tileMenu.selected = Math.max(0, Math.min(tileMenu.choices.length - 1, tileMenu.selected + step));
        updateMenuSelection();
        return;
      }
      if (k === KEY.ENTER) {
        e.preventDefault();
        // enterDown is still true until the physical OK that opened this menu is
        // released. Thus repeats and its final keyup cannot choose an action.
        if (enterDown) { return; }
        enterDown = true;
        chooseMenuAction(tileMenu.selected);
      }
      return;
    }
    if (moving) {
      if (k === KEY.LEFT) { e.preventDefault(); stepMove(-1); }
      else if (k === KEY.RIGHT) { e.preventDefault(); stepMove(1); }
      else if (k === KEY.UP) { e.preventDefault(); stepMove(-COLS); }
      else if (k === KEY.DOWN) { e.preventDefault(); stepMove(COLS); }
      else if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) {
        e.preventDefault();
        if (k !== KEY.ENTER || !enterDown) {
          if (k === KEY.ENTER) { enterDown = true; }
          endMove();
        }
      }
      return;
    }
    if (k === KEY.ENTER) {
      e.preventDefault();
      // Samsung key repeat is not a second physical press.
      if (enterDown) { return; }
      enterDown = true;
      var selectedTile = current();
      pressTimer = setTimeout(function () {
        pressTimer = null;
        if (enterDown && isAppTile(selectedTile)) { openTileMenu(selectedTile); }
      }, cfg.LONG_PRESS_MS);
      return;
    }
    if (k === KEY.LEFT) { e.preventDefault(); moveFocus(0, -1); }
    else if (k === KEY.RIGHT) { e.preventDefault(); moveFocus(0, 1); }
    else if (k === KEY.UP) { e.preventDefault(); moveFocus(-1); }
    else if (k === KEY.DOWN) { e.preventDefault(); moveFocus(1); }
    else if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); }
  }

  function keyup(k) {
    if (k !== KEY.ENTER) { return; }
    // Settle the input state BEFORE triggering a launch or entering Settings.
    enterDown = false;
    if (!pressTimer) { return; }  // a long hold has already been consumed
    clearTimeout(pressTimer);
    pressTimer = null;
    settleTabSwitch();
    if (tileMenu || moving) { return; }
    var el = current();
    if (el === A.$('gear')) { A.settingsUi.open(); }
    else if (el && el.onclick) { el.onclick(); }
  }

  // Home Samsung rimane un'azione separata: il tasto HOME fisico resta AeroTizen.
  var samsungButton = A.$('samsung-home-shortcut');
  if (samsungButton) {
    samsungButton.onclick = function () { A.homewatch.openSamsungHome(); };
  }
  A.homeScreen = { render: render, buildRows: buildRows, focus: focus, keydown: keydown, keyup: keyup, setTab: changeTab, getTab: function(){return activeTab;} }; 
})(window.AeroTizen);
