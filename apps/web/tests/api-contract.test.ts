import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderStatus } from '../../../packages/core/src/schemas/enums';
test('provider status enum includes not_configured and healthy',()=>{ assert.equal(ProviderStatus.safeParse('not_configured').success,true); assert.equal(ProviderStatus.safeParse('healthy').success,true); });
