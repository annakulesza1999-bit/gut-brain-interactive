import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotConfig,equalSecret,allowedRequest,isExpired,rateAllowed,renderPilotConfig,renderRequestAllowed} from './server/pilotPolicy.js';
const env={NODE_ENV:'test',GM_PILOT_TEST:'1',GM_PUBLIC_ORIGIN:'http://127.0.0.1:3000',PORT:'3000',GM_PRESENTER_SECRET:'synthetic_only_0123456789abcdef012345'};
test('pilot fails closed, accepts only exact test host and origin',()=>{assert.equal(pilotConfig({}),null);for(const patch of [{NODE_ENV:'production'},{GM_PRESENTER_SECRET:'short'},{GM_PUBLIC_ORIGIN:'https://example.com'},{GM_PUBLIC_ORIGIN:'http://127.0.0.1:3000/path'},{PORT:'3001'}])assert.throws(()=>pilotConfig({...env,...patch}));const cfg=pilotConfig(env);assert.ok(allowedRequest(cfg,{headers:{host:cfg.host,origin:cfg.origin}}));assert.ok(!allowedRequest(cfg,{headers:{host:'evil.invalid',origin:cfg.origin}}));assert.ok(!allowedRequest(cfg,{headers:{host:cfg.host,origin:'https://evil.invalid'}}));assert.ok(!allowedRequest(cfg,{headers:{host:cfg.host,'sec-fetch-site':'cross-site'}}));});
test('secret validation, bounded rate and session expiry',()=>{assert.ok(equalSecret(env.GM_PRESENTER_SECRET,env.GM_PRESENTER_SECRET));for(const bad of [null,'','wrong','x'.repeat(257)])assert.equal(equalSecret(env.GM_PRESENTER_SECRET,bad),false);const bucket={};assert.ok(rateAllowed(bucket,100,2,1000));assert.ok(rateAllowed(bucket,101,2,1000));assert.equal(rateAllowed(bucket,102,2,1000),false);assert.ok(rateAllowed(bucket,1100,2,1000));assert.equal(isExpired({createdAt:10},99,90),false);assert.equal(isExpired({createdAt:10},100,90),true);});

test('candidate Render policy rejects missing secrets, insecure origins, unexpected hosts and cross-site requests',()=>{
 const env={NODE_ENV:'production',RENDER:'true',RENDER_EXTERNAL_URL:'https://synthetic-pilot.onrender.com',PORT:'10000',GM_PRESENTER_SECRET:'synthetic_only_0123456789abcdef012345'};
 const cfg=renderPilotConfig(env);
 for(const patch of [{RENDER:'false'},{GM_PILOT_TEST:'1'},{GM_PRESENTER_SECRET:''},{RENDER_EXTERNAL_URL:'http://synthetic-pilot.onrender.com'},{RENDER_EXTERNAL_URL:'https://synthetic-pilot.onrender.com.evil.invalid'},{RENDER_EXTERNAL_URL:'https://synthetic-pilot.onrender.com/path'},{PORT:'0'}])assert.throws(()=>renderPilotConfig({...env,...patch}));
 const req={headers:{host:cfg.host,origin:cfg.origin,'x-forwarded-proto':'https'}};
 assert.equal(renderRequestAllowed(cfg,req),true);
 for(const patch of [{host:'evil.invalid'},{origin:'https://evil.invalid'},{'x-forwarded-proto':'http'},{'x-forwarded-proto':'https,http'},{'sec-fetch-site':'cross-site'}])assert.equal(renderRequestAllowed(cfg,{headers:{...req.headers,...patch}}),false);
});
