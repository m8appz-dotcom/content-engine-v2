import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Remotion scene library exposes distinct v1 scene components and dispatcher',()=>{
  const source=readFileSync('packages/video/src/remotion/DraftComposition.tsx','utf8');
  for(const name of ['HookScene','ContextSetupScene','ProofZoomScene','RiskContrastScene','ResultRevealScene','BenefitStackScene','CtaScene']){
    assert.match(source,new RegExp(`function ${name}\\(`));
  }
  assert.match(source,/function SceneLibraryDispatcher/);
  assert.match(source,/template==='RiskContrastScene'/);
  assert.match(source,/template==='BenefitStackScene'/);
});
