import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {researchTemplate} from './src/researchActivities.js';
import {defaultResponse} from './src/simulations.js';
import {defaultPairs} from './src/spatialActivities.js';
import {brainTemplate} from './src/anatomyActivities.js';
import {exampleCortisolReference} from './src/activities.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8765/editor-preview.html',out='preview-test-output';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const choice={type:'mcq',question:'Which teaching response is supported?',options:['Option A','Option B','Option C','Option D'],correctAnswer:1,explanation:'An example explanation for this simulated exercise.'};
const pred={...researchTemplate('prediction','scatter'),question:'Compare four hypothetical relationships in an illustrative study',researchContext:'Participants compare four possible patterns. This synthetic fixture includes a representative amount of text and asks for a prediction before the findings are revealed.',researchOptions:[...researchTemplate('prediction','scatter').researchOptions,{label:'A further plausible pattern',graph:'scatter-flat'}],researchGraded:true,researchCorrect:2,researchReveal:'The fictional study supports the positive relationship. This example is not evidence about real people or measured cortisol.',researchSource:'Synthetic browser test fixture',researchFigure:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGMs7KlmIAUwkaR6VMOohiGlAQCw0gGYqw/vQAAAAABJRU5ErkJggg=='};
const evidence={...researchTemplate('evidence'),researchClaims:Array.from({length:5},(_,i)=>({text:'Evidence statement '+(i+1)+': evaluate whether this conclusion follows from the described study design and results.',answer:i%2,reason:'Explanation '+(i+1)+': the distinction between an observed association and an experimental causal conclusion must be maintained.'}))};
const simulation=kind=>({type:'simulation',question:'Compare individual scenarios: '+kind,simKind:kind,simInitial:defaultResponse(kind),simTask:'Adjust the parameters of this illustrative model.',simMode:'submit'});
const questions=[choice,{...choice,type:'sequence',sequenceTitle:'Teaching sequence',sequenceStep:1,sequenceTotal:5,beforePreset:'threat',afterPreset:'sympathetic'},{type:'wordcloud',question:'What comes to mind?'},{type:'curve',question:'Draw a predicted response',referenceCurve:exampleCortisolReference,referenceLabel:'Illustrative reference',referenceNote:'Normalized example, not measured cortisol.',axisExplanation:'T1 and T2 are pre-stressor sampling points.'},{type:'pointmap',question:'Where might you notice stress?',mapGraded:false},{type:'matching',question:'Match the teaching concepts',matchPairs:[...defaultPairs,{left:'Example five',right:'Category five'},{left:'Example six',right:'Category six'}],matchPoints:100},simulation('appraisal'),simulation('recovery'),simulation('microbiome'),pred,evidence,{...brainTemplate(),brainView:'sagittal-map',brainTargets:[-101],brainAnchor:null,brainTolerance:0}, {...simulation('appraisal'),simMode:'explore'},{...simulation('recovery'),simMode:'explore'}].map((q,i)=>({options:[],correctAnswer:null,...q,id:i+1,timerSeconds:0}));
test('audience layout regression with fourteen demo responses, live and revealed, at 16:9', {timeout:180000}, async t=>{
 await mkdir(out,{recursive:true});
 const server=spawn('python3',['dist-preview/open-preview.py'],{env:{...process.env,GM_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());let ready=false;
 for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 async function fit(name,min=.80){
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(140);
  const metrics=await page.locator('.gm-slide-viewport').evaluate(v=>{const c=v.querySelector('.gm-slide-canvas'),s=v.querySelector('.gm-stage-content'),a=c.getBoundingClientRect(),b=s.getBoundingClientRect();return {fit:Number(v.dataset.fitScale),ratio:a.width/a.height,overflow:b.bottom-a.bottom,scroll:v.scrollHeight-v.clientHeight};});
  checks.push({name,...metrics});assert.ok(Math.abs(metrics.ratio-16/9)<.02,name+' aspect');assert.ok(metrics.overflow<=2&&metrics.scroll<=1,name+' overflow '+JSON.stringify(metrics));assert.ok(metrics.fit>=min,name+' too small '+JSON.stringify(metrics));
 }
 try{
  await page.goto(url);await page.getByRole('heading',{name:'My presentations'}).waitFor();
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'layout-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'gut-mind-presentation',schemaVersion:1,content:{title:'Synthetic audience layout fixture',questions,settings:{timerDuration:0}},history:[]}))});
  await page.waitForFunction(()=>document.querySelector('input[maxlength="160"]')?.value==='Synthetic audience layout fixture');
  await page.getByRole('button',{name:'Present',exact:true}).click();
  await page.getByRole('button',{name:'Student phone',exact:true}).click();
  const nav=page.locator('aside').first(),stage=page.locator('.gm-stage-content');
  for(let i=0;i<questions.length;i++){
   const q=questions[i],name=(i+1)+'-'+q.type+(q.simKind?'-'+q.simKind:'')+(q.researchKind?'-'+q.researchKind:'');
   await nav.locator('button').nth(i).click();
   if(q.simMode!=='explore'){await page.getByRole('button',{name:'Add demo responses'}).click();await page.getByRole('status').filter({hasText:'14/15 completed'}).waitFor();}
   await page.getByRole('button',{name:'Full screen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
   await fit(name+' live');
   if(q.simMode!=='explore'){await page.locator('.gm-fullscreen-controls').getByRole('button',{name:'Reveal results'}).click();await fit(name+' revealed');}
   if(q.type==='research'){
    if(q.researchKind==='prediction'){assert.equal(await stage.locator('.gm-prediction-tile').count(),4);await page.screenshot({path:out+'/results-four-predictions.png'});}
    else {assert.equal(await stage.locator('.gm-evidence-card').count(),2);await stage.getByRole('button',{name:'Next page'}).click();await fit(name+' page 2');await stage.getByRole('button',{name:'Next page'}).click();assert.equal(await stage.locator('.gm-evidence-card').count(),1);await stage.getByText('5. Evidence statement 5:',{exact:false}).waitFor();await fit(name+' page 3');}
    await stage.getByRole('button',{name:'Study findings'}).click();await fit(name+' findings');await page.screenshot({path:out+'/results-'+q.researchKind+'-findings.png'});
    await stage.getByRole('button',{name:'Confidence analysis'}).click();await fit(name+' calibration');await page.screenshot({path:out+'/results-'+q.researchKind+'-confidence.png'});
   }
   if(q.type==='simulation'&&q.simMode!=='explore'&&q.simKind!=='recovery'){await stage.getByRole('button',{name:'Next page'}).click();await fit(name+' page 2');await stage.getByRole('button',{name:'#2',exact:true}).click();await stage.getByRole('button',{name:'Selected scenario'}).click();await fit(name+' detail');}
   if(q.type==='matching'){await stage.getByRole('button',{name:'Next page'}).click();await fit(name+' page 2');}
   await page.screenshot({path:out+'/layout-'+name+'.png'});
   await page.getByRole('button',{name:'Exit full screen'}).click();await page.waitForFunction(()=>!document.fullscreenElement);
  }
  assert.deepEqual(errors,[]);
 }finally{await writeFile(out+'/layout-checks.json',JSON.stringify(checks,null,2));await page.screenshot({path:out+'/layout-last.png'}).catch(()=>{});}
});
