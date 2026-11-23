import path from 'node:path';
import {realpathSync} from 'node:fs';
import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { withIdempotency } from '../../../../lib/idempotency';
import { createArtifactVersion, createDraft, ensureState, getJob, getScriptCandidate, getStoryboard, listDrafts, listEvidence, transitionJob, withTaskRun } from '../../../../../../../packages/core/src/db/repositories';
import { createDraftArtifact } from '../../../../../../../packages/video/src/renderer/draft-renderer';
import { selectPreservedNarration } from '../../../../../../../packages/video/src/audio/preserved-narration';
import { createEditorialVisualRevision } from '../../../../../../../packages/core/src/artifacts/editorial-visual-revision';
import { requirePublicSource } from '../../../../lib/public-sources';
import { createDerivedVisualAssets } from '../../../../../../../packages/core/src/artifacts/derived-visual-assets';

const RequestSchema = z.object({ storyboard_id: z.string().min(1), render_quality: z.literal('draft').default('draft'), editorial_source_evidence_ids: z.array(z.string().min(1).max(90)).min(1).max(32).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = await readJson(req, RequestSchema);
    const db = await getDb();
    return await withIdempotency(req, db, 'POST /api/jobs/' + id + '/render-draft', input, async () => withTaskRun(db, {
      job_id: id, task_type: 'draft_rendering', input,
    }, async () => {
      const job = getJob(db, id);
      if (!job) throw Object.assign(new Error('Job not found'), { code: 'not_found' });
      ensureState(job, ['storyboard_ready', 'qa_failed', 'draft_rendered', 'qa_passed']);
      const storyboard = getStoryboard(db, id, input.storyboard_id);
      if (!storyboard) throw Object.assign(new Error('Storyboard not found'), { code: 'not_found' });
      const script = getScriptCandidate(db, id, storyboard.script_id);
      if (!script) throw Object.assign(new Error('Script not found'), { code: 'not_found' });
      if (script.status !== 'approved' || storyboard.status !== 'approved') {
        throw Object.assign(new Error('Review and approve the script and storyboard before rendering.'), { code: 'business_validation_failed' });
      }
      const account = (db as any).workspaceActor;
      const originalWorkspace = process.env.CONTENT_ORIGINAL_WORKSPACE === '1';
      const outputsPath = account ? path.join(process.env.WORKSPACE_STATE!, 'content-accounts', account, 'outputs') : process.env.OUTPUTS_PATH;
      // Only authenticated database records and the server's private account
      // root select a source. An invalid prior render never falls back to TTS.
      const priorDrafts = originalWorkspace ? listDrafts(db, id) : [];
      const preserved = originalWorkspace ? selectPreservedNarration({
        accountId: account, workspaceState: process.env.WORKSPACE_STATE, outputsPath,
        jobId: id, script, storyboard, drafts: priorDrafts,
      }) : null;
      const priorVisualRevision = priorDrafts.find((draft:any) => draft.job_id === id
        && draft.script_id === script.id && draft.storyboard_id === storyboard.id
        && draft.render_status === 'draft_rendered' && draft.notes?.visual_revision)?.notes?.visual_revision;
      const visualRevision = originalWorkspace ? createEditorialVisualRevision({
        job_id: id, script, storyboard, evidence: listEvidence(db, id),
        approvals: db.prepare("SELECT id,job_id,artifact_id,status,approved_by,metadata_json FROM approvals WHERE job_id=? AND status='approved' AND artifact_id IN (?,?)").all(id, script.id, storyboard.id),
        source_evidence_ids: input.editorial_source_evidence_ids,
        scope_actor_id: account, prior_visual_revision: priorVisualRevision,
      }) : null;
      // Evidence membership is established above; file access remains constrained
      // to the server's public release allowlist, never a client-supplied path.
      const editorialEvidenceAssets = visualRevision?.assets.map(asset => ({ ...asset, path: requirePublicSource(asset.path) }));
      transitionJob(db, id, 'rendering_draft');
      try {
        const derivedVisualAssets = originalWorkspace ? { id: 'original-source-assets', assets: [] } : createDerivedVisualAssets({
          job_id: id, storyboard, outputRoot: outputsPath ? path.join(outputsPath, 'derived-visual-assets', id, storyboard.id) : undefined,
        });
        createArtifactVersion(db, { job_id: id, artifact_type: 'derived_visual_assets', artifact_id: derivedVisualAssets.id, artifact_json: derivedVisualAssets });
        const storyboardWithDerived = { ...storyboard, storyboard_json: { ...storyboard.storyboard_json, derived_visual_assets: derivedVisualAssets } };
        if (visualRevision) createArtifactVersion(db, {
          job_id: id, artifact_type: 'editorial_visual_revision', artifact_id: visualRevision.id, artifact_json: visualRevision,
        });
        const draft = await createDraftArtifact({
          job_id: id, script, storyboard: storyboardWithDerived, outputsPath,
          ...(visualRevision ? {
            editorialEvidenceAssets,
            editorialSceneSources: visualRevision.scene_sources,
            editorialAllowedRoots: [realpathSync(process.cwd())],
          } : {}),
          ...(preserved ? {
            preservedAudioVideoPath: preserved.videoPath,
            preservedAudioDurationSec: preserved.durationSec,
            preservedSpeechDurationSec: preserved.speechDurationSec,
          } : {}),
        });
        const visualDraft = visualRevision ? { ...draft, notes: { ...draft.notes, visual_revision: {
          artifact_id: visualRevision.id, status: visualRevision.status,
          job_id: id, script_id: script.id, scope_actor_id: account,
          selection_mode: visualRevision.selection_mode,
          selected_evidence_ids: visualRevision.selected_evidence_ids,
          source_storyboard_id: storyboard.id,
          source_script_sha256: visualRevision.source_script_sha256,
          source_storyboard_sha256: visualRevision.source_storyboard_sha256,
          source_approval_ids: visualRevision.source_approval_ids,
          scene_sources: visualRevision.scene_sources,
        } } } : draft;
        const storedDraft = preserved ? { ...visualDraft, notes: { ...visualDraft.notes, preserved_audio: {
          source_draft_id: preserved.sourceDraftId,
          source_storyboard_id: preserved.sourceStoryboardId,
          duration_sec: preserved.durationSec,
          ...(preserved.speechDurationSec === undefined ? {} : { speech_duration_sec: preserved.speechDurationSec }),
          mode: 'aac_stream_copy',
        } } } : visualDraft;
        const row = createDraft(db, { job_id: id, script_id: storyboard.script_id, storyboard_id: input.storyboard_id, draft: storedDraft });
        const next = transitionJob(db, id, 'draft_rendered');
        return json({ job_id: id, status: next.status, draft: row });
      } catch (error) {
        transitionJob(db, id, 'storyboard_ready');
        throw error;
      }
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
