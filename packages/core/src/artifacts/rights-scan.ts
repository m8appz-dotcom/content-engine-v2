export function normalizeRights(input:{rights_status?:string;provider?:string|null;source_url?:string|null;license?:string|null;attribution_required?:boolean}){
  const rights_status=input.rights_status ?? 'unknown';
  const blocking = rights_status === 'prohibited' || rights_status === 'unknown';
  return {provider:input.provider ?? 'manual_upload', license:input.license ?? (rights_status==='owned'?'owner-provided':'unknown'), rights_status, attribution_required:Boolean(input.attribution_required), attribution_text:null as string|null, source_url:input.source_url ?? null, blocking, checked_at:new Date().toISOString()};
}
