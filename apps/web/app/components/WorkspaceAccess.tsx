'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Wordmark,PipelineImage} from './EditorialElements';
import {copy} from './editorial-copy';
import {startRegistration,startAuthentication} from '@simplewebauthn/browser';
export default function WorkspaceAccess({children}:{children:ReactNode}){
  const hosted=process.env.NEXT_PUBLIC_CONTENT_WORKSPACE==='1';
  const [status,setStatus]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[invite,setInvite]=useState('');
  async function load(){const r=await fetch('/auth/status',{cache:'no-store'});if(!r.ok)throw Error('Access is temporarily unavailable. Please try again.');setStatus(await r.json());}
  useEffect(()=>{if(hosted)load().catch(e=>setError(e.message));},[hosted]);
  async function request(route:string,body:unknown={}){const r=await fetch('/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(typeof data.error==='string'?data.error:'Passkey access could not finish. Try again.');return data;}
  async function access(kind:'register'|'login'){setBusy(true);setError('');try{const options=await request(kind+'/options',kind==='register'?{invite}:{});const response=kind==='register'?await startRegistration({optionsJSON:options}):await startAuthentication({optionsJSON:options});await request(kind+'/verify',response);setInvite('');await load();}catch{setError('Passkey access was cancelled or could not finish. Your saved projects are safe.');}finally{setBusy(false);}}
  if(!hosted)return children;
  if(!status?.signedIn)return <div className="content-layout"><aside className="content-rail"><Wordmark/><div className="content-rail-bottom"><p>{copy.sourceNote}</p></div></aside><main className="content-main"><header className="content-header"><div><span>{copy.headerLabel}</span><small>{copy.headerDetail}</small></div><span className="mono">CE—02</span></header><section className="content-title"><h1>{copy.accessTitle}</h1></section><section className="accessPanel"><div><h2>Content Engine</h2><p>{copy.accessBody}</p><PipelineImage/></div><div className="accessActions"><button className="btn" disabled={busy||!status} onClick={()=>access('login')}>{copy.signIn} ↗</button>{status?.registrationOpen&&<>{status.invitationRequired&&<label>Invitation code<input value={invite} onChange={e=>setInvite(e.target.value)} autoComplete="off" maxLength={200}/></label>}<button className="btn" disabled={busy||(status.invitationRequired&&!invite.trim())} onClick={()=>access('register')}>Create workspace</button></>}<p className="notice" role="status">{error||(!status?'Checking access…':copy.accessNote)}</p></div></section></main></div>;
  return <><div className="sessionBar"><span>{copy.signedIn}</span><button className="text-button" disabled={busy} onClick={async()=>{setBusy(true);try{await request('logout');await load();}catch{setError('Sign-out could not finish. Try again.');}finally{setBusy(false);}}}>Sign out</button></div>{error&&<p role="alert">{error}</p>}{children}</>;
}
