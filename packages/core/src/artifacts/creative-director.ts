import { randomUUID } from 'node:crypto';
import { CreativeDirectionSchema, type CreativeDirection } from '../schemas/creative-direction';

function evidenceLabel(evidence:any[]){
  const visual=evidence.find(e=>['screenshot','screen_recording','user_clip','project_asset'].includes(e.type)) ?? evidence[0];
  return visual?.title || visual?.description || visual?.id || 'la evidencia disponible';
}
function hasMotionEvidence(evidence:any[]){ return evidence.some(e=>['screen_recording','user_clip'].includes(e.type)); }

export function createCreativeDirection(input:{job_id:string;angle?:any|null;evidence:any[]}):CreativeDirection{
  const angle=input.angle?.angle_json ?? input.angle ?? null;
  const proof=evidenceLabel(input.evidence);
  const motion=hasMotionEvidence(input.evidence);
  return CreativeDirectionSchema.parse({
    id:`creative_${randomUUID()}`,
    job_id:input.job_id,
    angle_id:angle?.id ?? null,
    created_at:new Date().toISOString(),
    created_by:'creative_director',
    intended_viewer_read:`Un dueño de pyme ve ${proof}, entiende la acción técnica detrás y cree que el contenido sale de pruebas reales, no de promesas.`,
    forbidden_reads:['video silencioso terminado','captura repetida como relleno','demo sin acción visible','claims de negocio sin prueba','aprobación sintética presentada como humana'],
    tone:'sharp_practical',
    rhythm:'fast_hook_proof_payoff',
    payoff:'El espectador entiende qué se hizo, por qué importa y qué decisión humana falta antes de publicar.',
    style_reference:'Content Engine v1 semantic scenes: hook, proof, demo/action, benefit, CTA; upgraded with v2 evidence-first constraints.',
    hook_strategy:'Abrir con una pregunta/tensión que prometa prueba inmediata, no una declaración corporativa.',
    retention_strategy:'Cada beat debe cambiar la lectura visual: prueba completa, detalle, acción/demo, beneficio y cierre.',
    proof_strategy:'La evidencia real aparece en el primer frame y cada claim se conecta a un visual legible.',
    avatar_decision:{use_avatar:false,reason:'No usar avatar por defecto; solo entra si aclara un punto que evidencia/demo no puede explicar.',presenter_role:'none',asset_required:false},
    demo_capture_decision:{required:!motion,reason:motion?'Ya existe clip/demo que puede sostener acción.':'Solo hay evidencia estática; pedir demo/screen recording o derivar micro-b-roll antes de un video final.',minimum_shots:motion?0:2},
    broll_decision:{required:true,reason:'La repetición de una sola captura reduce calidad percibida; cada beat necesita visual secundario o crop con propósito.',minimum_items:3},
    audio_decision:{voiceover_required:true,music_required:true,sfx_required:true,reason:'Un draft productivo no puede ser silencioso; la voz marca intención y los cues sostienen ritmo.'},
    script_constraints:['líneas cortas narrables','cada beat declara visual y sonido','hook promete prueba en los primeros segundos','CTA conecta con decisión humana o siguiente paso'],
    reject_script_if:['voiceover genérico corporativo','no cambia el visual por beat','no menciona qué evidencia sostiene el claim','puede renderizarse como captions sobre una sola captura'],
    editorial_criteria:{
      must_read:['evidencia real visible desde el inicio','cada claim nace de una prueba legible','hay una decisión humana antes de publicar'],
      must_not_read:['video silencioso terminado','captura repetida como relleno','aprobación sintética presentada como humana'],
      quality_bars:['primer frame con prueba real','cada beat cambia visual/audio','audio audible con VO música y SFX','storyboard revisable por humano'],
      approval_questions:['¿Se entiende la prueba sin leer logs?','¿Hay cambio real entre beats?','¿La aprobación humana es explícita y no sintética?','¿El audio sostiene intención y ritmo?'],
      qa_blockers:['missing_intended_viewer_read','forbidden_read_not_addressed','editorial_criteria_missing','same_visual_no_derivatives','silent_or_unverified_audio']
    },
    handoff_to_scriptwriter:'Escribe un guion con retención y producción integrada: qué se ve, qué se oye y por qué el beat avanza la historia.'
  });
}
