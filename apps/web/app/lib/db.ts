import { migrate } from '../../../../packages/core/src/db/client';
import { hostedWorkspace, workspaceDatabase } from './workspace';
export async function getDb(){ return hostedWorkspace() ? workspaceDatabase() : migrate(); }
