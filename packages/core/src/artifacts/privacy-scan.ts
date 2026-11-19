import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';

export type PrivacyFinding = { type:string; match:string; severity:'low'|'medium'|'high'; reason:string };
const patterns: Array<[string,RegExp,'low'|'medium'|'high',string]> = [
  ['email',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'medium','Email address detected'],
  ['phone',/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g,'medium','Possible phone number detected'],
  ['api_key',/(?:api[_-]?key|token|secret|password|authorization)[\s:=]+[A-Za-z0-9_\-\.]{12,}/gi,'high','Possible credential/token detected'],
  ['private_url',/https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[^\s/]+\.local|[^\s/]+\.tail[a-z0-9.-]*)[^\s]*/gi,'high','Private/internal URL detected'],
  ['bearer_token',/Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi,'high','Bearer token detected'],
  ['github_token',/gh[pousr]_[A-Za-z0-9_]{20,}/g,'high','GitHub token detected'],
  ['private_key',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/g,'high','Private key detected']
];

function redactMatch(s:string){ if(s.length<=8) return '[redacted]'; return `${s.slice(0,3)}…${s.slice(-3)}`; }
export function privacyScanText(text:string){
  const findings:PrivacyFinding[]=[];
  for(const [type,regex,severity,reason] of patterns){
    for(const match of text.matchAll(regex)) findings.push({type,match:redactMatch(match[0]),severity,reason});
  }
  return findings;
}
export function privacyScanMedia(input:{asset_path:string;privacy_level:'public'|'internal'|'confidential'|'restricted'}){
  const findings:PrivacyFinding[]=[];
  let scanned_text=false;
  if(existsSync(input.asset_path)){
    const ext=path.extname(input.asset_path).toLowerCase();
    if(['.txt','.md','.json','.csv','.log','.html','.xml','.svg','.js','.ts','.tsx','.css'].includes(ext)){
      scanned_text=true;
      findings.push(...privacyScanText(readFileSync(input.asset_path,'utf8').slice(0,2_000_000)));
    }
  } else findings.push({type:'missing_asset',match:input.asset_path,severity:'high',reason:'Asset path does not exist'});
  if(input.privacy_level==='restricted') findings.push({type:'restricted_privacy_level',match:'restricted',severity:'high',reason:'Restricted assets cannot be public'});
  if(input.privacy_level==='confidential') findings.push({type:'confidential_privacy_level',match:'confidential',severity:'medium',reason:'Confidential assets require explicit approval'});
  const redaction_required=findings.some(f=>f.severity==='high');
  return {public_safe: findings.every(f=>f.severity!=='high') && input.privacy_level!=='restricted', findings, redaction_required, redacted_asset_path:null as string|null, scanned_text};
}
export function copyUploadedEvidence(input:{source_path:string;job_id:string;outputsPath?:string}){
  const outRoot=input.outputsPath ?? process.env.OUTPUTS_PATH ?? './outputs';
  const dir=path.join(outRoot,'evidence',input.job_id);
  mkdirSync(dir,{recursive:true});
  const dest=path.join(dir,path.basename(input.source_path));
  copyFileSync(input.source_path,dest);
  return dest;
}
