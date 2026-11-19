import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { privacyScanMedia, copyUploadedEvidence } from '../src/artifacts/privacy-scan';
import { normalizeRights } from '../src/artifacts/rights-scan';

test('privacy scan blocks secrets and private URLs',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'ce2-privacy-'));
  const file=path.join(dir,'note.txt');
  writeFileSync(file,'Contact me at bad@example.com token=sk_test_1234567890abcdef http://127.0.0.1:3000/private');
  const scan=privacyScanMedia({asset_path:file,privacy_level:'public'});
  assert.equal(scan.public_safe,false);
  assert.equal(scan.redaction_required,true);
  assert.ok(scan.findings.some(f=>f.type==='api_key'));
  assert.ok(scan.findings.some(f=>f.type==='private_url'));
  rmSync(dir,{recursive:true,force:true});
});

test('manual evidence copy and rights normalization work',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'ce2-upload-'));
  const src=path.join(dir,'asset.txt');
  writeFileSync(src,'public-safe text');
  const dest=copyUploadedEvidence({source_path:src,job_id:'job_test',outputsPath:dir});
  assert.ok(dest.includes('job_test'));
  const rights=normalizeRights({rights_status:'owned'});
  assert.equal(rights.blocking,false);
  const unknown=normalizeRights({rights_status:'unknown'});
  assert.equal(unknown.blocking,true);
  rmSync(dir,{recursive:true,force:true});
});
