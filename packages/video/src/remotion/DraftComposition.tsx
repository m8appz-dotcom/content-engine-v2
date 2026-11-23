import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {EditorialFilm} from './EditorialFilm';
import type {EditorialFilm as EditorialFilmData} from './editorial-types';

export type SceneTemplate='HookScene'|'ContextSetupScene'|'ProofZoomScene'|'RiskContrastScene'|'ResultRevealScene'|'BenefitStackScene'|'CtaScene'|'ProofDrivenScene';
export type DraftScene={
  id:string;
  startFrame:number;
  durationFrames:number;
  scriptApproved?:boolean;
  storyboardApproved?:boolean;
  caption:string;
  intent:string;
  assetPath:string;
  movement:'proof_reveal'|'detail_push'|'benefit_lock'|'cta_close'|'context_slide'|'risk_split'|'result_reveal';
  sceneTemplate?:SceneTemplate|string;
  beatKind?:string;
  motionIntent?:string;
  vfxIntent?:string;
  overlayIntent?:string;
  focalPoint?:string;
  humanSceneTitle?:string;
  foregroundText?:string;
  evidenceTreatment?:string;
  layoutTreatment?:any;
};
export type DraftVideoProps={
  title:string;
  scenes:DraftScene[];
  brand?:{accent?:string;background?:string};
  editorialFilm?:EditorialFilmData;
};

