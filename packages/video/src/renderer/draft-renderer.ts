import {createSparkNarration} from '../../../providers/src/ai/spark-narration';
import {buildContentEditorialFilm} from './editorial-plan';
import {readNarrationSegments} from '../audio/narration-timing';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync,copyFileSync,realpathSync } from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import type { DraftScene, DraftVideoProps } from '../remotion/DraftComposition';

function ensureFfmpeg(){ const bin=process.env.FFMPEG_BIN || 'ffmpeg'; execFileSync(bin,['-version'],{stdio:'ignore'}); return bin; }
function firstSentence(text:string){ return String(text||'').replace(/\s+/g,' ').trim(); }
function sceneIntent(idx:number, scene:any){ return scene.first_frame_read ?? scene.why_this_shot_works ?? ['La prueba real aparece primero','El método convierte evidencia en historia','Cada afirmación queda respaldada','El cierre conecta con beneficio de negocio'][idx] ?? 'La evidencia sostiene el mensaje'; }
function mimeFor(filePath:string){ const ext=path.extname(filePath).toLowerCase(); if(ext==='.jpg'||ext==='.jpeg') return 'image/jpeg'; if(ext==='.svg') return 'image/svg+xml'; if(ext==='.webp') return 'image/webp'; return 'image/png'; }
function dataUrlForAsset(filePath:string){ const data=readFileSync(filePath); return `data:${mimeFor(filePath)};base64,${data.toString('base64')}`; }
function cleanNarration(storyboard:any, script:any){
  const fromTimeline=(storyboard.timeline??[]).map((s:any)=>s.narration).filter(Boolean).join(' ');
  const text=fromTimeline || script.voiceover || (script.beats??[]).map((b:any)=>b.line).join(' ') || script.hook || 'Evidencia real visible antes de publicar.';
  return String(text).replace(/\s+/g,' ').trim();
}
function parseVolume(stderr:string){
  const mean=stderr.match(/mean_volume:\s*(-?[0-9.]+) dB/);
  const max=stderr.match(/max_volume:\s*(-?[0-9.]+) dB/);
  return {mean_volume_db:mean?Number(mean[1]):null,max_volume_db:max?Number(max[1]):null};
}
function verifyAudible(ffmpeg:string, videoPath:string){
  const result=spawnSync(ffmpeg,['-i',videoPath,'-af','volumedetect','-f','null','-'],{encoding:'utf8'});
  const metrics=parseVolume(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  if(metrics.mean_volume_db===null || metrics.max_volume_db===null) throw Object.assign(new Error('Unable to measure draft audio volume'),{code:'audio_verification_failed'});
  if(metrics.mean_volume_db < -45 || metrics.max_volume_db < -30) throw Object.assign(new Error(`Draft audio is effectively silent: mean=${metrics.mean_volume_db} max=${metrics.max_volume_db}`),{code:'silent_audio_blocked',details:metrics});
  return metrics;
}
function acceptableVoiceoverPath(){
  const configured=process.env.CONTENT_ENGINE_VOICEOVER_PATH || process.env.PRODUCT_VOICEOVER_PATH;
  if(configured && existsSync(configured)) return configured;
  return null;
}
function preservedAudioArtifacts(input:{sourceVideo:string;dir:string;narration:string}){
 const audioDir=path.join(input.dir,'09_voiceover');mkdirSync(audioDir,{recursive:true});
 const sourceDir=path.join(path.dirname(input.sourceVideo),'09_voiceover');
 const copy=(name:string)=>{const source=path.join(sourceDir,name);if(!existsSync(source)||!realpathSync(source).startsWith(realpathSync(sourceDir)+path.sep))throw Object.assign(new Error('The preserved narration source is unavailable.'),{code:'preserved_audio_unavailable'});const destination=path.join(audioDir,name);copyFileSync(source,destination);return destination;};
 const voiceoverPath=copy('voiceover.wav'),mixPath=copy('final_mix.wav');
 const narrationPath=path.join(audioDir,'narration.txt');writeFileSync(narrationPath,input.narration);
 const notesPath=path.join(audioDir,'timing_notes.md');writeFileSync(notesPath,'Audio copied from the existing reviewed draft. Final mux copies its AAC packets without synthesis or re-encoding.');
 return {audioDir,narrationPath,voiceoverPath,mixPath,notesPath,mix_mode:'voice_only',musicPath:null,sfxPath:null,voiceover_source:'preserved-product-voice',product_voiceover_usable:true,voiceover_required:true,voiceover_blocker:null};
}
export function muxDraftAudio(input:{ffmpeg:string;silentVideo:string;mixPath:string;preservedVideo?:string;destination:string}){
 const args=input.preservedVideo?['-y','-i',input.silentVideo,'-i',input.preservedVideo,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-shortest','-movie_timescale','48000',input.destination]:['-y','-i',input.silentVideo,'-i',input.mixPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-ar','48000','-ac','1','-shortest',input.destination];
 execFileSync(input.ffmpeg,args,{stdio:'ignore'});
}
export function makeAudioTrack(input:{ffmpeg:string;duration:number;dir:string;narration:string;voiceoverRequired:boolean;voiceoverPath?:string}){
  const audioDir=path.join(input.dir,'09_voiceover'); mkdirSync(audioDir,{recursive:true});
  const narrationPath=path.join(audioDir,'narration.txt'),voiceoverPath=path.join(audioDir,'voiceover.wav'),musicPath=path.join(audioDir,'music_bed.wav'),sfxPath=path.join(audioDir,'sfx_cues.wav'),mixPath=path.join(audioDir,'final_mix.wav'),notesPath=path.join(audioDir,'timing_notes.md');
  writeFileSync(narrationPath,input.narration);
  const productVoice=input.voiceoverPath ?? acceptableVoiceoverPath();
  if(productVoice){
    const sourceDuration=Number(execFileSync(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',productVoice],{encoding:'utf8'}).trim());
    if(!Number.isFinite(sourceDuration)||sourceDuration<=0||sourceDuration>input.duration+0.005)throw Object.assign(new Error('The full narration must fit the video before mixing.'),{code:'audio_timing_invalid'});
    execFileSync(input.ffmpeg,['-y','-i',productVoice,'-ar','48000','-ac','1',voiceoverPath],{stdio:'ignore'});
    execFileSync(input.ffmpeg,['-y','-i',voiceoverPath,'-af',`loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=0:${input.duration}`,'-ar','48000','-ac','1','-t',String(input.duration),mixPath],{stdio:'ignore'});
    writeFileSync(notesPath,`# Narration mix\n\nFull narration retained. Voice only; no generated music or effect cues. Output: 48 kHz mono.\n`);
    return {audioDir,narrationPath,voiceoverPath,mix_mode:'voice_only',musicPath:null,sfxPath:null,mixPath,notesPath,voiceover_source:'configured-product-voice',product_voiceover_usable:true,voiceover_required:input.voiceoverRequired,voiceover_blocker:null};
  }
  // Retained offline fixtures have no narration and keep their explicit blocker.
  execFileSync(input.ffmpeg,['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=mono:d=${input.duration}`,voiceoverPath],{stdio:'ignore'});
  execFileSync(input.ffmpeg,['-y','-f','lavfi','-i',`sine=frequency=196:duration=${input.duration}:sample_rate=48000`,'-af','volume=0.045',musicPath],{stdio:'ignore'});
  execFileSync(input.ffmpeg,['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=mono:d=${input.duration}`,'-f','lavfi','-i','sine=frequency=920:duration=0.07:sample_rate=48000','-filter_complex',`[1:a]adelay=900|900,apad,atrim=0:${input.duration}[tick];[0:a][tick]amix=inputs=2:duration=first`,'-ac','1',sfxPath],{stdio:'ignore'});
  execFileSync(input.ffmpeg,['-y','-i',musicPath,'-i',sfxPath,'-filter_complex','[0:a]volume=1.0[a1];[1:a]volume=0.75[a2];[a1][a2]amix=inputs=2:duration=first,loudnorm=I=-22:TP=-2:LRA=9,aresample=48000[aout]','-map','[aout]','-ar','48000','-t',String(input.duration),mixPath],{stdio:'ignore'});
  writeFileSync(notesPath,'# Offline fixture\n\nNo narration source. Not accepted as a narrated product video.\n');
  return {mix_mode:'offline_fixture',audioDir,narrationPath,voiceoverPath,musicPath,sfxPath,mixPath,notesPath,voiceover_source:null,product_voiceover_usable:false,voiceover_required:input.voiceoverRequired,voiceover_blocker:'acceptable_voiceover_source_missing'};
}
function hasNativeTextLayouts(storyboard:any){
  const timeline=storyboard.timeline??[];
  return timeline.length>0 && timeline.every((scene:any)=>scene.shot_recipe?.layout_treatment?.proof_module?.value || scene.layout_treatment?.proof_module?.value);
}
function nativeTextAsset(dir:string){
  const p=path.join(dir,'native_text_layout_source.svg');
  writeFileSync(p,`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#07070a'/></svg>`);
  return {evidence_id:'native_text_layout',path:p,type:'native_text_layout',rights_status:'owned'};
}
function pickAssetForScene(scene:any, assets:any[]){
  const sceneId=String(scene.scene_id ?? scene.id ?? '');
  // Native Remotion layouts compose the scene; derived SVG cards are kept as artifacts, not final scene wallpaper.
  const ids=new Set(scene.evidence_ids??[]);
  return assets.find(a=>ids.has(a.evidence_id) && a.path) ?? assets.find(a=>a.path);
}
function movementForTemplate(template:string|undefined, idx:number){
  if(template==='HookScene') return 'proof_reveal';
  if(template==='ContextSetupScene') return 'context_slide';
  if(template==='ProofZoomScene') return 'detail_push';
  if(template==='RiskContrastScene') return 'risk_split';
  if(template==='ResultRevealScene') return 'result_reveal';
  if(template==='BenefitStackScene') return 'benefit_lock';
  if(template==='CtaScene') return 'cta_close';
  return idx===0?'proof_reveal':idx===1?'detail_push':idx===2?'benefit_lock':'cta_close';
}

function makeBeatContactSheet(input:{ffmpeg:string;videoPath:string;contactSheetPath:string;timelineScenes:any[];duration:number;fps:number}){
  const mids=(input.timelineScenes.length?input.timelineScenes:[{start_sec:0,end_sec:input.duration}]).map((scene:any)=>{
    const start=Number(scene.start_sec ?? 0);
    const end=Number(scene.end_sec ?? input.duration);
    return Math.max(0,Math.min(input.duration,Number.isFinite(start+end)?(start+end)/2:start));
  });
  const selects=mids.map(t=>`eq(n\,${Math.max(0,Math.round(t*input.fps))})`).join('+');
  const cols=4;
  const rows=Math.max(1,Math.ceil(mids.length/cols));
  execFileSync(input.ffmpeg,['-y','-i',input.videoPath,'-vf',`select='${selects}',scale=270:480,tile=${cols}x${rows}:padding=8:color=black`,'-vsync','0','-frames:v','1',input.contactSheetPath],{stdio:'ignore'});
}

function ensurePresenterPlan(storyboard:any){
  const plan=storyboard.avatar_plan ?? storyboard.presenter_plan;
  if(plan?.enabled){
    if(!plan.asset_path && !plan.asset_url) throw Object.assign(new Error('Presenter/avatar enabled but no real presenter asset was provided; placeholder presenter is forbidden'),{code:'presenter_asset_missing'});
    if(plan.asset_path && !existsSync(plan.asset_path)) throw Object.assign(new Error('Presenter/avatar asset path is not readable'),{code:'presenter_asset_missing'});
  }
  return plan ?? {enabled:false};
}
function ensureAssetBacked(storyboard:any){
  const assets=(storyboard.preview_assets??[]).filter((a:any)=>a?.path && existsSync(a.path));
  if(assets.length===0) throw Object.assign(new Error('Draft render requires real preview_assets with readable local paths; placeholder rendering is forbidden by production spec'),{code:'visual_evidence_missing'});
  return assets;
}

export async function createDraftArtifact(input:{job_id:string;script:any;storyboard:any;outputsPath?:string;preservedAudioVideoPath?:string;preservedAudioDurationSec?:number;preservedSpeechDurationSec?:number;editorialEvidenceAssets?:any[];editorialSceneSources?:any[];editorialAllowedRoots?:string[]}){
  const storyboard=input.storyboard.storyboard_json ?? input.storyboard;
  const script=input.script.script_json ?? input.script;
  const presenterPlan=ensurePresenterPlan(storyboard);
  const basePreviewAssets=(storyboard.preview_assets??[]).filter((a:any)=>a?.path && /\.(png|jpe?g|webp|svg)$/i.test(a.path) && existsSync(a.path));
  const derivedPreviewAssets=(storyboard.derived_visual_assets?.assets ?? storyboard.derived_visual_assets ?? []).map((a:any)=>({evidence_id:a.source_evidence_id,path:a.output_path,type:'derived_broll',rights_status:'generated',scene_id:a.scene_id,derived:true})).filter((a:any)=>a.path && existsSync(a.path));
  const configuredOut=input.outputsPath ?? process.env.OUTPUTS_PATH ?? path.join(/*turbopackIgnore: true*/ process.cwd(),'outputs');
  const outRoot=path.isAbsolute(configuredOut)?configuredOut:path.join(/*turbopackIgnore: true*/ process.cwd(),configuredOut);
  const draftId=`draft_${randomUUID()}`;
  const dir=path.join(outRoot,'drafts',input.job_id,script.id,draftId);
  const sheetDir=path.join(outRoot,'contact-sheets',input.job_id,script.id,draftId);
  mkdirSync(dir,{recursive:true}); mkdirSync(sheetDir,{recursive:true});
  if((process.env.CONTENT_ORIGINAL_WORKSPACE==='1'||process.env.CONTENT_ENGINE_APP_GENERATION==='provider') && !basePreviewAssets.length && !derivedPreviewAssets.length)throw Object.assign(new Error('Add a readable public source image before rendering.'),{code:'visual_evidence_missing'});
  const nativeAssets=(basePreviewAssets.length===0 && derivedPreviewAssets.length===0 && hasNativeTextLayouts(storyboard))?[nativeTextAsset(dir)]:[];
  const previewAssets=[...derivedPreviewAssets,...basePreviewAssets,...nativeAssets];
  if(previewAssets.length===0) throw Object.assign(new Error('Draft render requires real preview_assets with readable local paths or derived visual assets'),{code:'visual_evidence_missing'});
  const timelinePath=path.join(dir,`${draftId}-timeline.json`);
  const videoTmpPath=path.join(dir,'draft_visual_silent.mp4');
  const videoPath=path.join(dir,'draft_v1.mp4');
  const contactSheetPath=path.join(sheetDir,'contact_sheet_v1.png');
  const fps=30;
  const narration=cleanNarration(storyboard,script);
  const preservedTracks=input.preservedAudioVideoPath?preservedAudioArtifacts({sourceVideo:input.preservedAudioVideoPath,dir,narration}):null;
  const generatedVoice=!input.preservedAudioVideoPath&&process.env.CONTENT_ENGINE_APP_GENERATION==='provider'?await createSparkNarration(narration,path.join(dir,'approved-narration.wav')):null;
  const duration=input.preservedAudioVideoPath?Math.ceil(input.preservedAudioDurationSec!):generatedVoice?Math.max(20,Math.ceil(generatedVoice.duration+0.5)):Math.max(20,Math.min(30,Number(storyboard.estimated_duration_sec ?? script.duration_sec ?? 30)));
  if(!Number.isFinite(duration)||duration<1||duration>75)throw Object.assign(new Error('The preserved audio needs a valid duration.'),{code:'business_validation_failed'});
  const rawTimelineScenes=(storyboard.timeline??[]).length?storyboard.timeline:[{id:'tl_1',start_sec:0,end_sec:duration,evidence_ids:[previewAssets[0].evidence_id],narration:script.hook}];
  const rawEnd=Math.max(...rawTimelineScenes.map((scene:any)=>Number(scene.end_sec??duration)));
  if(!Number.isFinite(rawEnd)||rawEnd<=0)throw Object.assign(new Error('The storyboard needs a valid timeline.'),{code:'business_validation_failed'});
  const scale=duration/rawEnd;
  const timelineScenes=rawTimelineScenes.map((scene:any,idx:number)=>({
    ...scene,
    start_sec: idx===0 ? 0 : Number(scene.start_sec??0)*scale,
    end_sec: Math.min(duration,Number(scene.end_sec??duration)*scale)
  }));
  const remotionScenes:DraftScene[]=timelineScenes.map((scene:any,idx:number)=>{
    const asset=pickAssetForScene(scene,previewAssets);
    if(!asset?.path) throw Object.assign(new Error(`Scene ${scene.id} has no readable asset`),{code:'visual_evidence_missing'});
    const startFrame=Math.round(Number(scene.start_sec??0)*fps);
    const nextStart=idx<timelineScenes.length-1?Math.round(Number(timelineScenes[idx+1].start_sec)*fps):duration*fps;
    const endFrame=Math.max(startFrame+fps*2,Math.min(duration*fps,Math.round(Number(scene.end_sec??duration)*fps),nextStart || duration*fps));
    return {scriptApproved:(input.script.status??script.status)==='approved',storyboardApproved:(input.storyboard.status??storyboard.status)==='approved',id:String(scene.id??`scene_${idx+1}`),startFrame,durationFrames:Math.max(fps*2,endFrame-startFrame),caption:firstSentence(scene.narration ?? storyboard.captions?.[idx]?.text ?? script.beats?.[idx]?.line ?? script.hook),intent:scene.shot_recipe?.viewer_read ?? sceneIntent(idx,scene),assetPath:dataUrlForAsset(asset.path),movement:movementForTemplate(scene.scene_template,idx) as DraftScene['movement'],sceneTemplate:scene.scene_template ?? 'ProofDrivenScene',beatKind:scene.beat_kind,motionIntent:scene.motion_intent,vfxIntent:scene.vfx_intent,overlayIntent:scene.shot_recipe?.foreground_text ?? scene.foreground_text ?? scene.overlay_intent,focalPoint:scene.shot_recipe?.focal_area ?? scene.focal_point,humanSceneTitle:scene.shot_recipe?.human_scene_title ?? scene.human_scene_title,foregroundText:scene.shot_recipe?.foreground_text ?? scene.foreground_text,evidenceTreatment:scene.shot_recipe?.evidence_treatment ?? scene.evidence_treatment,layoutTreatment:scene.shot_recipe?.layout_treatment ?? scene.layout_treatment};
  });
  const timingPath=input.preservedAudioVideoPath?path.join(path.dirname(input.preservedAudioVideoPath),'09_voiceover','voiceover.wav'):generatedVoice?.path;
  const speechSegments=timingPath&&existsSync(timingPath)?readNarrationSegments(timingPath,narration):undefined;
  const editorial=process.env.CONTENT_ORIGINAL_WORKSPACE==='1'?buildContentEditorialFilm({root:process.cwd(),narration,duration,speechDuration:input.preservedSpeechDurationSec??generatedVoice?.duration??duration,scriptApproved:(input.script.status??script.status)==='approved',storyboardApproved:(input.storyboard.status??storyboard.status)==='approved',storyboard,timeline:timelineScenes,evidenceAssets:input.editorialEvidenceAssets??basePreviewAssets,sceneSources:input.editorialSceneSources,allowedRoots:input.editorialAllowedRoots,speechSegments,brand:script.brand_name??'Content Engine',publicProductUrl:process.env.WORKSPACE_ORIGIN}):null;
  if(editorial&&!editorial.validation.pass)throw Object.assign(new Error('The visual plan needs corrections before rendering.'),{code:'visual_validation_failed'});
  const inputProps:DraftVideoProps & {durationInFrames:number;fps:number}={title:script.hook ?? 'Content Engine v2 draft',scenes:remotionScenes,editorialFilm:editorial?.film,brand:{accent:'#66e3a2',background:'#07070a'},durationInFrames:duration*fps,fps};
  const timeline={editorial_plan:editorial?{...editorial.film,scenes:editorial.film.scenes.map(s=>({...s,image:s.image?{...s.image,src:undefined}:undefined}))}:undefined,visual_validation:editorial?.validation,draft_id:draftId,job_id:input.job_id,script_id:script.id,storyboard_id:storyboard.id,estimated_duration_sec:duration,timeline:timelineScenes,captions:storyboard.captions,preview_assets:storyboard.preview_assets,render_type:'remotion_native_layout_v1_asset_backed_draft_mp4',scene_library_version:'v1',native_layout_version:'layout_treatment_v1',render_note:'Remotion composition uses real preview_assets as the visible primary video evidence; ffmpeg is only used for contact sheet/post-processing.',remotion_scenes:remotionScenes,scene_templates_used:Array.from(new Set(remotionScenes.map(s=>s.sceneTemplate)))};
  writeFileSync(timelinePath,JSON.stringify(timeline,null,2));
  // Keep Remotion bundler out of the Next.js route bundle; it loads native Rspack/Esbuild binaries.
  // eslint-disable-next-line no-new-func
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier:string)=>Promise<any>;
  const [{bundle},{getCompositions,renderMedia}]=await Promise.all([dynamicImport('@remotion/bundler'),dynamicImport('@remotion/renderer')]);
  const serveUrl=await bundle({entryPoint:path.resolve(/*turbopackIgnore: true*/ process.cwd(),'packages/video/src/remotion/Root.tsx'),webpackOverride:(config:any)=>config});
  const compositions=await getCompositions(serveUrl,{inputProps});
  const composition=compositions.find((c:any)=>c.id==='ContentEngineDraft');
  if(!composition) throw Object.assign(new Error('Remotion composition ContentEngineDraft not found'),{code:'render_failed'});
  await renderMedia({serveUrl,composition,codec:'h264',audioCodec:'aac',outputLocation:videoTmpPath,inputProps,overwrite:true,timeoutInMilliseconds:120000,concurrency:1,disallowParallelEncoding:true});
  const ffmpeg=ensureFfmpeg();
  const voiceoverRequired=Boolean(narration && narration.length>0);
  const audio=preservedTracks??makeAudioTrack({ffmpeg,duration,dir,narration,voiceoverRequired,voiceoverPath:generatedVoice?.path});
  muxDraftAudio({ffmpeg,silentVideo:videoTmpPath,mixPath:audio.mixPath,preservedVideo:input.preservedAudioVideoPath,destination:videoPath});
  const audioMetrics=verifyAudible(ffmpeg,videoPath);
  makeBeatContactSheet({ffmpeg,videoPath,contactSheetPath,timelineScenes,duration,fps});
  if(!existsSync(videoPath) || !existsSync(contactSheetPath)) throw Object.assign(new Error('Draft render output missing'),{code:'render_failed'});
  return {id:draftId,job_id:input.job_id,script_id:script.id,storyboard_id:storyboard.id,video_path:videoPath,contact_sheet_path:contactSheetPath,timeline_json_path:timelinePath,render_status:'draft_rendered',duration_sec:duration,notes:{presentation_style:editorial?'editorial_v1':'legacy_scene_library',visual_validation:editorial?.validation,structured_preview:true,mp4:true,contact_sheet_png:true,requires_qa:true,aspect_ratio:'9:16',resolution:'1080x1920',fps,video_codec:'h264',audio_codec:'aac',composer:'remotion',scene_library_version:'v1',native_layout_version:'layout_treatment_v1',uses_scene_templates:true,uses_real_preview_assets:true,uses_native_layouts:true,uses_derived_visual_assets:derivedPreviewAssets.length>0,derived_visual_asset_count:derivedPreviewAssets.length,presenter_enabled:Boolean(presenterPlan.enabled),presenter_asset_path:presenterPlan.asset_path ?? null,placeholder_render:false,audio_verified:true,audio_metrics:audioMetrics,voiceover_path:audio.voiceoverPath,audio_mix_mode:audio.mix_mode,voiceover_source:audio.voiceover_source,product_voiceover_usable:audio.product_voiceover_usable,voiceover_required:audio.voiceover_required,voiceover_blocker:audio.voiceover_blocker,music_path:audio.musicPath,sfx_path:audio.sfxPath,final_mix_path:audio.mixPath,narration_path:audio.narrationPath,timing_notes_path:audio.notesPath}};
}
