import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { json, readJson, errorResponse } from '../../../../lib/http';
import { requirePublicSource } from '../../../../lib/public-sources';
import { getJob, ensureState, transitionJob, addEvidence, listEvidence, withTaskRun } from '../../../../../../../packages/core/src/db/repositories';

export async function POST(req: Request, { params }: { params: Promise<{id: string}> }) {
  try {
    await readJson(req, z.object({}).strict());
    const { id } = await params, db = await getDb();
    const job = getJob(db, id);
    if (!job) throw Object.assign(new Error('Project not found.'), { code: 'not_found' });
    ensureState(job, ['created', 'evidence_failed']);
    const document = requirePublicSource('docs/architecture.md');
    const screenshot = requirePublicSource('docs/images/original-app-baseline.jpg');
    return withTaskRun(db, { job_id: id, task_type: 'evidence_collection', input: { sources: ['architecture', 'original-app'] } }, async () => {
      transitionJob(db, id, 'evidence_collecting');
      addEvidence(db, { job_id: id, type: 'project_asset', title: 'Public architecture document', description: readFileSync(document, 'utf8'), path: 'docs/architecture.md', source_project_id: 'content-engine-v2', rights_status: 'owned', privacy_level: 'public', public_safe: true, metadata: { sha256: createHash('sha256').update(readFileSync(document)).digest('hex') } });
      addEvidence(db, { job_id: id, type: 'screenshot', title: 'Original Content Engine application', description: 'An unmodified browser capture of the original application before this workflow update.', path: 'docs/images/original-app-baseline.jpg', source_project_id: 'content-engine-v2', rights_status: 'owned', privacy_level: 'public', public_safe: true, metadata: { sha256: createHash('sha256').update(readFileSync(screenshot)).digest('hex') } });
      const updated = transitionJob(db, id, 'evidence_collected');
      return json({ job_id: id, status: updated.status, evidence: listEvidence(db, id) });
    });
  } catch (error) { return errorResponse(error); }
}
