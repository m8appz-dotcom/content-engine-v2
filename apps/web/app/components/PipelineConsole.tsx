"use client";
import { useEffect, useMemo, useState } from 'react';

type Job = { id:string; title:string; description?:string|null; status:string; created_at:string; updated_at:string };
type LogItem = { label:string; ok:boolean; detail:string };
type AvatarRequirement='required'|'optional'|'forbidden';

async function postJson(path:string, body:unknown){
  const res=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const json=await res.json();
  if(!res.ok) throw new Error(json?.error?.message || `${res.status} ${res.statusText}`);
  return json;
}
async function getJson(path:string){ const res=await fetch(path); const json=await res.json(); if(!res.ok) throw new Error(json?.error?.message || `${res.status}`); return json; }

const stageLabels: Record<string,string>={created:'Creado',evidence_collected:'Evidencia lista',angles_generated:'Ángulos listos',script_pending_approval:'Gate A pendiente',script_approved:'Script aprobado',production_planned:'Plan listo',storyboard_ready:'Storyboard listo',draft_rendered:'Draft listo',qa_passed:'QA aprobada',publish_ready:'Listo para publish'};

export default function PipelineConsole(){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [selectedId,setSelectedId]=useState<string>('');
  const [busy,setBusy]=useState(false);
  const [logs,setLogs]=useState<LogItem[]>([]);
  const [humanActorId,setHumanActorId]=useState('');
  const [details,setDetails]=useState<any>({});
  const [activeReview,setActiveReview]=useState<'contract'|'evidence'|'angles'|'scripts'|'storyboard'|'draft'|'qa'>('contract');
  const [contractForm,setContractForm]=useState({style_reference_id:'impressed_v5_visual_story',style_reference_label:'Impressed / v5 visual story style',style_notes:'Kinetic typography, distinct layouts by beat, chapter palette shifts, real before/after proof, one giant phrase + one main visual + one supporting detail. No repeated dark cards.',real_app_clips_required:true,real_app_clips_min:5,broll_required:true,broll_min:3,avatar_requirement:'optional' as AvatarRequirement,voiceover_required:true,derive_video_duration_from_audio:true,require_asset_id_per_beat:true,allow_generic_cards_as_primary:false,block_if_required_assets_missing:false});
  const selected=useMemo(()=>jobs.find(j=>j.id===selectedId) || jobs[0], [jobs,selectedId]);
  const addLog=(label:string, ok:boolean, detail:string)=>setLogs(prev=>[{label,ok,detail},...prev].slice(0,10));
  async function refresh(){ const data=await getJson('/api/jobs'); setJobs(data.jobs ?? []); if(!selectedId && data.jobs?.[0]?.id) setSelectedId(data.jobs[0].id); }
  useEffect(()=>{ refresh().catch(err=>addLog('Cargar jobs',false,err.message)); },[]);

  async function createJob(){
    setBusy(true); try{ const data=await postJson('/api/jobs',{title:`Demo pipeline ${new Date().toLocaleTimeString()}`,description:'Created from the MVP browser console',target_platform:'vertical_short'}); setSelectedId(data.job.id); addLog('Crear job',true,data.job.id); await refresh(); } catch(err:any){ addLog('Crear job',false,err.message); } finally{ setBusy(false); }
  }
  async function runPipeline(){
    if(!selected) return;
    setBusy(true); const id=selected.id;
    try{
      const collect=await postJson(`/api/jobs/${id}/collect-evidence`,{project_id:'content-engine-v2',evidence_types:['task_note']}); addLog('Evidencia base',true,collect.status);
      const evidence=await postJson(`/api/jobs/${id}/evidence`,{type:'screenshot',title:'Homepage visual proof',path:'outputs/qa/homepage-3302.png',rights_status:'owned',privacy_level:'public',public_safe:true,metadata:{source:'ui_console'}}); addLog('Screenshot evidence',true,evidence.evidence.id);
      const angles=await postJson(`/api/jobs/${id}/story-angles`,{count:3}); const angleId=angles.angles[0].id; addLog('Ángulos',true,`${angles.angles.length} generados`);
      await postJson(`/api/jobs/${id}/select-angle`,{angle_id:angleId}); addLog('Seleccionar ángulo',true,angleId);
      const scripts=await postJson(`/api/jobs/${id}/scripts`,{count:1}); const scriptId=scripts.scripts[0].id; addLog('Guion',true,scriptId);
      const verify=await postJson(`/api/jobs/${id}/verify-claims`,{script_id:scriptId}); addLog('Verificar claims',verify.overall_pass,verify.overall_pass?'pass':'fail');
      addLog('Gate A pendiente',true,'revisión humana requerida; no se auto-aprueba');
      setDetails({angle:angles.angles[0],script:scripts.scripts[0]});
      await refresh();
      return;
      const plan=await postJson(`/api/jobs/${id}/production-plan`,{script_id:scriptId}); const planId=plan.production_plan.id; addLog('Production plan',true,`${plan.production_plan.plan_json.scenes.length} escenas`);
      const storyboard=await postJson(`/api/jobs/${id}/storyboard-preview`,{script_id:scriptId,production_plan_id:planId}); const storyboardId=storyboard.storyboard.id; addLog('Storyboard',true,storyboard.status);
      const draft=await postJson(`/api/jobs/${id}/render-draft`,{storyboard_id:storyboardId,render_quality:'draft'}); const draftId=draft.draft.id; addLog('Draft',true,draft.status);
      const qa=await postJson(`/api/jobs/${id}/qa`,{draft_id:draftId}); addLog('QA Gate B',qa.qa_report.report_json.pass,qa.status);
      setDetails({angle:angles.angles[0],script:scripts.scripts[0],plan:plan.production_plan,storyboard:storyboard.storyboard,draft:draft.draft,qa:qa.qa_report});
      await refresh();
    } catch(err:any){ addLog('Pipeline',false,err.message); await refresh().catch(()=>{}); }
    finally{ setBusy(false); }
  }
  async function loadDetails(){
    if(!selected) return; setBusy(true); try{
      const [contract,evidence,angles,scripts,plans,storyboards,drafts,qa,audit]=await Promise.all([
        getJson(`/api/jobs/${selected.id}/deliverable-contract`), getJson(`/api/jobs/${selected.id}/evidence`), getJson(`/api/jobs/${selected.id}/story-angles`), getJson(`/api/jobs/${selected.id}/scripts`), getJson(`/api/jobs/${selected.id}/production-plan`), getJson(`/api/jobs/${selected.id}/storyboard`), getJson(`/api/jobs/${selected.id}/drafts`), getJson(`/api/jobs/${selected.id}/qa`), getJson(`/api/jobs/${selected.id}/audit-log`)
      ]);
      setDetails({contract,evidence,angles,scripts,plans,storyboards,drafts,qa,audit}); addLog('Cargar detalles',true,selected.id);
    } catch(err:any){ addLog('Cargar detalles',false,err.message); } finally{ setBusy(false); }
  }


  const contractItems=details?.contract?.contracts ?? [];
  const activeContract=details?.contract?.active_contract?.contract_json ?? contractItems.find((c:any)=>c.status==='active')?.contract_json;
  const contractEvaluation=details?.contract?.evaluation;
  const previewRequirementStatuses=[
    {key:'style_reference',label:'Use approved style',status:'missing',detail:contractForm.style_reference_id},
    {key:'real_app_clips',label:'Needs real app clips',status:contractForm.real_app_clips_required?'missing':'ready',detail:`0/${contractForm.real_app_clips_min} accepted evidence assets`},
    {key:'broll',label:'Needs b-roll',status:contractForm.broll_required?'missing':'ready',detail:`0/${contractForm.broll_min} accepted evidence assets`},
    {key:'shot_asset_map',label:'Beat → asset map',status:'missing',detail:'shot_asset_map.json required'},
    {key:'voiceover_timing',label:'Voiceover timing',status:contractForm.voiceover_required?'missing':'ready',detail:contractForm.derive_video_duration_from_audio?'duration from full VO':'fixed duration allowed'},
    {key:'generic_cards',label:'No generic cards primary',status:'ready',detail:contractForm.allow_generic_cards_as_primary?'generic cards allowed':'generic cards forbidden as primary visual'}
  ];
  const evidenceItems=details?.evidence?.evidence ?? [];
  const angleItems=details?.angles?.angles ?? [];
  const scriptItems=details?.scripts?.scripts ?? [];
  const storyboardItems=details?.storyboards?.storyboards ?? [];
  const draftItems=details?.drafts?.drafts ?? [];
  const qaItems=details?.qa?.qa_reports ?? [];
  const selectedAngle=angleItems.find((a:any)=>a.status==='selected') ?? angleItems[0];
  const latestScript=scriptItems[0];
  const latestStoryboard=storyboardItems[0];
  const latestDraft=draftItems[0];
  const latestQa=qaItems[0];

  async function selectAngle(angleId:string){ if(!selected) return; setBusy(true); try{ await postJson(`/api/jobs/${selected.id}/select-angle`,{angle_id:angleId}); addLog('Seleccionar ángulo',true,angleId); await loadDetails(); await refresh(); }catch(err:any){ addLog('Seleccionar ángulo',false,err.message); } finally{ setBusy(false); } }
  async function approveLatestScript(){ if(!selected || !latestScript) return; setBusy(true); try{ const res=await postJson(`/api/jobs/${selected.id}/approve-script`,{script_id:latestScript.id,approved_by:humanActorId,owner_understands_angle_and_benefit:true,human_reviewed_script_text:true,approval_context:'human_review'}); addLog('Gate A manual',res.approved,'aprobado'); await loadDetails(); await refresh(); }catch(err:any){ addLog('Gate A manual',false,err.message); } finally{ setBusy(false); } }
  async function requestScriptRevision(){ if(!selected || !latestScript) return; setBusy(true); try{ await postJson(`/api/jobs/${selected.id}/request-script-revision`,{script_id:latestScript.id,notes:'Revisión solicitada desde UI'}); addLog('Revisión script',true,latestScript.id); await loadDetails(); await refresh(); }catch(err:any){ addLog('Revisión script',false,err.message); } finally{ setBusy(false); } }
  async function approveStoryboard(){ if(!selected || !latestStoryboard) return; setBusy(true); try{ const res=await postJson(`/api/jobs/${selected.id}/approve-storyboard`,{storyboard_id:latestStoryboard.id,actor_id:humanActorId,notes:'Aprobación humana desde UI',human_reviewed_storyboard_preview:true,approval_context:'human_review'}); addLog('Storyboard approval',res.approved ?? true,res.status ?? 'approved'); await loadDetails(); await refresh(); }catch(err:any){ addLog('Storyboard approval',false,err.message); } finally{ setBusy(false); } }
  async function approvePublish(){ if(!selected || !latestQa) return; setBusy(true); try{ const res=await postJson(`/api/jobs/${selected.id}/approve-publish`,{qa_report_id:latestQa.id,approved_by:humanActorId,notes:'Aprobación humana explícita desde UI',human_reviewed_final_video:true,human_accepts_publish_risk:true,approval_context:'human_review'}); addLog('Publish approval',res.approved,res.status); await loadDetails(); await refresh(); }catch(err:any){ addLog('Publish approval',false,err.message); } finally{ setBusy(false); } }
  async function runEvidencePrivacyScan(evidenceId:string){ if(!selected) return; setBusy(true); try{ await postJson(`/api/jobs/${selected.id}/evidence/${evidenceId}/privacy-scan`,{}); addLog('Privacy scan',true,evidenceId); await loadDetails(); }catch(err:any){ addLog('Privacy scan',false,err.message); } finally{ setBusy(false); } }
  async function markEvidenceOwnedPublic(evidenceId:string){ if(!selected) return; setBusy(true); try{ await postJson(`/api/jobs/${selected.id}/evidence/${evidenceId}/rights-scan`,{rights_status:'owned'}); addLog('Rights scan',true,evidenceId); await loadDetails(); }catch(err:any){ addLog('Rights scan',false,err.message); } finally{ setBusy(false); } }
  async function saveDeliverableContract(){ if(!selected) return; setBusy(true); try{ const res=await postJson(`/api/jobs/${selected.id}/deliverable-contract`,contractForm); addLog('Contrato deliverable',true,res.summary?.style_reference_id ?? res.deliverable_contract?.id); await loadDetails(); }catch(err:any){ addLog('Contrato deliverable',false,err.message); } finally{ setBusy(false); } }
  function setContractField<K extends keyof typeof contractForm>(key:K,value:(typeof contractForm)[K]){ setContractForm(prev=>({...prev,[key]:value})); }

  function ReviewBody(){
    if(activeReview==='contract') return <div className="contractCanvas"><div className="contractBuilder"><div className="contractNode primaryNode"><span className="material-symbols-outlined">contract_edit</span><div><p className="eyebrow">Workflow node</p><h4>Production / Deliverable Contract</h4><p className="muted">Control visible entre brief/evidencia y agentes. No es prompt oculto: cada requisito se vuelve artifact consumible.</p></div></div><label>Style reference ID<input value={contractForm.style_reference_id} onChange={e=>setContractField('style_reference_id',e.target.value)} /></label><label>Label<input value={contractForm.style_reference_label} onChange={e=>setContractField('style_reference_label',e.target.value)} /></label><label>Style notes<textarea value={contractForm.style_notes} onChange={e=>setContractField('style_notes',e.target.value)} /></label><div className="contractChecks"><label><input type="checkbox" checked={contractForm.real_app_clips_required} onChange={e=>setContractField('real_app_clips_required',e.target.checked)} /> Needs real app clips</label><input type="number" value={contractForm.real_app_clips_min} onChange={e=>setContractField('real_app_clips_min',Number(e.target.value))} /><label><input type="checkbox" checked={contractForm.broll_required} onChange={e=>setContractField('broll_required',e.target.checked)} /> Needs b-roll</label><input type="number" value={contractForm.broll_min} onChange={e=>setContractField('broll_min',Number(e.target.value))} /><label>Avatar<select value={contractForm.avatar_requirement} onChange={e=>setContractField('avatar_requirement',e.target.value as AvatarRequirement)}><option value="required">required</option><option value="optional">optional</option><option value="forbidden">forbidden</option></select></label><label><input type="checkbox" checked={contractForm.voiceover_required} onChange={e=>setContractField('voiceover_required',e.target.checked)} /> Voiceover required</label><label><input type="checkbox" checked={contractForm.derive_video_duration_from_audio} onChange={e=>setContractField('derive_video_duration_from_audio',e.target.checked)} /> Duration from audio</label><label><input type="checkbox" checked={contractForm.require_asset_id_per_beat} onChange={e=>setContractField('require_asset_id_per_beat',e.target.checked)} /> Asset ID per beat</label><label><input type="checkbox" checked={!contractForm.allow_generic_cards_as_primary} onChange={e=>setContractField('allow_generic_cards_as_primary',!e.target.checked)} /> No generic cards as primary</label><label><input type="checkbox" checked={contractForm.block_if_required_assets_missing} onChange={e=>setContractField('block_if_required_assets_missing',e.target.checked)} /> Hard block if missing</label></div><button className="btn primary" disabled={busy || !selected} onClick={saveDeliverableContract}><span className="material-symbols-outlined">save</span>Guardar contrato</button></div><div className="contractStatus"><h4>Contrato activo</h4>{activeContract?<><div className="statusBadge">{activeContract.style_reference?.id}</div><div className="contractGrid"><span>app clips<b>{activeContract.required_assets?.real_app_clips?.required?`min ${activeContract.required_assets.real_app_clips.min_count}`:'off'}</b></span><span>b-roll<b>{activeContract.required_assets?.broll?.required?`min ${activeContract.required_assets.broll.min_count}`:'off'}</b></span><span>avatar<b>{activeContract.required_assets?.avatar_presenter?.requirement}</b></span><span>voiceover<b>{activeContract.required_assets?.voiceover?.required?'required':'off'}</b></span><span>generic cards<b>{activeContract.renderer_policy?.allow_generic_cards_as_primary?'allowed':'forbidden primary'}</b></span><span>asset per beat<b>{activeContract.renderer_policy?.require_asset_id_per_beat?'yes':'no'}</b></span></div><h4>Requirement status</h4><div className="requirementStatuses">{contractEvaluation?.requirements?.map((r:any)=><span key={r.key} className={`reqStatus ${r.status}`}><b>{r.label}</b><em>{r.status}</em><small>{r.detail}</small></span>) ?? activeContract.output_artifacts?.filter((a:any)=>a.required).map((a:any)=><span key={a.name} className="reqStatus missing"><b>{a.name}</b><em>missing</em><small>{a.producer_role} → {a.consumer_role}</small></span>)}</div><h4>Artifacts obligatorios</h4><div className="artifactChips">{activeContract.output_artifacts?.filter((a:any)=>a.required).map((a:any)=><span key={a.name}>{a.name}<small>{a.producer_role} → {a.consumer_role}</small></span>)}</div></>:<><div className="statusBadge draftBadge">draft template</div><p className="muted">Guarda este contrato en un job para activarlo. Estos son los estados esperados antes de adjuntar assets/artifacts:</p><h4>Requirement status preview</h4><div className="requirementStatuses">{previewRequirementStatuses.map((r:any)=><span key={r.key} className={`reqStatus ${r.status}`}><b>{r.label}</b><em>{r.status}</em><small>{r.detail}</small></span>)}</div></>}</div></div>;
    if(activeReview==='evidence') return <div><p className="muted">Upload manual API: POST /api/jobs/:id/evidence/upload con source_path local. Cada item puede re-escanear privacy/rights.</p><div className="reviewCards">{evidenceItems.length?evidenceItems.map((e:any)=><div className="reviewCard" key={e.id}><span className="pill">{e.type}</span><h4>{e.title ?? e.id}</h4><p className="muted">{e.description ?? e.path ?? e.url ?? 'Sin descripción'}</p><div className="metaGrid"><span>rights <b>{e.rights_status}</b></span><span>privacy <b>{e.privacy_level}</b></span><span>public_safe <b>{String(Boolean(e.public_safe))}</b></span></div><div className="rowActions"><button className="miniBtn" disabled={busy} onClick={()=>runEvidencePrivacyScan(e.id)}>Privacy scan</button><button className="miniBtn" disabled={busy} onClick={()=>markEvidenceOwnedPublic(e.id)}>Rights owned</button></div></div>):<p className="muted">Carga detalles o corre el pipeline para ver evidencia.</p>}</div></div>;
    if(activeReview==='angles') return <div className="reviewCards">{angleItems.length?angleItems.map((a:any)=><div className={`reviewCard ${a.status==='selected'?'selectedCard':''}`} key={a.id}><span className="pill">{a.status}</span><h4>{a.title}</h4><p>{a.angle_json?.what_we_did_with_ai_or_tech}</p><p className="muted">Beneficio: {a.angle_json?.benefits_for_smes?.[0]}</p><div className="metaGrid"><span>score <b>{a.score}</b></span><span>evidence <b>{a.angle_json?.visual_evidence_ids?.length ?? 0}</b></span></div><button className="miniBtn" disabled={busy || a.status==='selected'} onClick={()=>selectAngle(a.id)}>Seleccionar</button></div>):<p className="muted">No hay ángulos cargados.</p>}</div>;
    if(activeReview==='scripts') return <div className="reviewCards">{scriptItems.length?scriptItems.map((s:any)=><div className="reviewCard wide" key={s.id}><span className="pill">{s.status}</span><h4>{s.script_json?.hook}</h4><p>{s.script_json?.voiceover}</p><div className="claimList">{s.script_json?.claims?.map((c:any)=><span key={c.id}>{c.support_level}: {c.claim_text}</span>)}</div><div className="rowActions"><button className="miniBtn" disabled={busy || s.status==='approved'} onClick={approveLatestScript}>Aprobar Gate A</button><button className="miniBtn dangerMini" disabled={busy} onClick={requestScriptRevision}>Pedir revisión</button></div></div>):<p className="muted">No hay guiones cargados.</p>}</div>;
    if(activeReview==='storyboard') return <div className="reviewCards">{storyboardItems.length?storyboardItems.map((sb:any)=><div className="reviewCard wide" key={sb.id}><span className="pill">{sb.status}</span><h4>{sb.id}</h4><p className="muted">Duración estimada: {sb.storyboard_json?.estimated_duration_sec}s · cards: {sb.storyboard_json?.human_preview?.length ?? 0}</p><p>{sb.storyboard_json?.human_preview_summary?.approval_prompt}</p><div className="storyboardCards">{sb.storyboard_json?.human_preview?.map((card:any)=><div className="storyboardCard" key={card.card_id}><span className="pill">{card.time_range} · {card.beat_kind}</span><h4>{card.scene_template}</h4><p><b>Ve:</b> {card.what_viewer_sees}</p><p><b>Entiende:</b> {card.what_viewer_must_understand}</p><p><b>Emoción:</b> {card.expected_emotion_or_curiosity}</p><p><b>Cambio:</b> {card.change_from_previous}</p><p><b>VO:</b> {card.voiceover_line}</p><div className="metaGrid"><span>music <b>{card.audio?.music_cue?.cue}</b></span><span>sfx <b>{card.audio?.sfx_cue?.cue}</b></span><span>crop <b>{card.safe_crop?.crop}</b></span></div><p className="muted">{card.thumbnail_prompt}</p></div>)}</div><button className="miniBtn" disabled={busy || sb.status==='approved'} onClick={approveStoryboard}>Aprobar storyboard humano</button></div>):<p className="muted">No hay storyboard cargado.</p>}</div>;
    if(activeReview==='draft') return <div className="reviewCards">{draftItems.length?draftItems.map((d:any)=><div className="reviewCard wide" key={d.id}><span className="pill">{d.render_status}</span><h4>{d.id}</h4><p className="mono muted">{d.video_path}</p><div className="metaGrid"><span>duration <b>{d.duration_sec}s</b></span><span>contact sheet <b>{d.contact_sheet_path?'sí':'no'}</b></span></div></div>):<p className="muted">No hay draft cargado.</p>}</div>;
    return <div className="reviewCards">{qaItems.length?qaItems.map((q:any)=><div className="reviewCard wide" key={q.id}><span className={`pill ${q.report_json?.pass?'passPill':'failPill'}`}>{q.report_json?.pass?'pass':'fail'}</span><h4>{q.id}</h4><p>{q.report_json?.gate_b_note}</p><div className="scoreGrid">{Object.entries(q.report_json?.scores ?? {}).map(([k,v])=><span key={k}>{k}<b>{String(v)}</b></span>)}</div><button className="miniBtn" disabled={busy || !q.report_json?.pass} onClick={approvePublish}>Aprobar publish readiness</button></div>):<p className="muted">No hay QA cargado.</p>}</div>;
  }

  return <section className="console card">
    <div className="consoleHeader">
      <div><p className="eyebrow">Operación MVP</p><h2>Consola del pipeline</h2><p className="muted">Corre evidencia → ángulos → guion → Gate A → storyboard → draft → QA desde el browser.</p></div>
      <div className="actions"><button className="btn" disabled={busy} onClick={createJob}><span className="material-symbols-outlined">add_circle</span>Nuevo job</button><button className="btn primary" disabled={busy || !selected} onClick={runPipeline}><span className="material-symbols-outlined">play_arrow</span>Correr pipeline</button><button className="btn ghost" disabled={busy || !selected} onClick={loadDetails}><span className="material-symbols-outlined">refresh</span>Detalles</button></div>
    </div>
    <div className="reviewWorkbench prominentReview">
      <div className="reviewHeader"><div><p className="eyebrow">Revisión manual</p><h3>Artefactos por etapa</h3><p className="muted">Contract controla obligaciones medibles; luego revisas/apruebas cada artifact por etapa.</p><label className="humanActorField">Actor humano <input value={humanActorId} onChange={e=>setHumanActorId(e.target.value)} placeholder="user id real, no owner_e2e" /></label></div><button className="btn ghost" disabled={busy || !selected} onClick={loadDetails}><span className="material-symbols-outlined">fact_check</span>Cargar artefactos</button></div>
      <div className="reviewTabs">{(['contract','evidence','angles','scripts','storyboard','draft','qa'] as const).map(tab=><button key={tab} className={activeReview===tab?'activeTab':''} onClick={()=>setActiveReview(tab)}>{tab}</button>)}</div>
      <ReviewBody />
    </div>
    <div className="consoleGrid">
      <div className="panel"><h3>Jobs / trabajos</h3>{jobs.length===0?<p className="muted">No hay jobs todavía.</p>:<div className="jobList">{jobs.slice(0,8).map(job=><button key={job.id} className={`jobRow ${selected?.id===job.id?'selected':''}`} onClick={()=>setSelectedId(job.id)}><span><b>{job.title}</b><small>{job.id}</small></span><em>{stageLabels[job.status]??job.status}</em></button>)}</div>}</div>
      <div className="panel"><h3>Estado actual</h3>{selected?<><div className="statusBadge">{stageLabels[selected.status]??selected.status}</div><p><b>{selected.title}</b></p><p className="muted mono">{selected.id}</p><ol className="stageList">{['evidence_collected','angles_generated','script_approved','storyboard_ready','draft_rendered','qa_passed'].map(s=><li key={s} className={selected.status===s?'active':''}>{stageLabels[s]}</li>)}</ol></>:<p className="muted">Selecciona o crea un job.</p>}</div>
      <div className="panel"><h3>Registro</h3><div className="logList">{logs.length===0?<p className="muted">Sin acciones aún.</p>:logs.map((log,idx)=><div key={idx} className={`log ${log.ok?'okline':'badline'}`}><span>{log.ok?'check_circle':'error'}</span><b>{log.label}</b><small>{log.detail}</small></div>)}</div></div>
    </div>
    <div className="artifactPreview"><h3>JSON técnico</h3><pre>{JSON.stringify(details,null,2).slice(0,5000)}</pre></div>
  </section>;
}
