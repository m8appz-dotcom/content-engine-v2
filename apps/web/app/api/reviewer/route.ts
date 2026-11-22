import { getDb } from '../../lib/db';
import { json, errorResponse } from '../../lib/http';
import {reviewerOptions} from '../../lib/reviewers';
export async function GET() {
  try {
    const db = await getDb();
    return json({ ...reviewerOptions(db), generation: process.env.CONTENT_ENGINE_APP_GENERATION === 'provider' ? 'private-model' : 'native-planner' });
  } catch (error) { return errorResponse(error); }
}
