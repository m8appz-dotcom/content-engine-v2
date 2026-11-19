import React from 'react';
import { Composition, getInputProps, registerRoot } from 'remotion';
import { DraftVideo, type DraftVideoProps } from './DraftComposition';

const input=getInputProps() as Partial<DraftVideoProps> & {durationInFrames?:number;fps?:number};
const fps=input.fps ?? 30;
const durationInFrames=input.durationInFrames ?? Math.max(600,...(input.scenes??[]).map(s=>s.startFrame+s.durationFrames));

const Root:React.FC=()=> <Composition
  id="ContentEngineDraft"
  component={DraftVideo}
  durationInFrames={durationInFrames}
  fps={fps}
  width={1080}
  height={1920}
  defaultProps={{title:input.title ?? 'Content Engine v2',scenes:input.scenes ?? [],brand:input.brand ?? {accent:'#66e3a2'}}}
/>;

registerRoot(Root);
