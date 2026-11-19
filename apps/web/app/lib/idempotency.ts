import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

export async function withIdempotency(req: Request, db: Database.Database, scope: string, body: unknown, run: () => Promise<Response> | Response) {
  const key = req.headers.get('Idempotency-Key');
  if (!key) return run();
  const request_hash = stableHash(body);
  const existing = db.prepare('SELECT * FROM idempotency_keys WHERE key=? AND scope=?').get(key, scope) as any;
  if (existing) {
    if (existing.request_hash !== request_hash) {
      return Response.json({ error: { code: 'idempotency_conflict', message: 'Idempotency-Key reused with different request body', details: { scope } } }, { status: 409 });
    }
    return Response.json(JSON.parse(existing.response_json), { status: existing.status_code });
  }
  const response = await run();
  const clone = response.clone();
  const payload = await clone.json().catch(() => ({}));
  db.prepare('INSERT INTO idempotency_keys (key,scope,request_hash,response_json,status_code,created_at) VALUES (?,?,?,?,?,?)').run(key, scope, request_hash, JSON.stringify(payload), response.status, new Date().toISOString());
  return Response.json(payload, { status: response.status });
}
