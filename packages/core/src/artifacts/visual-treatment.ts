import { randomUUID } from 'node:crypto';

const TREATMENTS=['full_screenshot_hero','context_crop','detail_callout','risk_comparison','result_bridge','benefit_checklist','human_decision_card'] as const;
const TITLES:Record<string,string>={hook:'Prueba real',setup:'Contexto claro',proof:'Detalle verificable',tension:'Riesgo sin prueba',reveal:'De evidencia a historia',benefit:'Beneficio defendible',cta:'Decisión humana'};
const TEXT:Record<string,string>={hook:'Prueba real',setup:'Qué estamos viendo',proof:'Detalle verificable',tension:'Sin prueba, no publica',reveal:'Evidencia → historia',benefit:'Claim defendible',cta:'Revisión humana'};
const FOCAL:Record<string,string>={hook:'full evidence screen, scaled to be legible',setup:'top navigation and page context',proof:'central proof/detail area, enlarged',tension:'proof vs unsupported claim contrast',reveal:'evidence-to-story bridge area',benefit:'checklist/benefit area next to proof',cta:'approval/status/next-step area'};
const LAYOUT:Record<string,string>={hook:'hero_proof_card',setup:'context_summary_card',proof:'proof_zoom_card',tension:'risk_split_card',reveal:'transformation_diagram',benefit:'benefit_checklist',cta:'human_review_card'};
const PURPOSE:Record<string,string>={hook:'reveal',setup:'orient',proof:'magnify',tension:'compare',reveal:'connect',benefit:'stack',cta:'decide'};

function cleanText(value:string,maxWords=6){
  return String(value||'').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/scene|template/ig,'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).slice(0,maxWords).join(' ');
}
function kind(scene:any,idx:number,last:number){
  const raw=String(scene.beat_kind ?? scene.scene_template ?? '').toLowerCase();
  if(raw.includes('hook')) return 'hook';
  if(raw.includes('setup')||idx===1) return 'setup';
  if(raw.includes('proof')||idx===2) return 'proof';
  if(raw.includes('tension')||raw.includes('risk')) return 'tension';
  if(raw.includes('reveal')||raw.includes('result')) return 'reveal';
  if(raw.includes('benefit')) return 'benefit';
  if(raw.includes('cta')||idx===last) return 'cta';
  return 'proof';
}
function evidenceTitle(evidence:any[]){
  const ev=evidence.find(e=>e.title || e.description) ?? evidence[0];
  return cleanText(ev?.title || ev?.description || 'evidencia real',5) || 'evidencia real';
}

function conversationEvidence(evidence:any[]){ return evidence.map(e=>{ try{return {...e,metadata:e.metadata_json?JSON.parse(e.metadata_json):e.metadata}}catch{return e} }).filter(e=>['conversation_event','conversation_excerpt','customer_quote','owner_note'].includes(e.type)); }
function conversationRecipes(input:{job_id:string;script:any;production_plan:any;evidence:any[]}){
  const conv=conversationEvidence(input.evidence);
  if(!conv.length || input.script.production_readiness?.mode!=='conversation_story') return null;
  const scenes=input.production_plan.scenes ?? [];
  const byId=(ids:any[])=>{ for(const id of (ids??[])){ const found=conv.find((e:any)=>e.id===id || e.evidence_id===id); if(found) return found; } return null; };
  const layouts=['quote_card','diagnosis_card','source_shift_card','decision_card','fix_pipeline_card','before_after_card','lesson_card'];
  const titles=['Crítica real','Diagnóstico','Nueva fuente','Decisión humana','Fix aplicado','Beneficio','Lección'];
  return scenes.map((scene:any,idx:number)=>{
    const ev=byId(scene.evidence_ids) ?? conv[Math.min(idx,conv.length-1)] ?? conv[0];
    const quote=idx===1?'Falló en video, voz y criterio semántico.':idx===2?'La fuente correcta era la conversación, no una captura pobre.':idx===3?'Exacto, aplica el fix':idx===4?'Conector de evidencia conversacional':idx===5?'Feedback real, menos dependencia de screenshots pobres.':idx===6?'La mejor señal está en la conversación.':String(ev.title ?? ev.description ?? scene.voiceover_line ?? '').slice(0,220);
    const foreground=titles[idx] ?? 'Conversación real';
    return {scene_id:scene.id,beat_id:scene.beat_id,beat_kind:scene.beat_kind,human_scene_title:foreground,foreground_text:foreground,focal_area:'conversation quote as primary visual',evidence_treatment:'conversation_quote_card',viewer_read:idx===0?'Una crítica humana real cambió el estándar.':idx===3?'Una decisión humana ordenó aplicar el fix.':idx===4?'El feedback se convirtió en un conector del sistema.':idx===5?'El contenido ahora nace de feedback real.':'La conversación es la evidencia primaria.',visual_change_from_previous:idx===0?'Abrir con la cita humana sin suavizar.':'Mostrar un nuevo evento conversacional en orden causal.',needs_new_capture:false,max_caption_words:10,layout_treatment:{version:'layout_treatment_v1',layout_type:layouts[idx] ?? 'quote_card',dominant_element:'conversation_quote',source_screenshot_role:'not_visible',safe_margin_px:96,min_proof_area_percent:70,visual_hierarchy_order:[foreground,'quote','meaning'],proof_module:{title:foreground,value:quote,support_text:scene.voiceover_line ?? quote,event_type:ev.metadata?.event_type ?? 'conversation_event'},text_zones:[{role:'title',text:foreground,max_chars:28,x:96,y:140,w:888,h:130},{role:'quote',text:quote,max_chars:180,x:96,y:360,w:888,h:720}],motion_purpose:idx===0?'reveal':idx===3?'decide':idx===4?'connect':'explain',forbidden_reads:['tiny quote','generic evidence label','screenshot wallpaper','hidden human critique','more than three competing elements']},forbidden:['technical template names visible','tiny quote','generic evidence label','screenshot wallpaper']};
  });
}
function visualObservations(evidence:any[]){
  const label=evidenceTitle(evidence);
  return [
    `La fuente visual principal es ${label}.`,
    'La pieza necesita una vista completa inicial para establecer confianza.',
    'Después necesita un detalle ampliado que convierta el claim en prueba visible.',
    'Si se reutiliza la misma captura, cada repetición debe cambiar escala, foco o función narrativa.',
    'El cierre debe mostrar decisión humana pendiente, no publicar automático.'
  ];
}

