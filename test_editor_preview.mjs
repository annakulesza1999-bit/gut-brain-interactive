import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8765/editor-preview.html',out='preview-test-output';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function enabled(locator){for(let i=0;i<120;i++){if(await locator.isEnabled().catch(()=>false))return;await delay(250);}throw Error('Control never enabled: '+locator);}
test('actual local editor: no network session, save/reload, media, backup, import, anatomy', {timeout:180000}, async t=>{
 await mkdir(out,{recursive:true});
 const server=spawn('python3',['dist-preview/open-preview.py'],{env:{...process.env,GM_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());let log='';server.stderr.on('data',d=>log+=d);
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,log);
 assert.equal((await fetch(new URL('/api/info',url))).status,404);
 assert.equal((await fetch(new URL('/socket.io/',url))).status,404);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 const page=await context.newPage(),errors=[],external=[],sessionRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{const u=new URL(req.url());if(u.origin!==new URL(url).origin&&!['data:','blob:'].includes(u.protocol))external.push(req.url());if(u.pathname.startsWith('/socket.io')||u.pathname.startsWith('/api/'))sessionRequests.push(req.url());});
 try{
  await page.goto(url);await page.getByRole('heading',{name:'My presentations'}).waitFor();
  await enabled(page.getByRole('button',{name:'Open a practice presentation'}));await page.screenshot({path:out+'/01-library.png'});
  await page.getByRole('button',{name:'Open a practice presentation'}).click();
  const prompt=page.getByPlaceholder('Type your question or prompt here...');
  await prompt.waitFor();await prompt.fill('Preflight example: gut and mind');
  await page.getByLabel('Slide content (one revealable point per line)').fill('First example line\nSecond example line');
  await page.getByRole('button',{name:'+ Draw a curve',exact:true}).click();
  await prompt.fill('Draw a test curve');await page.getByLabel('Countdown mode').selectOption('custom');await page.getByLabel('Seconds (1–3600)').fill('45');
  await page.screenshot({path:out+'/02-curve-editor.png'});
  await page.getByRole('button',{name:'+ Point map',exact:true}).click();
  await prompt.fill('Test anatomy image');
  // A small 1x1 PNG is sufficient to check upload and round-trip persistence.
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/gif,image/webp"]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR9sAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Use body silhouette'}).waitFor();
  await page.getByRole('button',{name:'Save & Close'}).click();
  await page.getByRole('heading',{name:'Presentation slide editor'}).waitFor({state:'hidden'});
  await page.getByLabel('Presentation title').fill('Preflight saved deck');
  await page.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await page.reload();await page.getByLabel('Presentation title').waitFor();
  assert.equal(await page.getByLabel('Presentation title').inputValue(),'Preflight saved deck');
  await page.getByRole('button',{name:'Edit slides'}).click();
  assert.equal(await prompt.inputValue(),'Preflight example: gut and mind');
  await page.getByText('Draw a test curve',{exact:true}).first().click();assert.equal(await page.getByLabel('Seconds (1–3600)').inputValue(),'45');
  await page.getByText('Test anatomy image',{exact:true}).first().click();await page.getByRole('button',{name:'Use body silhouette'}).waitFor();
  await page.getByRole('button',{name:'Save & Close'}).click();await page.getByRole('heading',{name:'Presentation slide editor'}).waitFor({state:'hidden'});
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Backup',exact:true}).click();const download=await downloaded;
  const file=out+'/synthetic.gutmind.json';await download.saveAs(file);
  const backup=JSON.parse(await readFile(file,'utf8'));assert.equal(backup.content.title,'Preflight saved deck');assert.equal(backup.content.questions.length,5);
  assert.equal(backup.content.questions[3].timerSeconds,45);assert.match(backup.content.questions[4].mapImage,/^data:image\/png;base64,/);
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();await page.getByLabel('Presentation title').evaluate(el=>el.value);await page.waitForFunction(()=>document.querySelector('input[maxlength="160"]')?.value==='Preflight saved deck — copy');
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles(file);
  await page.waitForFunction(()=>document.querySelector('input[maxlength="160"]')?.value==='Preflight saved deck');
  await page.getByRole('button',{name:'Edit slides'}).click();assert.equal(await prompt.inputValue(),'Preflight example: gut and mind');
  await page.getByRole('button',{name:'+ 3D brain anatomy',exact:true}).click();
  await enabled(page.getByRole('button',{name:'Rotate left',exact:true}));
  await page.getByRole('button',{name:'Rotate left',exact:true}).click();await page.getByRole('button',{name:'Zoom +',exact:true}).click();
  await page.screenshot({path:out+'/03-anatomy-editor.png'});
  await page.getByRole('button',{name:'Save & Close'}).click();await page.getByRole('heading',{name:'Presentation slide editor'}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Version history'}).click();await page.getByRole('button',{name:'Restore',exact:true}).last().waitFor();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restore',exact:true}).last().click();
  await page.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await page.screenshot({path:out+'/04-saved-library.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(sessionRequests,[]);
 }catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
});
