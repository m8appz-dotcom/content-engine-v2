import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { complete, type AssistantMessage, type Context, type Model, type ProviderStreamOptions } from '@mariozechner/pi-ai';
import { refreshOpenAICodexToken } from '@mariozechner/pi-ai/oauth';

export type OpenAIConfig={ provider:'openai'; model:string; apiKey:string; baseUrl:string; timeoutMs?:number };
export type CodexOAuthConfig={ provider:'codex-oauth'; model:string; timeoutMs?:number; credentialsPath?:string; credentialsProfile?:string; accessToken?:string; refreshToken?:string; expiresAt?:number };
export type StructuredModelConfig=OpenAIConfig|CodexOAuthConfig;
export const DEFAULT_GPT55_MODEL=process.env.CONTENT_ENGINE_GPT55_MODEL ?? 'gpt-5.5';

type CodexCredentials={ access:string; refresh?:string; expires?:number; accountId?:string; email?:string; provider?:string; type?:string };
type CodexComplete=(model:Model<'openai-codex-responses'>, context:Context, options?:ProviderStreamOptions)=>Promise<AssistantMessage>;

export function resolveStructuredModelConfig():StructuredModelConfig|null{
  const mode=process.env.CONTENT_ENGINE_AI_MODE ?? 'codex_oauth';
  const timeoutMs=Number(process.env.CONTENT_ENGINE_AI_TIMEOUT_MS ?? 120000);
  if(mode==='codex_oauth') return {provider:'codex-oauth',model:normalizeCodexModel(DEFAULT_GPT55_MODEL),timeoutMs,credentialsPath:process.env.CONTENT_ENGINE_CODEX_OAUTH_CREDENTIALS_PATH,credentialsProfile:process.env.CONTENT_ENGINE_CODEX_OAUTH_PROFILE,accessToken:process.env.CONTENT_ENGINE_CODEX_OAUTH_ACCESS_TOKEN,refreshToken:process.env.CONTENT_ENGINE_CODEX_OAUTH_REFRESH_TOKEN,expiresAt:process.env.CONTENT_ENGINE_CODEX_OAUTH_EXPIRES_AT?Number(process.env.CONTENT_ENGINE_CODEX_OAUTH_EXPIRES_AT):undefined};
  if(mode==='spark_private'){
    const url=process.env.SPARK_LLM_URL,model=process.env.SPARK_LLM_MODEL;
    if(!url || !model)return null;
    const parsed=new URL(url);
    if(parsed.username || parsed.password || parsed.search || parsed.hash || !['http:','https:'].includes(parsed.protocol))throw Error('Invalid private model endpoint');
    return {provider:'openai',model,apiKey:process.env.SPARK_LLM_TOKEN||'',baseUrl:url.replace(/\/$/,'')+'/v1',timeoutMs:60000};
  }
  const apiKey=process.env.CONTENT_ENGINE_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if(apiKey) return {provider:'openai',model:DEFAULT_GPT55_MODEL.replace(/^openai-codex\//,''),apiKey,baseUrl:process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',timeoutMs:Number(process.env.CONTENT_ENGINE_AI_TIMEOUT_MS ?? 60000)};
  return null;
}
function normalizeCodexModel(model:string){ return model.replace(/^openai-codex\//,'') || 'gpt-5.5'; }
function buildCodexModel(modelId:string):Model<'openai-codex-responses'>{ return {id:normalizeCodexModel(modelId),name:normalizeCodexModel(modelId).toUpperCase(),api:'openai-codex-responses',provider:'openai-codex',baseUrl:'https://chatgpt.com/backend-api',reasoning:true,input:['text','image'],cost:{input:5,output:30,cacheRead:0.5,cacheWrite:0},contextWindow:272000,maxTokens:128000}; }
function loadCodexCredentials(config:CodexOAuthConfig):CodexCredentials{
  if(config.accessToken) return {access:config.accessToken,refresh:config.refreshToken,expires:config.expiresAt,provider:'openai-codex',type:'oauth'};
  if(!config.credentialsPath) throw Object.assign(new Error('Codex OAuth credentials not configured: set CONTENT_ENGINE_CODEX_OAUTH_CREDENTIALS_PATH or CONTENT_ENGINE_CODEX_OAUTH_ACCESS_TOKEN'),{code:'provider_not_configured'});
  const parsed=JSON.parse(readFileSync(config.credentialsPath,'utf8'));
  if(parsed?.access) return parsed;
  const profiles=parsed?.profiles;
  if(profiles && typeof profiles==='object'){
    const requested=config.credentialsProfile;
    const entries=Object.entries(profiles) as [string,any][];
    const selected=(requested?entries.find(([key])=>key===requested):undefined) ?? entries.find(([,value])=>value?.provider==='openai-codex' && value?.access);
    if(selected?.[1]?.access) return selected[1];
  }
  throw Object.assign(new Error('No usable openai-codex OAuth credentials found'),{code:'provider_not_configured'});
}
async function getCodexAccessToken(config:CodexOAuthConfig):Promise<{access:string;credentials:CodexCredentials}> {
  let credentials=loadCodexCredentials(config);
  if(credentials.refresh && Date.now() >= Number(credentials.expires ?? 0) - 60_000){
    credentials=await refreshOpenAICodexToken(credentials.refresh) as CodexCredentials;
    if(config.credentialsPath && !config.credentialsPath.includes('auth-profiles.json')) writeFileSync(config.credentialsPath,JSON.stringify(credentials,null,2));
  }
  if(!credentials.access) throw Object.assign(new Error('Codex OAuth access token missing'),{code:'provider_not_configured'});
  return {access:credentials.access,credentials};
}
function zodToResponseFormat(name:string,schema:any){
  return {type:'json_schema',json_schema:{name,strict:true,schema:schemaToJsonSchema(schema)}};
}
// Zod's maintained converter preserves array item types, integer bounds and
// nested constraints; the application still validates the returned object.
export function schemaToJsonSchema(schema:z.ZodType):any{
  return z.toJSONSchema(schema,{target:'draft-7'});
}
function extractJson(text:string):unknown{
  const trimmed=text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
  return JSON.parse(trimmed);
}
export async function generateStructuredObject<T>(input:{schema:z.ZodType<T>;schemaName:string;system:string;prompt:string;config?:StructuredModelConfig|null;fetchImpl?:typeof fetch;codexCompleteImpl?:CodexComplete}):Promise<{object:T;model:string;raw:unknown}>{
  const config=input.config===undefined?resolveStructuredModelConfig():input.config;
  if(!config) throw Object.assign(new Error('GPT-5.5 structured output provider not configured'),{code:'provider_not_configured'});
  if(config.provider==='codex-oauth'){
    const {access}=await getCodexAccessToken(config);
    const model=buildCodexModel(config.model);
    const prompt=`${input.prompt}\n\nReturn ONLY valid JSON for schema ${input.schemaName}. Do not wrap in markdown.\n\nJSON schema:\n${JSON.stringify(schemaToJsonSchema(input.schema))}`;
    const raw=await (input.codexCompleteImpl ?? complete)(model,{systemPrompt:input.system,messages:[{role:'user',content:prompt,timestamp:Date.now()}]},{apiKey:access,reasoningEffort:'none',textVerbosity:'low',timeoutMs:config.timeoutMs ?? 120000});
    if(raw.stopReason==='error') throw Object.assign(new Error(`Codex OAuth structured model request failed: ${raw.errorMessage ?? 'unknown error'}`),{code:'provider_failed',raw});
    const text=raw.content.filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('').trim();
    const parsed=input.schema.parse(extractJson(text));
    return {object:parsed,model:`openai-codex/${model.id}`,raw};
  }
  const fetchImpl=input.fetchImpl ?? fetch;
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),config.timeoutMs ?? 60000);
  try{
    const res=await fetchImpl(`${config.baseUrl}/chat/completions`,{method:'POST',headers:{...(config.apiKey?{authorization:`Bearer ${config.apiKey}`}:{ }),'content-type':'application/json'},body:JSON.stringify({model:config.model,messages:[{role:'system',content:input.system},{role:'user',content:input.prompt}],response_format:zodToResponseFormat(input.schemaName,input.schema),temperature:0.2}),signal:controller.signal} as any);
    if(!res.ok) throw Object.assign(new Error(`Structured model request failed: ${res.status}`),{code:'provider_failed',status:res.status,body:await res.text().catch(()=>null)});
    const raw=await res.json(); const content=raw?.choices?.[0]?.message?.content; const parsed=input.schema.parse(JSON.parse(content)); return {object:parsed,model:config.model,raw};
  }finally{ clearTimeout(timeout); }
}
