const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const png=fs.readFileSync('tests/fixtures/artwork/neutral-square.png').toString('base64');
async function start(page,{denied=false,missing=false,shape='square',glass=false,many=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.fulfill({body:'{}'}));
 await page.route('http://127.0.0.1:47790/**',r=>r.fulfill({body:'{}'}));
 await page.addInitScript(({png,denied,missing,shape,glass,many})=>{
  if(!localStorage.getItem('aerotizen.settings.v1'))localStorage.setItem('aerotizen.settings.v1',JSON.stringify({home:['demo0','demo1'],background:'black',showWeather:false,homeCardMode:shape,glassSettings:glass}));
  const data=JSON.parse(localStorage.getItem('mock.artwork.files')||'{}');
  const files={'wgt-private':null,'removable_sda1':null,'removable_sda1/Art':null,'removable_sda1/Art/Cinema.png':png,...data};let mounted=!missing,listener;
  if(many)for(let i=0;i<40;i++)files['removable_sda1/Art/Image-'+String(i).padStart(2,'0')+'.png']=png;
  const persist=()=>localStorage.setItem('mock.artwork.files',JSON.stringify(Object.fromEntries(Object.entries(files).filter(([key])=>key.startsWith('wgt-private/')))));
  const file=(path,mode)=>{
   if(!(path in files))throw {name:'NotFoundError'};
   return {name:path.split('/').pop(),fullPath:path,isDirectory:files[path]===null,isFile:files[path]!==null,
    get fileSize(){return files[path]===null?undefined:atob(files[path]).length;},toURI:()=> 'file:///mock/'+path,
    resolve:name=>file(path+'/'+name,mode),createDirectory(name){if(mode!=='rw')throw {name:'SecurityError'};files[path+'/'+name]=null;persist();return file(path+'/'+name,mode);},
    createFile(name){if(mode!=='rw')throw {name:'SecurityError'};files[path+'/'+name]='';persist();return file(path+'/'+name,mode);},
    listFiles(done){done(Object.keys(files).filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(p=>file(p,mode)));},
    deleteFile(name,done){delete files[name];persist();done?.();},
    openStream(access,done){done({close(){},readBytes:n=>[...atob(files[path]).slice(0,n)].map(c=>c.charCodeAt(0)),readBase64:()=>files[path],writeBase64(value){if(mode!=='rw')throw {name:'SecurityError'};files[path]=value;persist();}});}
   };
  };
  window.tizen={filesystem:{resolve(path,done,failed,mode){try{if(denied||path.startsWith('removable_')&&!mounted)throw {name:denied?'SecurityError':'NotFoundError'};done(file(path,mode));}catch(e){failed(e);}},
   listStorages(done,failed){if(denied)return failed({name:'SecurityError'});done(mounted?[{label:'removable_sda1',type:'EXTERNAL',state:'MOUNTED'}]:[]);},
   addStorageStateChangeListener(changed){listener=changed;return 1;},removeStorageStateChangeListener(){listener=undefined;}
  }};
  window.removeMockUsb=()=>{mounted=false;listener?.({label:'removable_sda1',state:'REMOVED'});};
 },{png,denied,missing,shape,glass,many});
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.ready);return errors;
}
async function open(page,all=false){
 if(all){await page.locator('#apps-tab').click();await page.keyboard.press('ArrowDown');}
 await page.keyboard.down('Enter');await expect(page.getByRole('menu')).toBeVisible();await page.keyboard.up('Enter');
 await page.getByRole('menuitem').filter({hasText:'Custom artwork'}).click();await expect(page.getByRole('dialog')).toBeVisible();
}
async function preview(page,shape='Square'){
 await page.getByRole('button',{name:'Choose '+shape+' from USB',exact:true}).click();
 await page.getByRole('button',{name:'▸ removable_sda1',exact:true}).click();
 await page.getByRole('button',{name:'▸ Art',exact:true}).click();
 await page.getByRole('button',{name:'Cinema.png',exact:true}).click();
 await expect(page.getByAltText('Selected artwork preview')).toBeVisible();
}
test('Home imports a previewed Square only on confirmation and restores selection after close',async({page},info)=>{
 const errors=await start(page);await open(page);await preview(page);
 expect(await page.evaluate(()=>localStorage.getItem('aerotizen.artwork.usb.v1'))).toBeNull();
 await page.screenshot({path:info.outputPath('usb-square-preview.png')});
 await page.getByRole('button',{name:'Use this image',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('#grid [data-id="demo0"]')).toHaveClass(/focused/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')));expect(saved.images.demo0.square.width).toBe(1024);expect(saved.images.demo0.rectangle).toBeUndefined();
 await page.evaluate(()=>removeMockUsb());await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).images.demo0.square)).toEqual(saved.images.demo0.square);
 expect(errors).toEqual([]);
});
test('All Apps supports independent Rectangle import, per-shape reset and remote Back',async({page})=>{
 const errors=await start(page,{shape:'rectangle'});await open(page,true);await preview(page,'Rectangle');
 await page.getByRole('button',{name:'Use this image',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const id=await page.locator('#grid>.focused').getAttribute('data-id');expect(id).toBe('demo8');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).images.demo8.rectangle.width)).toBe(720);
 await open(page);await page.getByRole('button',{name:'Reset Rectangle to Samsung',exact:true}).click();await expect(page.getByRole('status')).toContainText('Rectangle restored');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#grid [data-id="demo8"]')).toHaveClass(/focused/);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).disabled)).toContain('demo8:rectangle');expect(errors).toEqual([]);
});
test('cancelled preview writes nothing; removed USB clears the browser and permits Back',async({page})=>{
 await start(page);await open(page);await preview(page);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(()=>localStorage.getItem('aerotizen.artwork.usb.v1'))).toBeNull();
 await open(page);await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'▸ removable_sda1',exact:true})).toBeVisible();
 await page.evaluate(()=>removeMockUsb());await expect(page.getByRole('status')).toContainText('USB storage changed');
 await page.getByRole('button',{name:'Refresh USB',exact:true}).click();await expect(page.getByRole('status')).toContainText('No PNG images');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
