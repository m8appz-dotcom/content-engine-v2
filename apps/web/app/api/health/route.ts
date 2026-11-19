import { json } from '../../lib/http';
export async function GET(){ return json({ ok:true, service:'content-engine-v2', version:'0.1.0', checks:{ database:'configured', source_registry:'configured' } }); }
