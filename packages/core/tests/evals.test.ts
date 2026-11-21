import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runEvals } from '../../../evals/run-evals';

test('eval suite writes a current result and preserves the dated historical report', async()=>{
  const archived=readFileSync('evals/reports/archive/2026-06-02.json','utf8');
  const summary=await runEvals({renderDraft:false});
  assert.equal(summary.ok,true);
  assert.equal(summary.passed,summary.total);
  assert.ok(summary.total>=7);
  const blocked=summary.results.find(result=>result.name==='draft QA contract blocks unusable product voice');
  assert.equal(blocked?.pass,true);
  assert.ok(existsSync('evals/reports/current.json'));
  const current=JSON.parse(readFileSync('evals/reports/current.json','utf8'));
  assert.equal(current.created_at,summary.created_at);
  assert.equal(current.ok,true);
  assert.equal(readFileSync('evals/reports/archive/2026-06-02.json','utf8'),archived);
});
