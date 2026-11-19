import { ScriptClaimSchema } from '../schemas/artifacts';
export function verifyScriptClaims(input:{script:any;evidence:any[]}){
  const evidenceIds = new Set(input.evidence.map(e=>e.id));
  const claim_checks = (input.script.claims ?? []).map((claim:any)=>{
    const mapped = (claim.evidence_ids ?? []).filter((id:string)=>evidenceIds.has(id));
    let support_level = claim.support_level;
    let reason = 'Claim has mapped evidence.';
    let rewrite_suggestion = claim.rewrite_suggestion ?? null;
    if(mapped.length===0){ support_level='unsupported'; reason='Claim has no evidence mapping in this job.'; rewrite_suggestion='Rewrite as a process description or remove the claim.'; }
    if(support_level==='weak' && !claim.requires_human_approval && !rewrite_suggestion){ rewrite_suggestion='Use more cautious wording or add stronger evidence.'; }
    const check={...claim,support_level,evidence_ids:mapped,reason,rewrite_suggestion};
    const valid=ScriptClaimSchema.safeParse(check).success;
    return {...check,valid};
  });
  const overall_pass = claim_checks.length>0 && claim_checks.every((c:any)=>c.valid && c.support_level!=='unsupported' && c.evidence_ids.length>0);
  return {script_id:input.script.id,claim_checks,overall_pass};
}
export function hasProhibitedPublicLanguage(script:any){
  const text=[script.hook,script.voiceover,script.cta,...(script.beats??[]).map((b:any)=>b.line)].join(' ').toLowerCase();
  const prohibited=['se implementó','critic score','feedback público','gate a','gate b','workflow interno'];
  return prohibited.filter(p=>text.includes(p));
}
