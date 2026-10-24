/* S90C V9.9: evita la misurazione forzata del layout a ogni freccia
   nel mini-menu. Le cinque categorie sono tutte visibili nel pannello.
   Le impostazioni, i tasti e il focus restano governati dalla V9.8. */
(function (A) {
  'use strict';
  if (!A || !A.settingsSections) { return; }
  var ss = A.settingsSections;
  var priorScrollTo = ss.scrollTo;
  if (typeof priorScrollTo !== 'function') { return; }
  ss.scrollTo = function (element) {
    if (!element) { return; }
    // Evita getBoundingClientRect() ad ogni cambio categoria: menu fisso.
    // Per le opzioni a destra preserva lo scroll originale (app e sfondi).
    if (element.dataset && element.dataset.sectionMenu) { return; }
    return priorScrollTo(element);
  };
})(window.AeroTizen);
