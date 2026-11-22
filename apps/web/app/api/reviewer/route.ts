import { getDb } from '../../lib/db';
import { json, errorResponse } from '../../lib/http';
export async function GET() {
  try {
    const db = await getDb();
    const actor = (db as any).workspaceActor;
    return json({ actor: actor || null, generation: process.env.CONTENT_ENGINE_APP_GENERATION === 'provider' ? 'private-model' : 'native-planner' });
  } catch (error) { return errorResponse(error); }
}
