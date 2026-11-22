import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createDraftArtifact} from '../src/renderer/draft-renderer';
test('a hosted render rejects a blank native-layout fallback before narration or rendering',async()=>{
  const root=mkdtempSync(path.join(tmpdir(),'content-proof-'));const before=process.env.CONTENT_ORIGINAL_WORKSPACE;process.env.CONTENT_ORIGINAL_WORKSPACE='1';
  try{await assert.rejects(createDraftArtifact({job_id:'job',script:{id:'script',hook:'A story'},storyboard:{id:'board',preview_assets:[],timeline:[{start_sec:0,end_sec:20,shot_recipe:{layout_treatment:{proof_module:{value:'A claim'}}}}]},outputsPath:root}),{code:'visual_evidence_missing'});}
  finally{if(before===undefined)delete process.env.CONTENT_ORIGINAL_WORKSPACE;else process.env.CONTENT_ORIGINAL_WORKSPACE=before;rmSync(root,{recursive:true,force:true});}
});
