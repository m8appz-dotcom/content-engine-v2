import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDraftArtifact } from '../src/renderer/draft-renderer';

const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#123'/><text x='90' y='250' font-size='82' fill='white'>Presenter gate</text></svg>`;

test('renderer blocks enabled presenter/avatar without a real asset',async()=>{
  const out=mkdtempSync(path.join(tmpdir(),'ce2-presenter-gate-'));
  const asset=path.join(out,'evidence.svg'); writeFileSync(asset,svg);
  const script={id:'script_presenter',hook:'Hook',cta:'CTA',duration_sec:20,voiceover:'Narración con suficiente longitud para pasar el contrato de audio.'};
  const storyboard={id:'storyboard_presenter',estimated_duration_sec:20,avatar_plan:{enabled:true,role:'cta',asset_required:true,asset_path:null},timeline:[{id:'tl_1',start_sec:0,end_sec:20,evidence_ids:['evi_1'],narration:script.voiceover,scene_template:'CtaScene',beat_kind:'cta'}],captions:[{text:'CTA'}],preview_assets:[{evidence_id:'evi_1',path:asset,type:'screenshot',rights_status:'owned'}]};
  await assert.rejects(()=>createDraftArtifact({job_id:'job_presenter',script,storyboard,outputsPath:out}),/no real presenter asset/);
  rmSync(out,{recursive:true,force:true});
});
