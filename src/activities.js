// Shared activity helpers (browser and server). Coordinates are normalized to [0,1].
export const curveColors = ['#507A65','#8070A0','#A26D53','#527A91','#A06179','#68834C','#927C42','#557F80','#8D668B','#B06C63','#626E9E','#7B7955','#A37D91','#397A73','#A78655'];
export function curveIdentity(index) {
  const i = Math.max(0, Number.isInteger(index) ? index : 0);
  return { color: curveColors[i % curveColors.length], label: 'Curve ' + (i + 1) };
}
export function normalizeCurve(points) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 1000) return null;
  if (points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || v < 0 || v > 1))) return null;
  if (points.some((p,i) => i > 0 && p[0] < points[i-1][0])) return null;
  if (points[points.length-1][0] - points[0][0] < .05) return null;
  return points.map(p => p.map(v => Math.round(v*10000)/10000));
}
export function publicActivity(q) {
  return {type:q.type || 'mcq', xLabel:q.xLabel, yLabel:q.yLabel, xTicks:q.xTicks, stressMarker:q.stressMarker, sequenceTitle:q.sequenceTitle, sequenceStep:q.sequenceStep, sequenceTotal:q.sequenceTotal, beforeMedia:q.beforeMedia, beforePreset:q.beforePreset};
}
export function safeMedia(value) {
  if (typeof value !== 'string' || value.length > 500000) return '';
  if (/^data:image\/(gif|png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  return '';
}
export const hpaStages = [
 {question:'Which rapid response may follow a threat appraisal?',options:['Sympathetic nervous system activation','Microbial fermentation','Cortisol negative feedback'],correctAnswer:0,explanation:'Sympathetic activation rapidly mobilizes resources. HPA activation can overlap with this response.',beforePreset:'threat',afterPreset:'sympathetic'},
 {question:'Which hormone is released by the hypothalamus in the HPA axis?',options:['ACTH','CRH','Cortisol'],correctAnswer:1,explanation:'CRH signals to the anterior pituitary.',beforePreset:'hypothalamus',afterPreset:'crh'},
 {question:'What does the anterior pituitary release in response to CRH?',options:['ACTH','Insulin','Cortisol'],correctAnswer:0,explanation:'ACTH travels in the bloodstream to the adrenal cortex.',beforePreset:'crh',afterPreset:'acth'},
 {question:'Which hormone is released by the adrenal cortex in response to ACTH?',options:['Dopamine','CRH','Cortisol'],correctAnswer:2,explanation:'Cortisol supports adaptation and energy regulation.',beforePreset:'acth',afterPreset:'cortisol'},
 {question:'How does cortisol help regulate further HPA activity?',options:['Permanently activates CRH release','Provides negative feedback','Directly produces gut microbes'],correctAnswer:1,explanation:'Cortisol helps inhibit further CRH and ACTH release.',beforePreset:'cortisol',afterPreset:'feedback'}
];

/** Average only where all curves have data; linearly interpolate on a shared grid. */
export function averageCurves(curves, samples=101) {
  const valid = curves.map(c=>normalizeCurve(c.points)).filter(Boolean);
  if (!valid.length || !Number.isInteger(samples) || samples<2 || samples>501) return [];
  const left=Math.max(...valid.map(c=>c[0][0])),right=Math.min(...valid.map(c=>c[c.length-1][0]));
  if(right<=left)return [];
  return Array.from({length:samples},(_,i)=>{
    const x=left+(right-left)*i/(samples-1);
    const ys=valid.map(c=>{
      let j=c.findIndex(p=>p[0]>=x);
      if(j<=0)return j===0?c[0][1]:c[c.length-1][1];
      const a=c[j-1],b=c[j];
      return b[0]===a[0]?b[1]:a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
    });
    return [x,ys.reduce((a,b)=>a+b,0)/ys.length];
  });
}
