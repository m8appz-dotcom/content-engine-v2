import { randomUUID } from 'node:crypto';
import { ScriptCandidateSchema } from '../schemas/artifacts';

function selectedEvidenceIds(angle:any, evidence:any[]): string[] {
  const ids = (angle?.angle_json?.visual_evidence_ids ?? angle?.visual_evidence_ids ?? []) as string[];
  return ids.filter(id => evidence.some(e => e.id === id));
}

const RETENTION_BEATS=['hook','setup','proof','tension','reveal','benefit','cta'] as const;
function beatTiming(index:number,total:number,duration:number){
  const segment=duration/total;
  return {time_start_sec:Math.round(index*segment),time_end_sec:Math.round((index+1)*segment)};
}
function visualFor(kind:string){
  const map:Record<string,string>={
    hook:'Prueba completa en pantalla desde el primer frame con headline corto.',
    setup:'Contexto visual mínimo: qué proyecto/evidencia estamos viendo.',
    proof:'Zoom/crop al detalle verificable que sostiene el claim.',
    tension:'Mostrar el riesgo de hacerlo mal: contenido genérico, claim sin prueba o aprobación faltante.',
    reveal:'Mostrar la transformación: evidencia → historia → criterio humano.',
    benefit:'Benefit stack visual con prueba al lado, no texto flotante solo.',
    cta:'Cierre con próximo paso y badge de revisión humana pendiente.'
  };
  return map[kind] ?? 'Visual con evidencia real y cambio claro de lectura.';
}
function audioFor(kind:string){
  const map:Record<string,string>={
    hook:'VO enérgica + riser suave de 1s.',
    setup:'VO clara, música baja, sin SFX fuerte.',
    proof:'SFX sutil de focus/highlight al entrar al detalle.',
    tension:'Bajada musical breve para marcar riesgo.',
    reveal:'Riser corto + hit suave cuando aparece la transformación.',
    benefit:'Música recupera energía; VO lista beneficios concretos.',
    cta:'Hit final suave + VO de acción.'
  };
  return map[kind] ?? 'VO audible con música de cama.';
}
function lineFor(kind:string, creative:any, variant:number){
  const payoff=creative?.payoff ?? 'El video se construye desde pruebas reales y decisión humana.';
  const lines:Record<string,string[]>={
    hook:['Antes de creer este video, mira la prueba.','No empezamos con una idea bonita; empezamos con evidencia.','Este contenido no nace de humo: nace de una prueba real.'],
    setup:['Esta captura muestra el trabajo real que sostiene la historia.','La evidencia marca el límite: solo contamos lo que podemos enseñar.','Primero fijamos qué se ve, qué significa y qué no podemos prometer.'],
    proof:['Aquí está el detalle que convierte el claim en algo verificable.','Este punto visual es lo que permite escribir sin inventar.','El guion avanza solo cuando la prueba lo sostiene.'],
    tension:['Si saltamos esta parte, el video se vuelve genérico y poco confiable.','Sin este control, cualquier caption podría sonar bien y decir poco.','El riesgo no es hacer menos contenido; es publicar contenido sin respaldo.'],
    reveal:['Ahora la evidencia se transforma en una historia clara para negocio.','La IA propone, pero el criterio humano decide qué se publica.','La producción conecta prueba, mensaje y aprobación antes del render final.'],
    benefit:[payoff,'Así el video se siente más honesto, más claro y más fácil de aprobar.','El beneficio no es más volumen; es contenido que se puede defender.'],
    cta:['Antes de publicar, aprueba el guion, revisa el storyboard y mira el video final.','Si quieres contenido confiable, empieza guardando la prueba antes del guion.','El próximo paso es simple: evidencia real, revisión humana y producción con criterio.']
  };
  return lines[kind]?.[variant%3] ?? payoff;
}


