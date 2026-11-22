import type Database from 'better-sqlite3';

export const APPROVAL_ROLES = ['owner','reviewer','operator'] as const;
export const PUBLISH_ROLES = ['owner','operator'] as const;
export type ContentEngineRole = 'owner'|'reviewer'|'operator'|'viewer'|'service_worker';

export function requireKnownActor(db:Database.Database, actorId:string|null|undefined, allowedRoles:readonly ContentEngineRole[], action:string){
  const authenticatedActor = (db as any).workspaceActor;
  if (authenticatedActor && actorId !== authenticatedActor)
    throw Object.assign(new Error('This review must use your signed-in identity.'), { code:'forbidden' });
  if(!actorId) throw Object.assign(new Error(`${action} requires actor_id/approved_by`),{code:'unauthorized'});
  const actor=db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(actorId) as any;
  if(!actor) throw Object.assign(new Error(`${action} actor not found`),{code:'unauthorized'});
  if(!allowedRoles.includes(actor.role)) throw Object.assign(new Error(`${action} requires role: ${allowedRoles.join(', ')}`),{code:'forbidden',actor_role:actor.role});
  return actor;
}

export function isSyntheticActor(actor:any){
  const haystack=`${actor?.id ?? ''} ${actor?.name ?? ''} ${actor?.email ?? ''}`.toLowerCase();
  return /(^|[_\-\s])(e2e|test|synthetic|automation|bot|service)([_\-\s]|$)/.test(haystack) || actor?.role==='service_worker';
}

export function requireHumanActor(db:Database.Database, actorId:string|null|undefined, allowedRoles:readonly ContentEngineRole[], action:string){
  const actor=requireKnownActor(db,actorId,allowedRoles,action);
  if(isSyntheticActor(actor)) throw Object.assign(new Error(`${action} requires a real human actor; synthetic/test actors cannot approve production gates`),{code:'forbidden',actor_id:actor.id,actor_role:actor.role});
  return actor;
}
