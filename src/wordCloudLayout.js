export function wordFrequencies(words){
 const counts=new Map();
 for(const item of Array.isArray(words)?words:[]){const raw=typeof item==='string'?item:item?.text;if(typeof raw!=='string')continue;const text=raw.trim().replace(/\s+/g,' ').slice(0,35);if(!text)continue;const key=text.toLocaleLowerCase();const old=counts.get(key);if(old)old.count++;else counts.set(key,{key,text,count:1});}
 return [...counts.values()].sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
}
const hash=s=>[...s].reduce((h,ch)=>(Math.imul(h,31)+ch.codePointAt(0))>>>0,2166136261);
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+5&&Math.abs(a.y-b.y)<(a.h+b.h)/2+5;
export function layoutWords(stats,measure,width=900,height=460){
 const all=stats.slice(0,300),max=all[0]?.count||1;
 for(let scale=1;scale>=.18;scale*=.87){
  const out=[];let failed=false;
  for(let i=0;i<all.length;i++){
   const item=all[i],size=Math.max(9,Math.round((24+88*Math.sqrt(item.count/max))*Math.min(1,Math.sqrt(12/Math.max(1,all.length)))*scale)),m=measure(item.text,size),w=m+size*.12,h=size*1.28,phase=(hash(item.key)%360)*Math.PI/180;
   let found=null;
   for(let j=0;j<2300;j++){const a=j*.34+phase,rad=2.8*Math.sqrt(j)*Math.sqrt(j/14+1),x=width/2+Math.cos(a)*rad*1.35,y=height/2+Math.sin(a)*rad*.82;const p={...item,size,x,y,w,h};if(x-w/2<12||x+w/2>width-12||y-h/2<12||y+h/2>height-12||out.some(other=>overlap(p,other)))continue;found=p;break;}
   if(!found){failed=true;break;}out.push(found);
  }
  if(!failed)return out;
 }
 return [];
}
export const wordColor=key=>['#0063A6','#176D70','#634078','#735E00','#032138','#407BA4','#7C468C'][hash(key)%7];

export const cloudPageSize=width=>width<600?6:15;
export function fitCloudWords(stats,measure,width,height,maxCount=stats[0]?.count||1){
 const availableW=Math.max(1,width-48),availableH=Math.max(1,height-40);
 const base=Math.min(96,width/10,height/3)*Math.min(1,Math.sqrt(8/Math.max(1,stats.length)));
 for(let scale=1;scale>=.08;scale*=.88){
  const words=stats.map(w=>({...w,size:Math.max(8,Math.floor(base*(.35+.65*Math.sqrt(w.count/maxCount))*scale))}));
  let rowW=0,rowH=0,totalH=0,rows=0,fits=true;
  for(const w of words){
   const measured=measure(w.text,w.size);
   // Reserve additional space for fallback fonts, glyph overhang and rounding.
   const ww=Math.ceil((Number.isFinite(measured)&&measured>0?measured:w.text.length*w.size)*1.12)+8;
   const hh=Math.ceil(w.size*1.25)+2;
   if(ww>availableW){fits=false;break;}
   if(rowW&&rowW+20+ww>availableW){totalH+=rowH+(rows?12:0);rows++;rowW=0;rowH=0;}
   rowW+=ww+(rowW?20:0);rowH=Math.max(rowH,hh);
  }
  if(rowW){totalH+=rowH+(rows?12:0);rows++;}
  if(fits&&totalH<=availableH)return {words,rows,height:totalH,fits:true};
 }
 return {words:stats.map(w=>({...w,size:8})),rows:0,height:0,fits:false};
}
