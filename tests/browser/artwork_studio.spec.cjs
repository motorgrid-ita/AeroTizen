const {test,expect}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');
const png=fs.readFileSync(path.join(__dirname,'../fixtures/artwork/neutral-square.png'));
async function start(page,profile={}){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',r=>r.fulfill({body:'{}'}));
 await page.route('http://127.0.0.1:47790/**',r=>r.fulfill({body:'{}'}));
 await page.route('**/js/artwork-profile.js',r=>r.fulfill({contentType:'application/javascript',body:'window.AeroTizen.artworkProfile='+JSON.stringify(profile)+';'}));
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.ready);
 return errors;
}
async function appearance(page){await page.locator('#gear').click();await page.locator('[data-key="section:appearance"]').click();}
async function close(page){await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('#apps-tab').click();}
async function focusApp(page,id){
 await page.locator('#apps-tab').click();await page.keyboard.press('ArrowDown');
 const geometry=await page.locator('#grid > .app-tile').evaluateAll(nodes=>({ids:nodes.map(n=>n.dataset.id),columns:nodes.filter(n=>n.offsetTop===nodes[0].offsetTop).length}));
 const index=geometry.ids.indexOf(id);expect(index).toBeGreaterThanOrEqual(0);
 for(let row=0;row<Math.floor(index/geometry.columns);row++)await page.keyboard.press('ArrowDown');
 for(let column=0;column<index%geometry.columns;column++)await page.keyboard.press('ArrowRight');
 await expect(page.locator(`#grid [data-id="${id}"]`)).toHaveClass(/focused/);
}
for(const mode of ['square','rectangle'])for(const columns of [3,4,5])test(`Studio ${mode}/${columns} keeps focus, proportions and theme-independent identity`,async({page},info)=>{
 const errors=await start(page);await appearance(page);
 await page.locator('[data-key="artwork-style:studio"]').click();
 await page.locator(`[data-key="home-card-mode:${mode}"]`).click();
 await page.locator(`[data-key="home-card-columns:${columns}"]`).click();await close(page);
 const first=page.locator('#grid>.app-tile').first();await expect(first.locator('.studio-surface')).toBeVisible();
 await page.keyboard.press('ArrowDown');await expect(first).toHaveClass(/focused/);
 const stable=await first.locator('.studio-surface').evaluate(n=>{n.dataset.identity='retained';return n.dataset.identity;});
 await page.locator('#home-tab').click();await page.locator('#apps-tab').click();expect(await first.locator('.studio-surface').getAttribute('data-identity')).toBe(stable);
 await appearance(page);await page.locator('[data-key="settings-appearance:true"]').click();await close(page);
 await expect(page.locator('body')).toHaveClass(/glass-ui/);await expect(first.locator('.studio-surface')).toBeVisible();
 await page.screenshot({path:info.outputPath(`studio-${mode}-${columns}.png`)});
 await page.reload();expect(await page.evaluate(()=>AeroTizen.settings.artworkStyle)).toBe('studio');expect(errors).toEqual([]);
});
test('local exact-ID override, failed image fallback and reversible selection survive reload',async({page})=>{
 const profile={'demo0':{square:{src:'assets/artwork-local/test.png',width:1024,height:1024}}};
 await page.route('**/assets/artwork-local/test.png',r=>r.fulfill({contentType:'image/png',body:png}));
 const errors=await start(page,profile);await appearance(page);await page.locator('[data-key="artwork-style:studio"]').click();await close(page);
 // Match the installed app ID: display names cannot select another app's file.
 const app=page.locator('#grid [data-id="demo0"]');
 await expect(app).toHaveCount(1); {
  await focusApp(page,'demo0');
  await expect(app.locator('.studio-surface')).toHaveAttribute('data-artwork-origin','local');
  expect(await app.locator('.studio-image').evaluate(n=>n.naturalWidth)).toBe(1024);
  expect(await app.locator('.studio-image').evaluate(n=>getComputedStyle(n).objectFit)).toBe('contain');
  await appearance(page);await page.locator('[data-key="artwork-override:demo0:false"]').click();await close(page);
  await expect(app.locator('.studio-image')).toHaveCount(0);
 }
 await appearance(page);await page.locator('[data-key="artwork-style:native"]').click();await close(page);
 await expect(page.locator('#grid .studio-surface')).toHaveCount(0);expect(errors).toEqual([]);
});

test('broken local images settle to generic cards without a timer loop or focus loss',async({page})=>{
 let requests=0;await page.route('**/assets/artwork-local/broken.png',r=>{requests++;return r.abort();});
 await start(page,{demo0:{square:{src:'assets/artwork-local/broken.png',width:1024,height:1024}},notInstalled:{square:{src:'assets/artwork-local/unused.png',width:1024,height:1024}}});
 await appearance(page);await page.locator('[data-key="artwork-style:studio"]').click();await close(page);
 const app=page.locator('#grid [data-id="demo0"]');await focusApp(page,'demo0');await expect(app.locator('.studio-surface')).toHaveAttribute('data-artwork-origin','generic');
 expect(requests).toBeGreaterThan(0);const settled=requests;
 await page.locator('#home-tab').click();await page.locator('#apps-tab').click();
 // Reopening may retry a failed sequence once; it must never request an uninstalled app.
 expect(requests).toBeLessThanOrEqual(settled+2);
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('unused.png')))).toBe(false);
 await page.keyboard.press('ArrowDown');await expect(page.locator('#grid > .focused')).toHaveCount(1);
});

test('reviewed-package logo omission keeps generic names, Settings and app launching usable',async({page})=>{
 await page.route('**/js/logos.js',r=>r.fulfill({contentType:'application/javascript',body:'/* omitted by reviewed packaging */'}));
 const errors=await start(page);await page.locator('#apps-tab').click();
 await expect(page.locator('#grid .app-fallback .name')).toHaveCount(25);
 await appearance(page);await page.locator('[data-key="artwork-style:studio"]').click();await close(page);
 await focusApp(page,'demo0');await page.keyboard.press('Enter');await expect(page.locator('#toast')).toContainText('Would open YouTube');
 expect(errors).toEqual([]);
});
