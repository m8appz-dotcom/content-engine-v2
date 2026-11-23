import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selectPreservedNarration } from '../src/audio/preserved-narration';

const account = 'a'.repeat(64);
const otherAccount = 'b'.repeat(64);
const narration = 'Content Engine keeps evidence visible. A person approves the story.';
const probe = () => ({ codec: 'aac', durationSec: 19.985 });

function fixture() {
  const state = mkdtempSync(path.join(tmpdir(), 'content-preserved-'));
  const outputs = path.join(state, 'content-accounts', account, 'outputs');
  const storyboard = {
    id: 'storyboard_test', script_id: 'script_test',
    storyboard_json: {
      id: 'storyboard_test',
      timeline: [{ id: 'one', narration: 'Content Engine keeps evidence visible.' }, { id: 'two', narration: 'A person approves the story.' }],
      captions: [{ text: 'Old visual placeholder' }],
    },
  };
  const input = {
    accountId: account, workspaceState: state, outputsPath: outputs,
    jobId: 'job_test', script: { id: 'script_test', script_json: { id: 'script_test', voiceover: narration } },
    storyboard, drafts: [] as any[],
  };
  function addDraft(id: string, created = '2026-11-22T12:00:00Z') {
    const dir = path.join(outputs, 'drafts', 'job_test', 'script_test', id);
    mkdirSync(path.join(dir, '09_voiceover'), { recursive: true });
    const row = {
      id, job_id: 'job_test', script_id: 'script_test', storyboard_id: storyboard.id,
      video_path: path.join(dir, 'draft_v1.mp4'), timeline_json_path: path.join(dir, `${id}-timeline.json`),
      render_status: 'draft_rendered', created_at: created,
      notes: { audio_verified: true, product_voiceover_usable: true },
    };
    writeFileSync(row.video_path, 'test fixture; probe is injected without model calls');
    writeFileSync(row.timeline_json_path, JSON.stringify({
      ...storyboard.storyboard_json, draft_id: id, job_id: row.job_id,
      script_id: row.script_id, storyboard_id: row.storyboard_id,
    }));
    writeFileSync(path.join(dir, '09_voiceover/narration.txt'), narration);
    input.drafts.push(row);
    return row;
  }
  return { state, outputs, input, addDraft, close: () => rmSync(state, { recursive: true, force: true }) };
}

function useFixture(fn: (f: ReturnType<typeof fixture>) => void) {
  const f = fixture();
  try { fn(f); } finally { f.close(); }
}

function refused(fn: () => unknown) {
  assert.throws(fn, { code: 'preserved_narration_unavailable' });
}

test('reuses newest scoped narration while allowing edited captions and visual layouts', () => useFixture(f => {
  f.addDraft('draft_old', '2026-11-22T11:00:00Z');
  const latest = f.addDraft('draft_latest');
  const before = readFileSync(latest.video_path);
  f.input.storyboard.storyboard_json.captions = [{ text: 'Evidence stays visible' }, { text: 'Human approval' }];
  Object.assign(f.input.storyboard.storyboard_json.timeline[0], { foreground_text: 'Readable evidence', scene_template: 'UpdatedVisual' });
  const result = selectPreservedNarration(f.input, probe);
  assert.deepEqual(result, { videoPath: latest.video_path, sourceDraftId: latest.id, sourceStoryboardId: latest.storyboard_id, durationSec: 19.985 });
  assert.deepEqual(readFileSync(latest.video_path), before);
}));

test('only the first narration of a script permits TTS; existing script recordings fail closed', () => useFixture(f => {
  let probes = 0;
  assert.equal(selectPreservedNarration(f.input, () => { probes++; return probe(); }), null);
  assert.equal(probes, 0);
  const row = f.addDraft('draft_other_board');
  row.storyboard_id = 'other_board';
  refused(() => selectPreservedNarration(f.input, probe));
  row.storyboard_id = f.input.storyboard.id;
  row.script_id = 'different_script';
  assert.equal(selectPreservedNarration(f.input, () => { probes++; return probe(); }), null);
  assert.equal(probes, 0, 'An unrelated script never needs probing to authorize its first narration.');
}));

test('changed or reordered spoken words fail closed instead of regenerating speech', () => useFixture(f => {
  f.addDraft('draft_original');
  f.input.storyboard.storyboard_json.timeline[0].narration = 'A different promise.';
  refused(() => selectPreservedNarration(f.input, probe));
  f.input.storyboard.storyboard_json.timeline = [
    { id: 'two', narration: 'A person approves the story.' },
    { id: 'one', narration: 'Content Engine keeps evidence visible.' },
  ];
  refused(() => selectPreservedNarration(f.input, probe));
}));

test('harmless narration whitespace does not force another voice generation', () => useFixture(f => {
  f.addDraft('draft_original');
  f.input.storyboard.storyboard_json.timeline[0].narration = 'Content  Engine\nkeeps evidence visible. ';
  assert.equal(selectPreservedNarration(f.input, probe)?.sourceDraftId, 'draft_original');
}));

