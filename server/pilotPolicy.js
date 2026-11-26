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

// Candidate Render configuration. Not wired to the listener yet: public startup remains blocked.
// Validate canonical HTTPS origin supplied by Render, not an arbitrary request Host.
export function renderPilotConfig(env=process.env){
 if(env.NODE_ENV!=='production'||env.RENDER!=='true'||env.GM_PILOT_TEST==='1')throw Error('Render production pilot configuration required.');
 const secret=env.GM_PRESENTER_SECRET;
 if(typeof secret!=='string'||!(/^[A-Za-z0-9_-]{32,128}$/.test(secret)))throw Error('Random presenter secret required.');
 const origin=new URL(env.RENDER_EXTERNAL_URL||'');
 if(origin.origin!==env.RENDER_EXTERNAL_URL||origin.protocol!=='https:'||origin.port||!(/^[a-z0-9-]+\.onrender\.com$/.test(origin.hostname)))throw Error('Exact Render HTTPS origin required.');
 const port=Number(env.PORT);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Valid Render port required.');
 return {secret,origin:origin.origin,host:origin.host,port,maxSessions:2,maxConnections:100,lifetimeMs:6*60*60*1000};
}
export function renderRequestAllowed(cfg,req){
 if(!allowedRequest(cfg,req))return false;
 // Render terminates TLS before forwarding HTTP. Health checks are intentionally limited to a minimal status endpoint.
 return req.headers['x-forwarded-proto']==='https';
}
