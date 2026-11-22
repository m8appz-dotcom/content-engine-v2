import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

function safeName(value:string){ return String(value).replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80); }
function mimeFor(filePath:string){ const ext=path.extname(filePath).toLowerCase(); if(ext==='.jpg'||ext==='.jpeg') return 'image/jpeg'; if(ext==='.svg') return 'image/svg+xml'; if(ext==='.webp') return 'image/webp'; return 'image/png'; }
function findEvidenceAsset(scene:any, assets:any[]){ const ids=new Set(scene.evidence_ids??[]); return assets.find(a=>ids.has(a.evidence_id) && ((a.path && existsSync(a.path)) || a.title || a.description)) ?? assets.find(a=>(a.path && existsSync(a.path)) || a.title || a.description); }
function cleanLabel(value:string,max=6){ return String(value||'Prueba real').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/scene|template/ig,'').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ →]/g,'').replace(/\s+/g,' ').trim().split(' ').slice(0,max).join(' ') || 'Prueba real'; }
function esc(value:string){ return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)); }
function dataHref(source:string){ const mime=mimeFor(source); const data=readFileSync(source).toString('base64'); return `data:${mime};base64,${data}`; }
function wrapLines(text:string,maxChars=22,maxLines=3){ const words=String(text).split(/\s+/).filter(Boolean); const lines:string[]=[]; let line=''; for(const word of words){ const next=line?`${line} ${word}`:word; if(next.length>maxChars && line){ lines.push(line); line=word; } else line=next; if(lines.length>=maxLines) break; } if(line && lines.length<maxLines) lines.push(line); return lines; }
function textBlock(lines:string[],x:number,y:number,size:number,color:string,weight=900){ return lines.map((line,i)=>`<text x="${x}" y="${y+i*size*1.18}" font-size="${size}" font-family="Inter, Arial, sans-serif" font-weight="${weight}" fill="${color}">${esc(line)}</text>`).join('\n'); }
function evidenceImage(source:string,x:number,y:number,w:number,h:number,fit='contain'){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="#111827" stroke="#66e3a2" stroke-width="5"/><image href="${dataHref(source)}" x="${x+18}" y="${y+18}" width="${w-36}" height="${h-36}" preserveAspectRatio="xMidYMid ${fit}"/>`; }
function cardSvg(source:string,scene:any){
  const recipe=scene.shot_recipe ?? {};
  const treatment=recipe.evidence_treatment ?? scene.evidence_treatment ?? 'detail_callout';
  const title=cleanLabel(recipe.foreground_text ?? scene.foreground_text ?? scene.human_scene_title ?? scene.caption_text ?? 'Prueba real',6);
  const viewer=cleanLabel(recipe.viewer_read ?? scene.first_frame_read ?? scene.why_this_shot_works ?? 'Evidencia verificable',10);
  const titleLines=wrapLines(title,18,2);
  const viewerLines=wrapLines(viewer,28,3);
  const bg='<rect width="1080" height="1920" fill="#07070a"/><rect x="0" y="0" width="1080" height="1920" fill="url(#g)" opacity="0.9"/>';
  const defs='<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10231c"/><stop offset="0.55" stop-color="#07070a"/><stop offset="1" stop-color="#141018"/></linearGradient></defs>';
  const badge=`<rect x="64" y="88" width="952" height="74" rx="37" fill="#66e3a2"/><text x="96" y="138" font-size="34" font-family="Inter, Arial" font-weight="900" fill="#07100d">CONTENT ENGINE · PRUEBA VISUAL</text>`;
  if(treatment==='risk_comparison'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}<rect x="64" y="220" width="442" height="1180" rx="44" fill="#3a1014" stroke="#ff5d5d" stroke-width="5"/>${textBlock(['Sin prueba,','no publica'],104,360,72,'#ffffff')}<text x="104" y="590" font-size="42" font-family="Inter, Arial" font-weight="800" fill="#ffb4b4">Claim genérico</text><path d="M134 680 L430 980" stroke="#ff5d5d" stroke-width="18" stroke-linecap="round"/><path d="M430 680 L134 980" stroke="#ff5d5d" stroke-width="18" stroke-linecap="round"/>${evidenceImage(source,548,220,468,1180,'slice')}<rect x="64" y="1460" width="952" height="300" rx="42" fill="#f8fafc"/>${textBlock(viewerLines,104,1550,48,'#07100d',900)}</svg>`;
  }
  if(treatment==='human_decision_card'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}${evidenceImage(source,86,230,908,720,'contain')}<rect x="86" y="1030" width="908" height="520" rx="54" fill="#f8fafc"/>${textBlock(['Revisión humana'],136,1150,76,'#07100d')}<circle cx="154" cy="1278" r="26" fill="#66e3a2"/><text x="200" y="1295" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#07100d">Guion aprobado</text><circle cx="154" cy="1382" r="26" fill="#66e3a2"/><text x="200" y="1399" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#07100d">Storyboard revisado</text><circle cx="154" cy="1486" r="26" fill="#f59e0b"/><text x="200" y="1503" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#07100d">Publicación pendiente</text>${textBlock(viewerLines,86,1668,44,'#ffffff',800)}</svg>`;
  }
  if(treatment==='benefit_checklist'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}${evidenceImage(source,70,210,940,860,'contain')}<rect x="94" y="1138" width="892" height="520" rx="48" fill="#f8fafc"/>${textBlock(['Claim defendible'],144,1252,72,'#07100d')}<text x="144" y="1376" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#0f5132">✓ Prueba visible</text><text x="144" y="1472" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#0f5132">✓ Mensaje claro</text><text x="144" y="1568" font-size="44" font-family="Inter, Arial" font-weight="900" fill="#0f5132">✓ Humano decide</text></svg>`;
  }
  if(treatment==='result_bridge'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}${evidenceImage(source,80,220,920,740,'contain')}<text x="154" y="1120" font-size="78" font-family="Inter, Arial" font-weight="950" fill="#ffffff">Evidencia</text><path d="M250 1208 C420 1320 610 1320 802 1208" fill="none" stroke="#66e3a2" stroke-width="18" stroke-linecap="round"/><polygon points="798,1162 890,1208 798,1254" fill="#66e3a2"/><text x="238" y="1450" font-size="78" font-family="Inter, Arial" font-weight="950" fill="#ffffff">Historia</text><rect x="146" y="1540" width="788" height="170" rx="42" fill="#f8fafc"/>${textBlock(viewerLines,190,1610,42,'#07100d',900)}</svg>`;
  }
  if(treatment==='detail_callout'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}<rect x="88" y="226" width="904" height="960" rx="54" fill="#f8fafc"/>${evidenceImage(source,128,276,824,820,'slice')}<rect x="164" y="610" width="752" height="250" rx="36" fill="none" stroke="#66e3a2" stroke-width="12"/><rect x="110" y="1280" width="860" height="340" rx="48" fill="#66e3a2"/>${textBlock(titleLines,154,1410,74,'#07100d')}<text x="154" y="1532" font-size="38" font-family="Inter, Arial" font-weight="800" fill="#07100d">El claim nace de este detalle.</text></svg>`;
  }
  if(treatment==='context_crop'){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}<rect x="72" y="225" width="936" height="1010" rx="52" fill="#0b1220"/>${evidenceImage(source,112,275,856,680,'contain')}<rect x="112" y="1010" width="856" height="150" rx="34" fill="#66e3a2"/>${textBlock(titleLines,154,1105,58,'#07100d')}<rect x="112" y="1330" width="856" height="300" rx="42" fill="#f8fafc"/>${textBlock(viewerLines,158,1420,46,'#07100d',900)}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${defs}${bg}${badge}${evidenceImage(source,70,230,940,990,'contain')}<rect x="86" y="1320" width="908" height="280" rx="50" fill="#f8fafc"/>${textBlock(titleLines,136,1442,78,'#07100d')}<rect x="86" y="1648" width="908" height="116" rx="38" fill="#66e3a2"/><text x="136" y="1722" font-size="40" font-family="Inter, Arial" font-weight="900" fill="#07100d">No es stock. Es evidencia real.</text></svg>`;
}

function conversationCardSvg(asset:any,scene:any){
  const recipe=scene.shot_recipe ?? {};
  const eventType=(()=>{ try{return JSON.parse(asset.metadata_json||'{}').event_type}catch{return null} })();
  const quote=cleanLabel(asset.title || asset.description || 'Conversación real',12);
  const title=eventType==='human_critique'?'Crítica humana':eventType==='decision'?'Decisión humana':eventType==='fix'?'Fix aplicado':eventType==='lesson'?'Aprendizaje':'Conversación real';
  const lines=wrapLines(asset.title || asset.description || quote,24,5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10231c"/><stop offset="1" stop-color="#07070a"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><rect x="72" y="98" width="936" height="82" rx="41" fill="#66e3a2"/><text x="118" y="151" font-size="34" font-family="Inter, Arial" font-weight="900" fill="#07100d">EVIDENCIA DE CONVERSACIÓN</text><rect x="86" y="280" width="908" height="980" rx="58" fill="#f8fafc"/><text x="140" y="400" font-size="74" font-family="Inter, Arial" font-weight="1000" fill="#07100d">${esc(title)}</text>${textBlock(lines,140,560,58,'#07100d',900)}<rect x="118" y="1350" width="844" height="250" rx="46" fill="#07100d" stroke="#66e3a2" stroke-width="5"/>${textBlock(wrapLines(recipe.viewer_read || asset.description || 'La conversación define la historia real',30,3),164,1450,42,'#ffffff',850)}<text x="118" y="1740" font-size="38" font-family="Inter, Arial" font-weight="850" fill="#66e3a2">No es screenshot: es decisión humana real.</text></svg>`;
}

