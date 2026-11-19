import { migrate } from '../../../../packages/core/src/db/client';
export function getDb(){ return migrate(); }
