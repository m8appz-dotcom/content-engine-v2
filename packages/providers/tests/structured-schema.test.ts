import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryAngleSchema,ScriptCandidateSchema} from '../../core/src/schemas/artifacts';
import {schemaToJsonSchema} from '../src/ai/structured-output';
test('structured angle constraints preserve string arrays and bounded integer scores',()=>{const schema=schemaToJsonSchema(StoryAngleSchema);assert.equal(schema.properties.main_claims.items.type,'string');assert.equal(schema.properties.score.type,'integer');assert.equal(schema.properties.score.minimum,0);assert.equal(schema.properties.score.maximum,100);});
test('script generation receives nested beat and claim contracts',()=>{const schema=schemaToJsonSchema(ScriptCandidateSchema);assert.equal(schema.properties.beats.items.type,'object');assert.equal(schema.properties.beats.minItems,3);assert.equal(schema.properties.beats.items.properties.evidence_ids.items.type,'string');assert.equal(schema.properties.claims.items.properties.evidence_ids.items.type,'string');assert.equal(schema.properties.duration_sec.type,'integer');assert.equal(schema.additionalProperties,false);});
