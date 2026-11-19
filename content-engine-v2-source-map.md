# Content Engine v2 — Source Map

## 1. Hosts válidos
- host_id: spark
- hostname: spark
- os: linux
- base_paths:
  - /home/m8apps/projects
- status: active

## 2. Titan OS Registry
- registry_path: http://127.0.0.1:7101/api/registry
- allowed_projects:
  - content-engine-v2
- last_validated_at:

## 3. Proyectos permitidos
- project_id: content-engine-v2
- public_name: Content Engine v2
- internal_name: content-engine-v2
- repo_path: /home/m8apps/projects/content-engine-v2
- screenshot_paths:
- screen_recording_paths:
- asset_paths:
- demo_urls:
- allowed_public_claims:
  - Evidence-first content workflow for M8 Apps internal production.
- prohibited_public_claims:
  - Revenue, client outcomes, or time savings without explicit approved evidence.
- client_privacy_level: internal
- status: active

## 4. Librerías de assets
- library_id: local_uploads
- type: user_clip
- path: ./outputs/uploads
- rights_status: owned
- attribution_required: false

## 5. Exclusiones
- path: ./.env
- reason: secrets
- path: ./node_modules
- reason: dependency noise

## 6. Validación
- last_validated_at:
- validated_by: builder
- missing_paths:
- invalid_paths:
- warnings:
