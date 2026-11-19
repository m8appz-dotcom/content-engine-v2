import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDerivedVisualAssets } from '../src/artifacts/derived-visual-assets';

test('derives scene-specific b-roll assets from one evidence item across many beats',()=>{
  const out=mkdtempSync(path.join(tmpdir(),'ce2-derived-'));
  const source=path.join(out,'evidence.svg');
  writeFileSync(source,`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#123'/><text x='90' y='250' font-size='82' fill='white'>Prueba</text></svg>`);
  const storyboard={id:'storyboard_1',timeline:['HookScene','ProofZoomScene','RiskContrastScene','ResultRevealScene','BenefitStackScene','CtaScene'].map((t,i)=>({id:`tl_${i+1}`,scene_id:`scene_${i+1}`,scene_template:t,beat_kind:t,evidence_ids:['evi_1']})),preview_assets:[{evidence_id:'evi_1',path:source,type:'screenshot',rights_status:'owned'}]};
  const manifest=createDerivedVisualAssets({job_id:'job_1',storyboard,outputRoot:path.join(out,'derived')});
  assert.equal(manifest.assets.length,storyboard.timeline.length);
  assert.ok(manifest.assets.every((a:any)=>existsSync(a.output_path)));
  assert.equal(new Set(manifest.assets.map((a:any)=>a.output_path)).size,storyboard.timeline.length);
  rmSync(out,{recursive:true,force:true});
});
