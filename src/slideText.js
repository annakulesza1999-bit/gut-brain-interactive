// Safe, small authoring syntax. Unrecognized syntax remains plain text.
export const shortDashes=value=>typeof value==='string'?value.replaceAll('—','-'):value;
export function parseSlideLine(line){
 let text=shortDashes(String(line||'')),kind='bullet';
 if(text.startsWith('@ ')){kind='sample';text=text.slice(2);}
 else if(text.startsWith('~ ')){kind='muted';text=text.slice(2);}
 else if(text.startsWith('> ')){kind='indent';text=text.slice(2);}
 else if(text.endsWith(':')&&text.length<85)kind='heading';
 const tokens=[];const re=/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;let cursor=0;
 for(const m of text.matchAll(re)){if(m.index>cursor)tokens.push({kind:'plain',text:text.slice(cursor,m.index)});tokens.push({kind:m[1]?'bold':'italic',text:m[1]||m[2]});cursor=m.index+m[0].length;}
 if(cursor<text.length)tokens.push({kind:'plain',text:text.slice(cursor)});
 return {kind,tokens};
}
