// Server-only: these paths come from the authenticated account's database and
// deployment configuration, never from a request body or a browser artifact.
import path from 'node:path';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

type DraftSource = {
  id: string;
  job_id: string;
  script_id: string;
  storyboard_id: string;
  video_path: string;
  timeline_json_path?: string | null;
  render_status: string;
  created_at: string;
  notes?: Record<string, unknown>;
};

export type PreservedNarration = {
  videoPath: string;
  sourceDraftId: string;
  sourceStoryboardId: string;
  durationSec: number;
  speechDurationSec?: number;
};

type AudioProbe = { codec: string; durationSec: number };
type Selection = {
  accountId: string | undefined;
  workspaceState: string | undefined;
  outputsPath: string | undefined;
  jobId: string;
  script: any;
  storyboard: any;
  drafts: readonly DraftSource[];
};

function unavailable(): never {
  throw Object.assign(new Error('The existing narration cannot be safely reused. Your original video is unchanged.'), {
    code: 'preserved_narration_unavailable',
  });
}

function identity(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) unavailable();
  return value;
}

function absolute(value: unknown): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0') || value.split(/[\\/]/).includes('..')) unavailable();
  return path.resolve(value);
}

function samePath(a: string, b: string): boolean {
  return path.relative(a, b) === '';
}

// Reject linked parents as well as linked leaf files. realpath alone would
// permit an account-directory junction to another account's private outputs.
function inspectPath(target: string, file: boolean, allowMissing = false): void {
  const root = path.parse(target).root;
  const parts = path.relative(root, target).split(path.sep).filter(Boolean);
  let cursor = root;
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i]);
    let stat;
    try { stat = lstatSync(cursor); }
    catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
      unavailable();
    }
    if (stat.isSymbolicLink()) unavailable();
    const leaf = i === parts.length - 1;
    if (leaf && file ? !stat.isFile() || stat.size <= 0 : !stat.isDirectory()) unavailable();
  }
  if (!samePath(target, realpathSync(target))) unavailable();
}

function ownFile(value: unknown, expected: string): string {
  const resolved = absolute(value);
  if (!samePath(resolved, expected)) unavailable();
  inspectPath(resolved, true);
  return resolved;
}

function normalized(value: unknown): string {
  if (typeof value !== 'string' || value.length > 100_000) unavailable();
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function spokenTimeline(value: any): string {
  if (!Array.isArray(value?.timeline) || value.timeline.length > 1000) unavailable();
  const lines = value.timeline.map((scene: any) => {
    if (!scene || typeof scene !== 'object') unavailable();
    return scene.narration === undefined || scene.narration === null ? '' : normalized(scene.narration);
  });
  return normalized(lines.filter(Boolean).join(' '));
}

function currentNarration(storyboard: any, script: any): string {
  const timeline = spokenTimeline(storyboard);
  if (timeline) return timeline;
  const fallback = script.voiceover || (script.beats ?? []).map((beat: any) => beat.line).join(' ') || script.hook;
  const narration = normalized(fallback);
  if (!narration) unavailable();
  return narration;
}

function probeAudio(videoPath: string): AudioProbe {
  const result = JSON.parse(execFileSync(process.env.FFPROBE_BIN || 'ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries',
    'stream=codec_name:format=duration', '-of', 'json', videoPath,
  ], { encoding: 'utf8', timeout: 10_000, maxBuffer: 65_536, stdio: ['ignore', 'pipe', 'pipe'] }));
  return { codec: result.streams?.[0]?.codec_name, durationSec: Number(result.format?.duration) };
}

/**
 * A prior render must never silently fall back to a fresh TTS request. Only a
 * genuinely initial render returns null. Caption/layout edits are intentionally
 * excluded: they can change while the approved spoken words stay identical.
 * The optional probe is a server-side test dependency, not a request option.
 */
