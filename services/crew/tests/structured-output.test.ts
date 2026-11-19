import test from 'node:test';
import assert from 'node:assert/strict';

import { StoryAngleSchema } from '../../../packages/core/src/schemas/artifacts';
import { generateStructuredObject, schemaToJsonSchema } from '../../../packages/providers/src/ai/structured-output';

test('zod schema is converted into strict response-format json schema',()=>{
  const json=schemaToJsonSchema(StoryAngleSchema);
  assert.equal(json.type,'object');
  assert.equal(json.additionalProperties,false);
  assert.ok(json.properties.title);
});

test('structured provider parses mocked GPT-5.5 JSON response through zod before returning',async()=>{
  const object={id:'angle_ai',job_id:'job_ai',title:'AI angle',what_we_did_with_ai_or_tech:'Used AI to structure evidence into a story.',goal:'Make safer content.',impressive_method:'Schema-valid generation with evidence IDs.',why_method_is_impressive:'It blocks unsupported claims before DB writes.',benefits_for_smes:['Safer publishing'],visual_evidence_ids:['evi_1'],main_claims:['Evidence-backed content'],hook_potential:'Strong',risk_or_weakness:'Needs real evidence quality.',privacy_risks:[],score:80,status:'candidate'};
  const fetchImpl=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(object)}}]})}) as any;
  const result=await generateStructuredObject({schema:StoryAngleSchema,schemaName:'StoryAngle',system:'x',prompt:'y',config:{provider:'openai',model:'gpt-5.5',apiKey:'test',baseUrl:'https://example.invalid',timeoutMs:1000},fetchImpl});
  assert.equal(result.model,'gpt-5.5');
  assert.equal(result.object.id,'angle_ai');
});


test('direct Codex OAuth transport parses model JSON through zod',async()=>{
  const object={id:'angle_codex',job_id:'job_codex',title:'Codex angle',what_we_did_with_ai_or_tech:'Used GPT-5.5 through direct Codex OAuth.',goal:'Verify structured outputs.',impressive_method:'The app calls the Codex Responses provider directly with an OAuth access token.',why_method_is_impressive:'It avoids OpenClaw CLI/runtime while preserving schema validation before DB writes.',benefits_for_smes:['Safer model auth'],visual_evidence_ids:['evi_1'],main_claims:['Direct OAuth backed structured output'],hook_potential:'Good',risk_or_weakness:'Provider must be reachable.',privacy_risks:[],score:88,status:'candidate'};
  const codexCompleteImpl=async(model:any)=>({role:'assistant',api:'openai-codex-responses',provider:'openai-codex',model:model.id,content:[{type:'text',text:JSON.stringify(object)}],usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()}) as any;
  const result=await generateStructuredObject({schema:StoryAngleSchema,schemaName:'StoryAngle',system:'x',prompt:'y',config:{provider:'codex-oauth',model:'gpt-5.5',accessToken:'test-oauth-token',timeoutMs:1000},codexCompleteImpl});
  assert.equal(result.object.id,'angle_codex');
  assert.equal(result.model,'openai-codex/gpt-5.5');
});
