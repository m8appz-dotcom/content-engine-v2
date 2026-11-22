import type Database from 'better-sqlite3';
import {APPROVAL_ROLES,requireHumanActor} from '../../../../packages/core/src/auth';
export function reviewerOptions(db:Database.Database){
  const actor=(db as any).workspaceActor;
  if(actor)return {actor,sessionBound:true,reviewers:[]};
  const rows=db.prepare('SELECT id,name FROM users ORDER BY name').all() as Array<{id:string;name:string}>;
  return {actor:null,sessionBound:false,reviewers:rows.filter(row=>{try{requireHumanActor(db,row.id,APPROVAL_ROLES,'Review');return true;}catch{return false;}})};
}