export function selectPreservedNarration(input: Selection, probe: (videoPath: string) => AudioProbe = probeAudio): PreservedNarration | null {
  try {
    if (typeof window !== 'undefined') unavailable();
    if (typeof input.accountId !== 'string' || !/^[a-f0-9]{64}$/.test(input.accountId)) unavailable();
    const state = absolute(input.workspaceState);
    const root = path.join(state, 'content-accounts', input.accountId, 'outputs');
    if (!samePath(absolute(input.outputsPath), root)) unavailable();
    inspectPath(state, false);
    inspectPath(root, false, true);
    const jobId = identity(input.jobId);
    const scriptId = identity(input.script?.id);
    const storyboardId = identity(input.storyboard?.id);
    const script = input.script.script_json ?? input.script;
    const storyboard = input.storyboard.storyboard_json ?? input.storyboard;
    if (script.id !== scriptId || storyboard.id !== storyboardId || input.storyboard.script_id !== scriptId) unavailable();
    const prior = input.drafts.filter(draft => draft.job_id === jobId && draft.script_id === scriptId);
    if (!prior.length) return null;
    const scoped = prior.filter(draft => draft.storyboard_id === storyboardId);
    if (!scoped.length) unavailable();
    if (scoped.some(draft => !Number.isFinite(Date.parse(draft.created_at)))) unavailable();
    const sorted = [...scoped].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const draft = sorted[0];
    if (sorted[1] && Date.parse(sorted[1].created_at) === Date.parse(draft.created_at)) unavailable();
    const draftId = identity(draft.id);
    if (draft.render_status !== 'draft_rendered' || draft.notes?.audio_verified !== true || draft.notes?.product_voiceover_usable !== true) unavailable();
    const draftRoot = path.join(root, 'drafts', jobId, scriptId, draftId);
    const videoPath = ownFile(draft.video_path, path.join(draftRoot, 'draft_v1.mp4'));
    const timelinePath = ownFile(draft.timeline_json_path, path.join(draftRoot, `${draftId}-timeline.json`));
    if (lstatSync(timelinePath).size > 2 * 1024 * 1024) unavailable();
    const snapshot = JSON.parse(readFileSync(timelinePath, 'utf8'));
    if (snapshot.draft_id !== draftId || snapshot.job_id !== jobId || snapshot.script_id !== scriptId || snapshot.storyboard_id !== storyboardId) unavailable();
    // The immutable narration text also covers older snapshots whose scenes
    // used the script fallback rather than explicit per-scene narration.
    const narrationPath = path.join(draftRoot, '09_voiceover', 'narration.txt');
    ownFile(narrationPath, narrationPath);
    if (lstatSync(narrationPath).size > 100_000) unavailable();
    const recorded = normalized(readFileSync(narrationPath, 'utf8'));
    const previousTimeline = spokenTimeline(snapshot);
    if (!recorded || (previousTimeline && previousTimeline !== recorded) || currentNarration(storyboard, script) !== recorded) unavailable();
    const audio = probe(videoPath);
    if (audio.codec !== 'aac' || !Number.isFinite(audio.durationSec) || audio.durationSec <= 0 || audio.durationSec > 3600) unavailable();
    const voicePath = path.join(draftRoot, '09_voiceover', 'voiceover.wav');
    let voiceExists = false;
    try { lstatSync(voicePath); voiceExists = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') unavailable(); }
    let speechDurationSec: number | undefined;
    if (voiceExists) {
      ownFile(voicePath, voicePath);
      const speech = probe(voicePath);
      if (!/^pcm_/.test(speech.codec) || !Number.isFinite(speech.durationSec) || speech.durationSec <= 0 || speech.durationSec > audio.durationSec + 0.05) unavailable();
      speechDurationSec = speech.durationSec;
    }
    return { videoPath, sourceDraftId: draftId, sourceStoryboardId: storyboardId, durationSec: audio.durationSec, ...(speechDurationSec === undefined ? {} : { speechDurationSec }) };
  } catch {
    unavailable();
  }
}
