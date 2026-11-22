import {writeFileSync} from 'node:fs';
export async function createSparkNarration(text:string,destination:string){
  const base=process.env.SPARK_TTS_URL,token=process.env.SPARK_TTS_TOKEN;
  if(!base||!token)throw Object.assign(new Error('Private narration is not configured.'),{code:'provider_not_configured'});
  if(!text.trim()||text.length>4000)throw Object.assign(new Error('Narration exceeds this draft limit.'),{code:'business_validation_failed'});
  const endpoint=new URL(base);
  if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!['http:','https:'].includes(endpoint.protocol))throw Error('Invalid narration endpoint');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{
    const response=await fetch(base.replace(/\/$/,'')+'/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({input:text,voice:'Aria',language:'en-US'}),signal:controller.signal});
    if(!response.ok||!response.headers.get('content-type')?.includes('audio/pcm'))throw Object.assign(new Error('Narration could not finish.'),{code:'provider_failed'});
    const chunks:Uint8Array[]=[];let size=0;
    if(!response.body)throw Error('Narration was empty.');
    for await(const chunk of response.body){size+=chunk.byteLength;if(size>22050*2*74){controller.abort();throw Object.assign(new Error('Narration exceeds the video length limit.'),{code:'business_validation_failed'});}chunks.push(chunk);}
    if(size<4410||size%2)throw Object.assign(new Error('Narration was incomplete.'),{code:'provider_failed'});
    const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+size,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(22050,24);header.writeUInt32LE(44100,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(size,40);
    writeFileSync(destination,Buffer.concat([header,...chunks]));return {path:destination,duration:size/44100};
  }finally{clearTimeout(timer);}
}
