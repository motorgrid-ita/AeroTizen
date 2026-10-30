const {test,expect}=require('@playwright/test');const fs=require('node:fs');
for(const shape of ['square','rectangle'])for(const glass of [false,true])test(`complete original ${shape} images fill cards in ${glass?'Glass':'Classic'} without extra labels`,async({page},info)=>{
 await page.route('https://**/*',r=>r.fulfill({body:'{}'}));await page.route('http://127.0.0.1:47790/**',r=>r.fulfill({body:'{}'}));
 const profile=Object.fromEntries(['cinema','music','games'].map((name,i)=>['demo'+i,{[shape]:{src:'assets/artwork-local/'+name+'.png',width:shape==='square'?1024:1920,height:shape==='square'?1024:1080}}]));
 await page.route('**/js/artwork-profile.js',r=>r.fulfill({contentType:'application/javascript',body:'AeroTizen.artworkProfile='+JSON.stringify(profile)+';'}));
 for(const name of ['cinema','music','games'])await page.route('**/assets/artwork-local/'+name+'.png',r=>r.fulfill({contentType:'image/png',body:fs.readFileSync('docs/artwork/examples/'+name+'-'+shape+'.png')}));
 await page.addInitScript(({shape,glass})=>localStorage.setItem('aerotizen.settings.v1',JSON.stringify({home:['demo0','demo1','demo2'],background:'black',showWeather:false,homeCardMode:shape,homeCardColumns:3,artworkStyle:'studio',glassSettings:glass})),{shape,glass});
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.ready);
 const images=page.locator('#grid .studio-image');await expect(images).toHaveCount(3);
 for(const image of await images.all()){
  await expect(image).toBeVisible();await expect(image.locator('..')).toHaveAttribute('data-artwork-loaded','true');
  const g=await image.evaluate(n=>({width:n.clientWidth,height:n.clientHeight,parentWidth:n.parentElement.clientWidth,parentHeight:n.parentElement.clientHeight,fit:getComputedStyle(n).objectFit}));
  expect(g.width).toBe(g.parentWidth);expect(g.height).toBe(g.parentHeight);expect(g.fit).toBe('contain');
 }
 for(const label of await page.locator('#grid .studio-name').all())await expect(label).toBeHidden();
 await page.screenshot({path:info.outputPath(`full-${shape}-${glass?'glass':'classic'}.png`)});
 await page.keyboard.press('ArrowRight');await expect(page.locator('#grid [data-id="demo1"]')).toHaveClass(/focused/);
});
