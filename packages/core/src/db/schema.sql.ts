import { readFileSync } from 'node:fs';
import path from 'node:path';
export const INIT_SQL = readFileSync(path.resolve(process.cwd(), 'data/migrations/001_init.sql'), 'utf8');