test('reports legitimate pre-padding speech duration without replacing the source AAC', () => useFixture(f => {
  const row = f.addDraft('draft_original');
  const voice = path.join(path.dirname(row.video_path), '09_voiceover/voiceover.wav');
  writeFileSync(voice, 'probe-only PCM fixture');
  const result = selectPreservedNarration(f.input, file => file === voice ? { codec: 'pcm_s16le', durationSec: 15.125 } : probe());
  assert.equal(result?.speechDurationSec, 15.125);
  assert.equal(result?.durationSec, 19.985);
  assert.equal(result?.videoPath, row.video_path);
  refused(() => selectPreservedNarration(f.input, file => file === voice ? { codec: 'pcm_s16le', durationSec: 21 } : probe()));
}));

test('rejects forged account roots before probing any file', () => useFixture(f => {
  f.addDraft('draft_original');
  let probes = 0;
  const forbiddenProbe = () => { probes++; return probe(); };
  refused(() => selectPreservedNarration({ ...f.input, accountId: '../other' }, forbiddenProbe));
  refused(() => selectPreservedNarration({ ...f.input, accountId: undefined }, forbiddenProbe));
  refused(() => selectPreservedNarration({ ...f.input, outputsPath: path.join(f.state, 'content-accounts', otherAccount, 'outputs') }, forbiddenProbe));
  assert.equal(probes, 0);
}));

test('rejects cross-account video or timeline paths and traversal within an apparent allowed path', () => useFixture(f => {
  const row = f.addDraft('draft_original');
  const video = row.video_path;
  const timeline = row.timeline_json_path;
  row.video_path = video.replace(account, otherAccount);
  refused(() => selectPreservedNarration(f.input, probe));
  row.video_path = path.dirname(video) + path.sep + 'unused' + path.sep + '..' + path.sep + path.basename(video);
  refused(() => selectPreservedNarration(f.input, probe));
  row.video_path = video;
  row.timeline_json_path = timeline.replace(account, otherAccount);
  refused(() => selectPreservedNarration(f.input, probe));
}));

test('rejects a linked draft directory even when its target contains valid artifacts', () => useFixture(f => {
  const row = f.addDraft('draft_original');
  const originalDir = path.dirname(row.video_path);
  const linkedDir = path.join(path.dirname(originalDir), 'draft_linked');
  symlinkSync(originalDir, linkedDir, process.platform === 'win32' ? 'junction' : 'dir');
  row.id = 'draft_linked';
  row.video_path = path.join(linkedDir, 'draft_v1.mp4');
  row.timeline_json_path = path.join(linkedDir, 'draft_linked-timeline.json');
  refused(() => selectPreservedNarration(f.input, probe));
}));

test('rejects a symlink leaf instead of passing it to ffprobe', t => useFixture(f => {
  const row = f.addDraft('draft_original');
  const source = path.join(path.dirname(row.video_path), 'other.mp4');
  writeFileSync(source, 'other');
  unlinkSync(row.video_path);
  try { symlinkSync(source, row.video_path, 'file'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') { t.skip('Host does not permit unprivileged file symlinks; directory-junction rejection is tested separately.'); return; }
    throw error;
  }
  let probed = false;
  refused(() => selectPreservedNarration(f.input, () => { probed = true; return probe(); }));
  assert.equal(probed, false);
}));

test('does not fall back to an older draft when the newest source is missing or invalid', () => useFixture(f => {
  f.addDraft('draft_old', '2026-11-22T11:00:00Z');
  const latest = f.addDraft('draft_latest');
  unlinkSync(latest.video_path);
  refused(() => selectPreservedNarration(f.input, probe));
}));

test('rejects mismatched snapshot identity or altered immutable narration text', () => useFixture(f => {
  const row = f.addDraft('draft_original');
  const original = readFileSync(row.timeline_json_path, 'utf8');
  const snapshot = JSON.parse(original);
  writeFileSync(row.timeline_json_path, JSON.stringify({ ...snapshot, script_id: 'different_script' }));
  refused(() => selectPreservedNarration(f.input, probe));
  writeFileSync(row.timeline_json_path, original);
  writeFileSync(path.join(path.dirname(row.video_path), '09_voiceover/narration.txt'), 'An altered narration.');
  refused(() => selectPreservedNarration(f.input, probe));
}));

test('unparseable snapshots, unavailable narration and uncertain audio fail closed', () => useFixture(f => {
  const row = f.addDraft('draft_original');
  const original = readFileSync(row.timeline_json_path, 'utf8');
  writeFileSync(row.timeline_json_path, '{bad');
  refused(() => selectPreservedNarration(f.input, probe));
  writeFileSync(row.timeline_json_path, original);
  for (const audio of [{ codec: 'mp3', durationSec: 19.985 }, { codec: 'aac', durationSec: NaN }, { codec: 'aac', durationSec: 0 }]) {
    refused(() => selectPreservedNarration(f.input, () => audio));
  }
  refused(() => selectPreservedNarration(f.input, () => { throw Error('probe failure'); }));
  // With the actual ffprobe the intentionally invalid fixture is rejected too.
  refused(() => selectPreservedNarration(f.input));
  unlinkSync(path.join(path.dirname(row.video_path), '09_voiceover/narration.txt'));
  refused(() => selectPreservedNarration(f.input, probe));
}));
