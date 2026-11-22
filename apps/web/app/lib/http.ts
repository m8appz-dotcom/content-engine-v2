import { ZodError, type ZodSchema } from 'zod';
export async function readJson<T>(req:Request,schema:ZodSchema<T>):Promise<T>{
  const reader=req.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>131072){await reader.cancel();throw Object.assign(new Error('Request too large'),{code:'request_too_large'});}chunks.push(value);}}finally{reader.releaseLock();}
  let body;try{body=bytes?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}catch{throw Object.assign(new Error('Enter a valid request and try again.'),{code:'invalid_json'});}
  const pending=[{value:body,depth:0}];let nodes=0;
  while(pending.length){const {value,depth}=pending.pop()!;if(++nodes>6000||depth>32)throw Object.assign(new Error('Simplify this request and try again.'),{code:'request_too_complex'});if(value&&typeof value==='object')for(const child of Object.values(value))pending.push({value:child,depth:depth+1});}
  return schema.parse(body);
}
export function publicArtifact(value:any):any {
  if(Array.isArray(value))return value.map(publicArtifact);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/(?:^|_)(?:path|paths|stderr|stdout|stack|raw_response)$/.test(key)).map(([key,v])=>[key,publicArtifact(v)]));
  if(typeof value==='string' && /(?:[A-Za-z]:[\\/]|\/home\/|\/tmp\/|\/var\/|\/Users\/)/.test(value))return 'Private workspace artifact';
  return value;
}
export function json(data:unknown,status=200){return Response.json(process.env.CONTENT_ORIGINAL_WORKSPACE==='1'?publicArtifact(data):data,{status,headers:{'Cache-Control':'private, no-store'}});}
export function errorResponse(error:unknown){
  if(error instanceof ZodError)return Response.json({error:{code:'schema_validation_failed',message:'Check the required fields and try again.'}},{status:400});
  const e=error as Error & {code?:string};const code=e.code || 'internal_error';
  const status=code==='not_found'?404:code==='invalid_state_transition'?409:code==='unauthorized'?401:code==='forbidden'?403:code==='request_too_large'?413:400;
  const messages:Record<string,string>={not_found:'This item is no longer available.',invalid_state_transition:'Finish the current review before continuing.',unauthorized:'Sign in with your passkey to continue.',forbidden:'This action is unavailable for this account.',request_too_large:'Shorten the request and try again.',provider_not_configured:'Generation is unavailable. Your saved work is safe.',business_validation_failed:'This step needs complete evidence and approval before it can continue.'};
  return Response.json({error:{code,message:process.env.CONTENT_ORIGINAL_WORKSPACE==='1'?(messages[code]||'This step could not finish. Your saved work is safe.'):e.message||'The request could not finish.'}},{status});
}
