import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
const REQUIRED_SECTIONS = ['## 1. Hosts válidos','## 2. Titan OS Registry','## 3. Proyectos permitidos','## 4. Librerías de assets','## 5. Exclusiones','## 6. Validación'];
export type SourceRegistryValidation = { valid:boolean; snapshot_id:string; missing_paths:string[]; invalid_paths:string[]; warnings:string[]; registry_hash:string };
export function validateSourceRegistry(sourceRegistryPath:string): SourceRegistryValidation {
  const warnings:string[]=[]; const missing_paths:string[]=[]; const invalid_paths:string[]=[];
  if(!existsSync(sourceRegistryPath)) return { valid:false, snapshot_id:'', missing_paths:[sourceRegistryPath], invalid_paths:[], warnings:['Source Registry file is missing'], registry_hash:'' };
  const text=readFileSync(sourceRegistryPath,'utf8'); const registry_hash=createHash('sha256').update(text).digest('hex');
  for (const section of REQUIRED_SECTIONS) if(!text.includes(section)) warnings.push(`Missing required section: ${section}`);
  const pathMatches=[...text.matchAll(/(?:repo_path|path|registry_path):\s*([^\n]+)/g)].map(m=>m[1].trim()).filter(v=>v && !v.includes('|') && !v.startsWith('active') && !v.startsWith('public'));
  for(const p of pathMatches){
    // Exclusion paths may intentionally not exist (e.g. .env); validate allowlisted/source paths only.
    if (p.includes('.env') || p.includes('node_modules')) continue;
    if(p.startsWith('/') || p.startsWith('./')) { const resolved=p.startsWith('./')?new URL(p, `file://${process.cwd()}/`).pathname:p; if(!existsSync(resolved)) invalid_paths.push(p); }
  }
  return { valid:warnings.length===0 && invalid_paths.length===0, snapshot_id:`srcsnap_${registry_hash.slice(0,12)}`, missing_paths, invalid_paths, warnings, registry_hash };
}
