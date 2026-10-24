/* S90C V9.8: progressive menu. Moving over category names does not reflow the detail pane. */
(function (A) {
  'use strict';
  if (!A || !A.settingsSections) { return; }
  var ss = A.settingsSections;
  var createOriginal = ss.create;
  var activateOriginal = ss.activate;
  var rowsOriginal = ss.rows;
  var activeIndexOriginal = ss.activeIndex;
  var collapsed = true;
  var pendingId = null;
  var entries = [];

  function setCollapsed(yes) {
    collapsed = !!yes;
    var editor = A.$('editor');
    if (editor) {
      editor.classList.toggle('s90c-menu-collapsed', collapsed);
      editor.classList.toggle('s90c-menu-expanded', !collapsed);
    }
  }

  function selectOnly(id) {
    var found = false;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].dataset.sectionMenu === id) { found = true; }
    }
    if (!found) { return; }
    pendingId = id;
    for (var j = 0; j < entries.length; j++) {
      entries[j].classList.toggle('s90c-current-section', entries[j].dataset.sectionMenu === id);
    }
    // The details are hidden in compact mode; do not touch their layout until OK.
  }

  ss.create = function () {
    createOriginal();
    pendingId = null;
    setCollapsed(true);
    entries = [].slice.call(A.$('editor').querySelectorAll('.s90c-section-entry'));
    for (var i = 0; i < entries.length; i++) {
      (function (item) {
        item.onclick = function () {
          ss.activate(item.dataset.sectionMenu);
          ss.expand();
          if (A.settingsUi && A.settingsUi.focus) { A.settingsUi.focus(); }
        };
      })(entries[i]);
    }
  };

  ss.activate = function (id) {
    if (collapsed) { selectOnly(id); return; }
    pendingId = null;
    activateOriginal(id);
  };

  ss.rows = function () {
    if (collapsed) {
      var nav = [];
      for (var i = 0; i < entries.length; i++) { nav.push([entries[i]]); }
      return nav;
    }
    return rowsOriginal();
  };

  ss.activeIndex = function () {
    if (pendingId !== null) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].dataset.sectionMenu === pendingId) { return i; }
      }
    }
    return activeIndexOriginal();
  };

  ss.collapse = function () { setCollapsed(true); pendingId = null; };
  ss.expand = function () {
    setCollapsed(false);
    if (pendingId !== null) {
      var target = pendingId;
      pendingId = null;
      activateOriginal(target);
    }
  };
  ss.isExpanded = function () { return !collapsed; };
})(window.AeroTizen);
