import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const root='outputs/remakes/contract-video-v1';
const framesDir=path.join(root,'frames'); fs.mkdirSync(framesDir,{recursive:true}); fs.mkdirSync(path.join(root,'audio'),{recursive:true});
const W=1080,H=1920,FPS=30;
const beats=[
 {id:'b1',dur:4,asset:'app_contract_full.png',palette:['#ff5a5f','#08080d'],giant:'ANTES: PROMESA',detail:'El prompt decía “usa clips”… pero nada lo exigía.',motion:'scroll_freeze'},
 {id:'b2',dur:4,asset:'contract_ui_final.png',palette:['#06b6d4','#f8fafc'],giant:'AHORA: CONTRATO',detail:'Un nodo visible controla obligaciones antes de producir.',motion:'magnet_pull'},
 {id:'b3',dur:4,asset:'human_approval_ui.png',palette:['#f472b6','#fde047'],giant:'AGENTES CON DEUDA',detail:'Creative / Producer / Storyboard / Audio / Motion producen artifacts.',motion:'split_stack'},
 {id:'b4',dur:4,asset:'staging_contact_sheet.png',palette:['#86efac','#0f172a'],giant:'MISSING → READY',detail:'5 clips reales + 3 b-rolls visibles, no texto aspiracional.',motion:'before_after'},
 {id:'b5',dur:4,asset:'production_frames.jpg',palette:['#facc15','#0f172a'],giant:'USED O NO PASA',detail:'Renderer usa shot_asset_map + voiceover_timing.',motion:'stamp'},
 {id:'b6',dur:4,asset:'contract_ui_final.png',palette:['#fff7ed','#0f172a'],giant:'NO MÁS\nCARDS GENÉRICAS',detail:'El workflow ve artifacts, no promesas del prompt.',motion:'cta_loop'},
];
const script=fs.readFileSync(path.join(root,'artifacts/voiceover_script.txt'),'utf8').trim();
const total=beats.reduce((a,b)=>a+b.dur,0);
const svgEsc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function frameSvg(n){
 const t=n/FPS; let acc=0, idx=0; for(; idx<beats.length; idx++){ if(t<acc+beats[idx].dur) break; acc+=beats[idx].dur; } const b=beats[Math.min(idx,beats.length-1)]; const local=(t-acc)/b.dur; const asset=path.resolve(root,'assets',b.asset); const img=fs.readFileSync(asset).toString('base64'); const ext=path.extname(asset).toLowerCase(); const mime=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':'image/png';
 const [accent,bg]=b.palette; const scale=1.02+0.08*Math.sin(local*Math.PI); const y=-60+120*local; const x=idx%2===0?70:-70; const rot=(local-.5)*2;
 const phraseY=idx%2===0?210:1260; const imageY=idx%2===0?560:190; const imageH=idx%2===0?930:930;
 const chapter=`0${idx+1}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
 <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${bg}"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.45"/></filter></defs>
 <rect width="${W}" height="${H}" fill="${bg}"/><circle cx="${160+idx*80}" cy="${240+idx*110}" r="${220+80*local}" fill="${accent}" opacity="0.24"/><rect x="42" y="42" width="996" height="1836" rx="54" fill="none" stroke="${accent}" stroke-width="5" opacity="0.75"/>
 <text x="70" y="102" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="900" fill="${accent}">CONTRACT VIDEO / ${chapter}</text>
 <g transform="translate(${x*(local-.5)} ${imageY+y*.35}) scale(${scale}) rotate(${rot} 540 490)" filter="url(#shadow)"><rect x="96" y="0" width="888" height="${imageH}" rx="36" fill="#fff" opacity="0.08"/><image href="data:${mime};base64,${img}" x="116" y="22" width="848" height="${imageH-44}" preserveAspectRatio="xMidYMid slice"/></g>
 <rect x="70" y="${phraseY-92}" width="940" height="${String(b.giant).includes('\n')?330:260}" rx="34" fill="url(#g)" opacity="0.96" filter="url(#shadow)"/>
 ${String(b.giant).split('\n').map((line,i)=>`<text x="105" y="${phraseY+i*76}" font-family="Inter,Arial Black,Arial,sans-serif" font-size="64" font-weight="1000" fill="${idx===1?'#071018':'#ffffff'}">${svgEsc(line)}</text>`).join('')}
 <text x="108" y="${phraseY+(String(b.giant).includes('\n')?150:76)}" font-family="Inter,Arial,sans-serif" font-size="31" font-weight="800" fill="${idx===1?'#0f172a':'#ffffff'}" opacity="0.94">${svgEsc(b.detail)}</text>
 <text x="75" y="1815" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="900" fill="${accent}">1 frase gigante + 1 visual real + 1 detalle verificable</text>
 </svg>`;
}
const frameCount=Math.round(total*FPS);
for(let n=0;n<frameCount;n++) fs.writeFileSync(path.join(framesDir,`f${String(n).padStart(5,'0')}.svg`),frameSvg(n));
// audio: acceptable cloud TTS failed; create non-silent music+sfx bed and timing manifest marks voiceover blocker.
execFileSync('ffmpeg',['-y','-f','lavfi','-i',`sine=frequency=174:duration=${total}:sample_rate=48000`,'-f','lavfi','-i',`sine=frequency=880:duration=0.08:sample_rate=48000`,'-filter_complex',`[0:a]volume=0.06[a0];[1:a]adelay=900|900,apad,atrim=0:${total},volume=0.25[a1];[a0][a1]amix=inputs=2:duration=first,loudnorm=I=-22:TP=-2:LRA=8[a]`,'-map','[a]',path.join(root,'audio','music_sfx_bed.wav')],{stdio:'ignore'});
execFileSync('ffmpeg',['-y','-framerate',String(FPS),'-i',path.join(framesDir,'f%05d.svg'),'-i',path.join(root,'audio','music_sfx_bed.wav'),'-c:v','libx264','-pix_fmt','yuv420p','-r',String(FPS),'-c:a','aac','-b:a','160k','-shortest',path.join(root,'contract-remake-v1.mp4')],{stdio:'inherit'});
let start=0; const shotMap=beats.map(b=>{const row={beat_id:b.id,start_sec:start,end_sec:start+b.dur,asset_id:path.parse(b.asset).name,asset_path:`outputs/remakes/contract-video-v1/assets/${b.asset}`,motion:b.motion,intended_read:b.giant,forbidden_reads:['generic cards as primary','unmapped assets','cut voiceover']}; start+=b.dur; return row;});
fs.writeFileSync(path.join(root,'artifacts','shot_asset_map.json'),JSON.stringify({version:'shot_asset_map_v1',style_reference_id:'impressed_v5_visual_story',beats:shotMap},null,2));
fs.writeFileSync(path.join(root,'artifacts','style_reference.json'),JSON.stringify({id:'impressed_v5_visual_story',rules:['kinetic typography','palette by chapter','real before/after proof','feed/scroll/magnet/split-screen metaphors','one giant phrase + one real visual + one detail','no generic UI cards/microtext as body']},null,2));
fs.writeFileSync(path.join(root,'artifacts','voiceover_timing.json'),JSON.stringify({version:'voiceover_timing_v1',voiceover_required:true,status:'blocked_acceptable_tts_missing',script_text:script,total_duration_sec:total,derive_video_duration_from_audio:true,beats:shotMap.map(x=>({beat_id:x.beat_id,start_sec:x.start_sec,end_sec:x.end_sec,line:''})),blocker:'OpenClaw TTS convert aborted with SIGKILL; rendered with non-silent music/SFX bed only until acceptable voiceover is available.'},null,2));
console.log(JSON.stringify({ok:true,video:path.join(root,'contract-remake-v1.mp4'),duration:total,frames:frameCount},null,2));
