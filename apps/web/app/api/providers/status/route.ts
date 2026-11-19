import { existsSync } from 'node:fs';
import { json } from '../../../lib/http';
const has=(k:string)=>Boolean(process.env[k]);
const mode=process.env.CONTENT_ENGINE_AI_MODE ?? 'codex_oauth';
function codexConfigured(){
  if(mode!=='codex_oauth') return false;
  if(has('CONTENT_ENGINE_CODEX_OAUTH_ACCESS_TOKEN')) return true;
  const path=process.env.CONTENT_ENGINE_CODEX_OAUTH_CREDENTIALS_PATH;
  return Boolean(path && existsSync(path));
}
export async function GET(){ return json({ providers:{ source_registry:{status:'configured'}, uploads:{status:'configured'}, mock:{status:'healthy'}, gpt55_structured_outputs:{status:mode==='codex_oauth'?(codexConfigured()?'configured':'not_configured'):(has('CONTENT_ENGINE_OPENAI_API_KEY')||has('OPENAI_API_KEY')?'configured':'not_configured'),model:process.env.CONTENT_ENGINE_GPT55_MODEL ?? 'gpt-5.5',auth:mode==='codex_oauth'?'direct_codex_oauth':'api_key'}, crewai:{status:'configured',mode}, pexels:{status:has('PEXELS_API_KEY')||has('PEXELS_KEY')?'configured':'not_configured'}, elevenlabs:{status:has('ELEVENLABS_API_KEY')?'configured':'not_configured'}, wavespeed:{status:has('WAVESPEED_API_KEY')?'configured':'not_configured'}, heygen:{status:has('HEYGEN_API_KEY')?'configured':'not_configured'}, youtube:{status:has('YOUTUBE_CLIENT_ID')&&has('YOUTUBE_CLIENT_SECRET')?'configured':'not_configured'} } }); }