export function createVisualTreatmentArtifact(input:{job_id:string;script:any;production_plan:any;evidence:any[]}){
  const script=input.script.script_json ?? input.script;
  const plan=input.production_plan.plan_json ?? input.production_plan;
  const scenes=plan.scenes ?? [];
  if(!scenes.length) throw Object.assign(new Error('Visual treatment requires production plan scenes'),{code:'business_validation_failed'});
  const convRecipes=conversationRecipes({job_id:input.job_id,script,production_plan:plan,evidence:input.evidence});
  const hero=evidenceTitle(input.evidence);
  const recipes=convRecipes ?? scenes.map((scene:any,idx:number)=>{
    const k=kind(scene,idx,scenes.length-1);
    const foreground=TEXT[k] ?? cleanText(scene.caption_text || scene.voiceover_line || k,6);
    const humanTitle=TITLES[k] ?? foreground;
    return {
      scene_id:scene.id,
      beat_id:scene.beat_id,
      beat_kind:k,
      human_scene_title:humanTitle,
      foreground_text:foreground,
      focal_area:FOCAL[k] ?? 'legible evidence detail',
      evidence_treatment:TREATMENTS[Math.min(idx,TREATMENTS.length-1)],
      layout_treatment:{
        version:'layout_treatment_v1',
        layout_type:LAYOUT[k] ?? 'proof_zoom_card',
        dominant_element:k==='proof'?'proof_module':k==='tension'?'risk_message':k==='cta'?'human_decision':'headline',
        source_screenshot_role:k==='hook'?'background_reference':k==='proof'?'cropped_detail':k==='tension'?'supporting_reference':'supporting_reference',
        safe_margin_px:96,
        min_proof_area_percent:k==='proof'?50:30,
        visual_hierarchy_order:[foreground,'proof module',k==='cta'?'human decision':'supporting evidence'].slice(0,3),
        proof_module:{title:foreground,value:k==='cta'?'Revisión pendiente':k==='tension'?'No publicar sin prueba':k==='benefit'?'Claim defendible':'Evidencia visible',support_text:k==='proof'?'Detalle ampliado y legible':`Basado en ${hero}`},
        text_zones:[{role:'title',text:foreground,max_chars:28,x:96,y:150,w:888,h:170},{role:'support',text:k==='tension'?'Sin prueba, no publica':k==='cta'?'Humano decide antes de publicar':'Prueba visible y verificable',max_chars:64,x:96,y:1350,w:888,h:260}],
        motion_purpose:PURPOSE[k] ?? 'reveal',
        forbidden_reads:['screenshot wallpaper','clutter','unreadable UI','cropped copy','more than three competing elements']
      },
      viewer_read:k==='hook'?`Veo ${hero} como prueba real desde el inicio.`:k==='proof'?'Entiendo qué detalle hace verificable el claim.':k==='tension'?'Entiendo el riesgo de publicar sin evidencia legible.':k==='cta'?'Sé que falta revisión humana antes de publicar.':`Entiendo una parte nueva de ${hero}.`,
      visual_change_from_previous:idx===0?'Vista completa de evidencia como punto de confianza.':k==='setup'?'Cambia de impacto a orientación del contexto.':k==='proof'?'Cambia a zoom/callout de detalle verificable.':k==='tension'?'Cambia a contraste de riesgo.':k==='reveal'?'Cambia a transformación evidencia-historia.':k==='benefit'?'Cambia a checklist de beneficios defendibles.':'Cambia a tarjeta de decisión humana.',
      needs_new_capture:false,
      max_caption_words:10,
      forbidden:[
        'technical template names visible',
        'same screenshot same scale',
        'foreground text longer than six words',
        'caption collision with evidence',
        'proof too small to inspect'
      ]
    };
  });
  return {
    id:`visual_treatment_${randomUUID()}`,
    job_id:input.job_id,
    script_id:script.id,
    production_plan_id:plan.id,
    mode:'deterministic_visual_producer_v1',
    hero_evidence_read:`En 2 segundos debe leerse: ${hero} es evidencia real, no relleno ni stock.`,
    visual_observations:visualObservations(input.evidence),
    scene_shot_recipes:recipes,
    production_rule:'El renderer debe construir planos desde shot recipes; scene_template es solo layout, nunca copy visible.',
    copy_rule:'No mostrar nombres técnicos. Foreground máximo 6 palabras; caption máximo 10 palabras en pantalla.',
    repetition_rule:'Si hay una sola evidencia, usar secuencia humana: completa, contexto, detalle, riesgo, transformación, beneficio, decisión.'
  };
}
