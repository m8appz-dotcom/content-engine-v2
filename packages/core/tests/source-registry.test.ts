import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceRegistry } from '../src/source-registry/validator';
test('validates default source registry contract',()=>{ const result=validateSourceRegistry('./content-engine-v2-source-map.md'); assert.equal(result.missing_paths.length,0); assert.equal(result.warnings.length,0); });
