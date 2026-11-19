import { randomUUID } from 'node:crypto';

export type AvatarRequirement='required'|'optional'|'forbidden';
export type ContractStatus='draft'|'active'|'superseded';

export type DeliverableContract={
  id:string;
  job_id:string;
  version:'deliverable_contract_v1';
  status:ContractStatus;
  created_at:string;
  updated_at:string;
  source:'default'|'human_ui'|'api';
  style_reference:{
    id:string;
    label:string;
    notes:string;
    must_use:boolean;
    forbidden_styles:string[];
  };
  required_assets:{
    real_app_clips:{required:boolean;min_count:number;accepted_types:string[];notes:string};
    broll:{required:boolean;min_count:number;accepted_types:string[];notes:string};
    avatar_presenter:{requirement:AvatarRequirement;notes:string};
    voiceover:{required:boolean;must_complete_before_video:boolean;derive_video_duration_from_audio:boolean;notes:string};
  };
  output_artifacts:{name:string;required:boolean;producer_role:string;consumer_role:string;description:string}[];
  agent_accountability:{role:string;must_produce:string[];cannot_satisfy_with:string[]}[];
  renderer_policy:{
    require_asset_id_per_beat:boolean;
    allow_generic_cards_as_primary:boolean;
    require_voiceover_timing:boolean;
    block_if_required_assets_missing:boolean;
  };
};

export function defaultDeliverableContract(input:{job_id:string;source?:DeliverableContract['source'];overrides?:Partial<DeliverableContract>}):DeliverableContract{
  const at=new Date().toISOString();
  const base:DeliverableContract={
    id:`contract_${randomUUID()}`,
    job_id:input.job_id,
    version:'deliverable_contract_v1',
    status:'active',
    created_at:at,
    updated_at:at,
    source:input.source ?? 'default',
    style_reference:{
      id:'impressed_v5_visual_story',
      label:'Impressed / v5 visual story style',
      notes:'Kinetic typography, distinct layouts by beat, chapter palette shifts, real before/after proof, one giant phrase + one main visual + one supporting detail. Avoid repeated dark cards.',
      must_use:true,
      forbidden_styles:['generic dark quote cards','same card layout every beat','microtext-heavy UI wallpaper','conversation cards as the whole video']
    },
    required_assets:{
      real_app_clips:{required:true,min_count:5,accepted_types:['screen_recording','user_clip','project_asset'],notes:'Clips must show the actual app/project, not abstract evidence cards.'},
      broll:{required:true,min_count:3,accepted_types:['screen_recording','user_clip','project_asset','generated_support_visual'],notes:'B-roll must advance a beat: demo, transition, before/after, proof detail, or workflow shot.'},
      avatar_presenter:{requirement:'optional',notes:'Use presenter/avatar when explanation benefits from a human face; do not invent one without asset.'},
      voiceover:{required:true,must_complete_before_video:true,derive_video_duration_from_audio:true,notes:'Render/measure full narration first; video duration follows audio instead of clipping VO to a fixed template.'}
    },
    output_artifacts:[
      {name:'style_reference.json',required:true,producer_role:'creative_director',consumer_role:'all_roles',description:'Approved visual style reference and forbidden styles.'},
      {name:'real_footage_manifest.json',required:true,producer_role:'video_producer',consumer_role:'storyboard_artist',description:'Paths/URLs/IDs for real app clips, b-roll, project assets, and optional avatar.'},
      {name:'shot_asset_map.json',required:true,producer_role:'storyboard_artist',consumer_role:'motion_designer',description:'Every beat maps to concrete asset IDs and intended viewer read.'},
      {name:'voiceover_timing.json',required:true,producer_role:'audio_producer',consumer_role:'motion_designer',description:'Measured narration duration, beat timing, pauses, and cutoff-safe ending.'}
    ],
    agent_accountability:[
      {role:'creative_director',must_produce:['style_reference_id','intended_viewer_read','forbidden_styles'],cannot_satisfy_with:['generic taste words','compliance-only criteria']},
      {role:'video_producer',must_produce:['real_footage_manifest','broll_manifest','avatar_asset_decision'],cannot_satisfy_with:['text saying b-roll is needed','stock/generic cards as primary proof']},
      {role:'storyboard_artist',must_produce:['beat_to_asset_id_map','shot_recipe_per_beat','visual_change_from_previous'],cannot_satisfy_with:['same primary visual repeated','abstract shot descriptions without asset IDs']},
      {role:'motion_designer',must_produce:['render_plan_using_asset_ids','layout/motion per beat'],cannot_satisfy_with:['template index only','caption/card decoration']},
      {role:'audio_producer',must_produce:['voiceover_timing','complete_audio_path','duration contract'],cannot_satisfy_with:['declared VO text only','fixed duration that cuts narration']}
    ],
    renderer_policy:{require_asset_id_per_beat:true,allow_generic_cards_as_primary:false,require_voiceover_timing:true,block_if_required_assets_missing:false}
  };
  return deepMerge(base,input.overrides ?? {}) as DeliverableContract;
}

