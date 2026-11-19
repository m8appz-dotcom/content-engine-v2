import { z } from 'zod';
export const UserRole = z.enum(['owner','editor','reviewer','viewer','service_worker']);
export const EvidenceType = z.enum(['screenshot','screen_recording','project_asset','user_clip','demo_url','git_context','task_note','metric','customer_quote','owner_note','conversation_excerpt','conversation_event','pexels_asset','wavespeed_asset','youtube_authorized_asset','music_asset','sfx_asset']);
export const RightsStatus = z.enum(['owned','licensed','generated','authorized','unknown','prohibited']);
export const PrivacyLevel = z.enum(['public','internal','confidential','restricted']);
export const ClaimSupportLevel = z.enum(['direct','inferred','weak','unsupported']);
export const ApprovalStatus = z.enum(['pending','approved','rejected','needs_revision']);
export const ProviderStatus = z.enum(['not_configured','configured','healthy','degraded','failing']);
export type EvidenceType = z.infer<typeof EvidenceType>;
