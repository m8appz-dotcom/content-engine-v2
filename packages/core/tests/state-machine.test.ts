import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertTransition } from '../src/state-machine/job-state';
test('allows specified transitions only',()=>{ assert.equal(canTransition('created','evidence_collecting'),true); assert.equal(canTransition('created','scripts_generated'),false); assert.throws(()=>assertTransition('created','publish_ready'),/Invalid transition/); });

test('a checked draft can be rendered again without reopening published or in-flight jobs',()=>{
  assert.equal(canTransition('qa_passed','rendering_draft'),true);
  assert.equal(canTransition('draft_rendered','rendering_draft'),true);
  for(const state of ['published','publishing','publish_ready','qa_pending','rendering_draft'] as const)assert.equal(canTransition(state,'rendering_draft'),false);
  assert.equal(canTransition('rendering_draft','draft_rendered'),true);
});
