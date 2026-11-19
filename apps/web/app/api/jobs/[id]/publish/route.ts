import { json } from '../../../../lib/http';
export async function POST(){ return json({error:{code:'not_implemented_in_mvp_slice',message:'publish is intentionally blocked until final export/publishing slice is implemented after QA.',details:{}}},501); }
