import { z } from 'zod';
import { generateStructuredObject } from '../packages/providers/src/ai/structured-output';

const SmokeSchema=z.object({ok:z.boolean(),model:z.string(),transport:z.literal('direct_codex_oauth'),summary:z.string().min(1)});
const result=await generateStructuredObject({
  schema:SmokeSchema,
  schemaName:'ContentEngineCodexSmoke',
  system:'You are a strict JSON generator. Return only JSON that matches the schema.',
  prompt:'Return ok true, model gpt-5.5, transport direct_codex_oauth, and a short summary that says direct OAuth Codex structured outputs work.'
});
console.log(JSON.stringify({ok:true,model:result.model,object:result.object},null,2));
