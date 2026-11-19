import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { INIT_SQL } from './schema.sql';
export function databasePath() { return process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/content-engine-v2.sqlite'); }
export function openDb(dbPath = databasePath()) { mkdirSync(path.dirname(dbPath), { recursive: true }); const db = new Database(dbPath); db.pragma('foreign_keys = ON'); return db; }
export function migrate(dbPath = databasePath()) { const db = openDb(dbPath); db.exec(INIT_SQL); ensureCurrentUsersRoleSchema(db); return db; }
function ensureCurrentUsersRoleSchema(db:Database.Database){
  const row=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as {sql?:string}|undefined;
  if(!row?.sql || row.sql.includes("'operator'")) return;
  db.exec(`
    PRAGMA foreign_keys = OFF;
    PRAGMA legacy_alter_table = ON;
    ALTER TABLE users RENAME TO users_legacy_roles;
    CREATE TABLE users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE,role TEXT NOT NULL CHECK (role IN ('owner','reviewer','operator','viewer','service_worker')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO users (id,name,email,role,created_at,updated_at)
      SELECT id,name,email,CASE WHEN role='editor' THEN 'operator' ELSE role END,created_at,updated_at FROM users_legacy_roles;
    DROP TABLE users_legacy_roles;
    PRAGMA legacy_alter_table = OFF;
    PRAGMA foreign_keys = ON;
  `);
}
