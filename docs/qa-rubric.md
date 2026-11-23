# QA Rubric

Automated QA reports objective file, source-reference, rights, privacy and audio measurements. Its `pass` value means those technical checks passed. It does not rate the design, pronunciation, narrative clarity or pacing.

Legacy score fields remain `null` until an actual review supplies a result. The report records `assessment_type: technical_checks`, `perceptual_review.status: pending`, `requires_human_review: true` and `publish_ready: false`. A valid codec or an audible waveform does not establish visual or listening quality.

Renderer validation binds each visible scene to an evidence ID belonging to the current project. It checks timing and text limits; these are structural checks, not a perceptual score. Sentence boundaries recovered from the narrator's recorded PCM pauses are measured. Word timing within a sentence remains estimated and is labeled accordingly.

An independent review must inspect the complete final video with its audio, record the exact artifact and identify any unobserved modality. Existing script and storyboard approvals do not approve a new visual revision. Publishing and final export remain blocked by their separate unimplemented gates.
