import { randomUUID, createHash } from 'node:crypto';

export type ConversationEvent={
  id:string;
  event_type:'request'|'attempt'|'human_critique'|'decision'|'fix'|'result'|'lesson';
  speaker:'user'|'assistant'|'system';
  quote:string;
  story_value:string;
  usable_public_quote:boolean;
};

function lines(text:string){ return String(text||'').split(/\r?\n+/).map(l=>l.trim()).filter(Boolean); }
function typeFor(line:string,speaker:ConversationEvent['speaker']):ConversationEvent['event_type']{
  const l=line.toLowerCase();
  if(speaker==='user' && /basura|inaceptable|malo|fail|fall[oó]|no sirve|horrible/.test(l)) return 'human_critique';
  if(speaker==='assistant' && /inaceptable|fall[oó]|no aceptable|ten[eé]s raz[oó]n/.test(l)) return 'lesson';
  if(/aplica|exacto|sí|yes|continue|sigue/.test(l)) return 'decision';
  if(/implement|fix|corrig|commit|despleg/.test(l)) return 'fix';
  if(/gener|render|candidate|video|qa|pass/.test(l)) return 'attempt';
  if(/aprend|causa|ra[ií]z|porque|xq/.test(l)) return 'lesson';
  return 'request';
}
function speakerFor(line:string):ConversationEvent['speaker']{
  const l=line.toLowerCase();
  if(l.startsWith('assistant:')||l.startsWith('agent:')) return 'assistant';
  if(l.startsWith('system:')) return 'system';
  return 'user';
}
function cleanQuote(line:string){ return line.replace(/^(user|assistant|agent|system)\s*:\s*/i,'').replace(/\s+/g,' ').trim().slice(0,240); }
function storyValue(type:ConversationEvent['event_type']){
  const map={request:'La historia nace de una petición real.',attempt:'Hubo un intento visible del sistema.',human_critique:'La crítica humana revela el estándar de calidad real.',decision:'Una decisión humana cambia el rumbo.',fix:'El sistema mejora a partir del feedback.',result:'El resultado crea evidencia de progreso.',lesson:'La causa raíz se vuelve una enseñanza publicable.'};
  return map[type];
}
export function extractConversationEvents(input:{job_id:string;conversation_text:string;max_events?:number}){
  const selected=lines(input.conversation_text).map(line=>{ const speaker=speakerFor(line); return {line,type:typeFor(line,speaker),speaker}; }).filter(x=>x.line.length>2 && !/^openclaw runtime context/i.test(x.line)).slice(-(input.max_events??18));
  const events=selected.map((x,idx)=>({id:`conv_event_${randomUUID()}`,event_type:x.type,speaker:x.speaker,quote:cleanQuote(x.line),story_value:storyValue(x.type),usable_public_quote:x.speaker==='user' && x.type==='human_critique'} satisfies ConversationEvent));
  const critique=events.find(e=>e.event_type==='human_critique');
  const decision=events.find(e=>e.event_type==='decision');
  const fix=events.find(e=>e.event_type==='fix');
  return {
    id:`conversation_evidence_${randomUUID()}`,
    job_id:input.job_id,
    source_hash:createHash('sha256').update(input.conversation_text).digest('hex'),
    created_at:new Date().toISOString(),
    narrative_spine:{
      hook:critique?.quote ?? events[0]?.quote ?? 'Una conversación real expuso un problema de calidad.',
      tension:critique?'El humano rechazó el resultado porque no cumplía criterio de producto.':'La conversación muestra una brecha entre output técnico y calidad humana.',
      turn:decision?.quote ?? 'Se decidió corregir la fuente y el proceso, no solo bloquear con QA.',
      payoff:fix?.quote ?? 'El sistema debe aprender de conversaciones reales para producir mejor contenido.'
    },
    events
  };
}
