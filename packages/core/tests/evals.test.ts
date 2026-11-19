import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { runEvals } from '../../../evals/run-evals';

test('eval suite passes golden fixtures and writes latest report', async()=>{
  const summary=await runEvals({renderDraft:false});
  assert.equal(summary.ok,true);
  assert.equal(summary.passed,summary.total);
  assert.ok(summary.total>=7);
  const blocked=summary.results.find(result=>result.name==='draft QA contract blocks unusable product voice');
  assert.equal(blocked?.pass,true);
  assert.ok(existsSync('evals/reports/latest.json'));
});
