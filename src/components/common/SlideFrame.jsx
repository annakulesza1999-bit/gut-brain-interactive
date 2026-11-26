import React,{useLayoutEffect,useRef,useState} from 'react';
// A real 16:9 presentation surface, independent of the surrounding editing UI.
export default function SlideFrame({children}){
 const host=useRef(null),content=useRef(null),[metrics,setMetrics]=useState({screen:1,fit:1});
 useLayoutEffect(()=>{
  let active=true;
  const measure=()=>{if(!active||!host.current||!content.current)return;
   const h=host.current,c=content.current;
   const screen=Math.max(.01,Math.min(h.clientWidth/1280,h.clientHeight/720));
   const fit=Math.min(1,720/Math.max(720,c.scrollHeight,c.offsetHeight),1280/Math.max(1280,c.scrollWidth));
   setMetrics(old=>Math.abs(old.screen-screen)<.0001&&Math.abs(old.fit-fit)<.0001?old:{screen,fit});
  };
  const observer=new ResizeObserver(measure);observer.observe(host.current);observer.observe(content.current);
  document.fonts?.ready.then(measure);measure();
  return()=>{active=false;observer.disconnect();};
 },[]);
 return <div ref={host} className="gm-slide-viewport" data-fit-scale={metrics.fit.toFixed(3)}><div className="gm-slide-canvas" style={{transform:'translate(-50%, -50%) scale('+metrics.screen+')'}}><div ref={content} className="gm-stage-content gm-audience-content" style={{transform:'translateX(-50%) scale('+metrics.fit+')'}}>{children}</div></div></div>;
}
