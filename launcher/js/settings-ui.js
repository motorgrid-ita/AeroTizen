// The Settings sheet: backgrounds (+ speed slider and preview), temperature unit, date and
// time formats, input names, which apps show on the home screen, and a tucked-away escape
// back to Samsung Home.
(function (A) {
  'use strict';

  var cfg = A.config, KEY = cfg.KEY, S = A.settings;
  var open = false, previewing = false, eRow = 0, eCol = [], focusKey = null, preferredCol = 0;

  function pill(key, text, selected, onSelect) {
    var p = A.el('div', 'pill unit' + (selected ? ' on' : ''), text);
    p.dataset.key = key;
    p.onclick = onSelect;
    return p;
  }

  function changed(after) { S.save(); if (after) { after(); } render(); }

  // ---- sections ------------------------------------------------------------------
  function renderBackgrounds() {
    var anim = A.$('bg-anim'), still = A.$('bg-still'), selected = null;
    anim.textContent = ''; still.textContent = '';
    window.Backgrounds.list.forEach(function (b) {
      var sw = A.el('div', 'swatch' + (b.id === S.background ? ' on' : ''));
      sw.style.background = window.Backgrounds.preview(b);
      sw.appendChild(A.el('span', '', b.name));
      sw.dataset.key = 'bg:' + b.id;
      sw.onclick = function () {
        // V992.5: un clic su Tinta unita / Gradiente / Animati applica subito
        // lo sfondo scelto anche se prima era attivo Meteo.
        S.background = b.id;
        S.aeroWeatherMode = 'off';
        changed(function(){A.applyBackground();if(window.Weather.updateVisibility){window.Weather.updateVisibility();}});
        if (A.refreshWeatherOptions) { A.refreshWeatherOptions(); }
      };
      (b.anim ? anim : still).appendChild(sw);
      if (b.id === S.background) { selected = b; }
    });

    // The speed slider only exists for animated backgrounds, right under them.
    var row = A.$('speed-row'), animated = !!(selected && selected.anim);
    row.hidden = !animated; row.textContent = '';
    if (!animated) { return; }
    var pct = (S.speed - cfg.SPEED.MIN) / (cfg.SPEED.MAX - cfg.SPEED.MIN) * 100;
    var slider = A.el('div', 'slider');
    slider.dataset.key = 'speed';
    slider.innerHTML = '<span class="slider-label">Velocità</span><div class="track"><div class="fill"></div><div class="thumb"></div></div>' +
                       '<span class="slider-value"></span><span class="slider-hint">◀ ▶</span>';
    slider.querySelector('.fill').style.width = pct + '%';
    slider.querySelector('.thumb').style.left = pct + '%';
    slider.querySelector('.slider-value').textContent = String(S.speed) + '×';
    slider.adjust = function (dir) {
      var next = S.speed + dir * cfg.SPEED.STEP;
      S.speed = Math.round(Math.max(cfg.SPEED.MIN, Math.min(cfg.SPEED.MAX, next)) * 100) / 100;
      changed(function () { window.Backgrounds.setSpeed(S.speed); });
    };
    row.appendChild(slider);
    row.appendChild(pill('preview', '▶  Anteprima', false, startPreview));
  }

  function renderUnits() {
    var units = A.$('units');
    units.textContent = '';
    [['auto', 'Automatico'], ['F', '°F  Fahrenheit'], ['C', '°C  Celsius']].forEach(function (u) {
      units.appendChild(pill('unit:' + u[0], u[1], S.tempUnit === u[0], function () { S.tempUnit = u[0]; changed(window.Weather.refresh); }));
    });
  }

  // Main Weather v2: località salvata con coordinate, ricerca geografica italiana.
  // Niente vecchi campi testuali; gli altri controlli V992.21 restano invariati.
  var geoSearchSerial=0, geoSearchTimer=null, geoQuery='';
  function renderWeatherLocation() {
    var box=A.$('weather-location'), saved=S.weatherLocation;
    box.textContent='';
    var automatic=pill('weather:auto','Posizione automatica',!saved,function(){
      geoSearchSerial++;S.weatherLocation=null;S.save();window.Weather.refresh();renderWeatherLocation();
      if(A.settingsUi&&A.settingsUi.isOpen()){A.settingsUi.focus();}
    });
    box.appendChild(automatic);
    if(saved&&saved.name){
      var current=A.el('div','pill unit on','Località: '+(saved.label||saved.name));
      current.dataset.key='weather:selected';box.appendChild(current);
    }
    var inputPill=A.el('div','pill unit name-pill');inputPill.dataset.key='weather:search';
    inputPill.appendChild(A.el('span','port','Cerca città'));
    var field=A.el('input');field.type='text';field.maxLength=64;
    field.value=geoQuery;field.placeholder='Nome città o CAP';field.style.width='380px';
    inputPill.appendChild(field);inputPill.onclick=function(){field.focus();};
    box.appendChild(inputPill);
    var results=A.$('weather-results');results.textContent='';
    function search(){
      var query=String(field.value||'').trim(),serial=++geoSearchSerial;
      geoQuery=query;results.textContent='';
      if(query.length<2){return;}
      window.Weather.searchLocations(query,function(found){
        if(serial!==geoSearchSerial||!box.parentNode){return;}
        results.textContent='';
        if(!found||!found.length){results.appendChild(A.el('div','hint',!found?'Ricerca non disponibile':'Nessuna località trovata'));return;}
        found.forEach(function(g,i){
          var el=pill('weather:result:'+i,g.label,false,function(){
            geoSearchSerial++;
            S.weatherLocation={name:g.name,label:g.label,latitude:g.latitude,longitude:g.longitude,country_code:g.country_code};
            geoQuery='';S.save();window.Weather.refresh();renderWeatherLocation();
            if(A.settingsUi&&A.settingsUi.isOpen()){A.settingsUi.focus();}
          });
          results.appendChild(el);
        });
        if(A.settingsUi&&A.settingsUi.isOpen()){A.settingsUi.focus();}
      });
    }
    field.oninput=function(){if(geoSearchTimer){clearTimeout(geoSearchTimer);}geoSearchTimer=setTimeout(search,450);};
    field.onchange=search;
    field.onblur=function(){ if(field.value.trim()!==geoQuery){search();} };
    if(geoQuery.length>=2){ search(); }
  }
  function renderWeatherVisibility(){
    var box=A.$('weather-visibility');if(!box){return;}box.textContent='';
    [['Sì',true],['No',false]].forEach(function(o){
      box.appendChild(pill('weather:show:'+o[1],o[0],(S.weatherShowLocation!==false)===o[1],function(){
        S.weatherShowLocation=o[1];S.save();window.Weather.updateDisplay();renderWeatherVisibility();
        if(A.settingsUi&&A.settingsUi.isOpen()){A.settingsUi.focus();}
      }));
    });
  }

  // Upstream #21: independent visibility; use native S90C widget + network module.
  function renderHeaderVisibility() {
    var weather=A.$('weather-display'), network=A.$('network-visibility');
    function choices(box, prefix, setting, yes, no) {
      box.textContent='';
      [[true,yes],[false,no]].forEach(function(opt) {
        var value=opt[0],key=prefix+':'+value;
        box.appendChild(pill(key,opt[1],(S[setting]!==false)===value,function(){
          S[setting]=value;focusKey=key;
          changed(function(){
            if(A.s90cHeaderVisibility){A.s90cHeaderVisibility.update();}
            if(setting==='showWeather' && window.Weather.updateVisibility){window.Weather.updateVisibility();}
          });
        }));
      });
    }
    choices(weather,'header:weather','showWeather','Mostra meteo','Nascondi meteo');
    choices(network,'header:network','showNetwork','Mostra','Nascondi');
  }

  function renderDateTime() {
    var now = new Date(), times = A.$('time-formats'), dates = A.$('date-formats');
    times.textContent = ''; dates.textContent = '';
    [['12', '(12 ore)'], ['24', '(24 ore)']].forEach(function (t) {
      times.appendChild(pill('time:' + t[0], A.clock.formatTime(now, t[0]) + '  ' + t[1], S.showTime!==false && S.timeFormat === t[0],
        function () { S.showTime=true; S.timeFormat=t[0]; focusKey='time:'+t[0]; changed(function(){A.clock.tick();if(A.s90cHeaderVisibility){A.s90cHeaderVisibility.update();}}); }));
    });
    times.appendChild(pill('time:none','Nessuna ora',S.showTime===false,function(){
      S.showTime=false;focusKey='time:none';changed(function(){A.clock.tick();if(A.s90cHeaderVisibility){A.s90cHeaderVisibility.update();}});
    }));
    A.clock.DATE_FORMATS.forEach(function (f) {
      dates.appendChild(pill('date:' + f.id, f.id === 'none' ? 'Nessuna data' : f.format(now), S.dateFormat === f.id,
        function () { S.dateFormat = f.id; changed(A.clock.tick); }));
    });
  }

  // Sorgenti - visibility from official main; native TV / HDMI launch paths unchanged.
  function renderInputVisibility() {
    var live = A.$('live-tv-visibility'), hdmi = A.$('input-visibility');
    if (!live || !hdmi) { return; }
    live.textContent = ''; hdmi.textContent = '';
    [[true, 'Mostra'], [false, 'Nascondi']].forEach(function (opt) {
      var value = opt[0], key = 'live-tv:' + value;
      live.appendChild(pill(key, opt[1], (S.showLiveTv !== false) === value, function () {
        S.showLiveTv = value;
        focusKey = key;
        changed(A.inputs.render);
      }));
    });
    [[false, 'Tutte'], [true, 'Riconosciute']].forEach(function (opt) {
      var value = opt[0], key = 'hdmi-hidden:' + value;
      hdmi.appendChild(pill(key, opt[1], (S.hideDisconnectedHdmi === true) === value, function () {
        S.hideDisconnectedHdmi = value;
        focusKey = key;
        changed(A.inputs.render);
      }));
    });
  }

  // Manual per-HDMI override. Do not confuse Tizen source availability
  // with a physical cable: a device in standby can appear disconnected.
  function renderHdmiOverrides() {
    var box = A.$('hdmi-force-visibility');
    if (!box) { return; }
    box.textContent = '';
    if (!S.hdmiKeepVisible || typeof S.hdmiKeepVisible !== 'object') { S.hdmiKeepVisible = {}; }
    var numbers = [];
    A.inputs.sources.forEach(function (s) {
      if (s.type === 'HDMI' && numbers.indexOf(String(s.number)) < 0) { numbers.push(String(s.number)); }
    });
    numbers.sort(function (a, b) { return Number(a) - Number(b); });
    numbers.forEach(function (number) {
      var forced = S.hdmiKeepVisible[number] === true;
      var key = 'hdmi-keep:' + number;
      var label = 'HDMI ' + number + '  ·  ' + (forced ? 'Sempre visibile' : 'Automatico');
      var control = pill(key, label, forced, function () {
        if (!S.hdmiKeepVisible || typeof S.hdmiKeepVisible !== 'object') { S.hdmiKeepVisible = {}; }
        if (S.hdmiKeepVisible[number] === true) { delete S.hdmiKeepVisible[number]; }
        else { S.hdmiKeepVisible[number] = true; }
        focusKey = key;
        changed(function () { A.inputs.render(); });
      });
      control.setAttribute('aria-label', 'HDMI ' + number +
        (forced ? ', sempre visibile, premi OK per automatico' : ', automatico, premi OK per mantenere visibile'));
      box.appendChild(control);
    });
    if (!numbers.length) {
      var note = A.el('div', 's90c-input-note', 'Le porte HDMI saranno disponibili dopo la lettura della TV.');
      box.appendChild(note);
    }
  }

  // OK opens the TV's on-screen keyboard; an empty name falls back to the TV's own name.
  function renderInputNames() {
    var box = A.$('input-names');
    box.textContent = '';
    A.inputs.sources.filter(function (s) { return s.type !== 'TV'; }).forEach(function (s) {
      var port = A.inputs.portName(s), p = A.el('div', 'pill unit name-pill');
      p.dataset.key = 'name:' + port;
      p.appendChild(A.el('span', 'port', port));
      var field = A.el('input');
      field.type = 'text'; field.maxLength = 24;
      field.value = S.inputNames[port] || '';
      field.placeholder = s.editName || 'Assegna un nome';
      field.onchange = field.onblur = function () {
        var v = field.value.trim();
        if (v) { S.inputNames[port] = v; } else { delete S.inputNames[port]; }
        S.save(); A.inputs.render();
      };
      p.appendChild(field);
      p.onclick = function () { field.focus(); };
      box.appendChild(p);
    });
  }

  // Every real app on the TV; OK shows or hides it on the home screen.
  function renderAppMenu() {
    var box = A.$('all-apps');
    box.textContent = '';
    var add = A.el('div', 'tile addapps');
    add.dataset.key = 'add';
    add.innerHTML = A.tiles.ICONS.plus + '<div class="name">Aggiungi app<div class="sub">Ricerca Samsung</div></div>';
    add.onclick = A.apps.openStore;
    box.appendChild(add);
    // V9.7: Caminetto is a virtual tile, not an installed Samsung application.
    var fireplaceId = cfg.FIREPLACE_ID;
    if (fireplaceId) {
      var fireShown = S.home.indexOf(fireplaceId) >= 0;
      var fireTile = A.el('div', 'tile s90c-fireplace-setting' + (fireShown ? ' on' : ''));
      fireTile.dataset.key = 'app:' + fireplaceId;
      fireTile.innerHTML = '<svg class="logo" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="#ffdf8b" d="M12 2c1.7 3.5-.9 5.5.7 8 1.4-1.3 2-3 1.8-4.1 4 3.7 6.4 7.5 4.1 12.1-1.2 2.5-3.8 4-6.6 4-4.7 0-7.5-3-7.5-7.1 0-3.2 2.3-5.9 4.8-8.3-.4 3.1.2 4.6 1.7 5.5 2.1-2.6.3-5.6 1.1-10.1z"/>' +
        '</svg><div class="name">Caminetto</div>';
      fireTile.onclick = function () {
        var i = S.home.indexOf(fireplaceId);
        if (i >= 0) { S.home.splice(i, 1); } else { S.home.push(fireplaceId); }
        fireTile.classList.toggle('on', i < 0);
        S.save();
      };
      box.appendChild(fireTile);
    }

    A.apps.all.forEach(function (app) {
      var tile = A.tiles.banner(app, S.home.indexOf(app.id) >= 0 ? 'on' : '');
      tile.dataset.key = 'app:' + app.id;
      tile.onclick = function () {
        var i = S.home.indexOf(app.id);
        if (i >= 0) { S.home.splice(i, 1); } else { S.home.push(app.id); }
        tile.classList.toggle('on', i < 0);
        S.save();
      };
      box.appendChild(tile);
    });
  }

  function renderV9Theme() {
    if (A.v9Theme) { A.v9Theme.renderOptions(render); }
  }

  function render() {
    renderBackgrounds(); renderV9Theme(); renderUnits(); renderWeatherLocation(); renderWeatherVisibility(); renderHeaderVisibility(); renderDateTime(); renderInputVisibility(); renderHdmiOverrides(); renderInputNames(); renderAppMenu();
    focus();
  }

  // ---- navigation (focus follows the item, so re-renders don't make it jump) -------
  function editorRows() {
    // S90C V9.4: navigazione limitata alla sezione corrente.
    if (A.settingsSections && A.settingsSections.isActive()) { return A.settingsSections.rows(); }
    function kids(id) { return [].slice.call(A.$(id).children); }
    // V9.1: il telecomando segue l'ordine visivo: prima i temi, poi gli sfondi.
    var r = [kids('v9-mode-picks'), kids('v9-col-picks')];
    var bgRows = A.chunk(kids('bg-anim'), 8);
    if (!A.$('speed-row').hidden) { bgRows.push(kids('speed-row')); }
    return r.concat(bgRows, A.chunk(kids('bg-still'), 8), [kids('units')], [kids('weather-location')], [kids('weather-visibility')], [kids('weather-display')], [kids('time-formats')], [kids('date-formats')],
      [kids('hdmi-force-visibility')], [kids('input-names')], A.chunk(kids('all-apps'), 5));
  }

  // V992.10: deterministic focus. Never carry a stale row/column from another
  // section into the currently visible section (avoids unexpected jumps).
  function focus() {
    A.clearFocus();
    var r = editorRows();
    if (!r || !r.length) { return; }
    var located = false;
    if (focusKey) {
      for (var i = 0; i < r.length && !located; i++) {
        for (var j = 0; j < r[i].length; j++) {
          if (r[i][j] && r[i][j].dataset.key === focusKey) {
            eRow = i; eCol[i] = j; located = true; break;
          }
        }
      }
    }
    eRow = Math.max(0, Math.min(eRow, r.length - 1));
    if (!r[eRow] || !r[eRow].length) {
      var target = -1;
      for (var k = eRow; k < r.length; k++) { if (r[k] && r[k].length) { target = k; break; } }
      if (target < 0) { for (var u = eRow - 1; u >= 0; u--) { if (r[u] && r[u].length) { target = u; break; } } }
      if (target < 0) { focusKey = null; return; }
      eRow = target;
    }
    eCol[eRow] = Math.max(0, Math.min(eCol[eRow] || 0, r[eRow].length - 1));
    var el = r[eRow][eCol[eRow]];
    if (!el) { return; }
    el.classList.add('focused');
    focusKey = el.dataset.key || null;
    if (A.settingsSections && A.settingsSections.isActive()) {
      A.settingsSections.scrollTo(el);
      if (A.settingsSections.updateHighlight) { A.settingsSections.updateHighlight(el); }
    } else { A.$('editor').scrollTop = Math.max(0, el.offsetTop - 640); }
  }

  function startPreview() {
    previewing = true;
    document.body.classList.add('previewing');
    A.clearFocus();
    A.toast('Anteprima attiva. Premi un tasto per tornare');
  }

  var s90cMotionTimer = null;
  var s90cMotionArmed = false;
  var lastArrowAt = 0;
  var lastArrowKey = null;

  // Stable navigation: retain the intended column through short rows.
  // When the row grows again, the cursor returns to that column.
  function goRow(rows, target) {
    if (target < 0 || target >= rows.length || !rows[target] || !rows[target].length) { return; }
    eRow = target;
    eCol[target] = Math.min(preferredCol, rows[target].length - 1);
    focusKey = null;
    focus();
  }

  function keydown(k, e) {
    if (k === KEY.LEFT || k === KEY.RIGHT || k === KEY.UP || k === KEY.DOWN) {
      var now = Date.now();
      // Never discard two distinct physical presses; throttle *only* key auto-repeat.
      // The old 95 ms guard ate legitimate consecutive D-pad clicks.
      if (e && e.repeat && k === lastArrowKey && now - lastArrowAt < 80) {
        if (e && e.preventDefault) { e.preventDefault(); }
        return;
      }
      lastArrowAt = now;
      lastArrowKey = k;
    } else { lastArrowKey = null; }
    if (s90cMotionTimer !== null) { e.preventDefault(); return; }
    if (previewing) {
      e.preventDefault(); previewing = false;
      document.body.classList.remove('previewing'); A.hideToast(); focus();
      return;
    }
    // S90C V9.4: menu laterale e contenuto navigabili da telecomando.
    if (A.settingsSections && A.settingsSections.isActive()) {
      var ss = A.settingsSections;
      var r4 = editorRows();
      var menuLen = ss.navCount();
      var navRow = eRow < menuLen;
      var item = r4[eRow] && r4[eRow][eCol[eRow] || 0];
      if (k === KEY.BACK || k === KEY.ESC) {
        e.preventDefault();
        if (!navRow) {
          ss.collapse();
          eRow = ss.activeIndex(); eCol[eRow] = 0; preferredCol = 0;
          focusKey = 'section:' + itemSection(); focus();
          return;
        }
        return close();
      }
      if (navRow) {
        if (k === KEY.UP || k === KEY.DOWN) {
          e.preventDefault();
          eRow = Math.max(0, Math.min(menuLen - 1, eRow + (k === KEY.UP ? -1 : 1)));
          eCol[eRow] = 0; preferredCol = 0;
          var target = r4[eRow][0];
          ss.activate(target.dataset.sectionMenu);
          focusKey = target.dataset.key;
          focus();
          return;
        }
        if (k === KEY.ENTER || k === KEY.RIGHT) {
          e.preventDefault();
          ss.expand();
          var rowsAfter = editorRows();
          if (rowsAfter.length > menuLen) {
            eRow = menuLen; eCol[eRow] = 0; preferredCol = 0; focusKey = null; focus();
          }
          return;
        }
        if (k === KEY.LEFT) { e.preventDefault(); if (ss.isExpanded()) { ss.collapse(); focus(); } return; }
        return;
      }
      if (k === KEY.LEFT || k === KEY.RIGHT) {
        e.preventDefault();
        if (item && item.adjust) { item.adjust(k === KEY.LEFT ? -1 : 1); return; }
        var col = eCol[eRow] || 0;
        // On the first column, LEFT returns to categories like BACK.
        if (k === KEY.LEFT && col === 0) {
          ss.collapse();
          eRow = ss.activeIndex(); eCol[eRow] = 0; preferredCol = 0;
          focusKey = 'section:' + itemSection(); focus();
          return;
        }
        eCol[eRow] = Math.max(0, Math.min(r4[eRow].length - 1, col + (k === KEY.RIGHT ? 1 : -1)));
        preferredCol = eCol[eRow];
        focusKey = null; focus();
        return;
      }
      if (k === KEY.UP || k === KEY.DOWN) {
        e.preventDefault();
        var next = eRow + (k === KEY.UP ? -1 : 1);
        // Do not jump from the first content row into the sidebar on UP.
        if (next >= menuLen && next < r4.length) { goRow(r4, next); }
        return;
      }
      if (k === KEY.ENTER) {
        e.preventDefault();
        focusKey = item && item.dataset.key;
        if (item === A.$('escape')) { A.homewatch.openSamsungHome(); }
        else if (item && item.onclick) { item.onclick(); }
        return;
      }
      return;
    }
    function itemSection() {
      var a = ss.activeIndex();
      var nav = r4[a] && r4[a][0];
      return nav ? nav.dataset.sectionMenu : 'home';
    }
    if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); return close(); }
    var r = editorRows(), cur = r[eRow] && r[eRow][eCol[eRow] || 0];
    if (cur && cur.adjust && (k === KEY.LEFT || k === KEY.RIGHT)) { return cur.adjust(k === KEY.LEFT ? -1 : 1); }
    if (k === KEY.ENTER) {
      focusKey = cur && cur.dataset.key;
      if (cur && cur.onclick) { cur.onclick(); }
      return;
    }
    focusKey = null;
    var c = eCol[eRow] || 0;
    if (k === KEY.LEFT) { eCol[eRow] = c - 1; } else if (k === KEY.RIGHT) { eCol[eRow] = c + 1; } else if (k === KEY.UP) { eRow--; eCol[eRow] = c; } else if (k === KEY.DOWN) { eRow = Math.min(r.length - 1, eRow + 1); eCol[eRow] = c; }
    focus();
  }

  function openSheet() {
    if (s90cMotionTimer !== null) {
      clearTimeout(s90cMotionTimer);
      s90cMotionTimer = null;
    }
    s90cMotionArmed = false;
    document.body.classList.remove('s90c-popup-closing');
    open = true; eRow = 0; eCol = []; preferredCol = 0; lastArrowAt = 0; lastArrowKey = null;
    focusKey = 'v9:mode:' + (A.v9Theme ? A.v9Theme.get().mode : 'classic');
    document.body.classList.add('editing');
    A.$('editor').hidden = false;
    if (A.settingsSections) {
      A.settingsSections.create();
      // V992.55: collapse first, then select the entry. The compact wrapper
      // saves a pending category: collapsing AFTER activate used to erase it
      // on reopen and send RIGHT into the previous category instead of Home.
      A.settingsSections.collapse();
      A.settingsSections.activate('home');
      eRow = 0; eCol = []; focusKey = 'section:home';
    }
    render();
  }

  function close() {
    if (s90cMotionTimer !== null) { return; }
    if (!s90cMotionArmed && A.settingsSections && A.settingsSections.isActive()) {
      document.body.classList.add('s90c-popup-closing');
      s90cMotionTimer = setTimeout(function () {
        s90cMotionTimer = null;
        s90cMotionArmed = true;
        close();
      }, 300);
      return;
    }
    s90cMotionArmed = false;
    document.body.classList.remove('s90c-popup-closing');
    open = false;
    document.body.classList.remove('editing');
    A.$('editor').hidden = true;
    S.save();
    A.homeScreen.render();
  }

  A.settingsUi = { open: openSheet, close: close, isOpen: function () { return open; }, focus: focus, keydown: keydown, refreshApps: function () { if (open) { renderAppMenu(); focus(); } } };
})(window.AeroTizen);
