// Clock and date in the top bar, in the user's chosen formats.
(function (A) {
  'use strict';

  var DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  var MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  var DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function dn() { return A.i18n && A.i18n.language==='en' ? DAYS_EN : DAYS; }
  function mn() { return A.i18n && A.i18n.language==='en' ? MONTHS_EN : MONTHS; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Formatted by hand (not toLocale*) so every TV shows exactly the same thing.
  var DATE_FORMATS = [
    { id: 'weekday', format: function (d) { return dn()[d.getDay()] + ' ' + d.getDate(); } },
    { id: 'short', format: function (d) { return dn()[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + mn()[d.getMonth()].slice(0, 3); } },
    { id: 'long', format: function (d) { return dn()[d.getDay()] + ' ' + d.getDate() + ' ' + mn()[d.getMonth()]; } },
    { id: 'dmy', format: function (d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); } },
    { id: 'mdy', format: function (d) { return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear(); } },
    { id: 'iso', format: function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); } },
    { id: 'none', format: function () { return ''; } }
  ];

  function formatDate(d, id) {
    for (var i = 0; i < DATE_FORMATS.length; i++) { if (DATE_FORMATS[i].id === id) { return DATE_FORMATS[i].format(d); } }
    return DATE_FORMATS[0].format(d);
  }

  function formatTime(d, id) {
    if (id === '24') { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    return (d.getHours() % 12 || 12) + ':' + pad(d.getMinutes()) + (d.getHours() < 12 ? ' am' : ' pm');
  }

  function tick() {
    var d = new Date(), dateEl = A.$('date');
    dateEl.textContent = formatDate(d, A.settings.dateFormat);
    dateEl.hidden = A.settings.dateFormat === 'none';
    A.$('time').textContent = formatTime(d, A.settings.timeFormat);
    A.$('time').hidden = A.settings.showTime===false;
  }

  A.clock = {
    DATE_FORMATS: DATE_FORMATS,
    formatDate: formatDate,
    formatTime: formatTime,
    tick: tick,
    start: function () { tick(); setInterval(tick, 10000); }
  };
})(window.AeroTizen);
