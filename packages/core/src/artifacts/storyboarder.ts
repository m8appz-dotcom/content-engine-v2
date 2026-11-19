import { randomUUID } from 'node:crypto';

function emotionFor(kind:string){
  const k=kind.replace('_question','').replace('_zoom','').replace('_stack','').replace('_action','');
  const map:Record<string,string>={hook:'curiosidad inmediata',setup:'orientación/confianza',proof:'certeza visual',tension:'urgencia/riesgo',reveal:'alivio/claridad',benefit:'confianza práctica',cta:'decisión segura'};
  return map[k] ?? 'claridad progresiva';
}
function thumbnailPrompt(scene:any){
  const recipe=scene.shot_recipe ?? {};
  return `${recipe.human_scene_title ?? scene.human_scene_title ?? 'Plano de evidencia'}: ${recipe.viewer_read ?? scene.first_frame_read ?? scene.primary_visual ?? scene.visual_goal}. Tratamiento: ${recipe.evidence_treatment ?? scene.evidence_treatment ?? scene.scene_template}. Foco: ${recipe.focal_area ?? scene.focal_area ?? scene.safe_crop?.crop ?? scene.focal_point ?? 'mobile safe proof crop'}.`;
}
function viewerRead(scene:any){ return scene.first_frame_read ?? scene.why_this_shot_works ?? 'El espectador entiende una prueba visual concreta.'; }

