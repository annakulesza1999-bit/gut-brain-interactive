import {createHash,timingSafeEqual} from 'node:crypto';
export function equalSecret(expected,provided){
 if(typeof expected!=='string'||typeof provided!=='string'||!expected||provided.length>256)return false;
 return timingSafeEqual(createHash('sha256').update(expected).digest(),createHash('sha256').update(provided).digest());
}
// This candidate is testable on loopback only. Public startup remains guarded in index.js.
export function pilotConfig(env=process.env){
 if(env.GM_PILOT_TEST!=='1')return null;
 if(env.NODE_ENV!=='test')throw Error('Pilot test mode requires NODE_ENV=test.');
 const secret=env.GM_PRESENTER_SECRET;
 if(typeof secret!=='string'||!(/^[A-Za-z0-9_-]{32,128}$/.test(secret)))throw Error('A random 32–128 character presenter secret is required.');
 const origin=new URL(env.GM_PUBLIC_ORIGIN||'');
 if(origin.origin!==env.GM_PUBLIC_ORIGIN||origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||origin.port!==String(env.PORT))throw Error('Pilot test origin must be the exact loopback server origin.');
 return {secret,origin:origin.origin,host:origin.host,maxSessions:2,maxConnections:100,lifetimeMs:6*60*60*1000};
}
export function allowedRequest(cfg,req){
 if(!cfg)return false;
 return req.headers.host===cfg.host&&(!req.headers.origin||req.headers.origin===cfg.origin)&&req.headers['sec-fetch-site']!=='cross-site';
}
export function isExpired(session,now,lifetimeMs){return now-session.createdAt>=lifetimeMs;}
export function rateAllowed(state,now,limit,windowMs){
 if(!state.start||now-state.start>=windowMs){state.start=now;state.count=0;}
 return ++state.count<=limit;
}
