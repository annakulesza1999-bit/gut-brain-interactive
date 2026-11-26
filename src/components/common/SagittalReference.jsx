import React,{useState} from 'react';
import image from '../../assets/sagittal-reference.svg?url';
export default function SagittalReference(){
 const [zoom,setZoom]=useState(false);
 return <figure className="bg-white p-3 border border-slate-800 rounded-xl space-y-3">
 <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Midsagittal anatomical illustration</h3><button type="button" className="border rounded-lg px-3 py-2 text-sm" onClick={()=>setZoom(z=>!z)}>{zoom?'Whole section':'Enlarge section'}</button></div>
 <div className="overflow-auto max-h-[570px]"><img src={image} alt="Midsagittal illustration showing the entire cerebral hemisphere, corpus callosum, diencephalon, pituitary, brainstem and cerebellum. Anterior is left." style={{width:zoom?'720px':'100%',maxWidth:zoom?'none':'520px',display:'block',margin:'auto'}}/></div>
 <div className="flex justify-between text-xs text-slate-400"><span>Anterior ←</span><span>→ Posterior</span></div>
 <figcaption className="text-xs text-slate-500">Reference view only. Return to the 3D model to submit a location. Patrick J. Lynch, medical illustrator; C. Carl Jaffe, MD. <a href="https://commons.wikimedia.org/wiki/File:Brain_human_sagittal_section.svg" className="underline" target="_blank" rel="noreferrer">Source</a> · <a href="https://creativecommons.org/licenses/by/2.5/" className="underline" target="_blank" rel="noreferrer">CC BY 2.5</a>.</figcaption>
 </figure>;
}
