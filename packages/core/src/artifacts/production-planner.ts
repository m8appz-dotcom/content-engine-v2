import { randomUUID } from 'node:crypto';

const SCENE_TEMPLATE_BY_KIND:Record<string,string>={
  hook:'HookScene', hook_question:'HookScene',
  setup:'ContextSetupScene',
  proof:'ProofZoomScene', proof_zoom:'ProofZoomScene',
  tension:'RiskContrastScene', objection:'RiskContrastScene',
  reveal:'ResultRevealScene', result_reveal:'ResultRevealScene', demo_action:'DemoActionScene',
  benefit:'BenefitStackScene', benefit_stack:'BenefitStackScene',
  cta:'CtaScene'
};
const MUSIC_BY_KIND:Record<string,string>={hook:'soft_riser',setup:'low_bed',proof:'focus_pulse',tension:'dropout_tension',reveal:'short_rise_hit',benefit:'warm_momentum',cta:'resolve_hit'};
const SFX_BY_KIND:Record<string,string>={hook:'subtle_whoosh',setup:'none',proof:'focus_tick',tension:'low_tick',reveal:'reveal_hit',benefit:'stack_tick',cta:'soft_button_hit'};

function normalizeBeatKind(kind:string|undefined,idx:number,last:number){
  if(kind) return kind;
  if(idx===0) return 'hook';
  if(idx===1) return 'proof';
  if(idx===last) return 'cta';
  return 'benefit';
}
function sceneTemplate(kind:string){ return SCENE_TEMPLATE_BY_KIND[kind] ?? 'ProofDrivenScene'; }
function safeCrop(kind:string){
  if(kind==='hook'||kind==='hook_question') return {aspect_ratio:'9:16',safe_area:'mobile_9_16',crop:'full_evidence_with_headline_safe',focal_point:'largest legible proof area'};
  if(kind==='proof'||kind==='proof_zoom') return {aspect_ratio:'9:16',safe_area:'mobile_9_16',crop:'tight_detail_without_cutting_context',focal_point:'claim-supporting detail'};
  return {aspect_ratio:'9:16',safe_area:'mobile_9_16',crop:'balanced_proof_plus_overlay',focal_point:'proof detail and caption safe zone'};
}
function kindGroup(kind:string){ return kind.replace('_question','').replace('_zoom','').replace('_stack','').replace('_action',''); }
function uniqueEvidenceCount(scenes:any[]){ return new Set(scenes.flatMap(s=>s.evidence_ids ?? [])).size; }
function findPresenterAsset(evidence:any[]){ return evidence.find(e=>['presenter_asset','avatar_asset','talking_head_clip'].includes(e.type) && (e.path || e.url)) ?? null; }
function buildAvatarPlan(script:any,evidence:any[]){
  const decision=script.avatar_decision ?? {use_avatar:false,reason:'Creative Director did not request presenter/avatar.',presenter_role:'none',asset_required:false};
  const asset=findPresenterAsset(evidence);
  const enabled=Boolean(decision.use_avatar);
  return {
    enabled,
    role:enabled?(decision.presenter_role ?? 'trust_marker'):'none',
    reason:decision.reason ?? 'Avatar/presenter disabled by editorial direction.',
    asset_required:enabled || Boolean(decision.asset_required),
    asset_path:asset?.path ?? null,
    asset_url:asset?.url ?? null,
    asset_evidence_id:asset?.id ?? null,
    placement:enabled?'intro_bridge_or_cta_only':'disabled',
    allowed_scene_templates:enabled?['PresenterBridgeScene','CtaScene']:[],
    reject_if:enabled?['presenter asset missing','avatar used as filler','presenter covers visual proof','synthetic face implied as real person without disclosure']:['renderer invents a presenter despite disabled plan']
  };
}