for(const denied of [false,true])test(`USB ${denied?'permission denial':'absence'} is recoverable without preference writes`,async({page})=>{
 const errors=await start(page,{denied,missing:!denied});await open(page);await page.keyboard.press('Enter');
 await expect(page.getByRole('status')).toContainText(denied?'denied':'No PNG');
 await page.keyboard.press('Escape');if(!denied)await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('aerotizen.artwork.usb.v1'))).toBeNull();expect(errors).toEqual([]);
});
test('dialog D-pad focus is bounded and native launch keys cannot leak into Home',async({page})=>{
 await start(page);await open(page);
 for(let i=0;i<12;i++)await page.keyboard.press('ArrowDown');
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();
 await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:'Reset Square to Samsung',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#grid [data-id="demo0"]')).toHaveClass(/focused/);
});

test('cached inventory cannot authorize USB import before installed-app discovery completes',async({page})=>{
 await start(page);
 await page.evaluate(()=>{AeroTizen.apps.ready=false;AeroTizen.homeScreen.refreshApps();});
 await page.keyboard.down('Enter');await expect(page.getByRole('menu')).toBeVisible();await page.keyboard.up('Enter');
 await expect(page.getByRole('menuitem').filter({hasText:'Custom artwork'})).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{AeroTizen.apps.ready=true;AeroTizen.homeScreen.refreshApps();});
 await open(page);
 await page.evaluate(()=>{AeroTizen.apps.ready=false;AeroTizen.homeScreen.refreshApps();});
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('aerotizen.artwork.usb.v1'))).toBeNull();
});

for(const shape of ['square','rectangle'])for(const glass of [false,true])test(`only ${shape} actions in ${glass?'Glass':'Classic'}; full dialog scrolls on a short screen`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 const errors=await start(page,{shape,glass,many:true});await open(page);
 const label=shape==='square'?'Square':'Rectangle',other=shape==='square'?'Rectangle':'Square';
 await expect(page.getByRole('button',{name:'Choose '+label+' from USB',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Choose '+other+' from USB',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Reset '+other+' to Samsung',exact:true})).toHaveCount(0);
 await preview(page,label);
 for(let i=0;i<4;i++)await page.keyboard.press('ArrowDown');
 await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
 const inside=()=>page.evaluate(()=>{const a=document.activeElement.getBoundingClientRect(),b=document.querySelector('.artwork-dialog').getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom&&b.top>=0&&b.bottom<=innerHeight;});
 expect(await inside()).toBe(true);
 await page.keyboard.press('Escape');
 for(let i=0;i<50;i++)await page.keyboard.press('ArrowDown');
 await expect(page.getByRole('button',{name:'Image-39.png',exact:true})).toBeFocused();
 expect(await inside()).toBe(true);
 expect(await page.locator('.artwork-dialog').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 for(let i=0;i<50;i++)await page.keyboard.press('ArrowUp');
 await expect(page.getByRole('button',{name:'Up one folder',exact:true})).toBeFocused();
 expect(await inside()).toBe(true);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await expect(page.locator('#grid [data-id="demo0"]')).toHaveClass(/focused/);
 expect(errors).toEqual([]);
});

test('changing card layout preserves the other imported shape and reset remains shape-specific',async({page})=>{
 await start(page);await open(page);await preview(page);
 await page.getByRole('button',{name:'Use this image',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const square=await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).images.demo0.square);
 await page.evaluate(()=>{const settings=JSON.parse(localStorage.getItem('aerotizen.settings.v1'));settings.homeCardMode='rectangle';localStorage.setItem('aerotizen.settings.v1',JSON.stringify(settings));});
 await page.reload();await page.waitForFunction(()=>AeroTizen.apps.ready);
 await open(page);await preview(page,'Rectangle');
 await page.getByRole('button',{name:'Use this image',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).images.demo0.square)).toEqual(square);
 await open(page);await page.getByRole('button',{name:'Reset Rectangle to Samsung',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Rectangle restored');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).images.demo0.square)).toEqual(square);
 await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>AeroTizen.apps.ready);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aerotizen.artwork.usb.v1')).disabled)).toContain('demo0:rectangle');
});
