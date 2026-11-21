import {
  $,
  $$,
  esc,
  load,
  save,
  draw,
  modal,
  notify,
  download,
  words,
  tabs,
  scope,
  access,
  wireAccess,
} from "./core.js";
import { stories, source } from "./data.js";
const blank = () => ({
  scripts: stories.map((s) => s.script),
  revision: stories.map(() => 1),
  reviewed: stories.map(() => false),
  approved: stories.map(() => 0),
  notes: stories.map(() => ""),
});
const valid = (s) =>
  s &&
  Array.isArray(s.scripts) &&
  s.scripts.length === 3 &&
  s.scripts.every((t) => typeof t === "string" && t.length <= 20000) &&
  ["revision", "reviewed", "approved", "notes"].every(
    (k) => Array.isArray(s[k]) && s[k].length === 3,
  ) &&
  s.revision.every((n) => Number.isSafeInteger(n) && n > 0) &&
  s.approved.every((n) => Number.isSafeInteger(n) && n >= 0) &&
  s.reviewed.every((v) => typeof v === "boolean") &&
  s.notes.every((t) => typeof t === "string" && t.length <= 2000);
let state = load("content", blank(), valid),
  selected = 0,
  view = "write",
  editing = false;
const persist = () => save("content", state);
function invalidate(text) {
  if (text !== state.scripts[selected]) {
    state.scripts[selected] = text;
    state.revision[selected]++;
    state.approved[selected] = 0;
    state.reviewed[selected] = false;
  }
}
function render() {
  const s = stories[selected],
    script = state.scripts[selected],
    approved = state.approved[selected] === state.revision[selected];
  const review = `<section class="content-review"><h2>Review the claim.</h2><blockquote>${esc(s.claim)}</blockquote><p>${esc(s.evidence)}</p><button class="text-button" data-source>Compare with the source ↗</button><label class="check-row"><input type="checkbox" id="claim-check" ${state.reviewed[selected] ? "checked" : ""}> I compared this claim with its source.</label><label for="review-note">Review note</label><textarea id="review-note" maxlength="2000" placeholder="Record the reason for your decision.">${esc(state.notes[selected])}</textarea><button class="solid" data-approve ${!state.reviewed[selected] || !script.trim() || approved ? "disabled" : ""}>${approved ? "Revision approved" : "Approve this revision"}</button><p class="quiet">Editing the script resets its approval.</p></section>`;
  const board = `<section class="content-board"><h2>Storyboard</h2><p>${approved ? "Approved revision " + state.revision[selected] + ". Ready to export for the next production step." : "Review and approve the current script before exporting its production handoff."}</p><div class="shot-list">${s.shots.map((t, i) => `<article><span class="mono">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(script.split(/(?<=[.!?])\s+/)[i] || script)}</p></article>`).join("")}</div><button class="solid" data-handoff ${!approved ? "disabled" : ""}>Export storyboard</button><p class="quiet">This creates a script and shot-list handoff, not a rendered video.</p></section>`;
  draw(
    `<div class="content-layout"><aside class="content-rail"><div class="content-wordmark"><span>Content</span><span>Engine.</span><small>An editorial workspace</small></div><nav class="content-storynav" aria-label="Stories">${stories.map((s, i) => `<button data-story="${i}" class="${i === selected ? "active" : ""}" aria-current="${i === selected ? "page" : "false"}"><span>0${i + 1}</span><span>${esc(s.title)}</span></button>`).join("")}</nav><div class="content-rail-bottom"><p class="prototype">${scope}</p>${access()}</div></aside><main class="content-main" id="main"><header class="content-header topline"><div class="project-label"><span>Editorial / Stories</span><span class="edition">Architecture → story</span></div><span class="mono">CE—02</span></header><section class="content-title"><h1>${esc(s.title)}</h1><span class="story-number">0${selected + 1} / 03</span></section>${tabs(
      [
        ["write", "Write"],
        ["review", "Review claims"],
        ["board", "Storyboard"],
      ],
      view,
    )}${
      view === "review"
        ? review
        : view === "board"
          ? board
          : `<div class="editor-layout"><section class="source-study"><div class="section-title"><span>The source</span><span>01</span></div><p class="file-name">Public architecture · English excerpt</p><div class="source-diagram" aria-label="Content pipeline">${["Source Registry", "Evidence", "Script", "Validation"].map((t, i) => `<div class="flow-row">${t}<span>0${i + 1} ↘</span></div>`).join("")}</div><p class="source-note">Validation comes before the database write. Human approval remains a separate step.</p><button class="text-button" data-source>Read source excerpt ↗</button></section><section class="script-study"><div class="section-title"><span>Example script</span><button data-edit>${editing ? "Read draft" : "Edit draft"}</button></div><h2>${esc(s.hook)}</h2>${
              editing
                ? `<label class="sr-only" for="draft">Draft script</label><textarea id="draft" maxlength="20000">${esc(script)}</textarea><div class="action-row"><button class="solid" data-save>Save draft</button><button class="text-button" data-restore>Restore example</button></div>`
                : `<div class="script-copy">${(script.startsWith(s.hook)
                    ? script.slice(s.hook.length).trimStart()
                    : script
                  )
                    .split(/\n\n/)
                    .map((p) => `<p>${esc(p)}</p>`)
                    .join("")}</div>`
            }<p class="script-status quiet">${words(script)} words · Revision ${state.revision[selected]} · ${approved ? "Approved" : "Awaiting review"}</p></section></div>`
    }<section class="content-proof"><div><span>Linked evidence</span>01 source · 01 claim to review</div><button data-review>Inspect the claim ↗</button></section><footer class="review-footer"><span>English adaptation · authored example</span><button class="text-button" data-export>Export draft ↓</button></footer></main></div>`,
    () => {
      $$("[data-story]").forEach(
        (b) =>
          (b.onclick = () => {
            selected = Number(b.dataset.story);
            editing = false;
            render();
          }),
      );
      $$("[data-tab]").forEach(
        (b) =>
          (b.onclick = () => {
            view = b.dataset.tab;
            render();
          }),
      );
      $$("[data-source]").forEach(
        (b) =>
          (b.onclick = () =>
            modal(
              "Architecture · English excerpt",
              `<pre>${esc(source)}</pre>`,
            )),
      );
      $("[data-review]").onclick = () => {
        view = "review";
        render();
      };
      $("[data-edit]")?.addEventListener("click", () => {
        editing = !editing;
        render();
        if (editing) $("#draft").focus();
      });
      $("#draft")?.addEventListener("input", (e) => {
        invalidate(e.target.value);
        const ok = persist();
        $(".script-status").textContent =
          `${words(e.target.value)} words · Revision ${state.revision[selected]} · ${ok ? "Saved locally · awaiting review" : "Not saved · export before leaving"}`;
      });
      $("[data-save]")?.addEventListener("click", () => {
        if (!state.scripts[selected].trim()) {
          notify("Add script text before saving.", true);
          return;
        }
        if (persist()) {
          editing = false;
          render();
          notify("Draft saved in this browser.");
        }
      });
      $("[data-restore]")?.addEventListener("click", () => {
        invalidate(s.script);
        persist();
        editing = false;
        render();
        notify("Example restored. Review this revision before approving it.");
      });
      $("#claim-check")?.addEventListener("change", (e) => {
        state.reviewed[selected] = e.target.checked;
        if (!e.target.checked) state.approved[selected] = 0;
        persist();
        render();
      });
      $("#review-note")?.addEventListener("input", (e) => {
        state.notes[selected] = e.target.value;
        persist();
      });
      $("[data-approve]")?.addEventListener("click", () => {
        if (!state.reviewed[selected] || !script.trim()) return;
        state.approved[selected] = state.revision[selected];
        if (persist()) {
          render();
          notify("This script revision is approved.");
        }
      });
      $("[data-export]").onclick = () =>
        download(`${s.id}-draft.json`, {
          kind: "authored-english-demo",
          title: s.title,
          script: state.scripts[selected],
          revision: state.revision[selected],
          approved: state.approved[selected] === state.revision[selected],
          review_note: state.notes[selected],
        });
      $("[data-handoff]")?.addEventListener("click", () => {
        if (state.approved[selected] !== state.revision[selected]) return;
        download(`${s.id}-storyboard.json`, {
          title: s.title,
          language: "en",
          revision: state.revision[selected],
          approved: true,
          script: state.scripts[selected],
          source: source,
          shots: s.shots,
          rendered_video: false,
        });
      });
      wireAccess(
        "content",
        () => state,
        (data) => {
          if (!valid(data))
            throw new Error(
              "That workspace is not a compatible content draft.",
            );
          state = data;
          persist();
          render();
        },
      );
    },
  );
}
render();