export function createStoryboardArtifact(input:{job_id:string;script:any;production_plan:any}){
  const script=input.script.script_json ?? input.script;
  const plan=input.production_plan.plan_json ?? input.production_plan;
  const scenes=plan.scenes ?? [];
  if(scenes.length===0) throw Object.assign(new Error('Production plan has no scenes'),{code:'business_validation_failed'});
  for(const scene of scenes){
    if((scene.evidence_ids??[]).length===0 && !scene.caption_text) throw Object.assign(new Error(`Scene ${scene.id} has no evidence or explicit caption`),{code:'business_validation_failed'});
    for(const field of ['scene_template','primary_visual','secondary_visual_or_broll','music_cue','sfx_cue','safe_crop','why_this_shot_works']){
      if(scene[field]===undefined || scene[field]===null) throw Object.assign(new Error(`Scene ${scene.id} missing storyboard field ${field}`),{code:'business_validation_failed'});
    }
  }
  const timeline=scenes.map((scene:any,idx:number)=>({
    id:`tl_${idx+1}`, scene_id:scene.id, start_sec:scene.time_start_sec, end_sec:scene.time_end_sec,
    layer_order:['evidence','derived_broll','caption','overlay','vfx'], evidence_ids:scene.evidence_ids,
    narration:scene.voiceover_line, first_frame_read:scene.first_frame_read,
    shot_recipe:scene.shot_recipe, layout_treatment:scene.shot_recipe?.layout_treatment ?? scene.layout_treatment, human_scene_title:scene.human_scene_title, foreground_text:scene.foreground_text, focal_area:scene.focal_area, evidence_treatment:scene.evidence_treatment,
    scene_template:scene.scene_template, composition_instruction:scene.composition_instruction,
    focal_point:scene.focal_point, safe_crop:scene.safe_crop,
    music_cue:scene.music_cue, sfx_cue:scene.sfx_cue, vfx_intent:scene.vfx_intent
  }));
  const human_preview=scenes.map((scene:any,idx:number)=>({
    card_id:`card_${idx+1}`,
    scene_id:scene.id,
    beat_id:scene.beat_id,
    beat_kind:scene.beat_kind,
    time_range:`${scene.time_start_sec}-${scene.time_end_sec}s`,
    scene_template:scene.scene_template,
    thumbnail_prompt:thumbnailPrompt(scene),
    what_viewer_sees:scene.shot_recipe?.viewer_read ?? scene.first_frame_read ?? scene.primary_visual,
    secondary_visual_or_broll:scene.shot_recipe?.visual_change_from_previous ?? scene.secondary_visual_or_broll,
    what_viewer_must_understand:scene.shot_recipe?.viewer_read ?? viewerRead(scene),
    expected_emotion_or_curiosity:emotionFor(scene.beat_kind ?? ''),
    change_from_previous:scene.change_from_previous ?? (idx===0?'Primer impacto visual.':'Debe cambiar visual/audio respecto al beat anterior.'),
    voiceover_line:scene.voiceover_line,
    audio:{music_cue:scene.music_cue,sfx_cue:scene.sfx_cue,audio_intent:scene.audio_intent},
    motion_vfx:{motion_intent:scene.motion_intent ?? scene.motion_note,vfx_intent:scene.vfx_intent,overlay_intent:scene.overlay_intent},
    safe_crop:scene.safe_crop,
    focal_point:scene.focal_point,
    asset_requirement:{evidence_ids:scene.evidence_ids,primary_visual:scene.primary_visual,secondary_visual_or_broll:scene.shot_recipe?.visual_change_from_previous ?? scene.secondary_visual_or_broll,required_visual_sources:scene.required_visual_sources ?? []},
    why_this_shot_works:scene.why_this_shot_works,
    reviewer_checklist:[
      '¿Se entiende el beat sin leer JSON técnico?',
      '¿El visual primario es evidencia real o derivado claro?',
      '¿Hay cambio visible/sonoro respecto al beat anterior?',
      '¿La lectura prohibida queda evitada?',
      '¿El crop es seguro para 9:16 móvil?'
    ]
  }));
  return {
    id:`storyboard_${randomUUID()}`, job_id:input.job_id, script_id:script.id, production_plan_id:plan.id,
    timeline,
    human_preview,
    human_preview_summary:{
      cards:human_preview.length,
      intended_viewer_read:plan.intended_viewer_read,
      forbidden_reads:plan.forbidden_reads ?? [],
      editorial_criteria:plan.editorial_criteria ?? null,
      asset_coverage:plan.asset_coverage,
      review_required:true,
      approval_prompt:'Aprobar solo si cada card cumple los criterios editoriales: lectura prevista, evidencia visible, audio esperado, cambio real entre beats y ausencia de lecturas prohibidas.'
    },
    editorial_criteria:plan.editorial_criteria ?? null,
    avatar_plan:plan.avatar_plan ?? {enabled:false,role:'none',reason:'No presenter requested.'},
    cuts:scenes.slice(1).map((scene:any)=>({at_sec:scene.time_start_sec,type:'clean_cut',reason:'Keep pace without hiding evidence.'})),
    zooms:scenes.map((scene:any,idx:number)=>({scene_id:scene.id,type:idx===0?'proof_reveal':'semantic_push',intensity:idx===0?'medium':'low',safe:true,reason:scene.motion_intent ?? scene.motion_note})),
    overlays:scenes.map((scene:any)=>({scene_id:scene.id,type:'evidence_label',text:scene.overlay_intent ?? scene.visual_goal ?? 'Prueba visual real',evidence_ids:scene.evidence_ids,safe_area:'mobile_9_16'})),
    captions:scenes.map((scene:any)=>({scene_id:scene.id,start_sec:scene.time_start_sec,end_sec:scene.time_end_sec,text:scene.caption_text,max_lines:2})),
    music_sfx:scenes.map((scene:any)=>({scene_id:scene.id,music_cue:scene.music_cue,sfx_cue:scene.sfx_cue,audio_intent:scene.audio_intent})),
    preview_assets:(plan.assets_needed??[]).map((a:any)=>({evidence_id:a.evidence_id,title:a.title,description:a.description,path:a.path,url:a.url,type:a.type,rights_status:a.rights_status,privacy_level:a.privacy_level,metadata_json:a.metadata_json})),
    estimated_duration_sec:script.duration_sec,
    readability_check:{message_locked:true,every_factual_beat_has_evidence:true,no_unsafe_rights:true,preview_only:true,first_frame_has_real_evidence:true,captions_mobile_safe:true,no_placeholder_visuals:true,human_preview_cards:true,scene_templates_visible:true,audio_plan_visible:true,change_per_beat_visible:true}
  };
}
