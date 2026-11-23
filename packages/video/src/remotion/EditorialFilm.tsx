import React from 'react';
import {AbsoluteFill,Img,Sequence,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import type {EditorialFilm as Film,EditorialScene} from './editorial-types';

const ink='#22211e',paper='#f7f5ef',rule='#a7a59e',serif='Liberation Serif, Georgia, serif',sans='Liberation Sans, Arial, sans-serif';
const ease=(p:number)=>1-(1-p)**3;
function Lines({children,style={}}:{children:React.ReactNode;style?:React.CSSProperties}){
 return <div style={{borderTop:`2px solid ${rule}`,paddingTop:28,...style}}>{children}</div>;
}
function Caption({scene}:{scene:EditorialScene}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),time=scene.start+frame/fps;
 const active=scene.caption.find(c=>time>=c.start&&time<c.end);
 return <div style={{position:'absolute',left:72,right:72,bottom:74,minHeight:138,borderTop:`2px solid ${rule}`,paddingTop:26,fontFamily:sans,fontSize:46,lineHeight:1.25,color:ink}}>{active?.text||''}</div>;
}
function Source({scene}:{scene:EditorialScene}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),p=ease(Math.min(1,frame/(fps*.65)));
 const image=scene.image!;
 const width=936,height=930,fit=Math.min(1.35,width/image.width,height/image.height);
 const focused=Math.min(1.35,Math.max(width/image.focus.width,height/image.focus.height));
 const push=interpolate(frame,[fps*.15,fps*.65],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const scale=interpolate(push,[0,1],[fit,Math.max(fit,focused)]);
 // Camera framing uses the intact source capture. No derivative image is made.
 const left=interpolate(push,[0,1],[(width-image.width*fit)/2,(width-image.focus.width*scale)/2-image.focus.x*scale]);
 const top=interpolate(push,[0,1],[(height-image.height*fit)/2,(height-image.focus.height*scale)/2-image.focus.y*scale]);
 return <>
  <div style={{position:'absolute',left:72,right:72,top:170,fontFamily:serif,fontSize:scene.headline.length>48?82:98,lineHeight:1.03,letterSpacing:-2,whiteSpace:'pre-line'}}>{scene.headline}</div>
  <div style={{position:'absolute',left:72,right:72,top:465,height,overflow:'hidden',borderTop:`2px solid ${ink}`,borderBottom:`2px solid ${ink}`,background:'#fff'}}>
   <div style={{position:'absolute',left,top:top+interpolate(p,[0,1],[26,0]),width:image.width*scale,height:image.height*scale}}><Img src={image.src} style={{width:'100%',height:'100%',filter:'none'}}/></div>
  </div>
  <div style={{position:'absolute',left:72,right:72,top:1440,fontFamily:sans,fontSize:38,lineHeight:1.3}}>{scene.sourceName}</div>
 </>;
}
function Document({scene}:{scene:EditorialScene}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),time=frame/fps;
 const steps=scene.documentSteps??[];
 const active=Math.min(2,Math.floor(time/1.45));
 return <>
  <div style={{position:'absolute',left:72,right:72,top:170,fontFamily:serif,fontSize:scene.headline.length>48?82:98,lineHeight:1.03,letterSpacing:-2,whiteSpace:'pre-line'}}>{scene.headline}</div>
  <div style={{position:'absolute',left:72,right:72,top:440,bottom:390}}>
   <Lines><div style={{fontFamily:sans,fontSize:36,letterSpacing:2,marginBottom:42}}>{scene.excerptKind==='approved_claim'?'THE LINKED CLAIM':'FROM THE SOURCE'}</div><div style={{fontFamily:serif,fontSize:scene.excerptKind==='approved_claim'&&(scene.excerpt?.length??0)<=130?76:58,lineHeight:1.17,whiteSpace:'pre-wrap'}}>{scene.excerpt}</div></Lines>
   {steps.length>0&&<div style={{marginTop:48}}>{steps.map((label,i)=><div key={label} style={{display:'flex',gap:30,alignItems:'baseline',padding:'22px 0',borderTop:`2px solid ${rule}`,opacity:i>active ? 0.38 : 1,transform:`translateY(${i>active?8:0}px)`}}><span style={{fontFamily:sans,fontSize:34,width:55}}>{String(i+1).padStart(2,'0')}</span><span style={{fontFamily:serif,fontSize:54,lineHeight:1.15}}>{label}</span></div>)}</div>}
  </div>
  <div style={{position:'absolute',left:72,right:72,top:1510,fontFamily:sans,fontSize:36,lineHeight:1.3}}>{scene.sourceName}</div>
 </>;
}
function Decision({scene}:{scene:EditorialScene}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),p=ease(Math.min(1,frame/(fps*.45)));
 const revealed=interpolate(frame,[(scene.decisionRevealSec??0)*fps,(scene.decisionRevealSec??0)*fps+fps*.35],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <>
  <div style={{position:'absolute',left:72,right:72,top:170,fontFamily:serif,fontSize:scene.headline.length>48?82:98,lineHeight:1.03,letterSpacing:-2,whiteSpace:'pre-line',transform:`translateY(${(1-p)*14}px)`}}>{scene.headline}</div>
  <div style={{position:'absolute',left:72,right:72,top:535,fontFamily:serif,fontSize:64,lineHeight:1.15}}>{scene.decisionText}</div>
  <div style={{position:'absolute',left:72,right:72,top:840,opacity:revealed,transform:`translateY(${(1-revealed)*16}px)`}}>
   <Lines><div style={{fontFamily:sans,fontSize:35,letterSpacing:2,marginBottom:32}}>THIS PROJECT'S REVIEW RECORD</div>
   {[['Script',scene.scriptApproved],['Storyboard',scene.storyboardApproved]].map(([name,approved])=><div key={String(name)} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'36px 0',borderBottom:`2px solid ${rule}`}}><span style={{fontFamily:serif,fontSize:65}}>{name}</span><span style={{fontFamily:sans,fontSize:42}}>{approved?'Approved':'Needs review'}</span></div>)}
   </Lines>
  </div>
  <div style={{position:'absolute',left:72,right:72,top:1370,fontFamily:serif,fontSize:57,lineHeight:1.2,opacity:revealed}}>{scene.decisionActions?.map(line=><div key={line}>{line}</div>)}</div>
 </>;
}
function Scene({scene,index,brand,total}:{scene:EditorialScene;index:number;brand:string;total:number}){
 return <AbsoluteFill style={{background:paper,color:ink,overflow:'hidden'}}>
  <div style={{position:'absolute',left:72,right:72,top:55,height:60,borderBottom:`2px solid ${ink}`,display:'flex',alignItems:'baseline',justifyContent:'space-between',fontFamily:sans,fontSize:34}}><span>{brand} / {scene.eyebrow}</span><span>{String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</span></div>
  {scene.kind==='source'?<Source scene={scene}/>:scene.kind==='document'?<Document scene={scene}/>:<Decision scene={scene}/>}
  <Caption scene={scene}/>
 </AbsoluteFill>;
}
export const EditorialFilm:React.FC<{film:Film}>=({film})=>{
 const {fps}=useVideoConfig();
 return <AbsoluteFill style={{background:paper}}>{film.scenes.map((s,i)=>{const end=Math.min(s.end,film.endCard?.start??film.duration);return end>s.start?<Sequence key={s.id} from={Math.round(s.start*fps)} durationInFrames={Math.round(end*fps)-Math.round(s.start*fps)}><Scene scene={s} index={i} brand={film.brand} total={film.scenes.length}/></Sequence>:null;})}{film.endCard&&<Sequence from={Math.round(film.endCard.start*fps)}><Closing card={film.endCard}/></Sequence>}</AbsoluteFill>;
};

function Closing({card}:{card:NonNullable<Film['endCard']>}){
 return <AbsoluteFill style={{background:paper,color:ink,padding:72,fontFamily:serif}}>
  <div style={{position:'absolute',left:72,right:72,top:120,borderTop:`2px solid ${ink}`}}/>
  <div style={{position:'absolute',left:72,right:72,top:470,fontSize:card.title.length>22?112:190,lineHeight:.92,letterSpacing:-5,whiteSpace:'pre-line'}}>{card.title.length<=22?card.title.split(' ').join('\n'):card.title}</div>
  <div style={{position:'absolute',left:72,right:72,top:1080,fontSize:64,lineHeight:1.15}}>{card.line}</div>
  {card.url&&<div style={{position:'absolute',left:72,right:72,bottom:400,fontFamily:sans,fontSize:42}}>{new URL(card.url).hostname}</div>}
  <div style={{position:'absolute',left:72,right:72,bottom:220,borderTop:`2px solid ${ink}`}}/>
 </AbsoluteFill>;
}
