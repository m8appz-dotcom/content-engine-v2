import { existsSync } from 'node:fs';
import { validateSourceRegistry } from '../packages/core/src/source-registry/validator';
const registry=validateSourceRegistry(process.env.SOURCE_REGISTRY_PATH || './content-engine-v2-source-map.md');
const required=['docs/assumptions.md','data/migrations/001_init.sql','apps/web/app/api/health/route.ts'];
const missing=required.filter(p=>!existsSync(p));
if(missing.length) { console.error({ok:false,missing}); process.exit(1); }
console.log(JSON.stringify({ok:true,source_registry:registry.valid,warnings:registry.warnings,invalid_paths:registry.invalid_paths},null,2));
