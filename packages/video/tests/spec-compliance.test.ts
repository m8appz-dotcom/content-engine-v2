import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('production agent spec is canonized in repo',()=>{
  assert.ok(existsSync('docs/production-agent-spec.md'));
  const spec=readFileSync('docs/production-agent-spec.md','utf8');
  assert.match(spec,/Especificación de Producción para Agente GPT/);
  assert.match(spec,/Remotion fresco para composición basada en timeline propio/);
  assert.match(spec,/El primer frame debe tener prueba visual o promesa clara/);
});

test('draft renderer does not use ffmpeg drawbox/drawtext placeholder composition',()=>{
  const src=readFileSync('packages/video/src/renderer/draft-renderer.ts','utf8');
  assert.doesNotMatch(src,/drawbox=/);
  assert.doesNotMatch(src,/drawtext=/);
  assert.match(src,/renderMedia/);
  assert.match(src,/preview_assets/);
});
