import test from 'node:test';
import assert from 'node:assert/strict';
import { ScriptClaimSchema } from '../src/schemas/artifacts';
test('blocks unsupported or unmapped factual claims',()=>{ const parsed=ScriptClaimSchema.safeParse({id:'claim_1',script_id:'script_1',claim_text:'Aumentó ventas 40%',claim_type:'other',support_level:'unsupported',evidence_ids:[],public_safe:true,requires_human_approval:false,rewrite_suggestion:null}); assert.equal(parsed.success,false); });
