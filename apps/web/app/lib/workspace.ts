import { headers } from 'next/headers';
import path from 'node:path';
import { migrate } from '../../../../packages/core/src/db/client';
import { createUser } from '../../../../packages/core/src/db/repositories';

const accounts = new Map<string, ReturnType<typeof migrate>>();
export const hostedWorkspace = () => process.env.CONTENT_ORIGINAL_WORKSPACE === '1';

export async function workspaceDatabase() {
  const account = (await headers()).get('x-content-account');
  const state = process.env.WORKSPACE_STATE;
  if (!account || !/^[a-f0-9]{64}$/.test(account) || !state || !path.isAbsolute(state))
    throw Object.assign(new Error('Sign in with a passkey to open your projects.'), { code: 'unauthorized' });
  let db = accounts.get(account);
  if (!db) {
    if (accounts.size >= 16) throw Object.assign(new Error('Workspace capacity is currently full.'), { code: 'capacity' });
    db = migrate(path.join(state, 'content-accounts', account, 'content.sqlite'));
    if (!db.prepare('SELECT id FROM users WHERE id=?').get(account))
      createUser(db, { id: account, name: 'Workspace reviewer', role: 'operator' });
    Object.defineProperty(db, 'workspaceActor', { value: account });
    accounts.set(account, db);
  }
  return db;
}
