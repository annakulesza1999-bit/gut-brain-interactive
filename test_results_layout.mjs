import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {researchTemplate} from './src/researchActivities.js';
import {defaultResponse} from './src/simulations.js';
import {defaultPairs} from './src/spatialActivities.js';
import {brainTemplate} from './src/anatomyActivities.js';
import {exampleCortisolReference,hpaStages} from './src/activities.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8765/editor-preview.html',out='preview-test-output';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const choice={type:'mcq',question:'Which teaching response is supported?',options:['Option A','Option B','Option C','Option D'],correctAnswer:1,explanation:'An example explanation for this simulated exercise.'};
const pred={...researchTemplate('prediction','scatter'),question:'Compare four hypothetical relationships in an illustrative study',researchContext:'Participants compare four possible patterns. This synthetic fixture includes a representative amount of text and asks for a prediction before the findings are revealed.',researchOptions:[...researchTemplate('prediction','scatter').researchOptions,{label:'A further plausible pattern',graph:'scatter-flat'}],researchGraded:true,researchCorrect:2,researchReveal:'The fictional study supports the positive relationship. This example is not evidence about real people or measured cortisol.',researchSource:'Synthetic browser test fixture',researchFigure:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGMs7KlmIAUwkaR6VMOohiGlAQCw0gGYqw/vQAAAAABJRU5ErkJggg=='};
const evidence={...researchTemplate('evidence'),researchClaims:Array.from({length:5},(_,i)=>({text:'Evidence statement '+(i+1)+': evaluate whether this conclusion follows from the described study design and results.',answer:i%2,reason:'Explanation '+(i+1)+': the distinction between an observed association and an experimental causal conclusion must be maintained.'}))};
const simulation=kind=>({type:'simulation',question:'Compare individual scenarios: '+kind,simKind:kind,simInitial:defaultResponse(kind),simTask:'Adjust the parameters of this illustrative model.',simMode:'submit'});
const questions=[choice,{...choice,type:'sequence',sequenceTitle:'Teaching sequence',sequenceStep:1,sequenceTotal:5,beforePreset:'threat',afterPreset:'sympathetic'},{type:'wordcloud',question:'What comes to mind?'},{type:'curve',question:'Draw a predicted response',referenceCurve:exampleCortisolReference,referenceLabel:'Illustrative reference',referenceNote:'Normalized example, not measured cortisol.',axisExplanation:'T1 and T2 are pre-stressor sampling points.'},{type:'pointmap',question:'Where might you notice stress?',mapGraded:false},{type:'matching',question:'Match the teaching concepts',matchPairs:[...defaultPairs,{left:'Example five',right:'Category five'},{left:'Example six',right:'Category six'}],matchPoints:100},simulation('appraisal'),simulation('recovery'),simulation('microbiome'),pred,evidence,{...brainTemplate(),brainView:'sagittal-map',brainTargets:[-101],brainAnchor:null,brainTolerance:0}, {...simulation('appraisal'),simMode:'explore'},{...simulation('recovery'),simMode:'explore'}].map((q,i)=>({options:[],correctAnswer:null,...q,id:i+1,timerSeconds:0}));
test('audience layout regression with fourteen demo responses, live and revealed, at 16:9', {timeout:240000}, async t=>{
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
  // Generated raster fixtures match the geometry, not the contents, of wide and portrait research figures.
  const media=await page.evaluate(()=>{
   function image(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,w,h);c.strokeStyle='#0063A6';c.lineWidth=3;c.strokeRect(4,4,w-8,h-8);c.fillStyle='#032138';c.font='24px sans-serif';c.fillText('Synthetic geometry fixture',20,35);for(let x=30;x<w-30;x+=80){c.beginPath();c.moveTo(x,55);c.lineTo(x,h-25);c.stroke();}return canvas.toDataURL('image/png');}
   return {wide:image(1057,375),timeline:image(1302,432),portrait:image(1127,1750),qr:image(90,90)};
  });
  questions[1].sequenceArtwork={body:media.portrait,brain:media.wide,layout:'vascular-v2'};
  for(const [j,stage] of hpaStages.slice(1).entries())questions.push({...questions[1],...stage,id:questions.length+1,question:'Synthetic HPA stage '+(j+2),sequenceStep:j+2});
  questions.push({type:'text',id:questions.length+1,question:'Social appraisal fixture',body:'**Two interpretations:**\n~ *Same audience behavior, different appraisals.*',revealMode:'all',options:[],correctAnswer:null,timerSeconds:0,slideSources:'Synthetic fixture'});
  questions.push({type:'wordcloud',wordcloudMode:'open',id:questions.length+1,question:'Open-ended interpretation fixture',options:[],correctAnswer:null,timerSeconds:0});
  questions.push({type:'text',id:questions.length+1,question:'Example text fixture',body:'**Acute stress:**\n~ Example: giving a presentation.\n**Chronic stress:**\n~ Example: months of ongoing work pressure.\n~ Chronic stress is associated with increased risk or symptom burden.\n~ Measurements: salivary cortisol, blood (BDNF, serum SCFAs) and stool (fecal SCFAs)',revealMode:'all',options:[],correctAnswer:null,timerSeconds:0,slideSources:'Synthetic fixture'});
  const fixtures=[
   {question:'Wide findings: compare three original-sized panels',body:'**Main association:** a fictional finding, not measured data.\n~ Group A: n = 35 | Group B: n = 39',figureLayout:'wide',revealMode:'all',textImages:[{media:media.wide,alt:'Wide geometry fixture'}]},
   {question:'Study design and sample: wide timeline and compact QR',body:'@ **Sample:** fictional participants, 18-35 years; initial N = 80\n@ **Groups:** A n = 35 | B n = 39\n**Sampling:** salivary and microbiome measurements\n**Behavioral data:** subjective ratings and a representative questionnaire\n**Microbiome:** composition and hypothetical functional measures',figureLayout:'wide',revealMode:'all',textImages:[{media:media.timeline,alt:'Timeline geometry fixture'},{media:media.qr,alt:'QR geometry fixture',role:'qr'}]},
   {question:'Portrait illustration and longer source footer',body:'**Nervous system:** alertness and vigilance\n**Cardiovascular and respiratory systems:** heart rate and breathing rate\n**Energy mobilization:** glucose availability and skeletal muscle blood flow\n**Digestive system:** changes in motility and secretion',figureLayout:'large',revealMode:'all',textImages:[{media:media.portrait,alt:'Portrait geometry fixture: includes illustrative acute and chronic effects.'}]},
   {question:'Portrait body figure with gradual reveal',body:'First visible point\nSecond visible point\nThird visible point\nFourth visible point',figureLayout:'large',revealMode:'step',textImages:[{media:media.portrait,alt:'Portrait pointer fixture',pointers:{aspect:1127/1750,groups:[[[[.05,.2],[.5,.3]]],[[[.05,.4],[.6,.4]],[[.05,.4],[.7,.45]]],[[[.05,.6],[.6,.6]]],[[[.05,.8],[.8,.8]]]]}}]},
   {question:'Wide figure with gradual reveal',body:'First visible point\nSecond visible point\nThird visible point',figureLayout:'wide',revealMode:'step',textImages:[{media:media.timeline,alt:'Step geometry fixture',pointers:{aspect:1302/432,groups:[[[[.05,.2],[.5,.3]]],[[[.05,.5],[.6,.6]]],[[[.05,.8],[.8,.8]]]]}}]}
  ];
  for(const [j,q] of fixtures.entries())questions.push({...q,type:'text',options:[],correctAnswer:null,id:questions.length+1,timerSeconds:0,slideSources:'Synthetic reference with supporting source details; no real study data or private lecture figures.',sourceNotes:'Private fixture note'});

  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'layout-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'gut-mind-presentation',schemaVersion:1,content:{title:'Synthetic audience layout fixture',questions,settings:{timerDuration:0}},history:[]}))});
  await page.waitForFunction(()=>document.querySelector('input[maxlength="160"]')?.value==='Synthetic audience layout fixture');
  await page.getByRole('button',{name:'Present',exact:true}).click();
  await page.getByRole('button',{name:'Student phone',exact:true}).click();
  const nav=page.locator('aside').first(),stage=page.locator('.gm-stage-content');

 async function cloudFit(name,expected){
  await page.evaluate(()=>document.fonts.ready);
  const cloud=stage.getByRole('img',{name:'Live frequency word cloud'});
  await cloud.locator('[data-cloud-word]').first().waitFor();
  await page.waitForTimeout(140);
  const metrics=await cloud.evaluate(node=>{
   const box=node.getBoundingClientRect(),words=[...node.querySelectorAll('[data-cloud-word]')].map(w=>({word:w.textContent,b:w.getBoundingClientRect().toJSON(),count:Number(w.dataset.count),size:parseFloat(getComputedStyle(w).fontSize)}));
   return {box:box.toJSON(),words,scroll:node.scrollHeight-node.clientHeight};
  });
  assert.equal(metrics.words.length,expected,name+' word count');
  assert.ok(metrics.scroll<=1,name+' scroll');
  for(const [i,w] of metrics.words.entries()){
   assert.ok(w.b.left>=metrics.box.left-1&&w.b.right<=metrics.box.right+1&&w.b.top>=metrics.box.top-1&&w.b.bottom<=metrics.box.bottom+1,name+' clipped '+w.word);
   for(const v of metrics.words.slice(i+1)){
    assert.ok(w.b.right<=v.b.left+1||v.b.right<=w.b.left+1||w.b.bottom<=v.b.top+1||v.b.bottom<=w.b.top+1,name+' overlap '+w.word+' / '+v.word);
    if(w.count>v.count)assert.ok(w.size>=v.size,name+' frequency size order');
   }
  }
 }
  for(let i=0;i<questions.length;i++){
   const q=questions[i],name=(i+1)+'-'+q.type+(q.simKind?'-'+q.simKind:'')+(q.researchKind?'-'+q.researchKind:'');
   await nav.locator('button').nth(i).click();
   if(q.type==='sequence'){
    const phoneToggle=page.getByRole('button',{name:'Student phone',exact:true});if(await phoneToggle.getAttribute('aria-pressed')!=='true')await phoneToggle.click();
    const phone=page.frameLocator('iframe[title="Student phone preview"]');
    async function checkAnatomy(preset,phase){
     const mobile=phone.locator('svg[data-hpa-stage="'+preset+'"][viewBox="0 0 410 980"]');
     await mobile.waitFor();
     for(const part of ['body','brain']){
      assert.equal(await mobile.locator('[data-hpa-art="'+part+'"]').getAttribute('href'),q.sequenceArtwork[part],phase+' mobile '+part+' differs');
      assert.equal(await stage.locator('[data-hpa-art="'+part+'"]').getAttribute('href'),q.sequenceArtwork[part],phase+' presenter '+part+' differs');
     }
     assert.equal(await mobile.locator('[data-vessel="artery"]').count(),6);
     assert.equal(await mobile.locator('[data-vessel="vein"]').count(),6);
     assert.equal(await mobile.locator('[data-hpa-pituitary]').count(),1);
     const signals=async scope=>scope.locator('[data-hpa-signal] animateMotion').count();
     assert.equal(await signals(mobile),await signals(stage),phase+' animated signals differ');
     if(preset==='feedback')assert.equal(await mobile.locator('[data-hpa-inhibition] circle').count(),2);
     console.log('Verified phone/presenter HPA artwork and animation: stage '+q.sequenceStep+' '+phase);
     if((q.sequenceStep===1||q.sequenceStep===5)&&phase==='after'){
      await page.screenshot({path:out+'/hpa-phone-'+q.sequenceStep+'-'+phase+'.png',timeout:5000}).catch(e=>console.warn('Optional screenshot unavailable: '+e.message));
     }
    }
    await checkAnatomy(q.beforePreset,'before');
    await page.getByRole('button',{name:'Reveal results',exact:true}).click();
    await checkAnatomy(q.afterPreset,'after');
    await page.getByRole('button',{name:'Reset slide',exact:true}).click();
    await phoneToggle.click();
   }
   if(q.type==='text'&&!q.textImages?.length){
    const muted=stage.locator('.gm-muted-line');
    await muted.first().waitFor();
    await fit(name+' muted line');
    for(const line of await muted.all()){const m=await line.evaluate(el=>({display:getComputedStyle(el).display,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,line:getComputedStyle(el).lineHeight,scale:el.closest('.gm-slide-canvas').getBoundingClientRect().width/1280}));
    assert.equal(m.display,'block');assert.ok(m.height/m.scale<=parseFloat(m.line)*1.15,name+' muted text wraps '+JSON.stringify(m));}
    continue;
   }
   if(q.type==='text'){
    // The full-size canvas should fit almost entirely without global shrinking.
    const phoneToggle=page.getByRole('button',{name:'Student phone',exact:true});
    if(await phoneToggle.getAttribute('aria-pressed')!=='true')await phoneToggle.click();
    const phone=page.frameLocator('iframe[title="Student phone preview"]');
    await phone.getByRole('img',{name:q.textImages[0].alt,exact:true}).waitFor();
    assert.equal(await phone.getByText('Private fixture note',{exact:true}).count(),0);
    if(q.revealMode==='step'){
     assert.equal(await phone.getByText('First visible point',{exact:true}).count(),0);
     assert.equal(await stage.locator('[data-pointer-index]').count(),0);assert.equal(await phone.locator('[data-pointer-index]').count(),0);
     for(const line of q.body.split('\n')){
      await page.getByRole('button',{name:'Reveal next line',exact:true}).click();
      await phone.getByText(line,{exact:true}).waitFor();
      const count=q.body.split('\n').indexOf(line)+1;assert.equal(await stage.locator('[data-pointer-index]').count(),count);assert.equal(await phone.locator('[data-pointer-index]').count(),count);
     }
    }
    await phoneToggle.click();
    await page.setViewportSize({width:1280,height:720});
    await page.getByRole('button',{name:'Full screen',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement);
    const figures=async suffix=>{
     await stage.locator('.gm-slide-figures img,.gm-annotated-figure').first().waitFor();
     for(const sample of await stage.locator('.gm-sample-line').all()){const m=await sample.evaluate(el=>({bullet:getComputedStyle(el,'::before').content,size:parseFloat(getComputedStyle(el).fontSize)}));assert.ok(['none','normal'].includes(m.bullet));assert.ok(m.size<=17.1);}
     await page.waitForFunction(()=>[...document.querySelectorAll('.gm-stage-content .gm-slide-figures img')].every(i=>i.complete&&i.naturalWidth>0));
     await fit(name+' '+suffix,.96);
     const metrics=await stage.evaluate(s=>{
      const c=s.closest('.gm-slide-canvas'),a=c.getBoundingClientRect(),footer=s.querySelector('.gm-slide-sources').getBoundingClientRect(),img=s.querySelector('.gm-slide-figures figure:not(.gm-qr) img,.gm-annotated-figure'),qr=s.querySelector('.gm-qr img'),box=img.getBoundingClientRect(),scale=a.width/1280;
      const logicalWidth=Math.min(box.width,box.height*(img.naturalWidth?img.naturalWidth/img.naturalHeight:img.viewBox.baseVal.width/img.viewBox.baseVal.height))/scale;
      const figBottom=Math.max(...[...s.querySelectorAll('.gm-slide-figures figure')].map(f=>f.getBoundingClientRect().bottom));
      return {logicalWidth,footerBottom:footer.bottom-a.bottom,figureFooterGap:(footer.top-figBottom)/scale,qrWidth:qr?qr.getBoundingClientRect().width/scale:0};
     });
     assert.ok(metrics.footerBottom<=2,name+' source footer clipped '+JSON.stringify(metrics));
     if(q.textImages[0].pointers){const annotated=stage.locator('.gm-annotated-figure');assert.equal(await annotated.locator('[data-pointer-index]').count(),q.body.split('\n').length);assert.equal(await annotated.locator('[data-pointer-marker][r="27"]').count(),q.body.split('\n').length);assert.ok(await annotated.evaluate(svg=>svg.getBoundingClientRect().width>0&&svg.querySelector('image').getBBox().width>0));}
     assert.ok(metrics.figureFooterGap>=-1,name+' figure/caption overlaps footer '+JSON.stringify(metrics));
     if(q.figureLayout==='wide')assert.ok(metrics.logicalWidth>=850,name+' wide figure too small '+JSON.stringify(metrics));
     if(q.figureLayout==='large')assert.ok(metrics.logicalWidth>=280,name+' portrait figure too small '+JSON.stringify(metrics));
     if(q.textImages.length===2)assert.ok(metrics.qrWidth>=110&&metrics.qrWidth<=125,name+' QR size '+JSON.stringify(metrics));
     await page.screenshot({path:out+'/layout-'+name+'-'+suffix+'.png'});
    };
    await figures('720p');
    await page.getByRole('button',{name:'Exit full screen'}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.setViewportSize({width:1920,height:1080});
    await page.getByRole('button',{name:'Full screen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await figures('1080p');
    await page.getByRole('button',{name:'Exit full screen'}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.setViewportSize({width:1366,height:768});
    continue;
   }

   if(q.simMode!=='explore'){await page.getByRole('button',{name:'Add demo responses'}).click();await page.getByRole('status').filter({hasText:'14/15 completed'}).waitFor();}
   if(q.type==='wordcloud'&&q.wordcloudMode==='open'){
    const phoneToggle=page.getByRole('button',{name:'Student phone',exact:true});if(await phoneToggle.getAttribute('aria-pressed')!=='true')await phoneToggle.click();
    const phone=page.frameLocator('iframe[title="Student phone preview"]'),input=phone.getByPlaceholder('Type your response…');const sentence='They might be discussing something completely unrelated to my presentation.';
    await input.fill(sentence);await input.press('Enter');await phone.getByText(sentence,{exact:true}).waitFor();await stage.getByText(sentence,{exact:true}).waitFor();
    await input.fill(sentence);await input.press('Enter');await stage.getByText('16 responses',{exact:true}).waitFor();
    assert.equal(await stage.getByText(sentence,{exact:true}).count(),2);assert.equal(await stage.locator('[data-open-response]').count(),16);
    await phoneToggle.click();await page.getByRole('button',{name:'Full screen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await fit(name+' live');
    const region=stage.getByRole('region',{name:'Open-ended responses'});assert.ok(await region.evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollHeight>el.clientHeight&&el.scrollTop>0;}));
    await page.locator('.gm-fullscreen-controls').getByRole('button',{name:'Reveal results'}).click();await fit(name+' revealed');assert.equal(await stage.locator('[data-open-response]').count(),16);await page.screenshot({path:out+'/open-ended.png'});
    await page.getByRole('button',{name:'Exit full screen'}).click();await page.waitForFunction(()=>!document.fullscreenElement);continue;
   }
   if(q.type==='wordcloud'){
    await cloudFit(name+' normal live',11);
    // Rehearsal opens with the phone visible; the initial toggle hid it for the audience tests.
    const phoneToggle=page.getByRole('button',{name:'Student phone',exact:true});
    if(await phoneToggle.getAttribute('aria-pressed')!=='true')await phoneToggle.click();
    const phone=page.frameLocator('iframe[title="Student phone preview"]');
    const word=phone.getByPlaceholder('e.g. Stress, recovery, support…');
    await word.waitFor();
    for(const text of ['perceived social evaluation','uncertainty about the presentation','anticipatory anxiety','gastrointestinal symptoms','negative feedback regulation','psychological coping resources','sympathetic nervous system','difficulty concentrating','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW','microbiome diversity']){
     await word.fill(text);await word.press('Enter');await phone.getByText(text,{exact:true}).waitFor();
    }
    await stage.getByText('24 submissions · 21 unique',{exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'15/15 completed'}).waitFor();
    await cloudFit(name+' long live',15);
    await stage.getByRole('button',{name:'Next word cloud page'}).click();
    await cloudFit(name+' live page 2',6);
    await stage.getByRole('button',{name:'Previous word cloud page'}).click();
    await cloudFit(name+' live page 1 again',15);
    if(await phoneToggle.getAttribute('aria-pressed')==='true')await phoneToggle.click();
   }
   await page.getByRole('button',{name:'Full screen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
   await fit(name+' live');
   if(q.type==='simulation'&&q.simMode==='explore'&&q.simKind==='appraisal'){
    const scale=stage.getByRole('img',{name:'Conceptual demand and resource balance'});assert.equal(await scale.locator('[data-balance-platform]').count(),2);assert.equal(await scale.locator('[data-balance-string][stroke="#171717"]').count(),2);assert.equal(await scale.locator('[data-balance-brick="demand"]').count(),8);await stage.getByRole('slider',{name:'Perceived demands'}).fill('10');assert.equal(await scale.locator('[data-balance-brick="demand"]').count(),10);await stage.getByRole('slider',{name:'Perceived demands'}).fill('0');assert.equal(await scale.locator('[data-balance-brick="demand"]').count(),0);await stage.getByRole('slider',{name:'Perceived demands'}).fill('8');
   }
   if(q.type==='sequence'){assert.equal(await stage.locator('[data-hpa-art]').count(),2);assert.equal(await stage.locator('[data-vessel="artery"]').count(),6);assert.equal(await stage.locator('[data-vessel="vein"]').count(),6);assert.equal(await stage.locator('[data-hpa-pituitary]').count(),1);if(q.beforePreset==='threat')assert.equal(await stage.locator('[data-hpa-signal]').count(),0);}
   if(q.type==='wordcloud')await cloudFit(name+' full screen live',15);
   if(q.simMode!=='explore'){await page.locator('.gm-fullscreen-controls').getByRole('button',{name:'Reveal results'}).click();await fit(name+' revealed');if(q.type==='sequence'){assert.equal(await stage.locator('[data-hpa-art]').count(),2);assert.ok(await stage.locator('[data-hpa-signal] animateMotion').count()>0);if(q.afterPreset==='feedback'){for(const kind of ['crh','acth','cortisol','feedback'])assert.ok(await stage.locator('[data-hpa-signal="'+kind+'"] animateMotion').count()>0,kind+' missing');assert.equal(await stage.locator('[data-hpa-inhibition] circle').count(),2);const colors=await stage.evaluate(s=>['cortisol','feedback'].map(k=>s.querySelector('[data-hpa-signal="'+k+'"] circle')?.getAttribute('fill')));assert.equal(colors[0],colors[1],'cortisol and feedback must share a color');await page.screenshot({path:out+'/hpa-complete-loop.png'});}}}
   if(q.type==='wordcloud'){
    await cloudFit(name+' revealed',15);
    await page.screenshot({path:out+'/word-cloud-stress-page1.png'});
    await stage.getByRole('button',{name:'Next word cloud page'}).click();
    await cloudFit(name+' revealed page 2',6);
    await fit(name+' page 2');
    await page.screenshot({path:out+'/word-cloud-stress-page2.png'});
    await stage.getByRole('button',{name:'Previous word cloud page'}).click();
    await stage.getByRole('button',{name:'Response frequencies',exact:true}).click();
    assert.equal(await stage.getByRole('list',{name:'Response frequencies'}).locator('li').count(),15);
    await fit(name+' frequencies');
    await stage.getByRole('button',{name:'Next word cloud page'}).click();
    assert.equal(await stage.getByRole('list',{name:'Response frequencies'}).locator('li').count(),6);
    await fit(name+' frequencies page 2');
    await stage.getByRole('button',{name:'Previous word cloud page'}).click();
    await stage.getByRole('button',{name:'Back to word cloud',exact:true}).click();
    await cloudFit(name+' returned to cloud',15);
   }
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