export function createProductionPlanArtifact(input:{job_id:string;script:any;evidence:any[];productive_crew?:any|null}){
  const script=input.script.script_json ?? input.script;
  const crew=input.productive_crew?.artifact_json ?? input.productive_crew ?? null;
  const referencedEvidenceIds=new Set<string>();
  for(const beat of script.beats ?? []) for(const id of beat.evidence_ids ?? []) referencedEvidenceIds.add(id);
  for(const claim of script.claims ?? []) for(const id of claim.evidence_ids ?? []) referencedEvidenceIds.add(id);
  const evidence=input.evidence.filter(e=>referencedEvidenceIds.has(e.id));
  if(evidence.length===0) throw Object.assign(new Error('Approved script has no referenced evidence for production plan'),{code:'business_validation_failed'});
  const unsafe=evidence.filter(e=>!['owned','licensed','generated','authorized'].includes(e.rights_status) || e.privacy_level==='restricted');
  if(unsafe.length) throw Object.assign(new Error('Production plan blocked by unsafe evidence rights/privacy'),{code:'business_validation_failed',details:{unsafe:unsafe.map(e=>e.id)}});
  const beatDecisions=new Map((crew?.beat_decisions??[]).map((d:any)=>[d.beat_id,d]));
  const beats=script.beats ?? [];
  const scenes=beats.map((beat:any,idx:number)=>{
    const decision=beatDecisions.get(beat.beat_id) as any;
    const beat_kind=normalizeBeatKind(beat.beat_kind ?? decision?.beat_kind,idx,beats.length-1);
    const crop=safeCrop(beat_kind);
    const scene_template=sceneTemplate(beat_kind);
    const primary_visual=decision?.primary_visual ?? `Use evidence ${beat.evidence_ids?.[0] ?? evidence[0].id} as visible primary proof`;
    const secondary_visual_or_broll=decision?.secondary_visual_or_broll ?? beat.suggested_visual ?? 'Derive b-roll/demo crop before render if evidence repeats';
    const audio_intent=beat.audio_intent ?? decision?.audio_intent ?? 'Audible voiceover with light music bed and transition SFX.';
    return {
      id:`scene_${idx+1}`,
      beat_id:beat.beat_id,
      beat_kind,
      scene_template,
      time_start_sec:beat.time_start_sec,
      time_end_sec:beat.time_end_sec,
      voiceover_line:beat.line,
      visual_goal:beat.suggested_visual,
      evidence_ids:beat.evidence_ids ?? [],
      asset_strategy:'use_real_evidence_first_plus_required_secondary_visual',
      primary_visual,
      secondary_visual_or_broll,
      required_visual_sources:[primary_visual,secondary_visual_or_broll],
      motion_intent:decision?.motion_intent ?? beat.motion_intent ?? (idx===0?'proof reveal, then settle for readability':'motion must reveal, compare, or clarify the proof'),
      motion_note:decision?.motion_intent ?? beat.motion_intent ?? (idx===0?'proof reveal, then settle for readability':'motion must reveal, compare, or clarify the proof'),
      vfx_intent:decision?.vfx_intent ?? 'Use highlight/labels only to clarify the evidence; no decorative filler.',
      overlay_intent:beat_kind==='tension'?'show risk label and contrast against unsupported claim':beat_kind==='cta'?'human approval badge plus next step':'proof label and claim-support line',
      music_cue:{required:true,cue:MUSIC_BY_KIND[kindGroup(beat_kind)] ?? 'low_bed',duck_under_voiceover:true},
      sfx_cue:{required:(SFX_BY_KIND[kindGroup(beat_kind)] ?? 'none')!=='none',cue:SFX_BY_KIND[kindGroup(beat_kind)] ?? 'none'},
      audio_intent,
      caption_text:beat.line,
      first_frame_read:decision?.viewer_read ?? beat.why_it_matters ?? (idx===0?'Real project evidence is visible immediately with a clear curiosity/promise caption.':'The viewer sees a specific proof detail connected to the narration.'),
      composition_instruction:'Choose the semantic scene_template; visible proof remains primary, secondary visual/b-roll prevents repetition, crop to mobile-safe 9:16, and avoid placeholder panels.',
      safe_crop:crop,
      focal_point:crop.focal_point,
      why_this_shot_works:beat.why_it_matters ?? decision?.editorial_reason ?? 'Scene advances viewer understanding with a new visual and audio intention.',
      change_from_previous:beat.change_from_previous ?? (idx===0?'First visual contract.':`Switch from ${beats[idx-1]?.beat_kind ?? 'previous beat'} to ${beat_kind}.`),
      editorial_reason:beat.why_it_matters ?? decision?.editorial_reason ?? 'Scene must advance the viewer read, not just satisfy a schema.',
      forbidden_visuals:['empty dark card','generic stock as primary proof','cut-off captions','technical dashboard as unexplained report','silent finished video','same screenshot at same scale for every beat']
    };
  });
  const uniqueEvidence=uniqueEvidenceCount(scenes);
  const repeatedSingleEvidence=uniqueEvidence===1 && scenes.length>3;
  const derivedVisualsRequired=repeatedSingleEvidence?Math.max(3,Math.ceil(scenes.length/2)):Math.max(1,Math.ceil(scenes.length/3));
  const avatarPlan=buildAvatarPlan(script,input.evidence);
  const assetCoverage={
    unique_evidence_count:uniqueEvidence,
    scene_count:scenes.length,
    repeated_single_evidence:repeatedSingleEvidence,
    derived_visuals_required:derivedVisualsRequired,
    minimum_visual_sources_per_scene:2,
    coverage_note:repeatedSingleEvidence?'Only one evidence item supports many beats; plan requires derived b-roll/demo/crops before final render.':'Evidence coverage acceptable if secondary visuals are produced per scene.'
  };
  const broll_plan=scenes.map((s:any,idx:number)=>({scene_id:s.id,required:true,need:s.secondary_visual_or_broll,source_strategy:idx===0?'headline/proof framing':'derived crop, short demo capture, or semantic overlay backed by evidence',reason:s.why_this_shot_works}));
  const demo_capture_plan=scenes.filter((s:any)=>['setup','proof','reveal','demo_action'].includes(kindGroup(s.beat_kind)) || /demo|screen|capture|software|app|acción/i.test(`${s.secondary_visual_or_broll} ${s.primary_visual}`)).map((s:any)=>({scene_id:s.id,required:true,goal:s.secondary_visual_or_broll,minimum_duration_sec:2,reason:'Shows action/proof progression instead of static repetition.'}));
  return {
    id:`plan_${randomUUID()}`, job_id:input.job_id, script_id:script.id, scenes,
    productive_crew_id:crew?.id ?? null,
    creative_direction_id:script.creative_direction_id ?? null,
    intended_viewer_read:script.intended_viewer_read ?? crew?.intended_viewer_read ?? null,
    forbidden_reads:[...(script.forbidden_reads ?? []),...(crew?.forbidden_reads ?? [])],
    editorial_strategy:crew?.editorial_strategy ?? 'Evidence-first video with human-readable progression before render.',
    editorial_criteria:script.editorial_criteria ?? {must_read:[script.intended_viewer_read ?? 'viewer reads evidence-backed story with explicit human approval'],must_not_read:(script.forbidden_reads?.length?script.forbidden_reads:['silent video','unsupported claim','synthetic approval presented as human']),quality_bars:['evidence first','beat changes visual/audio','human approval explicit'],approval_questions:['Does the viewer read the intended message?'],qa_blockers:['editorial_criteria_missing']},
    production_contract:{version:'2.0',requires_scene_templates:true,requires_audio:true,requires_secondary_visuals:true,requires_human_storyboard_review:true},
    asset_coverage:assetCoverage,
    assets_needed:evidence.map(e=>({evidence_id:e.id,type:e.type,title:e.title,description:e.description,path:e.path,url:e.url,rights_status:e.rights_status,privacy_level:e.privacy_level,metadata_json:e.metadata_json})),
    screenshots_needed:evidence.filter(e=>e.type==='screenshot').map(e=>e.id),
    clips_needed:evidence.filter(e=>['screen_recording','user_clip'].includes(e.type)).map(e=>e.id),
    avatar_plan:avatarPlan,
    voiceover_plan:{source:'script_voiceover',duration_sec:script.duration_sec,needs_tts:true,audible_required:true,lines:scenes.map((s:any)=>({scene_id:s.id,text:s.voiceover_line,start_sec:s.time_start_sec,end_sec:s.time_end_sec}))},
    music_plan:{required:true,brief:'Light bed under VO; supports pace without overpowering speech.',cues:scenes.map((s:any)=>({scene_id:s.id,...s.music_cue}))},
    sfx_plan:{required:true,cues:scenes.map((s:any)=>({scene_id:s.id,...s.sfx_cue}))},
    vfx_plan:{required:true,cues:scenes.map((s:any)=>({scene_id:s.id,intent:s.vfx_intent,overlay_intent:s.overlay_intent}))},
    motion_plan:{required:true,cues:scenes.map((s:any)=>({scene_id:s.id,scene_template:s.scene_template,intent:s.motion_intent,safe_crop:s.safe_crop}))},
    caption_style:{position:'bottom_safe_area',case:'sentence',max_lines:2,high_contrast:true},
    broll_plan,
    demo_capture_plan,
    visual_rhythm:'Semantic scenes: hook, setup, proof, tension, reveal, benefit and CTA; each beat must change visual/audio intention.',
    handoff_to_storyboard:{must_show_per_beat:['scene_template','primary_visual','secondary_visual_or_broll','safe_crop','music_cue','sfx_cue','why_this_shot_works'],human_preview_required:true},
    rights_requirements:['Use only owned/licensed/generated/authorized evidence.','Keep attribution metadata for external assets.'],
    privacy_requirements:['Do not show restricted/private evidence.','Re-check public_safe before rendering draft.'],
    approval_requirements:{human_script_approval:crew?.approval_needs?.human_script_approval ?? true,human_storyboard_approval:crew?.approval_needs?.human_storyboard_approval ?? true,synthetic_approval_allowed_for_publish:false},
    approved_message_lock:{hook:script.hook,cta:script.cta,claims:script.claims.map((c:any)=>c.claim_text)}
  };
}
