// Original V992.56 weather-to-photo scene rules, adapted to upstream's
// existing Open-Meteo cache. Only static bundled JPEGs; no extra polling.
(function (A) {
  'use strict';
  var layer = document.getElementById('weather-photo');
  var scenes = { sun: 1, partly: 1, cloud: 1, fog: 1, rain: 1,
    snow: 1, storm: 1, night: 1, sunset: 1 };
  var currentScene = '', suspended = false, timer = null;

  function weatherCode(w) {
    if (!w || typeof w.code !== 'number') { return ''; }
    var c = w.code;
    if (w.day === 0 || w.day === '0') { return 'night'; }
    if (c === 0 || c === 1) { return 'sun'; }
    if (c === 2) { return 'partly'; }
    if (c === 3) { return 'cloud'; }
    if (c === 45 || c === 48) { return 'fog'; }
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) { return 'snow'; }
    if (c >= 95) { return 'storm'; }
    if (c >= 51) { return 'rain'; }
    return 'cloud';
  }

  // Ported from V992.56: UTC epoch time, 45 minutes before / 20 after sunset.
  function solarPhase(w, now) {
    if (!w || !Array.isArray(w.solar) || !w.solar.length ||
        typeof w.at !== 'number' || now - w.at > 36 * 3600000) { return ''; }
    var earliest = Infinity, latest = -Infinity;
    for (var i = 0; i < w.solar.length; i++) {
      var day = w.solar[i] || {};
      var rise = Number(day.sunrise), set = Number(day.sunset);
      if (!isFinite(rise) || !isFinite(set) || set <= rise) { continue; }
      if (rise < earliest) { earliest = rise; }
      if (set > latest) { latest = set; }
      if (now >= set - 45 * 60000 && now < set + 20 * 60000) { return 'sunset'; }
      if (now >= rise - 10 * 60000 && now < set - 45 * 60000) { return 'day'; }
    }
    if (earliest !== Infinity && now >= earliest - 18 * 3600000 &&
        now <= latest + 18 * 3600000) { return 'night'; }
    return '';
  }

  function autoScene(w, now) {
    if (!w || typeof w.code !== 'number') { return ''; }
    var phase = solarPhase(w, now), code = w.code;
    if (phase === 'night') { return 'night'; }
    if (phase === 'sunset' && code <= 2) { return 'sunset'; }
    if (phase === 'day' || phase === 'sunset') {
      return weatherCode({ code: code, day: 1 });
    }
    return weatherCode(w);
  }

  function hide() {
    if (!layer) { return; }
    layer.hidden = true;
    layer.className = 'weather-photo';
    layer.style.backgroundImage = '';
    currentScene = ''; suspended = false;
  }

  function update() {
    if (!layer || !A.settings || A.settings.photoWeather !== true ||
        document.body.classList.contains('tv')) {
      hide(); return false;
    }
    var w = window.Weather && window.Weather.currentReading &&
      window.Weather.currentReading();
    var choice = autoScene(w, Date.now()) || currentScene;
    if (!choice || !scenes[choice]) { return false; }
    if (choice !== currentScene) {
      layer.style.backgroundImage = 'url("assets/weather/' + choice + '.jpg")';
      currentScene = choice;
    }
    layer.hidden = false;
    layer.className = 'weather-photo active scene-' + currentScene;
    if (!suspended && window.Backgrounds) {
      // V992.56 switches to a static graphite background, stopping all
      // previous canvas/blob animations while a photograph is displayed.
      window.Backgrounds.apply('graphite');
      suspended = true;
    }
    return true;
  }

  function onForecast() {
    if (A.settings && A.settings.photoWeather === true && A.applyBackground) {
      A.applyBackground();
    }
  }

  function start() {
    if (timer !== null) { return; }
    timer = setInterval(function () {
      if (!document.hidden && A.settings && A.settings.photoWeather === true) {
        onForecast();
      }
    }, 60000); // solar-phase change only, no image frame loop
  }

  A.photoWeather = {
    weatherCode: weatherCode, solarPhase: solarPhase, autoScene: autoScene,
    update: update, hide: hide, start: start, onForecast: onForecast
  };
})(window.AeroTizen);
