import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertTransition } from '../src/state-machine/job-state';
test('allows specified transitions only',()=>{ assert.equal(canTransition('created','evidence_collecting'),true); assert.equal(canTransition('created','scripts_generated'),false); assert.throws(()=>assertTransition('created','publish_ready'),/Invalid transition/); });
