import {useLayoutEffect} from 'react';
// Reset the participant document only when a new slide becomes active.
// Do not reload the page, or reset scroll on answer reveals, timers or reactions.
export function useSlideScrollReset(active,slideKey){
 useLayoutEffect(()=>{
  if(!active)return;
  window.scrollTo({top:0,left:0,behavior:'instant'});
 },[active,slideKey]);
}
