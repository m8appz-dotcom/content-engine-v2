import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const SCORE_NAMES = ['evidence_support', 'rights_safety', 'privacy_safety', 'sme_clarity', 'hook_strength', 'narrative_coherence', 'visual_proof', 'caption_readability', 'audio_quality', 'pace'] as const;
type ScoreName = typeof SCORE_NAMES[number];
type CheckName = 'editorial_criteria' | 'artifact_files' | 'source_references' | 'rights_metadata' | 'privacy_metadata' | 'caption_metadata' | 'render_metadata' | 'audio_files_and_source' | 'audio_measurement_metadata' | 'renderer_visual_validation';

function audioMetrics(draft:any) { return draft?.notes?.audio_metrics ?? {}; }
function needsVoiceover(storyboard:any) { return (storyboard?.timeline ?? []).some((tl:any) => tl.narration) || (storyboard?.human_preview ?? []).some((card:any) => card.voiceover_line); }
function editorialCriteria(storyboard:any, script:any) { return storyboard?.editorial_criteria ?? script?.editorial_criteria ?? null; }

// These fields describe source and timing integrity, never a perceptual review.
function validVisualValidation(value:any):boolean {
  const strings = (items:any) => Array.isArray(items) && items.every((item:unknown) => typeof item === 'string');
  const object = (item:any) => item !== null && typeof item === 'object' && !Array.isArray(item);
  const named = (item:any) => typeof item === 'string' && item.trim().length > 0;
  const finite = (item:any) => typeof item === 'number' && Number.isFinite(item);
  if (!object(value) || value.version !== 'editorial_v1' || value.scope !== 'source_and_timing_integrity'
    || value.perceptual_review_required !== true || typeof value.pass !== 'boolean' || !strings(value.issues)
    || !Array.isArray(value.scenes) || !value.scenes.length) return false;
  for (const scene of value.scenes) {
    if (!object(scene) || !named(scene.scene_id) || !named(scene.layout) || !named(scene.source_id)
      || !['image', 'document', 'review_record'].includes(scene.source_kind)
      || typeof scene.geometry_measured !== 'boolean'
      || !finite(scene.narration_start_sec) || scene.narration_start_sec < 0
      || !finite(scene.narration_end_sec) || scene.narration_end_sec <= scene.narration_start_sec
      || !Number.isInteger(scene.caption_count) || scene.caption_count < 0
      || typeof scene.pass !== 'boolean' || !strings(scene.issues)
      || scene.pass !== (scene.issues.length === 0)) return false;
    const hasArea = Object.hasOwn(scene, 'source_area_fraction'), hasFont = Object.hasOwn(scene, 'min_font_px');
    // An unmeasured scene must not carry purported measurement values. When
    // measurements are supplied, validate them without treating them as a review.
    if (!scene.geometry_measured && (hasArea || hasFont)) return false;
    if (hasArea && (!finite(scene.source_area_fraction) || scene.source_area_fraction < 0 || scene.source_area_fraction > 1)) return false;
    if (hasFont && (!finite(scene.min_font_px) || scene.min_font_px < 32)) return false;
    for (const field of ['source_width_px', 'source_height_px']) {
      if (Object.hasOwn(scene, field) && scene[field] !== undefined && (!finite(scene[field]) || scene[field] <= 0)) return false;
    }
    if (Object.hasOwn(scene, 'planned_start_sec') || Object.hasOwn(scene, 'planned_end_sec')) {
      if (!finite(scene.planned_start_sec) || scene.planned_start_sec < 0 || !finite(scene.planned_end_sec) || scene.planned_end_sec <= scene.planned_start_sec) return false;
    }
  }
  return value.pass === (value.issues.length === 0 && value.scenes.every((scene:any) => scene.pass));
}

