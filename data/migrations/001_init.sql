PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE,role TEXT NOT NULL CHECK (role IN ('owner','reviewer','operator','viewer','service_worker')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL,target_platform TEXT NOT NULL DEFAULT 'vertical_short',created_by TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY (created_by) REFERENCES users(id));
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status); CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE TABLE IF NOT EXISTS source_registry_snapshots (id TEXT PRIMARY KEY,registry_path TEXT NOT NULL,registry_hash TEXT NOT NULL,valid INTEGER NOT NULL DEFAULT 0,snapshot_json TEXT NOT NULL,warnings_json TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS evidence_items (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,type TEXT NOT NULL,title TEXT,description TEXT,path TEXT,url TEXT,source_project_id TEXT,rights_status TEXT NOT NULL DEFAULT 'unknown',privacy_level TEXT NOT NULL DEFAULT 'internal',public_safe INTEGER NOT NULL DEFAULT 0,metadata_json TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_evidence_job_id ON evidence_items(job_id); CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_items(type);
CREATE TABLE IF NOT EXISTS asset_rights (id TEXT PRIMARY KEY,evidence_item_id TEXT,provider TEXT,license TEXT,rights_status TEXT NOT NULL,attribution_required INTEGER NOT NULL DEFAULT 0,attribution_text TEXT,source_url TEXT,checked_at TEXT NOT NULL,FOREIGN KEY (evidence_item_id) REFERENCES evidence_items(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS story_angles (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,title TEXT NOT NULL,angle_json TEXT NOT NULL,score INTEGER,status TEXT NOT NULL DEFAULT 'candidate',created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_story_angles_job_id ON story_angles(job_id);
CREATE TABLE IF NOT EXISTS script_candidates (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,angle_id TEXT NOT NULL,script_json TEXT NOT NULL,status TEXT NOT NULL,duration_sec INTEGER,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (angle_id) REFERENCES story_angles(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_scripts_job_id ON script_candidates(job_id); CREATE INDEX IF NOT EXISTS idx_scripts_status ON script_candidates(status);
CREATE TABLE IF NOT EXISTS script_claims (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,script_id TEXT NOT NULL,claim_text TEXT NOT NULL,claim_type TEXT NOT NULL,support_level TEXT NOT NULL,public_safe INTEGER NOT NULL DEFAULT 0,requires_human_approval INTEGER NOT NULL DEFAULT 0,rewrite_suggestion TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_script_claims_script_id ON script_claims(script_id); CREATE INDEX IF NOT EXISTS idx_script_claims_support ON script_claims(support_level);
CREATE TABLE IF NOT EXISTS claim_evidence_links (claim_id TEXT NOT NULL,evidence_item_id TEXT NOT NULL,support_note TEXT,PRIMARY KEY (claim_id,evidence_item_id),FOREIGN KEY (claim_id) REFERENCES script_claims(id) ON DELETE CASCADE,FOREIGN KEY (evidence_item_id) REFERENCES evidence_items(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,artifact_id TEXT,gate TEXT NOT NULL,status TEXT NOT NULL,approved_by TEXT,notes TEXT,metadata_json TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (approved_by) REFERENCES users(id));
CREATE INDEX IF NOT EXISTS idx_approvals_job_gate ON approvals(job_id,gate);

CREATE TABLE IF NOT EXISTS deliverable_contracts (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,contract_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_deliverable_contracts_job_status ON deliverable_contracts(job_id,status,created_at);
CREATE TABLE IF NOT EXISTS production_plans (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,script_id TEXT NOT NULL,plan_json TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS storyboards (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,script_id TEXT NOT NULL,production_plan_id TEXT NOT NULL,storyboard_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE,FOREIGN KEY (production_plan_id) REFERENCES production_plans(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,script_id TEXT NOT NULL,storyboard_id TEXT NOT NULL,video_path TEXT NOT NULL,contact_sheet_path TEXT,timeline_json_path TEXT,render_status TEXT NOT NULL,duration_sec INTEGER,notes_json TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE,FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS qa_reports (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,draft_id TEXT NOT NULL,report_json TEXT NOT NULL,pass INTEGER NOT NULL DEFAULT 0,publish_ready INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS provider_events (id TEXT PRIMARY KEY,job_id TEXT,provider TEXT NOT NULL,operation TEXT NOT NULL,status TEXT NOT NULL,request_json TEXT,response_json TEXT,error_json TEXT,cost_estimate_usd REAL,latency_ms INTEGER,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL);
CREATE INDEX IF NOT EXISTS idx_provider_events_job_id ON provider_events(job_id); CREATE INDEX IF NOT EXISTS idx_provider_events_provider ON provider_events(provider);
CREATE TABLE IF NOT EXISTS publish_events (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,draft_id TEXT NOT NULL,provider TEXT NOT NULL,status TEXT NOT NULL,url TEXT,external_id TEXT,metadata_json TEXT,published_by TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,FOREIGN KEY (published_by) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS job_runs (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,error_json TEXT,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS task_runs (id TEXT PRIMARY KEY,job_run_id TEXT,job_id TEXT NOT NULL,task_type TEXT NOT NULL,status TEXT NOT NULL,attempt_number INTEGER NOT NULL DEFAULT 1,started_at TEXT,finished_at TEXT,heartbeat_at TEXT,input_json TEXT,output_json TEXT,error_json TEXT,cost_estimate_usd REAL,FOREIGN KEY (job_run_id) REFERENCES job_runs(id) ON DELETE CASCADE,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_task_runs_job_status ON task_runs(job_id,status);
CREATE TABLE IF NOT EXISTS artifact_versions (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,artifact_type TEXT NOT NULL,artifact_id TEXT NOT NULL,version INTEGER NOT NULL,artifact_json TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY,job_id TEXT,actor_id TEXT,action TEXT NOT NULL,target_type TEXT,target_id TEXT,metadata_json TEXT,created_at TEXT NOT NULL,FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  created_at TEXT NOT NULL,
  PRIMARY KEY (key, scope)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys(created_at);
