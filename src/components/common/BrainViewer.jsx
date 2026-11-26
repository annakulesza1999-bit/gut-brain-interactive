import React,{useEffect,useRef,useState} from 'react';
import SagittalReference from './SagittalReference';
import SagittalMap from './SagittalMap';
import {SAGITTAL_VIEW} from '../../sagittalRegions.js';
import {brainNode,nodeVisible,viewLabels} from '../../anatomyActivities.js';
const btn='px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs disabled:opacity-40';
const credit=<p className="text-[11px] text-slate-400">Atlas: <a className="underline" href="https://github.com/itayinbarr/brainproject" target="_blank" rel="noreferrer">Brain Project</a> · Z-Anatomy / BodyParts3D (DBCLS) · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Gross anatomy model.</p>;
export default function BrainViewer(props){return props.view===SAGITTAL_VIEW?<SagittalMap {...props} renderContext={()=> <AtlasViewer view="medial-left"/>}/>:<AtlasViewer {...props}/>;}
function AtlasViewer({view,markers=[],targets=[],anchor=null,tolerance=0,onPick,showLabels=false,onStatus}){
 const host=useRef(null),api=useRef(null),latest=useRef(null);
 const [status,setStatus]=useState('loading'),[message,setMessage]=useState(''),[spin,setSpin]=useState(false),[retry,setRetry]=useState(0),[through,setThrough]=useState(true),[reference,setReference]=useState(false);
 latest.current={view,markers,targets,anchor,tolerance,onPick,showLabels,onStatus,through};
 useEffect(()=>{let stopped=false,renderer,controls,draco,observer,frame,scene,canvas;const disposables=new Set();
 const updateStatus=(s,m='')=>{if(!stopped){setStatus(s);setMessage(m);latest.current.onStatus?.(s);}};
 updateStatus('loading');
 async function start(){
  const [T,{OrbitControls},{GLTFLoader},{DRACOLoader}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/loaders/DRACOLoader.js')]);
  if(stopped)return;
  scene=new T.Scene();scene.background=new T.Color('#FFFFFF');
  const camera=new T.PerspectiveCamera(34,1,.05,30);camera.position.set(4.2,1.4,3.8);
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none;';canvas.setAttribute('aria-label','Rotatable anatomical brain. Drag to rotate; pinch or use buttons to zoom. Tap a surface to mark a location.');host.current.appendChild(canvas);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=10;controls.autoRotateSpeed=.65;
  scene.add(new T.HemisphereLight('#fffefa','#c5aaa5',2.1));const light=new T.DirectionalLight('#fff5ec',1.45);light.position.set(3,5,4);scene.add(light);const fill=new T.DirectionalLight('#e5ddec',1.1);fill.position.set(-5,2,-1);scene.add(fill);
  const model=new T.Group(),dots=new T.Group();scene.add(model,dots);
  draco=new DRACOLoader();draco.setDecoderPath('/atlas/draco/');draco.setWorkerLimit(2);
  const loader=new GLTFLoader();loader.setDRACOLoader(draco);
  // Only the pinned local GLB is loaded. No upstream scripts or remote URLs.
  const gltf=await loader.loadAsync('/atlas/brain.glb');
  if(stopped){gltf.scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();for(const m of [].concat(o.material||[]))m.dispose();}});return;}
  model.add(gltf.scene);model.updateMatrixWorld(true);
  const meshes=[],box=new T.Box3(),original=new Set();
  gltf.scene.traverse(o=>{if(!o.isMesh)return;let cur=o,ex;while(cur){if(cur.userData?.bx_id!=null){ex=cur.userData;break;}cur=cur.parent;}const id=Number(ex?.bx_id);const n=brainNode(id);for(const mat of [].concat(o.material||[]))original.add(mat);if(!n||ex?.bx_id==null){o.visible=false;return;}o.userData={nodeId:id};o.material=new T.MeshStandardMaterial({color:'#D0C3BC',roughness:.68,metalness:0,side:T.DoubleSide});disposables.add(o.material);meshes.push(o);box.expandByObject(o);});
  for(const mat of original){for(const v of Object.values(mat))if(v?.isTexture)v.dispose();mat.dispose();}
  if(meshes.length<100||box.isEmpty())throw Error('Atlas has no compatible anatomical mesh labels.');
  const center=box.getCenter(new T.Vector3()),radius=box.getBoundingSphere(new T.Sphere()).radius;
  if(!Number.isFinite(radius)||radius<=0)throw Error('Invalid atlas dimensions.');
  gltf.scene.position.sub(center);model.scale.setScalar(1.7/radius);model.updateMatrixWorld(true);
  const palette={cortex:'#C68E81',cerebellum:'#B67D72',brainstem:'#C9A589',diencephalon:'#C7ACA3',deep_grey:'#B59C91',white_matter:'#E7D7C6',ventricles:'#AAC5C9'};
  const raycaster=new T.Raycaster(),ndc=new T.Vector2(),sphere=new T.SphereGeometry(.034,16,12);disposables.add(sphere);
  function setView(v){
   const visible=new T.Box3();for(const m of meshes){m.visible=nodeVisible(brainNode(m.userData.nodeId),v);if(m.visible)visible.expandByObject(m);}
   const center=visible.getCenter(new T.Vector3()),r=visible.getBoundingSphere(new T.Sphere()).radius;
   const side=v==='medial-left'?[-1,.025,0]:v==='medial-right'?[1,.025,0]:[1,.23,.55];
   controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI;controls.autoRotate=false;
   controls.target.copy(center);const direction=new T.Vector3(...side).normalize();camera.position.copy(center).addScaledVector(direction,Math.max(3,Math.min(7,r*3.15)));
   controls.update();
   if(v==='medial-left'||v==='medial-right'){const az=controls.getAzimuthalAngle();controls.minAzimuthAngle=az-.42;controls.maxAzimuthAngle=az+.42;controls.minPolarAngle=Math.PI/2-.32;controls.maxPolarAngle=Math.PI/2+.32;controls.update();}
  }
  function sync(){
   const data=latest.current,selected=new Set(data.targets);
   for(const m of meshes){const n=brainNode(m.userData.nodeId);m.material.color.set(selected.has(n.id)?'#56977A':palette[n.category]||'#C8BEB7');m.material.emissive.set(selected.has(n.id)?'#284735':'#000000');m.material.emissiveIntensity=selected.has(n.id) ? .25 : 0;const locator=selected.has(n.id)&&data.through;m.material.transparent=locator;m.material.opacity=locator?.84:1;m.material.depthTest=!locator;m.material.depthWrite=!locator;m.renderOrder=locator?8:0;m.material.needsUpdate=true;}
   for(const child of [...dots.children]){dots.remove(child);child.material?.dispose();if(child.geometry!==sphere)child.geometry?.dispose();}
   for(const mark of data.markers){if(!mark.response?.point||!nodeVisible(brainNode(mark.response.nodeId),data.view))continue;const p=new T.Vector3(...mark.response.point);const mesh=new T.Mesh(sphere,new T.MeshStandardMaterial({color:mark.color||'#005C99',emissive:mark.color||'#005C99',emissiveIntensity:.3,depthTest:true}));mesh.position.copy(p);mesh.scale.setScalar(mark.highlight?1.55:1);dots.add(mesh);}
   if(data.anchor&&data.tolerance>0){const mesh=new T.Mesh(new T.SphereGeometry(data.tolerance,24,16),new T.MeshBasicMaterial({color:'#005C99',transparent:true,opacity:.18,depthWrite:false,wireframe:true}));mesh.position.set(...data.anchor.point);dots.add(mesh);}
  }
  let gesture=null,pointers=new Set();
  const down=e=>{pointers.add(e.pointerId);if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false};else if(gesture)gesture.moved=true;};
  const move=e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;};
  const up=e=>{const valid=gesture&&!gesture.moved&&gesture.id===e.pointerId&&pointers.size===1&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=7;pointers.delete(e.pointerId);gesture=null;if(!valid||!latest.current.onPick)return;const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(ndc,camera);const hits=raycaster.intersectObjects(meshes.filter(m=>m.visible),false);const hit=(latest.current.through&&hits.find(h=>latest.current.targets.includes(h.object.userData.nodeId)))||hits[0];if(hit)latest.current.onPick({nodeId:hit.object.userData.nodeId,point:hit.point.toArray()});};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>{gesture=null;pointers.clear();});
  const resize=()=>{if(!host.current)return;const w=Math.max(1,host.current.clientWidth),h=Math.max(1,host.current.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  observer=new ResizeObserver(resize);observer.observe(host.current);resize();
  function rotate(delta){const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),delta);camera.position.copy(controls.target).add(offset);controls.update();}
  api.current={setView,sync,rotate,zoom:factor=>{const v=camera.position.clone().sub(controls.target);v.setLength(Math.min(10,Math.max(2.5,v.length()*factor)));camera.position.copy(controls.target).add(v);controls.update();},setSpin:v=>{controls.autoRotate=v;}};
  setView(latest.current.view);sync();updateStatus('ready');
  const render=()=>{if(stopped)return;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(render);};render();
 }
 start().catch(e=>{if(!stopped)updateStatus('error',e?.message||'Cannot display this atlas.');});
 return()=>{stopped=true;api.current=null;if(frame)cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();draco?.dispose();const all=new Set(disposables);scene?.traverse(o=>{if(o.geometry)all.add(o.geometry);for(const m of [].concat(o.material||[]))if(m)all.add(m);});all.forEach(o=>o.dispose?.());renderer?.dispose();canvas?.remove();};
 },[retry]);
 useEffect(()=>{setSpin(false);setReference(false);api.current?.setView(view);},[view]);
 useEffect(()=>{api.current?.sync();},[view,markers,targets,anchor,tolerance,through]);
 useEffect(()=>{api.current?.setSpin(spin);},[spin]);
 return <div className="space-y-2">{(view==='medial-left'||view==='medial-right')&&<div className="flex gap-2 flex-wrap"><button type="button" className={btn} aria-pressed={!reference} onClick={()=>setReference(false)}>3D model</button><button type="button" className={btn} aria-pressed={reference} onClick={()=>setReference(true)}>Sagittal reference</button></div>}{reference&&<SagittalReference/>}<div style={{display:reference?'none':undefined}} className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950"><div ref={host} className="h-[340px] sm:h-[500px] w-full gm-brain-canvas"/>{status!=='ready'&&<div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-950 gap-3"><p>{status==='loading'?'Loading anatomical atlas…':'3D anatomy unavailable'}</p>{message&&<p className="text-xs">{message}</p>}{status==='error'&&<><p className="text-xs">Check WebGL support and that the atlas setup step was completed.</p><button type="button" className={btn} onClick={()=>setRetry(x=>x+1)}>Retry</button></>}</div>}</div><div style={{display:reference?'none':undefined}} className="flex flex-wrap gap-2"><button type="button" disabled={status!=='ready'} className={btn} onClick={()=>api.current?.rotate(-Math.PI/6)}>Rotate left</button><button type="button" disabled={status!=='ready'} className={btn} onClick={()=>api.current?.rotate(Math.PI/6)}>Rotate right</button><button type="button" disabled={status!=='ready'} className={btn} onClick={()=>api.current?.zoom(.8)}>Zoom +</button><button type="button" disabled={status!=='ready'} className={btn} onClick={()=>api.current?.zoom(1.25)}>Zoom −</button><button type="button" disabled={status!=='ready'} className={btn} onClick={()=>{setSpin(false);api.current?.setView(view);}}>Reset view</button><button type="button" disabled={status!=='ready'||view.startsWith('medial-')} aria-pressed={spin} className={btn} onClick={()=>setSpin(v=>!v)}>{spin?'Stop rotation':'Auto rotate'}</button></div><p className="text-xs text-slate-400">{reference?'Sagittal illustration · reference only':viewLabels[view]+(view.startsWith('medial-')?' · limited orbit; pinch to zoom.':' · drag to rotate; pinch to zoom.')} {!reference&&onPick?'Tap the surface to select a point.':''}</p>{targets.length>0&&<div className="space-y-1"><label className="text-xs flex items-center gap-2"><input type="checkbox" checked={through} onChange={e=>setThrough(e.target.checked)}/> Show highlighted structures through surrounding anatomy</label>{through&&<p className="text-[11px] text-slate-400">Green locator is a transparent anatomical overlay. It can show structures behind the visible surface; turn it off for ordinary depth rendering.</p>}</div>}{credit}</div>;
}