function deepMerge(target:any, source:any):any{
  if(!source || typeof source!=='object') return target;
  const out=Array.isArray(target)?[...target]:{...target};
  for(const [key,value] of Object.entries(source)){
    if(value && typeof value==='object' && !Array.isArray(value) && target?.[key] && typeof target[key]==='object' && !Array.isArray(target[key])) out[key]=deepMerge(target[key],value);
    else out[key]=value;
  }
  return out;
}

export function summarizeContract(contract:DeliverableContract){
  return {
    style_reference_id:contract.style_reference.id,
    real_app_clips_required:contract.required_assets.real_app_clips.required,
    real_app_clips_min:contract.required_assets.real_app_clips.min_count,
    broll_required:contract.required_assets.broll.required,
    broll_min:contract.required_assets.broll.min_count,
    avatar_requirement:contract.required_assets.avatar_presenter.requirement,
    voiceover_required:contract.required_assets.voiceover.required,
    artifacts_required:contract.output_artifacts.filter(a=>a.required).map(a=>a.name),
    renderer_policy:contract.renderer_policy
  };
}

export type RequirementStatus='missing'|'ready'|'used';
export type DeliverableContractEvaluation={
  overall_status:RequirementStatus;
  requirements:{key:string;label:string;status:RequirementStatus;required:boolean;detail:string;current:number;minimum:number;artifact_name?:string}[];
};

export function evaluateDeliverableContract(input:{contract:DeliverableContract;evidence?:any[];artifacts?:any[]}):DeliverableContractEvaluation{
  const evidence=input.evidence ?? [];
  const artifacts=input.artifacts ?? [];
  const hasArtifact=(name:string)=>artifacts.some((a:any)=>a.artifact_type===name || a.artifact_id===name || a.artifact_json?.name===name || a.artifact_json?.artifact_name===name);
  const artifactStatus=(name:string):RequirementStatus=>hasArtifact(name)?'used':'missing';
  const countByAccepted=(accepted:string[])=>evidence.filter((e:any)=>accepted.includes(e.type) || accepted.includes(e.metadata_json ? safeParse(e.metadata_json)?.asset_type : '') || accepted.includes(e.metadata?.asset_type)).length;
  const real=input.contract.required_assets.real_app_clips;
  const broll=input.contract.required_assets.broll;
  const realCount=countByAccepted(real.accepted_types);
  const brollCount=countByAccepted(broll.accepted_types);
  const reqs:DeliverableContractEvaluation['requirements']=[
    {key:'style_reference',label:'Use approved style',status:artifactStatus('style_reference.json'),required:true,detail:input.contract.style_reference.id,current:hasArtifact('style_reference.json')?1:0,minimum:1,artifact_name:'style_reference.json'},
    {key:'real_app_clips',label:'Needs real app clips',status:!real.required?'ready':realCount>=real.min_count?'ready':'missing',required:real.required,detail:`${realCount}/${real.min_count} accepted evidence assets`,current:realCount,minimum:real.min_count,artifact_name:'real_footage_manifest.json'},
    {key:'broll',label:'Needs b-roll',status:!broll.required?'ready':brollCount>=broll.min_count?'ready':'missing',required:broll.required,detail:`${brollCount}/${broll.min_count} accepted evidence assets`,current:brollCount,minimum:broll.min_count,artifact_name:'real_footage_manifest.json'},
    {key:'shot_asset_map',label:'Beat → asset map',status:artifactStatus('shot_asset_map.json'),required:true,detail:'Storyboard must map every beat to asset IDs',current:hasArtifact('shot_asset_map.json')?1:0,minimum:1,artifact_name:'shot_asset_map.json'},
    {key:'voiceover_timing',label:'Voiceover timing',status:input.contract.required_assets.voiceover.required?artifactStatus('voiceover_timing.json'):'ready',required:input.contract.required_assets.voiceover.required,detail:input.contract.required_assets.voiceover.derive_video_duration_from_audio?'video duration derives from full audio':'fixed duration allowed',current:hasArtifact('voiceover_timing.json')?1:0,minimum:input.contract.required_assets.voiceover.required?1:0,artifact_name:'voiceover_timing.json'},
    {key:'generic_cards',label:'No generic cards primary',status:input.contract.renderer_policy.allow_generic_cards_as_primary?'ready':'ready',required:!input.contract.renderer_policy.allow_generic_cards_as_primary,detail:input.contract.renderer_policy.allow_generic_cards_as_primary?'generic cards allowed':'generic cards forbidden as primary visual',current:1,minimum:1}
  ];
  const blocking=reqs.filter(r=>r.required && r.status==='missing');
  const used=reqs.filter(r=>r.status==='used').length;
  return {overall_status:blocking.length?'missing':used===reqs.length?'used':'ready',requirements:reqs};
}
function safeParse(text:string){ try{return JSON.parse(text);}catch{return null;} }
