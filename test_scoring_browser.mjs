import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {researchTemplate} from './src/researchActivities.js';
import {brainTemplate} from './src/anatomyActivities.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8765/editor-preview.html',delay=ms=>new Promise(r=>setTimeout(r,ms));
test('phone nickname, accumulated points, scorecard, tie ranks and midline return', {timeout:90000},async t=>{
 await mkdir('preview-test-output',{recursive:true});
 const server=spawn('python3',['dist-preview/open-preview.py'],{env:{...process.env,GM_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const questions=[
 {type:'text',question:'How points work',body:'Choose a nickname.\nOne participation point per activity.\nOne point for a correct answer.',revealMode:'all'},
 {type:'wordcloud',wordcloudMode:'open',question:'Share an idea'},
 {type:'mcq',question:'Choose the correct option',options:['Wrong','Correct'],correctAnswer:1},
 {type:'curve',question:'Draw a prediction'},
 {...brainTemplate(),brainView:'sagittal-map',brainTargets:[-101],brainAnchor:null,brainTolerance:0,question:'Locate the hypothalamus'},
 {type:'pointmap',mapGraded:false,question:'Where might you notice stress?'},
 {...researchTemplate('evidence'),question:'Evidence detective: optional confidence'},
 {...researchTemplate('prediction','curve'),researchGraded:true,researchCorrect:0,question:'Curve prediction: optional confidence'},
 {...researchTemplate('prediction','scatter'),researchGraded:true,researchCorrect:0,question:'Association prediction: optional confidence'},
 {...researchTemplate('prediction','scatter'),researchGraded:true,researchCorrect:0,question:'Second association: optional confidence'},
 ...['Long phone slide A','Long phone slide B'].map(question=>({type:'text',question,revealMode:'all',body:Array.from({length:12},(_,i)=>'Example '+(i+1)+': This deliberately lengthy teaching sentence creates enough content to exercise phone scrolling and navigation without relying on a short slide automatically clamping the scroll position.').join('\n')}))
 ].map((q,i)=>({options:[],correctAnswer:null,...q,id:i+1,scoringMode:'simple',timerSeconds:0}));
 await page.goto(url);await page.getByRole('heading',{name:'My presentations'}).waitFor();
 await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'score-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'gut-mind-presentation',schemaVersion:1,content:{title:'Synthetic scorecard fixture',questions,settings:{timerDuration:0}},history:[]}))});
 await page.waitForFunction(()=>document.querySelector('input[maxlength="160"]')?.value==='Synthetic scorecard fixture');
 await page.getByRole('button',{name:'Present',exact:true}).click();
 const phone=page.frameLocator('iframe[title="Student phone preview"]'),strip=phone.getByRole('button',{name:'Open personal scorecard'});
 await phone.getByLabel('Nickname').fill('Blue Fox');await phone.getByRole('button',{name:'Join practice'}).click();
 await strip.getByText('0 points',{exact:true}).waitFor();await strip.getByText('Rank 1/1',{exact:true}).waitFor();
 const nav=page.locator('aside').first();
 const go=async i=>{await nav.locator('button').nth(i).click();await phone.getByRole('heading',{name:questions[i].question,exact:true}).waitFor();};
 await go(1);const input=phone.getByPlaceholder('Type your response…');
 for(const word of ['first idea','second idea']){await input.fill(word);await input.press('Enter');await phone.getByText(word,{exact:true}).waitFor();}
 await strip.getByText('1 point',{exact:true}).waitFor();await strip.click();
 const sheet=phone.getByRole('region',{name:'Your scorecard'});await sheet.getByText('2. Share an idea').waitFor();await sheet.getByText('+1',{exact:true}).waitFor();await sheet.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Reveal results',exact:true}).click();await strip.getByText('1 point',{exact:true}).waitFor();
 await go(2);await phone.getByRole('button',{name:/Correct/}).click();await strip.getByText('1 point',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Reveal results',exact:true}).click();await strip.getByText('2 points',{exact:true}).waitFor();
 await go(3);await phone.getByText('Not graded',{exact:true}).waitFor();await strip.getByText('2 points',{exact:true}).waitFor();
 await go(4);await phone.getByRole('button',{name:'Rotatable 3D context',exact:true}).click();await phone.getByText('3D orientation only. To mark your answer, return to Enlarged midline.').waitFor();await phone.getByRole('button',{name:'Return to enlarged midline to mark your answer'}).click();await phone.getByRole('img',{name:'Interactive midsagittal anatomy'}).waitFor();
 await go(5);const map=phone.getByRole('img',{name:'Select a location on the image'});await map.click();await phone.getByRole('button',{name:/Submit/}).click();await strip.getByText('3 points',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Reveal results',exact:true}).click();await strip.getByText('3 points',{exact:true}).waitFor();
 await go(6);await phone.getByRole('button',{name:'Supported by the evidence',exact:true}).first().click();await phone.getByText('Optional - not rated',{exact:true}).waitFor();const submit=phone.getByRole('button',{name:'Submit classifications'});assert.equal(await submit.isEnabled(),true);await submit.click();await phone.getByText('Submitted - waiting for findings.').waitFor();await page.getByRole('button',{name:'Reveal results',exact:true}).click();await strip.getByText('4 points',{exact:true}).waitFor();
 for(const [i,label] of [[7,'Lower response'],[8,'Negative association'],[9,'Negative association']]){await go(i);await phone.getByRole('button',{name:label,exact:false}).first().click();await phone.getByText('Optional - not rated',{exact:true}).waitFor();const send=phone.getByRole('button',{name:'Submit prediction'});assert.equal(await send.isEnabled(),true);await send.click();await phone.getByText('Submitted - waiting for findings.').waitFor();await page.getByRole('button',{name:'Reveal results',exact:true}).click();await strip.getByText((i-2)+' points',{exact:true}).waitFor();}
 await go(0);await strip.getByText('7 points',{exact:true}).waitFor();await strip.click();await sheet.getByText('3. Choose the correct option').waitFor();
 await page.screenshot({path:'preview-test-output/phone-scorecard.png',timeout:3000}).catch(()=>{});
 await sheet.getByRole('button',{name:'Close',exact:true}).click();
 const frame=page.frames().find(f=>f.url().includes('participant-preview=1'));assert.ok(frame);
 async function scrollDown(){await frame.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await frame.waitForFunction(()=>window.scrollY>100);}
 async function atTop(i){await phone.getByRole('heading',{name:questions[i].question,exact:true}).waitFor();await frame.waitForFunction(()=>window.scrollY===0);assert.ok(await frame.evaluate(()=>document.documentElement.scrollHeight>innerHeight+100),'New slide must still be scrollable');await strip.getByText('7 points',{exact:true}).waitFor();await strip.getByText('Blue Fox',{exact:true}).waitFor();}
 await go(10);await atTop(10);await scrollDown();
 // The same-slide reaction updates the phone state but must not interrupt reading.
 await phone.getByRole('button',{name:'Thumbs up',exact:true}).click();await page.getByText('👍 1',{exact:true}).waitFor();assert.ok(await frame.evaluate(()=>window.scrollY>100),'Same-slide update reset the scroll position');
 await page.getByRole('button',{name:'Next slide',exact:true}).click();await atTop(11);await scrollDown();
 await page.getByRole('button',{name:'Previous',exact:true}).click();await atTop(10);await scrollDown();
 await go(11);await atTop(11);
 console.log('Verified phone scroll reset on next, previous and direct slide navigation; same-slide updates and score preserved.');
 assert.deepEqual(errors,[]);
});