function convertSourceToCard(source:any,out:string,scene:any){ const svgOut=out.replace(/\.png$/,'.svg'); if(source?.path && existsSync(source.path)) writeFileSync(svgOut,cardSvg(source.path,scene)); else writeFileSync(svgOut,conversationCardSvg(source,scene)); return svgOut; }

export function createDerivedVisualAssets(input:{job_id:string;storyboard:any;outputRoot?:string}){
  const storyboard=input.storyboard.storyboard_json ?? input.storyboard;
  const scenes=storyboard.timeline ?? [];
  const previewAssets=storyboard.preview_assets ?? [];
  if(!scenes.length) throw Object.assign(new Error('Storyboard has no timeline for derived visuals'),{code:'business_validation_failed'});
  const outRoot=input.outputRoot ?? path.join(process.env.OUTPUTS_PATH ?? path.join(process.cwd(),'outputs'),'derived-visual-assets',input.job_id,storyboard.id ?? `storyboard_${randomUUID()}`);
  mkdirSync(outRoot,{recursive:true});
  const assets=scenes.map((scene:any,idx:number)=>{
    const source=findEvidenceAsset(scene,previewAssets);
    if(!source) throw Object.assign(new Error(`Scene ${scene.id} has no preview asset or conversation evidence for b-roll derivation`),{code:'visual_evidence_missing'});
    const out=path.join(outRoot,`${String(idx+1).padStart(2,'0')}-${safeName(scene.shot_recipe?.human_scene_title ?? scene.human_scene_title ?? scene.scene_template ?? scene.beat_kind ?? scene.id)}.png`);
    const outputPath=convertSourceToCard(source,out,scene);
    return {
      id:`derived_${randomUUID()}`,
      job_id:input.job_id,
      storyboard_id:storyboard.id,
      scene_id:scene.scene_id ?? scene.id,
      source_evidence_id:source.evidence_id,
      source_path:source.path ?? null,
      output_path:outputPath,
      mime_type:mimeFor(outputPath),
      intended_use:scene.shot_recipe?.human_scene_title ?? scene.scene_template ?? scene.beat_kind ?? 'scene_specific_broll',
      crop_or_focal_area:scene.shot_recipe?.focal_area ?? scene.focal_area ?? scene.safe_crop ?? scene.focal_point ?? 'scene-specific crop/highlight',
      derived_kind:scene.shot_recipe?.evidence_treatment ?? scene.evidence_treatment ?? 'product_card',
      public_safe:true
    };
  });
  const manifest={id:`derived_assets_${randomUUID()}`,job_id:input.job_id,storyboard_id:storyboard.id,assets,coverage:{scene_count:scenes.length,derived_asset_count:assets.length,scene_ids:assets.map((a:any)=>a.scene_id),asset_strategy:'product_cards_not_decorated_crops'}};
  writeFileSync(path.join(outRoot,'manifest.json'),JSON.stringify(manifest,null,2));
  return manifest;
}
