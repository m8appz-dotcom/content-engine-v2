import {writeFileSync} from 'node:fs';
const SAMPLE_RATE=22050, BYTES_PER_SECOND=SAMPLE_RATE*2, MAX_SECONDS=74;

/** Keep complete sentences short enough for the deployed speech service. */
export function narrationChunks(text:string):string[]{
  const sentences:string[]=[];
  for(const part of new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)){
    const sentence=part.segment.trim();
    if(!sentence)continue;
    if(sentences.length&&/\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr)\.$/.test(sentences.at(-1)!))sentences[sentences.length-1]+=' '+sentence;
    else sentences.push(sentence);
  }
  return sentences.flatMap(sentence=>{
    const chunks:string[]=[];let current='';
    for(const word of sentence.split(/\s+/)){
      if(word.length>240)throw Object.assign(new Error('Narration contains a word that is too long.'),{code:'business_validation_failed'});
      if(current&&current.length+1+word.length>240){chunks.push(current);current='';}
      current=current?`${current} ${word}`:word;
    }
    if(current)chunks.push(current);
    return chunks;
  });
}

export async function createSparkNarration(text:string,destination:string,fetcher:typeof fetch=fetch){
  const base=process.env.SPARK_TTS_URL,token=process.env.SPARK_TTS_TOKEN;
  if(!base||!token)throw Object.assign(new Error('Private narration is not configured.'),{code:'provider_not_configured'});
  if(!text.trim()||text.length>4000)throw Object.assign(new Error('Narration exceeds this draft limit.'),{code:'business_validation_failed'});
  const endpoint=new URL(base);
  if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!['http:','https:'].includes(endpoint.protocol))throw Error('Invalid narration endpoint');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),180000);
  const chunks:Buffer[]=[];let size=0;
  try{
    // This pronunciation cue was checked with the product's human reviewer.
    // It never changes the approved script, captions or displayed product name.
    const parts=narrationChunks(text);
    for(const [index,part] of parts.entries()){
      const response=await fetcher(base.replace(/\/$/,'')+'/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({input:part.replace(/\bContent Engine\b/g,'CON-tent Engine'),voice:'Aria',language:'en-US'}),signal:controller.signal});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/pcm')||response.headers.get('x-audio-sample-rate')!==String(SAMPLE_RATE)||!response.body)throw Object.assign(new Error('Narration could not finish.'),{code:'provider_failed'});
      const sentence:Buffer[]=[];let sentenceSize=0;
      for await(const chunk of response.body){
        sentenceSize+=chunk.byteLength;size+=chunk.byteLength;
        if(size>BYTES_PER_SECOND*MAX_SECONDS){controller.abort();throw Object.assign(new Error('Narration exceeds the video length limit.'),{code:'business_validation_failed'});}
        sentence.push(Buffer.from(chunk));
      }
      if(sentenceSize<4410||sentenceSize%2)throw Object.assign(new Error('Narration was incomplete.'),{code:'provider_failed'});
      if(index){const pause=Buffer.alloc(Math.round(SAMPLE_RATE*0.12)*2);chunks.push(pause);size+=pause.length;}
      if(size>BYTES_PER_SECOND*MAX_SECONDS)throw Object.assign(new Error('Narration exceeds the video length limit.'),{code:'business_validation_failed'});
      chunks.push(...sentence);
    }
    const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+size,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(SAMPLE_RATE,24);header.writeUInt32LE(BYTES_PER_SECOND,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(size,40);
    writeFileSync(destination,Buffer.concat([header,...chunks]));return {path:destination,duration:size/BYTES_PER_SECOND};
  }finally{clearTimeout(timer);}
}