function shortCaption(text:string){
  const words=String(text||'').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/scene|template/ig,'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  if(words.length<=10) return words.join(' ');
  return words.slice(0,10).join(' ');
}
function cleanLabel(text:string,fallback:string){ return shortCaption(text||fallback); }
function assetSrc(path:string){
  if(path.startsWith('data:')||path.startsWith('file://')||path.startsWith('http://')||path.startsWith('https://')) return path;
  return `file://${path}`;
}
function baseFrame(scene:DraftScene, extra:React.CSSProperties={}){ return {position:'absolute' as const,borderRadius:42,overflow:'hidden',border:'5px solid rgba(102,227,162,.95)',boxShadow:'0 28px 90px rgba(0,0,0,.55)',background:'#f8fafc',...extra}; }
function EvidenceImage({scene,style}:{scene:DraftScene;style?:React.CSSProperties}){ return <Img src={assetSrc(scene.assetPath)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 44%',filter:'saturate(1.06) contrast(1.02)',...style}}/>; }
function Caption({scene,bottom=118}:{scene:DraftScene;bottom?:number}){ return <div style={{position:'absolute',left:58,right:58,bottom,zIndex:10,background:'rgba(255,255,255,.96)',color:'#090b0f',borderRadius:34,padding:'30px 34px',fontSize:52,fontWeight:900,lineHeight:1.08,boxShadow:'0 20px 70px rgba(0,0,0,.42)'}}>{shortCaption(scene.caption)}</div>; }
function TopBar({label,index,accent}:{label:string;index:number;accent:string}){ return <div style={{position:'absolute',top:48,left:54,right:54,display:'flex',alignItems:'center',gap:16,zIndex:12}}><div style={{width:14,height:14,borderRadius:99,background:accent,boxShadow:`0 0 28px ${accent}`}}/><div style={{fontSize:28,fontWeight:800,letterSpacing:.3,opacity:.92}}>{label}</div><div style={{marginLeft:'auto',fontSize:24,opacity:.58}}>Beat {index+1}</div></div>; }
function Label({children,accent,style}:{children:React.ReactNode;accent:string;style?:React.CSSProperties}){ return <div style={{background:'rgba(7,7,10,.88)',border:`2px solid ${accent}`,borderRadius:999,padding:'14px 22px',fontSize:30,fontWeight:950,lineHeight:1,color:'white',...style}}>{children}</div>; }

function ConversationNativeCard({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const lt:any=scene.layoutTreatment ?? {}; const pm=lt.proof_module ?? {}; const layout=lt.layout_type ?? 'quote_card';
  const title=String(pm.title ?? scene.foregroundText ?? 'Real conversation');
  const quote=String(pm.value ?? scene.caption ?? '').replace(/^“|”$/g,'');
  const support=String(pm.support_text ?? scene.intent ?? '');
  const isCritique=layout==='quote_card'; const isDecision=layout==='decision_card'; const isFix=layout==='fix_pipeline_card';
  return <AbsoluteFill style={{fontFamily:'Inter, Arial, sans-serif',color:'white',background:isCritique?'linear-gradient(180deg,#2a0d12,#07070a)':isDecision?'linear-gradient(180deg,#10231c,#07070a)':'linear-gradient(180deg,#08111f,#07070a)',overflow:'hidden'}}>
    <TopBar label="Real conversation" index={index} accent={accent}/>
    <div style={{position:'absolute',left:96,right:96,top:150,fontSize:70,fontWeight:1000,lineHeight:.95,color:isCritique?'#ffb4b4':accent}}>{title}</div>
    <div style={{position:'absolute',left:96,right:96,top:330,bottom:470,borderRadius:58,background:'#f8fafc',color:'#07100d',padding:'64px 58px',boxShadow:'0 30px 110px rgba(0,0,0,.45)',display:'flex',alignItems:'center'}}>
      <div style={{fontSize:quote.length>120?48:quote.length>80?58:72,fontWeight:1000,lineHeight:1.06}}>“{quote}”</div>
    </div>
    {isFix?<div style={{position:'absolute',left:118,right:118,bottom:178,display:'grid',gridTemplateColumns:'1fr 70px 1fr 70px 1fr',alignItems:'center',gap:12}}><Box label="Feedback"/><Arrow accent={accent}/><Box label="Decision"/><Arrow accent={accent}/><Box label="Fix"/></div>:<div style={{position:'absolute',left:96,right:96,bottom:170,borderRadius:42,background:isDecision?accent:'rgba(255,255,255,.10)',color:isDecision?'#07100d':'white',padding:'34px 42px',fontSize:40,fontWeight:900,lineHeight:1.12}}>{support}</div>}
  </AbsoluteFill>;
}
function Box({label}:{label:string}){ return <div style={{height:120,borderRadius:30,background:'#f8fafc',color:'#07100d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,fontWeight:1000}}>{label}</div>; }
function Arrow({accent}:{accent:string}){ return <div style={{height:8,background:accent,borderRadius:99,position:'relative'}}><div style={{position:'absolute',right:-2,top:-15,width:0,height:0,borderTop:'19px solid transparent',borderBottom:'19px solid transparent',borderLeft:`30px solid ${accent}`}}/></div>; }

function NativeCardScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const p=Math.min(1,f/Math.max(1,scene.durationFrames));
  const lt:any=scene.layoutTreatment ?? {}; const pm=lt.proof_module ?? {};
  const layout=lt.layout_type ?? 'hero_proof_card';
  if(['quote_card','diagnosis_card','source_shift_card','decision_card','fix_pipeline_card','before_after_card','lesson_card'].includes(layout)) return <ConversationNativeCard scene={scene} index={index} accent={accent}/>;
  const title=cleanLabel(pm.title ?? scene.foregroundText ?? scene.humanSceneTitle ?? scene.caption,'Real evidence');
  const value=cleanLabel(pm.value ?? 'Visible evidence','Visible evidence');
  const support=String(pm.support_text ?? scene.intent ?? '').replace(/\s+/g,' ').trim();
  const bg='radial-gradient(circle at 24% 10%,#173626 0%,#08111f 42%,#07070a 100%)';
  const shell:React.CSSProperties={fontFamily:'Inter, Arial, sans-serif',color:'white',background:bg,overflow:'hidden'};
  const proofImg=<div style={{position:'absolute',left:104,right:104,top:510,height:560,borderRadius:42,overflow:'hidden',background:'#0b1020',border:`4px solid ${accent}`,boxShadow:'0 24px 90px rgba(0,0,0,.45)'}}><EvidenceImage scene={scene} style={{objectFit:'contain',padding:18,boxSizing:'border-box',transform:`scale(${interpolate(p,[0,1],[1,1.035])})`}}/></div>;
  if(layout==='risk_split_card') return <AbsoluteFill style={{...shell,background:'linear-gradient(135deg,#210b10,#07070a 55%,#092018)'}}><TopBar label="Compare the claim" index={index} accent={accent}/><div style={{position:'absolute',left:96,top:170,width:410,height:820,borderRadius:46,background:'#3a1014',border:'5px solid #ff5d5d',padding:42}}><div style={{fontSize:74,fontWeight:1000,lineHeight:.96}}>Without proof</div><div style={{marginTop:38,fontSize:42,fontWeight:850,lineHeight:1.06,color:'#ffd1d1'}}>Do not publish</div><div style={{position:'absolute',left:52,right:52,bottom:70,height:10,background:'#ff5d5d',transform:'rotate(-18deg)',borderRadius:99}}/></div><div style={{position:'absolute',right:96,top:170,width:410,height:820,borderRadius:46,background:'#f8fafc',color:'#07100d',border:`5px solid ${accent}`,padding:42}}><div style={{fontSize:58,fontWeight:1000,lineHeight:1}}>With evidence</div><div style={{marginTop:34,fontSize:37,fontWeight:850,lineHeight:1.12}}>A claim you can inspect.</div><div style={{position:'absolute',left:42,right:42,bottom:52,height:240,borderRadius:30,overflow:'hidden',background:'#0b1020'}}><EvidenceImage scene={scene} style={{objectFit:'contain',padding:12,boxSizing:'border-box'}}/></div></div><div style={{position:'absolute',left:96,right:96,bottom:156,fontSize:54,fontWeight:1000,lineHeight:1.02}}>No proof. Do not publishtion.</div></AbsoluteFill>;
  if(layout==='transformation_diagram') return <AbsoluteFill style={shell}><TopBar label="From source to story" index={index} accent={accent}/><div style={{position:'absolute',left:96,right:96,top:170,height:300,borderRadius:44,background:'#f8fafc',color:'#07100d',padding:46}}><div style={{fontSize:72,fontWeight:1000}}>Evidence</div><div style={{fontSize:34,fontWeight:800,opacity:.72}}>Original application capture</div></div><div style={{position:'absolute',left:250,right:250,top:560,height:180,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:360,height:16,borderRadius:99,background:accent}}/><div style={{width:0,height:0,borderTop:'38px solid transparent',borderBottom:'38px solid transparent',borderLeft:`70px solid ${accent}`}}/></div><div style={{position:'absolute',left:96,right:96,top:820,height:370,borderRadius:44,background:accent,color:'#07100d',padding:48}}><div style={{fontSize:76,fontWeight:1000}}>A clear story</div><div style={{fontSize:38,fontWeight:850,lineHeight:1.1}}>See what happened and why it matters.</div></div><div style={{position:'absolute',left:96,right:96,bottom:150,height:260,borderRadius:42,overflow:'hidden',background:'#111827',border:'3px solid rgba(255,255,255,.18)'}}><EvidenceImage scene={scene} style={{objectFit:'contain',padding:16,boxSizing:'border-box'}}/></div></AbsoluteFill>;
  if(layout==='benefit_checklist') return <AbsoluteFill style={shell}><TopBar label="Benefit" index={index} accent={accent}/><div style={{position:'absolute',left:96,right:96,top:170,bottom:200,borderRadius:54,background:'#f8fafc',color:'#07100d',padding:58}}><div style={{fontSize:78,fontWeight:1000,lineHeight:.98}}>A supported claim</div><div style={{marginTop:54,display:'grid',gap:34}}>{['Visible proof','A clear message','You decide'].map(t=><div key={t} style={{display:'flex',alignItems:'center',gap:24,fontSize:48,fontWeight:950}}><span style={{width:54,height:54,borderRadius:99,background:accent,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>✓</span>{t}</div>)}</div><div style={{position:'absolute',left:58,right:58,bottom:56,height:360,borderRadius:36,overflow:'hidden',background:'#0b1020'}}><EvidenceImage scene={scene} style={{objectFit:'contain',padding:18,boxSizing:'border-box'}}/></div></div></AbsoluteFill>;
  if(layout==='human_review_card') return <AbsoluteFill style={shell}><TopBar label="Human review" index={index} accent={accent}/><div style={{position:'absolute',left:96,right:96,top:190,borderRadius:58,background:'#f8fafc',color:'#07100d',padding:58,height:940}}><div style={{fontSize:80,fontWeight:1000,lineHeight:.98}}>Human review</div><div style={{marginTop:48,display:'grid',gap:28}}>{[scene.scriptApproved?'Script approved':'Script review pending',scene.storyboardApproved?'Storyboard reviewed':'Storyboard review pending','Publishing pending'].map((t,i)=><div key={t} style={{display:'flex',alignItems:'center',gap:22,fontSize:42,fontWeight:920}}><span style={{width:50,height:50,borderRadius:99,background:(i===0?scene.scriptApproved:i===1?scene.storyboardApproved:false)?accent:'#f59e0b'}}/>{t}</div>)}</div><div style={{position:'absolute',left:58,right:58,bottom:52,height:260,borderRadius:34,background:'#07100d',overflow:'hidden'}}><EvidenceImage scene={scene} style={{objectFit:'contain',padding:14,boxSizing:'border-box'}}/></div></div><div style={{position:'absolute',left:96,right:96,bottom:178,fontSize:42,fontWeight:850,lineHeight:1.1,opacity:.9}}>Publishing requires an explicit human decision.</div></AbsoluteFill>;
  return <AbsoluteFill style={shell}><TopBar label={layout==='proof_zoom_card'?'A closer look':'Visual evidence'} index={index} accent={accent}/><div style={{position:'absolute',left:96,right:96,top:170,borderRadius:54,background:'#f8fafc',color:'#07100d',padding:54,height:270}}><div style={{fontSize:76,fontWeight:1000,lineHeight:1}}>{title}</div><div style={{marginTop:18,fontSize:34,fontWeight:800,opacity:.72}}>{value}</div></div>{proofImg}<div style={{position:'absolute',left:96,right:96,top:1135,borderRadius:44,background:accent,color:'#07100d',padding:'38px 44px',fontSize:44,fontWeight:950,lineHeight:1.08}}>{support || scene.intent}</div><div style={{position:'absolute',left:96,right:96,bottom:150,fontSize:40,fontWeight:800,lineHeight:1.12,opacity:.86}}>{shortCaption(scene.caption)}</div></AbsoluteFill>;
}

function HookScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const p=Math.min(1,f/Math.max(1,scene.durationFrames)); const scale=interpolate(p,[0,1],[1.0,1.06]);
  return <AbsoluteFill style={{background:'radial-gradient(circle at 30% 12%,#173626 0%,#07100d 42%,#07070a 100%)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}>
    <TopBar label="Show the proof first" index={index} accent={accent}/>
    <div style={baseFrame(scene,{top:120,left:46,right:46,height:980})}><EvidenceImage scene={scene} style={{objectFit:'contain',transform:`scale(${scale})`}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,0) 42%,rgba(0,0,0,.50) 100%)'}}/><Label accent={accent} style={{position:'absolute',left:28,top:26}}>{cleanLabel(scene.foregroundText ?? scene.humanSceneTitle ?? 'Real evidence','Real evidence')}</Label></div>
    <div style={{position:'absolute',left:72,right:72,top:1030,fontSize:44,fontWeight:950,color:accent,lineHeight:1.08}}>Show the source behind the story.</div><Caption scene={scene} bottom={170}/>
  </AbsoluteFill>;
}
function ContextSetupScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const x=interpolate(Math.min(1,f/scene.durationFrames),[0,1],[-28,18]);
  return <AbsoluteFill style={{background:'linear-gradient(180deg,#08111f,#0b1020)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="Readable context" index={index} accent={accent}/>
    <div style={{position:'absolute',top:144,left:58,width:360,bottom:220,background:'rgba(255,255,255,.08)',borderRadius:38,padding:34,border:'1px solid rgba(255,255,255,.16)'}}><div style={{fontSize:54,fontWeight:1000,lineHeight:1.02}}>What you are seeing</div><p style={{fontSize:32,lineHeight:1.18,opacity:.82}}>{scene.intent}</p></div>
    <div style={baseFrame(scene,{top:150,left:452,right:-70,bottom:218,transform:`translateX(${x}px)`})}><EvidenceImage scene={scene}/><Label accent={accent} style={{position:'absolute',left:28,top:28}}>{cleanLabel(scene.foregroundText ?? scene.humanSceneTitle ?? 'Clear context','Clear context')}</Label></div><Caption scene={scene}/>
  </AbsoluteFill>;
}
function ProofZoomScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const p=Math.min(1,f/scene.durationFrames); const scale=interpolate(p,[0,1],[1.12,1.28]); const y=interpolate(p,[0,1],[0,-44]);
  return <AbsoluteFill style={{background:'#090b0f',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="Inspect the source" index={index} accent={accent}/>
    <div style={baseFrame(scene,{top:98,left:-90,right:112,height:1084,borderColor:accent})}><EvidenceImage scene={scene} style={{transform:`scale(${scale}) translateY(${y}px)`}}/><div style={{position:'absolute',right:80,top:124,width:260,height:260,borderRadius:34,border:`9px solid ${accent}`,boxShadow:`0 0 55px ${accent}`}}/><Label accent={accent} style={{position:'absolute',left:130,top:30}}>{cleanLabel(scene.foregroundText ?? scene.humanSceneTitle ?? 'Verifiable detail','Verifiable detail')}</Label></div><Caption scene={scene}/>
  </AbsoluteFill>;
}
function RiskContrastScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const p=Math.min(1,f/scene.durationFrames);
  return <AbsoluteFill style={{background:'linear-gradient(135deg,#170b0b,#0b1020 58%,#07100d)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="Review the risk" index={index} accent={accent}/>
    <div style={{position:'absolute',top:150,left:54,width:455,bottom:250,background:'rgba(239,68,68,.16)',border:'3px solid rgba(239,68,68,.75)',borderRadius:40,padding:36}}><div style={{fontSize:48,fontWeight:1000}}>Without proof</div><p style={{fontSize:34,lineHeight:1.12}}>An unsupported claim needs stronger evidence.</p></div>
    <div style={baseFrame(scene,{top:150,left:540,right:54,bottom:250,transform:`scale(${interpolate(p,[0,1],[1.02,1.08])})`,borderColor:accent})}><EvidenceImage scene={scene}/><Label accent={accent} style={{position:'absolute',left:28,top:28}}>{cleanLabel(scene.foregroundText ?? scene.humanSceneTitle ?? 'With evidence','With evidence')}</Label></div><Caption scene={scene}/>
  </AbsoluteFill>;
}
function ResultRevealScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  const f=useCurrentFrame(); const p=Math.min(1,f/scene.durationFrames); const reveal=interpolate(p,[0,1],[-260,0]);
  return <AbsoluteFill style={{background:'radial-gradient(circle at 72% 20%,#1d3a2d,#08111f 48%,#07070a)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="See the result" index={index} accent={accent}/>
    <div style={baseFrame(scene,{top:146,left:92,right:92,height:870})}><EvidenceImage scene={scene} style={{transform:`scale(${interpolate(p,[0,1],[1.04,1.12])})`}}/><div style={{position:'absolute',left:0,right:0,bottom:0,transform:`translateY(${reveal}px)`,background:`${accent}`,color:'#07100d',padding:'34px 44px',fontSize:46,fontWeight:1000}}>{cleanLabel(scene.foregroundText ?? 'Evidence → story','Evidence → story')}</div></div><Caption scene={scene} bottom={114}/>
  </AbsoluteFill>;
}
function BenefitStackScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  return <AbsoluteFill style={{background:'linear-gradient(180deg,#07100d,#101218 54%,#07070a)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="A supported benefit" index={index} accent={accent}/>
    <div style={baseFrame(scene,{top:154,left:118,right:-90,height:880})}><EvidenceImage scene={scene}/></div><div style={{position:'absolute',left:62,top:180,width:360,zIndex:7,display:'grid',gap:18}}>{['Visible proof','Traceable claim','Human review'].map((t,i)=><div key={t} style={{background:'rgba(255,255,255,.94)',color:'#07100d',borderRadius:28,padding:'22px 24px',fontSize:35,fontWeight:950,lineHeight:1.05,boxShadow:'0 18px 55px rgba(0,0,0,.25)'}}>{i+1}. {t}</div>)}</div><Caption scene={scene}/>
  </AbsoluteFill>;
}
function CtaScene({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  return <AbsoluteFill style={{background:'linear-gradient(180deg,#07070a,#0f172a)',fontFamily:'Inter, Arial, sans-serif',color:'white',overflow:'hidden'}}><TopBar label="Human review" index={index} accent={accent}/>
    <div style={baseFrame(scene,{top:110,left:74,right:74,height:820})}><EvidenceImage scene={scene} style={{objectFit:'contain'}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.64) 100%)'}}/></div><div style={{position:'absolute',left:96,right:96,top:960,background:accent,color:'#07100d',borderRadius:999,padding:'28px 36px',textAlign:'center',fontSize:45,fontWeight:1000,zIndex:7}}>Ready for human review</div><Caption scene={scene} bottom={170}/>
  </AbsoluteFill>;
}
function SceneLibraryDispatcher({scene,index,accent}:{scene:DraftScene;index:number;accent:string}){
  if(scene.layoutTreatment) return <NativeCardScene scene={scene} index={index} accent={accent}/>;
  const template=scene.sceneTemplate ?? 'ProofDrivenScene';
  if(template==='HookScene') return <HookScene scene={scene} index={index} accent={accent}/>;
  if(template==='ContextSetupScene') return <ContextSetupScene scene={scene} index={index} accent={accent}/>;
  if(template==='ProofZoomScene') return <ProofZoomScene scene={scene} index={index} accent={accent}/>;
  if(template==='RiskContrastScene') return <RiskContrastScene scene={scene} index={index} accent={accent}/>;
  if(template==='ResultRevealScene') return <ResultRevealScene scene={scene} index={index} accent={accent}/>;
  if(template==='BenefitStackScene') return <BenefitStackScene scene={scene} index={index} accent={accent}/>;
  if(template==='CtaScene') return <CtaScene scene={scene} index={index} accent={accent}/>;
  return <ProofZoomScene scene={scene} index={index} accent={accent}/>;
}
export const DraftVideo:React.FC<DraftVideoProps>=({title,scenes,brand,editorialFilm})=>{
  const {durationInFrames}=useVideoConfig();
  if(editorialFilm)return <EditorialFilm film={editorialFilm}/>;
  const accent=brand?.accent ?? '#66e3a2';
  const safeScenes=scenes.length?scenes:[{id:'fallback',startFrame:0,durationFrames:durationInFrames,caption:title,intent:'Evidence real visible',assetPath:'',movement:'proof_reveal',sceneTemplate:'HookScene'} as DraftScene];
  return <AbsoluteFill style={{background:'#07070a'}}>{safeScenes.map((scene,index)=><Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationFrames}><SceneLibraryDispatcher scene={scene} index={index} accent={accent}/></Sequence>)}</AbsoluteFill>;
};
