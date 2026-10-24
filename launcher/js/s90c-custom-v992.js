/* AeroTizen V9.9.2 — additional choices; reads native V9.9 weather cache. */
(function (A) {
  'use strict';
  var S=A.settings;
  var layer=document.getElementById('aero-weather-photo');
  var widget=document.getElementById('aero-v991-widget');
  if (!layer || !widget) { return; }
  var valid={sun:1,partly:1,cloud:1,rain:1,storm:1,snow:1,fog:1,night:1};
  var photos={sun:'sun',partly:'partly',cloud:'cloud',rain:'rain',storm:'storm',snow:'snow',fog:'fog',night:'night',sunset:'sunset'};
  var lastScene='';
  var originalBackground=A.applyBackground;
  var clockOptions=[['vertical','Verticale grande','16|32'],['horizontal','Orizzontale','16:32'],['minimal','Sottile','16|32'],['bold','Bold','16|32']];
  var modes=[['off','Nessuno'],['auto','Automatico']];
  function getWeather(){
    try {
      var w=JSON.parse(localStorage.getItem('aerotizen.weather.v2')||'null');
      var g=S.weatherLocation;
      var source=g&&g.name&&typeof g.latitude==='number'&&typeof g.longitude==='number'
        ? JSON.stringify([g.latitude,g.longitude,g.name,g.country_code]) : 'auto';
      var unit=S.tempUnit==='C'||S.tempUnit==='F'?S.tempUnit:'auto';
      if(!w||w.source!==source||w.unit!==unit||typeof w.at!=='number'||
         Date.now()<w.at||Date.now()-w.at>7200000){return null;}
      return w;
    }catch(e){return null;}
  }
  function mapCode(w){
    if(!w || w.code==null){return ''}
    var c=Number(w.code);
    // V992.7: il flag is_day di Open-Meteo vale per qualsiasi tipo di cielo.
    // Prima le nuvole, la pioggia, la neve ecc. impedivano il passaggio notturno.
    // Il meteo continua a mostrare la condizione reale nel widget; questo cambia solo la foto.
    if(w.day === 0 || w.day === '0') { return 'night'; }
    if(c===0||c===1){return 'sun'}
    if(c===2){return 'partly'}
    if(c===3){return 'cloud'}
    if(c===45||c===48){return 'fog'}
    if((c>=71&&c<=77)||c===85||c===86){return 'snow'}
    if(c>=95){return 'storm'}
    if(c>=51){return 'rain'}
    return w.day===0?'night':'cloud';
  }
  // V992.9 - Solar phase from the same Open-Meteo cache used by the clock.
  // The device can be in another time zone: compare UTC epoch milliseconds only.
  function solarPhase(w, now){
    if(!w || !Array.isArray(w.solar) || !w.solar.length || !w.at ||
       now - Number(w.at) > 36*3600000){return '';}
    var twilightBefore=45*60000, twilightAfter=20*60000;
    var hasValid=false, earliest=Infinity, latest=-Infinity;
    for(var i=0;i<w.solar.length;i++){
      var s=w.solar[i];
      if(!s){continue;}
      var rise=Number(s.sunrise), set=Number(s.sunset);
      if(!isFinite(rise)||!isFinite(set)||set<=rise){continue;}
      hasValid=true;
      if(rise < earliest){earliest=rise;}
      if(set > latest){latest=set;}
      if(now>=set-twilightBefore && now<set+twilightAfter){return 'sunset';}
      if(now>=rise-10*60000 && now<set-twilightBefore){return 'day';}
    }
    // Night between sunset and next sunrise, including just after midnight.
    if(hasValid && now>=earliest-18*3600000 && now<=latest+18*3600000){return 'night';}
    return '';
  }
  function automaticPhoto(w){
    if(!w || w.code==null){return '';}
    var phase=solarPhase(w,Date.now());
    var c=Number(w.code);
    if(phase==='night'){return 'night';}
    if(phase==='sunset' && (c===0 || c===1 || c===2)){return 'sunset';}
    // Solar times can advance to daytime before the cached is_day changes.
    if(phase==='day' || phase==='sunset'){
      if(c===0||c===1){return 'sun';}
      if(c===2){return 'partly';}
      if(c===3){return 'cloud';}
      if(c===45||c===48){return 'fog';}
      if((c>=71&&c<=77)||c===85||c===86){return 'snow';}
      if(c>=95){return 'storm';}
      if(c>=51){return 'rain';}
      return 'cloud';
    }
    return mapCode(w); // Offline/backward-compatible fallback to is_day.
  }
  // Foto statica: nessuna dissolvenza, preload, canvas o effetto a ogni frame.
  // La fotografia cambia solo quando cambia la scena meteo.
  function changePhoto(photo){
    if(!photos[photo]){return;}
    layer.style.backgroundImage='url("assets/weather/'+photos[photo]+'.jpg")';
    layer.className='active scene-'+photo;
    lastScene=photo;
  }
  function applyClock(){
    var t=S.aeroClockStyle||'vertical';
    if(!/^(vertical|horizontal|minimal|bold)$/.test(t)){t='vertical'}
    widget.classList.remove('style-horizontal','style-minimal','style-bold');
    if(t!=='vertical'){widget.classList.add('style-'+t)}
    /* Height differs only for horizontal mode. Restore TV home tile spacing. */
    document.body.classList.toggle('aero-clock-horizontal',t==='horizontal');
    document.body.classList.toggle('s90c-clock-classic',S.clockLayout==='classic');
  }
  function applyBackground(){
    var mode=S.aeroWeatherMode||'off';
    var photo=mode==='auto'?automaticPhoto(getWeather()):(valid[mode]?mode:'');
    if(mode==='off'){
      if(layer.classList.contains('active')){
        layer.className=''; layer.style.backgroundImage=''; lastScene=''; layer.dataset.suspended='';
        originalBackground();
      }
      return;
    }
    if(!photo){
      /* No trustworthy weather reading: keep last successfully used photo or original background. */
      if(!lastScene){ return; }
      photo=lastScene;
    }
    if(photo!==lastScene){
      /* No remote image requests. Every JPEG is packaged with AeroTizen. */
      changePhoto(photo);
    }
    if(window.Backgrounds){
      /* Suspend all original animated backgrounds while a photo is shown. */
      if(!layer.dataset.suspended){window.Backgrounds.apply('graphite');layer.dataset.suspended='1';}
    }
  }
  function choose(value,type){
    if(type==='clock'){S.aeroClockStyle=value;applyClock()}
    else if(type==='layout'){S.clockLayout=value;applyClock();if(A.clock&&A.clock.tick){A.clock.tick();}}
    else if(type==='wall'){S.aeroWeatherMode=value;applyBackground()}
    S.save();
    if(type==='wall' && window.Weather.updateVisibility){window.Weather.updateVisibility();}
    renderOptions();
    if(A.settingsUi && A.settingsUi.isOpen()) { A.settingsUi.focus(); }
  }
  function button(container,key,text,on,fn,cssClass){
    var b=document.createElement('div');b.className='pill unit '+(on?'on ':'')+(cssClass||'');
    b.dataset.key=key; b.textContent=text;b.onclick=fn; container.appendChild(b);return b;
  }
  function renderOptions(){
    var clock=document.getElementById('aero-clock-styles');
    var layout=document.getElementById('aero-clock-layouts');
    var wall=document.getElementById('aero-weather-modes');
    if(!clock||!layout||!wall){return}
    clock.textContent='';layout.textContent='';wall.textContent='';
    [['custom','Personalizzata','Ore e minuti grandi, meteo sotto'],
     ['classic','Classica AeroTizen','Meteo, data e ora in una riga']].forEach(function(opt){
      var b=button(layout,'aero-layout:'+opt[0],'',
        (S.clockLayout==='classic'?'classic':'custom')===opt[0],
        function(){choose(opt[0],'layout')},'aero-layout-choice');
      b.appendChild(document.createElement('strong')).textContent=opt[1];
      b.appendChild(document.createElement('small')).textContent=opt[2];
    });
    clockOptions.forEach(function(opt){
      var b=button(clock,'aero-clock:'+opt[0],'',S.aeroClockStyle===opt[0],function(){choose(opt[0],'clock')},'aero-clock-choice');
      var p=document.createElement('div');p.className='aero-clock-preview'+(opt[0]==='bold'?' bold':'');
      p.textContent=opt[2].replace('|','\n');p.style.whiteSpace='pre-line';
      b.appendChild(p); var l=document.createElement('small');l.textContent=opt[1];b.appendChild(l);
    });
    // V992.10: two choices only. Weather scenes are determined by Open-Meteo.
    modes.forEach(function(opt){
      var b=button(wall,'aero-wall:'+opt[0],'',S.aeroWeatherMode===opt[0],function(){choose(opt[0],'wall')},'aero-weather-choice');
      b.setAttribute('role','button');
      var emblem=document.createElement('span');
      emblem.className='aero-weather-choice-icon';
      emblem.innerHTML=opt[0]==='off'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 18.4 18.4"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1-6.4 2.6"/><path d="M5.6 2.6v5.1h5.1"/></svg>';
      var label=document.createElement('span');
      label.className='aero-weather-choice-label';label.textContent=opt[1];
      b.appendChild(emblem);b.appendChild(label);
    });
  }
  /* Existing settings renders update all sections; re-render our choices whenever settings open. */
  var origOpen=A.settingsUi.open;
  A.settingsUi.open=function(){origOpen();renderOptions();};
  /* When native background swatches change, leave photo settings unchanged: our control is explicit. */
  A.applyBackground=function(){
    if(S.aeroWeatherMode==='off'){
      // V992.5: togli la foto PRIMA di mostrare il colore/gradiente scelto.
      if(layer.classList.contains('active')){
        layer.className='';layer.style.backgroundImage='';
        layer.dataset.suspended='';lastScene='';
      }
      originalBackground();
      return;
    }
    originalBackground();
    layer.dataset.suspended='';
    applyBackground();
  };
  A.refreshWeatherOptions=renderOptions;
  A.applyClockLayout=applyClock;
  applyClock();
  applyBackground();
  renderOptions();
  var nativeWeather=document.getElementById('weather');
  if(nativeWeather&&window.MutationObserver){
    var obs=new MutationObserver(function(){ if(S.aeroWeatherMode==='auto'){applyBackground()} });
    obs.observe(nativeWeather,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});
  }
  setInterval(function(){if(!document.hidden&&S.aeroWeatherMode==='auto'){applyBackground()}},60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){applyClock();applyBackground()}});
})(window.AeroTizen);
