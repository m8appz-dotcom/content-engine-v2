import { z } from 'zod';

export const ProductiveCrewRoleSchema = z.enum([
  'creative_director',
  'scriptwriter',
  'storyboard_artist',
  'video_producer',
  'motion_designer',
  'audio_producer',
  'qa_editor'
]);

export const ProductiveCrewDecisionSchema = z.object({
  role: ProductiveCrewRoleSchema,
  decision: z.string().min(12),
  rationale: z.string().min(12),
  output_contract: z.string().min(8),
  affects: z.array(z.enum(['script','storyboard','visuals','audio','motion','approval','qa','assets'])).min(1),
  must_have: z.array(z.string().min(2)).min(1),
  reject_if: z.array(z.string().min(2)).min(1),
  handoff_to: z.array(ProductiveCrewRoleSchema).default([])
});

export const ProductiveBeatDecisionSchema = z.object({
  beat_id: z.string().min(1),
  beat_kind: z.enum(['hook_question','proof_zoom','demo_action','result_reveal','benefit_stack','objection','cta']),
  viewer_read: z.string().min(8),
  primary_visual: z.string().min(4),
  secondary_visual_or_broll: z.string().min(4),
  motion_intent: z.string().min(4),
  audio_intent: z.string().min(4),
  vfx_intent: z.string().min(4),
  editorial_reason: z.string().min(8)
});

export const ProductiveCrewRunSchema = z.object({
  id: z.string().min(1),
  job_id: z.string().min(1),
  script_id: z.string().min(1).nullable(),
  status: z.enum(['productive_ready','needs_human_direction','blocked']),
  mode: z.enum(['deterministic_crew','structured_ai_crew','crewai_service']),
  created_at: z.string().datetime(),
  roles: z.array(ProductiveCrewRoleSchema).length(7),
  intended_viewer_read: z.string().min(12),
  forbidden_reads: z.array(z.string().min(2)).min(1),
  editorial_strategy: z.string().min(20),
  decisions: z.array(ProductiveCrewDecisionSchema).length(7),
  beat_decisions: z.array(ProductiveBeatDecisionSchema).min(3),
  asset_needs: z.array(z.string()).default([]),
  audio_needs: z.object({ voiceover_required:z.boolean(), music_required:z.boolean(), sfx_required:z.boolean(), notes:z.string() }),
  approval_needs: z.object({ human_script_approval:z.boolean(), human_storyboard_approval:z.boolean(), synthetic_approval_allowed_for_publish:z.boolean() }),
  handoff_summary: z.string().min(20)
});

export type ProductiveCrewRun = z.infer<typeof ProductiveCrewRunSchema>;
