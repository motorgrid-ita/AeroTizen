/* S90C V992.31: upstream #21 behaviour for V991 custom widget. */
(function(A){'use strict';
  function update(){
    var s=A.settings||{},b=document.body;
    b.classList.toggle('s90c-hide-time',s.showTime===false);
    b.classList.toggle('s90c-hide-weather',s.showWeather===false);
    b.classList.toggle('s90c-hide-network',s.showNetwork===false);
    if(A.network&&A.network.updateVisibility){A.network.updateVisibility();}
  }
  A.s90cHeaderVisibility={update:update};
  update();
})(window.AeroTizen);
