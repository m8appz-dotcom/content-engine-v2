import { randomUUID } from 'node:crypto';
import { StoryAngleSchema } from '../schemas/artifacts';

function scoreEvidence(e:any){ let score=20; if(['screenshot','screen_recording','demo_url','project_asset'].includes(e.type)) score+=25; if(e.public_safe) score+=15; if(['owned','licensed','generated','authorized'].includes(e.rights_status)) score+=15; if(e.privacy_level==='public') score+=10; if(e.title) score+=5; return Math.min(score,100); }

function conversationEvents(evidence:any[]){ return evidence.filter(e=>['conversation_excerpt','conversation_event','customer_quote','owner_note'].includes(e.type)).map(e=>{ try{return {...e,metadata:e.metadata_json?JSON.parse(e.metadata_json):e.metadata}}catch{return e} }); }
function conversationAngle(input:{job_id:string;evidence:any[];source_registry_snapshot_id?:string|null}){
  const conv=conversationEvents(input.evidence);
  if(!conv.length) return null;
  const critique=conv.find((e:any)=>e.metadata?.event_type==='human_critique') ?? conv[0];
  const decision=conv.find((e:any)=>e.metadata?.event_type==='decision') ?? conv[0];
  const fix=conv.find((e:any)=>e.metadata?.event_type==='fix') ?? conv[0];
  return StoryAngleSchema.parse({id:`angle_${randomUUID()}`,job_id:input.job_id,title:'De crítica humana a mejora real del sistema',what_we_did_with_ai_or_tech:`Usamos conversación real como evidencia: ${critique.title ?? critique.description ?? critique.id}`,goal:'Convertir feedback humano y decisiones reales en una historia verificable, no en contenido inventado.',impressive_method:'Conversation Evidence Connector extrae petición, intento, crítica, decisión, fix y resultado desde conversaciones reales.',why_method_is_impressive:'La historia nace del trabajo real: una mala salida, una crítica humana y una mejora concreta del pipeline.',benefits_for_smes:['Contenido basado en hechos reales del trabajo','Mejor criterio humano antes de publicar','Menos riesgo de videos genéricos o falsamente pulidos'],visual_evidence_ids:conv.slice(0,5).map((e:any)=>e.id),main_claims:['El contenido se puede generar desde conversaciones reales con crítica y decisión humana'],hook_potential:String(critique.title ?? critique.description ?? 'Una crítica humana revela el estándar real.'),risk_or_weakness:'Debe cuidar privacidad y no publicar citas sensibles sin permiso explícito.',privacy_risks:conv.filter((e:any)=>e.privacy_level!=='public').map((e:any)=>`Revisar privacidad de ${e.id}`),score:95,status:'candidate',acceptance_checklist:{has_ai_or_tech_action:true,has_goal:true,has_impressive_method:true,has_concrete_benefit:true,has_sme_relevance:true,has_visual_evidence:true},source_registry_snapshot_id:input.source_registry_snapshot_id??null});
}
export function generateEvidenceBackedAngles(input:{job_id:string;evidence:any[];source_registry_snapshot_id?:string|null;count?:number}){
  const convAngle=conversationAngle(input);
  const visual=input.evidence.filter(e=>['screenshot','screen_recording','demo_url','project_asset','user_clip'].includes(e.type));
  const usable=visual.filter(e=>Boolean(e.public_safe) && ['owned','licensed','generated','authorized'].includes(e.rights_status));
  if(usable.length===0){ if(convAngle) return [convAngle]; throw Object.assign(new Error('No public-safe visual evidence available for story angles'),{code:'business_validation_failed'}); }
  const top=[...usable].sort((a,b)=>scoreEvidence(b)-scoreEvidence(a)).slice(0,3);
  const templates=[
    ['De evidencia real a video publicable','Convertimos evidencia real del proyecto en una historia verificable para pymes.','Evitar contenido genérico o claims inventados.','Pipeline con Source Registry, evidencia allowlisted y gates de aprobación.','El método reduce el riesgo de publicar afirmaciones sin respaldo porque cada claim debe mapear a evidencia.'],
    ['Un sistema que no deja pasar claims flojos','Construimos una base donde los guiones nacen de evidencia y pasan por validación antes de producir video.','Mantener credibilidad pública mientras se escala producción de contenido.','Schemas Zod, estados de job y Gate A antes de storyboard/render.','El método es fuerte porque bloquea producción cuando falta evidencia o aprobación.'],
    ['Contenido para pymes desde trabajo real, no humo','Usamos assets y notas reales del trabajo de M8 Apps para encontrar ángulos concretos.','Mostrar capacidades técnicas sin lenguaje interno ni exageración.','Story Miner limitado por evidencia visual pública y derechos claros.','El método fuerza que la historia se pueda enseñar con prueba visible, no solo con copy.']
  ];
  const generated=templates.slice(0,input.count??3).map((t,i)=>{
    const ev=top[i%top.length];
    const angle={
      id:`angle_${randomUUID()}`,
      job_id:input.job_id,
      title:t[0], what_we_did_with_ai_or_tech:t[1], goal:t[2], impressive_method:t[3], why_method_is_impressive:t[4],
      benefits_for_smes:['Más confianza al publicar contenido técnico','Menos riesgo de prometer resultados no comprobados','Proceso repetible para convertir trabajo real en marketing'],
      visual_evidence_ids:[ev.id], main_claims:['El contenido se genera desde evidencia pública segura y allowlisted'], hook_potential:'Buen hook si se muestra el antes/después del flujo con pantalla real.', risk_or_weakness: usable.length<3?'Poca variedad visual; puede sentirse repetitivo.':'Debe evitar lenguaje interno y métricas no probadas.', privacy_risks: top.filter(x=>x.privacy_level!=='public').map(x=>`Revisar privacidad de ${x.id}`), score: scoreEvidence(ev), status:'candidate' as const,
      acceptance_checklist:{has_ai_or_tech_action:true,has_goal:true,has_impressive_method:true,has_concrete_benefit:true,has_sme_relevance:true,has_visual_evidence:true},
      source_registry_snapshot_id:input.source_registry_snapshot_id??null
    };
    return StoryAngleSchema.parse(angle);
  });
  return convAngle?[convAngle,...generated].slice(0,input.count??3):generated;
}
