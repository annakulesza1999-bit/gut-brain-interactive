import React from 'react';
// Explicit pages keep large response sets readable without an audience scrollbar.
export function ResultPager({page,pages,onChange,label='Results'}){
 if(pages<=1)return null;
 return <nav className="gm-result-pager" aria-label={label+' pages'}><button type="button" disabled={page===0} onClick={()=>onChange(page-1)}>Previous page</button><span aria-live="polite">{label} {page+1} / {pages}</span><button type="button" disabled={page>=pages-1} onClick={()=>onChange(page+1)}>Next page</button></nav>;
}
export function ResultViews({views,value,onChange}){
 if(views.length<=1)return null;
 return <nav className="gm-result-views" aria-label="Results views">{views.map(({id,label})=><button type="button" key={id} aria-pressed={id===value} onClick={()=>onChange(id)}>{label}</button>)}</nav>;
}
