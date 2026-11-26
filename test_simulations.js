import test from 'node:test';
import assert from 'node:assert/strict';
import {SIM_KINDS,defaultResponse,normalizeSimulation,simulationConfig,appraisalMetrics,recoverySeries,diversityMetrics,simulationSummary} from './src/simulations.js';
test('valid defaults and invalid inputs',()=>{
 for(const kind of SIM_KINDS)assert.deepEqual(normalizeSimulation(kind,defaultResponse(kind)),defaultResponse(kind));
 assert.equal(normalizeSimulation('appraisal',{demand:11,control:2,support:3,prepared:4}),null);
 assert.equal(normalizeSimulation('recovery',{frequency:0,recovery:100}),null);
 assert.equal(normalizeSimulation('microbiome',{microbes:Array(12).fill(6)}),null);
 assert.equal(normalizeSimulation('unknown',{}),null);
});
test('increased resources reduce the conceptual gap at fixed demand',()=>{
 const v=defaultResponse('appraisal');
 assert.ok(appraisalMetrics({...v,support:9}).gap<appraisalMetrics(v).gap);
});
test('faster recovery reduces simulated area with identical stressors',()=>{
 const slow=recoverySeries({frequency:4,recovery:0}),fast=recoverySeries({frequency:4,recovery:100});
 assert.equal(slow.values.length,141);assert.deepEqual(slow.stressors,fast.stressors);
 assert.ok(slow.exposure>fast.exposure);assert.ok(fast.exposure>0);
 assert.ok(fast.values.every(p=>Number.isFinite(p[1])&&p[1]>=.8));
});
test('equal richness, different evenness and Shannon diversity',()=>{
 const even=diversityMetrics(defaultResponse('microbiome').microbes),uneven=diversityMetrics([0,0,0,0,0,0,0,1,2,3,4,5]);
 assert.equal(even.richness,6);assert.equal(uneven.richness,6);
 assert.ok(Math.abs(even.shannon-Math.log(6))<1e-10);
 assert.ok(even.shannon>uneven.shannon);assert.ok(even.evenness>uneven.evenness);
 assert.equal(diversityMetrics(Array(12).fill(0)).evenness,null);
});
test('summary uses valid submissions and excludes undefined evenness',()=>{
 const entries=[{response:defaultResponse('microbiome')},{response:{microbes:Array(12).fill(0)}},{response:{microbes:[]}}];
 const s=simulationSummary('microbiome',entries);
 assert.equal(s.count,2);assert.equal(s.means.richness,3.5);assert.ok(Math.abs(s.means.evenness-1)<1e-10);
 assert.equal(simulationSummary('recovery',[]).means.exposure,null);
 assert.deepEqual(simulationConfig({simKind:'recovery',simInitial:{frequency:999}}).simInitial,defaultResponse('recovery'));
});