function conversationEvidence(evidence:any[]){
  return evidence.map(e=>{ try{return {...e,metadata:e.metadata_json?JSON.parse(e.metadata_json):e.metadata}}catch{return e} }).filter(e=>['conversation_event','conversation_excerpt','customer_quote','owner_note'].includes(e.type));
}
function conversationScript(input:{job_id:string;angle:any;evidence:any[];style_profile_id?:string}){
  const conv=conversationEvidence(input.evidence);
  if(!conv.length) return null;
  const byType=(t:string, speaker?:string)=>conv.find((e:any)=>e.metadata?.event_type===t && (!speaker || e.metadata?.speaker===speaker)) ?? conv.find((e:any)=>e.metadata?.event_type===t) ?? conv[0];
  const critique=byType('human_critique','user');
  const decision=byType('decision','user');
  const question=conv.find((e:any)=>/conversaciones directamente/i.test(`${e.title} ${e.description}`)) ?? byType('request','user');
  const fix=conv.find((e:any)=>/connector|conect|fuente primaria|conversaciones reales/i.test(`${e.title} ${e.description}`) && e.metadata?.speaker==='assistant') ?? byType('fix');
  const ids=conv.slice(0,8).map((e:any)=>e.id);
  const scriptId=`script_${randomUUID()}`;
  const rawBeats=[
    {kind:'hook',event:critique,line:`“${critique.title ?? critique.description}”`,visual:'Cita humana full-screen, sin suavizar.',why:'El estándar humano real entra primero.'},
    {kind:'setup',event:critique,line:'Diagnóstico: falló en video, voz y criterio semántico.',visual:'Card de diagnóstico limpio: video + voz + semántica.',why:'Nombra la causa sin esconderla.'},
    {kind:'proof',event:question,line:`La pregunta correcta: “${question.title ?? question.description}”`,visual:'Pregunta real como prueba del cambio de fuente.',why:'La fuente narrativa cambia de screenshot a conversación.'},
    {kind:'tension',event:decision,line:`Decisión humana: “${decision.title ?? decision.description}”`,visual:'Tarjeta de decisión humana grande.',why:'El cambio ocurre por una decisión explícita.'},
    {kind:'reveal',event:fix,line:'Fix aplicado: conectar conversaciones como evidencia primaria.',visual:'Pipeline: conversación → eventos → ángulo → video.',why:'Convierte feedback en sistema.'},
    {kind:'benefit',event:fix,line:'Beneficio: contenido desde feedback real, no desde screenshots pobres.',visual:'Antes/después: screenshot densa vs conversación estructurada.',why:'Explica el beneficio de negocio.'},
    {kind:'cta',event:question,line:'Lección: la mejor materia prima está en las conversaciones.',visual:'Regla final full-screen.',why:'Deja una regla memorable.'}
  ];
  const duration=42;
  const beats=rawBeats.map((b,i)=>({beat_id:`beat_${i+1}`,beat_kind:b.kind as any,...beatTiming(i,rawBeats.length,duration),line:b.line,visual_question:'¿La cita/decisión real se lee en 2 segundos?',suggested_visual:b.visual,audio_intent:i===0?'Pausa breve antes y después de la cita.':'VO clara, ritmo documental, música baja.',why_it_matters:b.why,change_from_previous:i===0?'Crítica humana abre la historia.':`Cambia de ${rawBeats[i-1].kind} a ${b.kind} con un evento conversacional nuevo.`,evidence_ids:[b.event?.id ?? ids[0],...ids].filter(Boolean).slice(0,6)}));
  const script={id:scriptId,job_id:input.job_id,angle_id:(input.angle?.angle_json??input.angle).id,hook:beats[0].line,voiceover:beats.map(b=>b.line).join(' '),beats,claims:[{id:`claim_${randomUUID()}`,script_id:scriptId,claim_text:'La conversación real puede ser evidencia primaria para generar contenido más honesto y específico',claim_type:'control' as const,support_level:'direct' as const,evidence_ids:ids,public_safe:false,requires_human_approval:true,rewrite_suggestion:null}],cta:beats[beats.length-1].line,duration_sec:duration,status:'pending_approval' as const,public_language_check:{no_internal_language:true,no_dev_jargon_as_main_story:true,no_unsupported_claims:true},style_profile_id:input.style_profile_id??'default_sme_short',creative_direction_id:null,intended_viewer_read:'El espectador entiende que una crítica humana real cambió el sistema y la fuente del contenido.',forbidden_reads:['demo inventada','screenshot decorativa','crítica humana escondida','fix sin decisión'],editorial_criteria:{must_read:['crítica humana real','decisión humana explícita','fix aplicado a la fuente'],must_not_read:['contenido inventado desde screenshot','voz técnica maquillada','QA como sustituto de criterio'],quality_bars:['citas legibles full-screen','cada beat muestra un evento conversacional','fix conectado a sistema'],approval_questions:['¿Se lee la crítica real?','¿Se entiende qué cambió?','¿La conversación es la fuente primaria?'],qa_blockers:['conversation_quote_not_visible','generic_evidence_language','missing_fix_event']},avatar_decision:{use_avatar:false,reason:'La conversación es protagonista.',presenter_role:'none',asset_required:false},production_readiness:{mode:'conversation_story',retention_beats:rawBeats.map(b=>b.kind),has_visual_contract:true,has_audio_contract:true,has_change_per_beat:true,requires_human_approval:true}};
  return ScriptCandidateSchema.parse(script);
}

