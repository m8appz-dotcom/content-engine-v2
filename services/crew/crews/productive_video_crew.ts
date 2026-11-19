import { randomUUID } from 'node:crypto';
import { ProductiveCrewRunSchema, type ProductiveCrewRun } from '../../../packages/core/src/schemas/productive-crew';

export const productiveVideoCrewRoles = ['creative_director','scriptwriter','storyboard_artist','video_producer','motion_designer','audio_producer','qa_editor'] as const;

function evidenceLabel(evidence:any[]){
  const publicEvidence=evidence.filter(e=>e.public_safe || e.privacy_level==='public');
  const visual=publicEvidence.find(e=>['screenshot','screen_recording','user_clip','project_asset'].includes(e.type)) ?? evidence[0];
  return visual?.title || visual?.description || visual?.id || 'la evidencia real disponible';
}
function beatKind(index:number){ return ['hook_question','proof_zoom','demo_action','benefit_stack','cta'][Math.min(index,4)] as any; }

export function runDeterministicProductiveCrew(input:{job_id:string;script?:any|null;angle?:any|null;evidence:any[]}):ProductiveCrewRun{
  const script=input.script?.script_json ?? input.script ?? null;
  const beats=(script?.beats?.length ? script.beats : [
    {beat_id:'beat_1',line:script?.hook ?? 'Abrir con la prueba más clara',evidence_ids:input.evidence.slice(0,1).map(e=>e.id)},
    {beat_id:'beat_2',line:'Mostrar cómo se transforma la prueba en historia',evidence_ids:input.evidence.slice(0,1).map(e=>e.id)},
    {beat_id:'beat_3',line:script?.cta ?? 'Cerrar con beneficio y siguiente paso',evidence_ids:input.evidence.slice(0,1).map(e=>e.id)}
  ]);
  const proof=evidenceLabel(input.evidence);
  const decisions=[
    ['creative_director','El video debe leerse como una mini-demostración editorial: prueba visible, transformación clara y cierre útil para negocio.','Un humano debe entender en segundos qué prueba existe, qué historia sale de ella y por qué importa.','Bloquea scripts planos; exige intención, forbidden reads y payoff antes del storyboard.',['script','storyboard','approval'],['intended viewer read explícito','forbidden reads','payoff humano'],['solo compliance JSON','captura repetida sin historia','aprobación sintética como publish real'],['scriptwriter','storyboard_artist']],
    ['scriptwriter','Reescribir beats como promesas visuales auditables, no como narración corporativa genérica.','El texto anterior era correcto pero sin tensión ni dirección audiovisual.','Cada beat debe decir qué se ve, qué se oye y por qué cambia respecto al beat anterior.',['script','audio'],['hook con tensión','líneas cortas narrables','beats con visual question'],['voiceover silencioso','frases largas imposibles de leer','claims sin evidencia'],['storyboard_artist','audio_producer']],
    ['storyboard_artist','Convertir cada beat en una escena con lectura propia: hook, proof zoom, demo/action, benefit stack y CTA.','La repetición de una sola captura mata el ritmo aunque sea evidencia real.','Storyboard debe tener escena, focal point, crop, secondary visual y razón editorial.',['storyboard','visuals','assets'],['shot type por beat','focal point','preview humano'],['timeline copiado del plan','misma captura misma escala','sin cambio visual'],['video_producer','motion_designer']],
    ['video_producer','Pedir o derivar b-roll/demo cuando una sola evidencia no alcanza para sostener todos los beats.','Un productor humano no rellenaría 30s solo con zooms de una captura.','Asset plan mínimo: visual primario por beat y secundario/b-roll cuando el primario se repite.',['assets','visuals'],['mínimo 3 variaciones visuales','demo capture o b-roll si hay software','asset manifest claro'],['broll_plan vacío por default','stock genérico como prueba','microtexto ilegible como escena principal'],['motion_designer','audio_producer']],
    ['motion_designer','Usar una librería de escenas semánticas en Remotion, no un layout genérico por índice.','El movimiento debe explicar, revelar o comparar; no decorar.','Cada beat elige scene template: hook, proof zoom, demo action, result reveal, benefit stack o CTA.',['motion','visuals'],['scene template por beat','movimiento con intención','safe-area real'],['pan/zoom repetido','captions cortados','negro/fade que parece placeholder'],['qa_editor']],
    ['audio_producer','El draft productivo requiere voz audible, música base y SFX mínimos; silencio solo es preview técnico.','Un MP4 silencioso no se percibe como video producido.','Plan de audio: voiceover_required=true, music cue y SFX por reveal/transición.',['audio'],['VO audible','música de cama','SFX en reveals'],['audio silent -91dB','voiceover solo texto','audio_quality fijo sin medición'],['qa_editor']],
    ['qa_editor','QA editorial confirma la intención humana, pero no sustituye decisiones de producción.','La corrección debe nacer en dirección, guion, storyboard, audio y motion.','Antes de render: revisar viewer read, variedad visual, audio plan y aprobación humana pendiente.',['qa','approval'],['criterio editorial antes del render','separar E2E técnico de publish real','comparar contra baseline v1'],['synthetic publish_ready','pass por existencia de MP4','QA como primera lectura humana'],[]]
  ].map(([role,decision,rationale,output_contract,affects,must_have,reject_if,handoff_to])=>({role,decision,rationale,output_contract,affects,must_have,reject_if,handoff_to})) as any;
  const beat_decisions=beats.map((beat:any,idx:number)=>({
    beat_id:String(beat.beat_id ?? `beat_${idx+1}`),
    beat_kind:beatKind(idx),
    viewer_read:idx===0?`Veo una prueba real: ${proof}; no una promesa vacía.`:idx===1?'Entiendo el detalle de la prueba y cómo se convierte en historia.':idx===beats.length-1?'Me queda claro el beneficio y qué acción sigue.':'Veo una decisión de producción diferente que avanza el argumento.',
    primary_visual:(beat.evidence_ids?.length?`Evidencia ${beat.evidence_ids[0]} como fuente principal`:`${proof} como fuente principal`),
    secondary_visual_or_broll:idx===0?'Título/hook cinético sobre prueba completa':idx===1?'Zoom/crop a detalle legible o screen-recording corto':'B-roll/demo/overlay semántico para evitar repetir la misma captura',
    motion_intent:idx===0?'reveal rápido y settle legible':idx===1?'push-in hacia detalle verificable':idx===beats.length-1?'snap a CTA con proof badge':'split/stack para conectar evidencia con beneficio',
    audio_intent:idx===0?'VO con hook + riser suave':idx===beats.length-1?'VO de cierre + hit suave':'VO clara + SFX corto en transición',
    vfx_intent:idx===0?'highlight de prueba real':idx===1?'marco luminoso sobre detalle':'badges/lines que conectan evidencia y claim',
    editorial_reason:String(beat.line ?? beat.narration ?? 'Este beat debe avanzar la historia con una lectura visual nueva.')
  }));
  return ProductiveCrewRunSchema.parse({
    id:`crew_${randomUUID()}`,job_id:input.job_id,script_id:script?.id ?? null,status:'productive_ready',mode:'deterministic_crew',created_at:new Date().toISOString(),roles:[...productiveVideoCrewRoles],
    intended_viewer_read:`Un dueño de pyme ve evidencia real (${proof}), entiende la transformación en historia y percibe control humano antes de publicar.`,
    forbidden_reads:['video silencioso terminado','captura repetida como relleno','JSON válido sin criterio humano','aprobación sintética presentada como humana','stock genérico como prueba principal'],
    editorial_strategy:'Producir primero una lectura humana fuerte: prueba completa, detalle verificable, transformación editorial, beneficio y CTA; después renderizar.',
    decisions,beat_decisions,
    asset_needs:['mínimo una fuente visual primaria por beat','b-roll/demo capture cuando se repite evidencia','preview humano de storyboard antes de render'],
    audio_needs:{voiceover_required:true,music_required:true,sfx_required:true,notes:'Draft productivo debe tener voz audible; música y SFX pueden ser simples, pero no silenciosos.'},
    approval_needs:{human_script_approval:true,human_storyboard_approval:true,synthetic_approval_allowed_for_publish:false},
    handoff_summary:'Crew productiva lista: dirección, guion, storyboard, producción, motion, audio y QA entregan decisiones concretas antes del render.'
  });
}

export function runProductiveVideoCrew(input:{job_id:string;script?:any|null;angle?:any|null;evidence:any[]}){
  return runDeterministicProductiveCrew(input);
}
