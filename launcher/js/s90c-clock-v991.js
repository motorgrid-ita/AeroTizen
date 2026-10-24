/* AeroTizen S90C V9.9.1: grande clock verticale, data e meteo Open-Meteo V9.9. */
(function () {
  'use strict';
  var w = document.getElementById('aero-v991-widget');
  if (!w) { return; }
  var hours = document.getElementById('aero-v991-hours');
  var minutes = document.getElementById('aero-v991-minutes');
  var date = document.getElementById('aero-v991-date');
  var icon = document.getElementById('aero-v991-weather-icon');
  var temp = document.getElementById('aero-v991-temp');
  var condition = document.getElementById('aero-v991-condition');
  var city = document.getElementById('aero-v991-city');
  var weatherOrigin = document.getElementById('weather');
  var dnames = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  var mnames = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  function tr(s) { var A=window.AeroTizen; return A && A.i18n ? A.i18n.t(s) : s; }
  function p2(n) { return n < 10 ? '0' + n : String(n); }
  /* V992.1: usa i formati della V992 invece del formato fisso V991. */
  function tick() {
    var now = new Date();
    var A = window.AeroTizen;
    var prefs = A && A.settings;
    var clock = A && A.clock;
    var timeFormat = prefs && prefs.timeFormat === '12' ? '12' : '24';
    var dateFormat = prefs && prefs.dateFormat || 'long';
    var time = clock && clock.formatTime ? clock.formatTime(now, timeFormat) :
      (p2(now.getHours()) + ':' + p2(now.getMinutes()));
    var match = /^([0-9]{1,2}):([0-9]{2})(?:\s*(am|pm))?$/i.exec(time);
    var hh = match ? match[1] : p2(now.getHours());
    var mm = match ? match[2] : p2(now.getMinutes());
    var meridiem = match && match[3] ? match[3].toUpperCase() : '';
    hours.textContent = hh;
    minutes.textContent = mm;
    if (meridiem) {
      /* Piccolo indicatore AM/PM: non cambia gli stili preesistenti. */
      var marker = document.createElement('span');
      marker.textContent = ' ' + meridiem;
      marker.style.cssText = 'display:inline-block;font-size:.20em;line-height:1;'
        + 'letter-spacing:0;margin-left:4px;font-weight:400;vertical-align:baseline;';
      minutes.appendChild(marker);
    }
    var formattedDate = clock && clock.formatDate ? clock.formatDate(now, dateFormat) :
      (dnames[now.getDay()] + ' ' + now.getDate() + ' ' + mnames[now.getMonth()]);
    date.textContent = formattedDate;
    date.style.display = formattedDate ? '' : 'none';
  }
  function describe(c) {
    if (c === 0) { return 'Sereno'; }
    if (c === 1) { return 'Prevalentemente sereno'; }
    if (c === 2) { return 'Parzialmente nuvoloso'; }
    if (c === 3) { return 'Nuvoloso'; }
    if (c === 45 || c === 48) { return 'Nebbia'; }
    if (c >= 51 && c <= 57) { return 'Pioviggine'; }
    if (c >= 61 && c <= 67) { return 'Pioggia'; }
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) { return 'Neve'; }
    if (c >= 80 && c <= 82) { return 'Rovesci'; }
    if (c >= 95 && c <= 99) { return 'Temporale'; }
    return 'Meteo';
  }
  function refreshWeather() {
    var value = null;
    try { value = JSON.parse(localStorage.getItem('aerotizen.weather.v2') || 'null'); } catch (e) {}
    var S = window.AeroTizen && window.AeroTizen.settings || {};
    var g = S.weatherLocation;
    var source = g && g.name && typeof g.latitude === 'number' && typeof g.longitude === 'number'
      ? JSON.stringify([g.latitude, g.longitude, g.name, g.country_code]) : 'auto';
    var unit = S.tempUnit === 'C' || S.tempUnit === 'F' ? S.tempUnit : 'auto';
    if (!value || value.source !== source || value.unit !== unit ||
        typeof value.at !== 'number' || Date.now() - value.at > 7200000 || Date.now() < value.at) {
      value = null;
    }
    if (!value || !isFinite(Number(value.temp))) {
      temp.textContent = '--°';
      condition.textContent = tr('Meteo non disponibile');
      city.textContent = '';
      icon.textContent = '';
      return;
    }
    temp.textContent = Math.round(Number(value.temp)) + '°';
    condition.textContent = tr(describe(Number(value.code)));
    var oldIcon = weatherOrigin && weatherOrigin.querySelector('svg');
    icon.textContent = '';
    if (oldIcon) { icon.appendChild(oldIcon.cloneNode(true)); }
    city.textContent = S.weatherShowLocation === false ? '' : String(value.city || '');
    if (typeof value.at === 'number' && Date.now() - value.at > 2 * 60 * 60 * 1000) {
      city.textContent += (city.textContent ? ' · ' : '') + tr('Ultimi dati disponibili');
    }
  }
  /* Quando il menu salva un nuovo formato, aggiorna SUBITO il widget grande. */
  var clockEngine = window.AeroTizen && window.AeroTizen.clock;
  if (clockEngine && typeof clockEngine.tick === 'function') {
    var nativeTick = clockEngine.tick;
    clockEngine.tick = function () { nativeTick(); tick(); };
  }
  tick(); refreshWeather();
  /* Stessi eventi della V9.9: niente richieste HTTP aggiuntive. */
  if (weatherOrigin && window.MutationObserver) {
    var observer = new MutationObserver(function () { refreshWeather(); });
    observer.observe(weatherOrigin, { childList: true, subtree: true, attributes: true, attributeFilter:['hidden'] });
  }
  setInterval(function () { tick(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); refreshWeather(); } });
})();
