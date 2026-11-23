import {readFileSync} from 'node:fs';
import {narrationChunks} from '../../../providers/src/ai/spark-narration';

export type NarrationSegment={text:string;start:number;end:number};
/** Recover the sentence boundaries written by the sentence-chunk narrator.
 * The PCM remains untouched. Ambiguous gaps return no measured timing. */
export function readNarrationSegments(wavPath:string,text:string):NarrationSegment[]|undefined{
 const bytes=readFileSync(wavPath);
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')return;
 let rate=0,channels=0,bits=0,format=0,data:Buffer|undefined;
 for(let at=12;at+8<=bytes.length;){
  const length=bytes.readUInt32LE(at+4),end=at+8+length;if(end>bytes.length)return;
  const tag=bytes.toString('ascii',at,at+4);
  if(tag==='fmt '&&length>=16){format=bytes.readUInt16LE(at+8);channels=bytes.readUInt16LE(at+10);rate=bytes.readUInt32LE(at+12);bits=bytes.readUInt16LE(at+22);}
  if(tag==='data')data=bytes.subarray(at+8,end);
  at=end+(length%2);
 }
 if(format!==1||channels!==1||bits!==16||!rate||!data||data.length%2)return;
 const parts=narrationChunks(text),gaps:{start:number;end:number}[]=[];
 let start=-1;
 for(let i=0;i<=data.length/2;i++){
  const zero=i<data.length/2&&data.readInt16LE(i*2)===0;
  if(zero&&start<0)start=i;
  if(!zero&&start>=0){const seconds=(i-start)/rate;if(start>0&&i<data.length/2&&seconds>=.11){if(seconds>.13)return;gaps.push({start:start/rate,end:i/rate});}start=-1;}
 }
 if(gaps.length!==parts.length-1)return;
 return parts.map((part,i)=>({text:part,start:i?gaps[i-1].end:0,end:i<gaps.length?gaps[i].start:data!.length/2/rate}));
}