/** Checks stored artifacts and metadata; never watches, listens to, or approves a video. */
export function reviewDraft(input:{job_id:string;draft:any;script:any;storyboard:any;evidence:any[]}) {
  const draft = input.draft;
  const script = input.script.script_json ?? input.script;
  const storyboard = input.storyboard.storyboard_json ?? input.storyboard;
  const blocking_issues:string[] = [];
  const non_blocking_issues:string[] = [];
  const checks:Record<CheckName, {status:'passed'|'failed'|'not_provided';issues:string[]}> = {
    editorial_criteria: {status:'passed',issues:[]},
    artifact_files: {status:'passed',issues:[]},
    source_references: {status:'passed',issues:[]},
    rights_metadata: {status:'passed',issues:[]},
    privacy_metadata: {status:'passed',issues:[]},
    caption_metadata: {status:'passed',issues:[]},
    render_metadata: {status:'passed',issues:[]},
    audio_files_and_source: {status:'passed',issues:[]},
    audio_measurement_metadata: {status:'passed',issues:[]},
    renderer_visual_validation: {status:'not_provided',issues:[]},
  };
  function block(check:CheckName, issue:string) {
    blocking_issues.push(issue);
    checks[check].status = 'failed';
    checks[check].issues.push(issue);
  }

  const criteria = editorialCriteria(storyboard, script);
  if (!criteria) block('editorial_criteria', 'editorial_criteria_missing');
  else {
    if (!(criteria.must_read ?? []).length) block('editorial_criteria', 'editorial_must_read_missing');
    if (!(criteria.must_not_read ?? []).length) block('editorial_criteria', 'editorial_must_not_read_missing');
    if (!(criteria.quality_bars ?? []).length) block('editorial_criteria', 'editorial_quality_bars_missing');
  }
  if (!draft.video_path || !existsSync(draft.video_path)) block('artifact_files', 'draft_video_missing');
  if (draft.video_path && !String(draft.video_path).endsWith('.mp4')) block('artifact_files', 'draft_not_mp4');
  if (!draft.contact_sheet_path || !existsSync(draft.contact_sheet_path)) block('artifact_files', 'contact_sheet_missing');
  if (draft.contact_sheet_path && !String(draft.contact_sheet_path).endsWith('.png')) block('artifact_files', 'contact_sheet_not_png');

  const evidenceIds = new Set(input.evidence.map(e => e.id));
  if (!evidenceIds.size) block('source_references', 'evidence_missing');
  for (const claim of script.claims ?? []) {
    if (!(claim.evidence_ids ?? []).length) block('source_references', `claim_without_evidence:${claim.id}`);
    for (const id of claim.evidence_ids ?? []) if (!evidenceIds.has(id)) block('source_references', `claim_missing_evidence:${claim.id}`);
  }
  for (const item of input.evidence) {
    if (!['owned','licensed','generated','authorized'].includes(item.rights_status)) block('rights_metadata', `unsafe_rights:${item.id}`);
    if (item.privacy_level === 'restricted') block('privacy_metadata', `restricted_privacy:${item.id}`);
  }
  for (const tl of storyboard.timeline ?? []) {
    if (!(tl.evidence_ids ?? []).length) block('source_references', `timeline_missing_visual_evidence:${tl.id}`);
    for (const id of tl.evidence_ids ?? []) if (!evidenceIds.has(id)) block('source_references', `timeline_missing_evidence:${tl.id}`);
  }
  if (!(storyboard.captions ?? []).length) block('caption_metadata', 'captions_missing');
  if (draft.render_status !== 'draft_rendered') block('render_metadata', 'draft_not_rendered');
  if (draft.timeline_json_path && existsSync(draft.timeline_json_path)) {
    try {
      const preview = JSON.parse(readFileSync(draft.timeline_json_path, 'utf8'));
      if (!preview.draft_id) block('render_metadata', 'timeline_unreadable');
    } catch { block('render_metadata', 'timeline_unreadable'); }
  }
  if ((script.voiceover ?? '').length < 80) non_blocking_issues.push('voiceover_may_be_too_short');

  const metrics = audioMetrics(draft);
  const mean = metrics.mean_volume_db, max = metrics.max_volume_db;
  if (draft.notes?.audio_verified !== true) block('audio_measurement_metadata', 'audio_not_verified');
  if (!draft.notes?.voiceover_path || !existsSync(draft.notes.voiceover_path)) block('audio_files_and_source', 'voiceover_missing');
  const voiceOnly = draft.notes?.audio_mix_mode === 'voice_only';
  if (!voiceOnly && (!draft.notes?.music_path || !existsSync(draft.notes.music_path))) block('audio_files_and_source', 'music_bed_missing');
  if (!voiceOnly && (!draft.notes?.sfx_path || !existsSync(draft.notes.sfx_path))) block('audio_files_and_source', 'sfx_missing');
  if ((needsVoiceover(storyboard) || voiceOnly) && !draft.notes?.voiceover_source) block('audio_files_and_source', 'voiceover_source_missing');
  if ((needsVoiceover(storyboard) || voiceOnly) && draft.notes?.product_voiceover_usable !== true) block('audio_files_and_source', 'product_voiceover_unusable');
  if (String(draft.notes?.voiceover_source ?? '').includes('espeak')) block('audio_files_and_source', 'unacceptable_robotic_voiceover');
  // Null, empty strings and booleans are not measured dB values.
  if (typeof mean !== 'number' || typeof max !== 'number' || !Number.isFinite(mean) || !Number.isFinite(max)) block('audio_measurement_metadata', 'audio_volume_metrics_missing');
  else if (mean < -45 || max < -30) block('audio_measurement_metadata', 'audio_effectively_silent');

  const visualValidation = draft.notes?.visual_validation;
  if (visualValidation !== undefined) {
    if (!validVisualValidation(visualValidation)) block('renderer_visual_validation', 'visual_validation_invalid');
    else if (visualValidation.scenes.some((scene:any) => !evidenceIds.has(scene.source_id))) block('renderer_visual_validation', 'visual_validation_source_missing');
    else if (visualValidation.scenes.length !== (storyboard.timeline ?? []).length
      || new Set(visualValidation.scenes.map((scene:any) => scene.scene_id)).size !== visualValidation.scenes.length
      || visualValidation.scenes.some((scene:any) => !(storyboard.timeline ?? []).some((entry:any) => entry.id === scene.scene_id))) block('renderer_visual_validation', 'visual_validation_scene_mismatch');
    else if (typeof draft.duration_sec === 'number' && Number.isFinite(draft.duration_sec)
      && visualValidation.scenes.some((scene:any) => scene.narration_end_sec > draft.duration_sec + 0.001
        || (scene.planned_end_sec !== undefined && scene.planned_end_sec > draft.duration_sec + 0.001))) block('renderer_visual_validation', 'visual_validation_timing_invalid');
    else if (!visualValidation.pass) block('renderer_visual_validation', 'visual_validation_failed');
    else checks.renderer_visual_validation.status = 'passed';
  }

  // Retain legacy keys for consumers, but never manufacture a quality rating.
  const scores = Object.fromEntries(SCORE_NAMES.map(name => [name, null])) as Record<ScoreName, number|null>;
  const pass = blocking_issues.length === 0;
  return {
    id:`qa_${randomUUID()}`, job_id:input.job_id, draft_id:draft.id,
    assessment_type:'technical_checks' as const,
    technical_checks: {
      status:pass ? 'passed' as const : 'failed' as const, pass,
      scope:'File presence, source references, declared rights/privacy, caption metadata and renderer-supplied measurements; no media decoding or perceptual assessment.',
      checks,
    },
    scores,
    perceptual_review: {status:'pending' as const, required:true, geometry_status:'not_evaluated' as const, scores:{...scores}},
    requires_human_review:true,
    editorial_criteria:criteria, blocking_issues, non_blocking_issues,
    // Compatibility: pass describes technical checks only, never human acceptance.
    pass, publish_ready:false,
    gate_b_note:pass ? 'Technical checks passed. Review the full video and audio before approving publication.' : 'Technical checks failed. Fix the listed issues, then review the full video and audio before approving publication.',
  };
}
