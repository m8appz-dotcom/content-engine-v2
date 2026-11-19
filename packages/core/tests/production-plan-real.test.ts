import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeDirection } from '../src/artifacts/creative-director';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { runDeterministicProductiveCrew } from '../../../services/crew/crews/content_engine_v2';

test('production plan is an audiovisual contract per beat, not metadata-only scenes',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',title:'Captura real',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const angle={id:'angle_1',visual_evidence_ids:['evi_1']};
  const creative=createCreativeDirection({job_id:'job_1',angle,evidence});
  const [script]=generateEvidenceBackedScripts({job_id:'job_1',angle,evidence,count:1,creative_direction:creative});
  const crew=runDeterministicProductiveCrew({job_id:'job_1',script,evidence});
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence,productive_crew:crew});
  assert.equal(plan.production_contract.requires_scene_templates,true);
  assert.equal(plan.production_contract.requires_audio,true);
  assert.equal(plan.production_contract.requires_secondary_visuals,true);
  assert.equal(plan.asset_coverage.repeated_single_evidence,true);
  assert.ok(plan.asset_coverage.derived_visuals_required>=3);
  assert.equal(plan.voiceover_plan.needs_tts,true);
  assert.equal(plan.music_plan.required,true);
  assert.equal(plan.sfx_plan.required,true);
  assert.equal(plan.vfx_plan.required,true);
  assert.equal(plan.motion_plan.required,true);
  assert.equal(plan.broll_plan.length,script.beats.length);
  assert.ok(plan.demo_capture_plan.length>0);
  assert.ok(plan.scenes.every((s:any)=>s.scene_template && s.primary_visual && s.secondary_visual_or_broll && s.music_cue && s.sfx_cue && s.safe_crop && s.why_this_shot_works));
  assert.ok(plan.handoff_to_storyboard.human_preview_required);
});
