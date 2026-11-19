import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeDirection } from '../src/artifacts/creative-director';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { createStoryboardArtifact } from '../src/artifacts/storyboarder';

test('storyboard exposes human-readable preview cards with editorial and audiovisual checks',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',title:'Captura real',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const angle={id:'angle_1',visual_evidence_ids:['evi_1']};
  const creative=createCreativeDirection({job_id:'job_1',angle,evidence});
  const [script]=generateEvidenceBackedScripts({job_id:'job_1',angle,evidence,count:1,creative_direction:creative});
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence});
  const storyboard=createStoryboardArtifact({job_id:'job_1',script,production_plan:plan});
  assert.equal(storyboard.human_preview.length,script.beats.length);
  assert.equal(storyboard.human_preview_summary.review_required,true);
  assert.equal(storyboard.readability_check.human_preview_cards,true);
  assert.equal(storyboard.readability_check.audio_plan_visible,true);
  assert.ok(storyboard.music_sfx.length===script.beats.length);
  assert.ok(storyboard.human_preview.every((card:any)=>card.thumbnail_prompt && card.what_viewer_sees && card.what_viewer_must_understand && card.expected_emotion_or_curiosity && card.change_from_previous && card.audio?.music_cue && card.motion_vfx?.vfx_intent && card.safe_crop && card.reviewer_checklist.length>=5));
});