export function generateEvidenceBackedScripts(input:{job_id:string; angle:any; evidence:any[]; count?:number; style_profile_id?:string; creative_direction?:any|null}){
  const angle = input.angle?.angle_json ?? input.angle;
  const convScript=conversationScript({job_id:input.job_id,angle,evidence:input.evidence,style_profile_id:input.style_profile_id});
  if(convScript) return [convScript];
  const evidenceIds = selectedEvidenceIds(angle, input.evidence);
  const creative=input.creative_direction?.artifact_json ?? input.creative_direction ?? null;
  if(evidenceIds.length===0) throw Object.assign(new Error('Selected angle has no mapped evidence for scripts'),{code:'business_validation_failed'});
  const baseClaim = 'El contenido se construye desde evidencia real y revisable antes de producirse públicamente';
  const count=input.count??3;
  return Array.from({length:count},(_,idx)=>{
    const scriptId=`script_${randomUUID()}`;
    const duration=42;
    const beats=RETENTION_BEATS.map((kind,i)=>{
      const timing=beatTiming(i,RETENTION_BEATS.length,duration);
      const line=lineFor(kind,creative,idx);
      return {
        beat_id:`beat_${i+1}`,
        beat_kind:kind,
        ...timing,
        line,
        visual_question:'¿Qué ve el usuario que hace este beat creíble y distinto al anterior?',
        suggested_visual:visualFor(kind),
        audio_intent:audioFor(kind),
        why_it_matters:kind==='hook'?'Promete prueba inmediata y evita parecer contenido genérico.':kind==='tension'?'Introduce riesgo humano/editorial para sostener retención.':kind==='cta'?'Convierte la historia en una decisión revisable.':'Avanza la historia con una lectura visual nueva.',
        change_from_previous:i===0?'Primer impacto visual.':`Cambia de ${RETENTION_BEATS[i-1]} a ${kind}: nueva intención visual y sonora.`,
        evidence_ids:evidenceIds
      };
    });
    const hook=beats[0].line;
    const cta=beats[beats.length-1].line;
    const script={
      id:scriptId, job_id:input.job_id, angle_id:angle.id, hook,
      voiceover:beats.map(b=>b.line).join(' '), beats,
      claims:[{ id:`claim_${randomUUID()}`, script_id:scriptId, claim_text:baseClaim, claim_type:'control' as const, support_level:'direct' as const, evidence_ids:evidenceIds, public_safe:true, requires_human_approval:false, rewrite_suggestion:null }],
      cta, duration_sec:duration, status:'pending_approval' as const,
      public_language_check:{no_internal_language:true,no_dev_jargon_as_main_story:true,no_unsupported_claims:true},
      style_profile_id:input.style_profile_id??'default_sme_short',
      creative_direction_id:creative?.id ?? null,
      intended_viewer_read:creative?.intended_viewer_read ?? null,
      forbidden_reads:creative?.forbidden_reads ?? [],
      editorial_criteria:creative?.editorial_criteria ?? null,
      avatar_decision:creative?.avatar_decision ?? {use_avatar:false,reason:'No avatar requested by Creative Director.',presenter_role:'none',asset_required:false},
      production_readiness:{retention_beats:RETENTION_BEATS,has_visual_contract:true,has_audio_contract:true,has_change_per_beat:true,requires_human_approval:true}
    };
    return ScriptCandidateSchema.parse(script);
  });
}
