const {test,expect}=require('@playwright/test');
const errors=new WeakMap();
test.beforeEach(async({page})=>{
  errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));
  await page.route('https://**/*',r=>r.fulfill({body:'{}'}));
  await page.route('http://127.0.0.1:47790/**',r=>r.fulfill({body:'{}'}));
  await page.addInitScript(()=>localStorage.setItem('aerotizen.settings.v1',JSON.stringify({background:'black',showWeather:false,glassSettings:true,clockLayout:'classic',hideDisconnectedHdmi:true,hdmiKeepVisible:{'2':true},home:['demo0','demo1']})));
});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));

test('Glass clock controls become immediately reachable by D-pad when the layout changes',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.ready);
  await page.locator('#gear').click();
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
  await expect(page.locator('#editor .focused')).toHaveAttribute('data-key','section:status');
  await page.keyboard.press('ArrowRight');
  await page.locator('[data-key="clock-layouts:custom"]').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#editor .focused')).toHaveAttribute('data-key',/^clock-styles:/);
  await page.locator('[data-key="clock-layouts:classic"]').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#editor .focused')).toHaveAttribute('data-key',/^time:/);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await expect(page.locator('#editor')).toBeHidden();
});

test('the dock distinguishes manual visibility and Samsung recognition from a real HDMI signal',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>AeroTizen.inputs.sources.length===4);
  const pinned=page.locator('#inputs .tile').filter({hasText:'HDMI 2'});
  await expect(pinned).toHaveClass(/aero-source-forced/);
  await expect(pinned).not.toHaveClass(/\boff\b/);
  await expect(pinned.locator('.aero-source-status')).toHaveText('PINNED');
  const known=page.getByRole('button',{name:'PC',exact:true});
  await expect(known.locator('.aero-source-status')).toHaveText('RECOGNISED');
  expect(await page.evaluate(()=>AeroTizen.inputs.sources.filter(s=>s.number===2&&s.type==='HDMI')[0].connected)).toBe(false);
  await page.locator('#gear').click();await page.locator('[data-key="section:sources"]').click();
  await page.locator('[data-key="hdmi-keep:2:false"]').click();
  await expect(page.locator('#inputs .aero-source-forced')).toHaveCount(0);
});
