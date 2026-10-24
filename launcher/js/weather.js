// Open-Meteo aggiornato: posizione salvata e cache v2 del Main ufficiale.
// Aggiunge alba/tramonto UTC soltanto per gli sfondi cinematici della V992.21.
window.Weather = (function () {
  'use strict';
  var CACHE='aerotizen.weather.v2', REFRESH=20*60*1000, MAX_AGE=2*60*60*1000;
  var reading=null, version=0, timer=null, automaticRequests=[], settingsOf=function(){return {};};
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4.5" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g>',
    partly: '<circle cx="9" cy="9" r="3.6" fill="#ffd34d"/><path fill="#e8ecf2" d="M8 19h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 19z"/>',
    cloud: '<path fill="#d5dbe4" d="M7 19h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 19z"/>',
    fog: '<g stroke="#c9cfd8" stroke-width="2" stroke-linecap="round"><path d="M4 9h16M6 13h12M4 17h16"/></g>',
    rain: '<path fill="#d5dbe4" d="M7 15h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3 3 0 0 0 7 15z"/><g stroke="#6cb6ff" stroke-width="1.8" stroke-linecap="round"><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></g>',
    snow: '<path fill="#d5dbe4" d="M7 15h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 15z"/><g fill="#fff"><circle cx="8" cy="19" r="1.2"/><circle cx="12" cy="20.5" r="1.2"/><circle cx="16" cy="19" r="1.2"/></g>',
    storm: '<path fill="#b9c0cc" d="M7 14h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 14z"/><path fill="#ffd34d" d="M12.5 13l-3 5h2.5l-1.5 4.5 4.5-6h-2.6l1.6-3.5z"/>'
  };
  function icon(code){
    if(code===0||code===1){return ICONS.sun;}
    if(code===2){return ICONS.partly;}
    if(code===3){return ICONS.cloud;}
    if(code===45||code===48){return ICONS.fog;}
    if((code>=71&&code<=77)||code===85||code===86){return ICONS.snow;}
    if(code>=95){return ICONS.storm;}
    if(code>=51){return ICONS.rain;}
    return ICONS.cloud;
  }
  function numeric(x){return typeof x==='number'&&isFinite(x);}
  function validGeo(g){return g&&!g.error&&numeric(g.latitude)&&Math.abs(g.latitude)<=90&&numeric(g.longitude)&&Math.abs(g.longitude)<=180;}
  function getJSON(url,cb,automatic){
    var x=new XMLHttpRequest(),finished=false;
    function cancel(){if(finished){return;}finished=true;forget();try{x.abort();}catch(e){}}
    function forget(){var at=automaticRequests.indexOf(cancel);if(at>=0){automaticRequests.splice(at,1);}}
    function done(data){if(finished){return;}finished=true;forget();cb(data);}
    x.onload=function(){var data=null;try{if(x.status===200){data=JSON.parse(x.responseText);}}catch(e){}done(data);};
    x.onerror=x.ontimeout=x.onabort=function(){done(null);};
    if(automatic){automaticRequests.push(cancel);}
    try{x.open('GET',url);x.timeout=8000;x.send();}catch(e){done(null);}
  }
  function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
  function cancelAutomatic(){version++;automaticRequests.slice().forEach(function(cancel){cancel();});}
  function needsWeather(){var s=settingsOf();return s.showWeather!==false || s.aeroWeatherMode==='auto';}

  function options(){
    var s=settingsOf(),geo=s.weatherLocation;
    if(!validGeo(geo)||typeof geo.name!=='string'||!geo.name.trim()){geo=null;}
    return {unit:s.tempUnit==='C'||s.tempUnit==='F'?s.tempUnit:'auto',geo:geo,
      source:geo?JSON.stringify([geo.latitude,geo.longitude,geo.name,geo.country_code]):'auto',
      showLocation:s.weatherShowLocation!==false, visible:s.showWeather!==false};
  }
  function valid(w,o){return w&&numeric(w.temp)&&numeric(w.code)&&numeric(w.at)&&
    w.unit===o.unit&&w.source===o.source&&Date.now()>=w.at&&Date.now()-w.at<=MAX_AGE;}
  function render(){
    var el=document.getElementById('weather'),o=options();if(!el){return;}
    if(!valid(reading,o)){el.textContent='';el.hidden=true;return;}
    el.innerHTML='<svg viewBox="0 0 24 24">'+icon(reading.code)+'</svg><b></b>'+(o.showLocation?'<span></span>':'');
    el.querySelector('b').textContent=Math.round(reading.temp)+'°';
    if(o.showLocation){el.querySelector('span').textContent=reading.city||'';}
    el.hidden=!o.visible;
  }
  // Open-Meteo daily timestamps are requested in UTC so Date.parse is unambiguous.
  function solarTimes(d){
    var a=[],i;
    if(!d||!Array.isArray(d.sunrise)||!Array.isArray(d.sunset)){return a;}
    for(i=0;i<Math.min(d.sunrise.length,d.sunset.length);i++){
      var rise=Date.parse(String(d.sunrise[i])+'Z'),set=Date.parse(String(d.sunset[i])+'Z');
      if(isFinite(rise)&&isFinite(set)&&set>rise){a.push({sunrise:rise,sunset:set});}
    }
    return a;
  }
  function refresh(){
    cancelAutomatic();
    var serial=version,o=options();render();
    if(!needsWeather()){stopTimer();return;}
    function current(){var n=options();return needsWeather()&&serial===version&&n.source===o.source&&n.unit===o.unit;}
    function forecast(geo){
      if(!current()||!validGeo(geo)){return;}
      var fahrenheit=o.unit==='F'||(o.unit==='auto'&&/^(US|LR|MM)$/.test(geo.country_code||''));
      var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(geo.latitude)+
        '&longitude='+encodeURIComponent(geo.longitude)+
        '&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=UTC&forecast_days=2'+
        (fahrenheit?'&temperature_unit=fahrenheit':'');
      getJSON(url,function(m){
        if(!current()||!m||m.error||!m.current||!numeric(m.current.temperature_2m)||!numeric(m.current.weather_code)){return;}
        reading={temp:m.current.temperature_2m,code:m.current.weather_code,city:geo.name||geo.city||'',
          unit:o.unit,source:o.source,at:Date.now(),day:m.current.is_day,solar:solarTimes(m.daily)};
        try{localStorage.setItem(CACHE,JSON.stringify(reading));}catch(e){}
        render();
      },true);
    }
    if(o.geo){forecast(o.geo);}else{getJSON('https://ipapi.co/json/',forecast,true);}
  }
  function searchLocations(query,cb){
    query=String(query||'').trim();if(query.length<2){cb([]);return;}
    getJSON('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query)+
      '&count=5&language='+(window.AeroTizen && AeroTizen.i18n ? AeroTizen.i18n.language : 'it')+'&format=json',function(data){
        if(!data||data.error||(data.results&&!Array.isArray(data.results))){cb(null);return;}
        cb((data.results||[]).filter(function(g){return validGeo(g)&&typeof g.name==='string'&&g.name.trim();})
          .map(function(g){
            var parts=[g.name];[g.admin2,g.admin1,g.country].forEach(function(x){if(x&&parts.indexOf(x)<0){parts.push(x);}});
            return {name:g.name,label:parts.join(', '),latitude:g.latitude,longitude:g.longitude,
              country_code:g.country_code||''};
          }));
      });
  }
  function updateVisibility(){
    if(!needsWeather()){stopTimer();cancelAutomatic();}
    render();
    if(needsWeather() && timer===null){
      if(!valid(reading,options()) || reading.unit!==options().unit || Date.now()-reading.at>=REFRESH){refresh();}
      timer=setInterval(refresh,REFRESH);
    }
  }
  function start(getter){
    stopTimer();cancelAutomatic();
    if(getter){settingsOf=getter;}
    try{reading=JSON.parse(localStorage.getItem(CACHE));}catch(e){reading=null;}
    updateVisibility();
  }
  return {start:start,refresh:refresh,updateVisibility:updateVisibility,updateDisplay:render,searchLocations:searchLocations};
})();
