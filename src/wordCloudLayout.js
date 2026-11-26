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
