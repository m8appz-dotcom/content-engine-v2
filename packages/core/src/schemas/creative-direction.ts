import { z } from 'zod';

export const CreativeDirectionSchema = z.object({
  id:z.string().min(1),
  job_id:z.string().min(1),
  angle_id:z.string().min(1).nullable(),
  created_at:z.string().datetime(),
  created_by:z.literal('creative_director'),
  intended_viewer_read:z.string().min(16),
  forbidden_reads:z.array(z.string().min(2)).min(1),
  tone:z.enum(['sharp_practical','warm_clear','urgent_direct','premium_editorial','playful_clear']),
  rhythm:z.enum(['fast_hook_proof_payoff','measured_demo_explainer','high_energy_social','calm_authority']),
  payoff:z.string().min(12),
  style_reference:z.string().min(8),
  hook_strategy:z.string().min(12),
  retention_strategy:z.string().min(12),
  proof_strategy:z.string().min(12),
  avatar_decision:z.object({use_avatar:z.boolean(),reason:z.string().min(8),presenter_role:z.enum(['none','intro','bridge','cta','trust_marker']).default('none'),asset_required:z.boolean().default(false)}),
  demo_capture_decision:z.object({required:z.boolean(),reason:z.string().min(8),minimum_shots:z.number().int().min(0).max(12)}),
  broll_decision:z.object({required:z.boolean(),reason:z.string().min(8),minimum_items:z.number().int().min(0).max(12)}),
  audio_decision:z.object({voiceover_required:z.boolean(),music_required:z.boolean(),sfx_required:z.boolean(),reason:z.string().min(8)}),
  script_constraints:z.array(z.string().min(4)).min(3),
  reject_script_if:z.array(z.string().min(4)).min(3),
  editorial_criteria:z.object({must_read:z.array(z.string()).min(1),must_not_read:z.array(z.string()).min(1),quality_bars:z.array(z.string()).min(3),approval_questions:z.array(z.string()).min(3),qa_blockers:z.array(z.string()).min(3)}),
  handoff_to_scriptwriter:z.string().min(20)
});
export type CreativeDirection = z.infer<typeof CreativeDirectionSchema>;
