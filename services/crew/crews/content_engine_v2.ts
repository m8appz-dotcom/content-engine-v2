import { generateCrewScript, generateCrewStoryAngle } from '../../../packages/providers/src/ai/crew-orchestrator';
import { productiveVideoCrewRoles, runProductiveVideoCrew } from './productive_video_crew';
export const contentEngineCrew={
  name:'content-engine-v2-productive-crew',
  model:process.env.CONTENT_ENGINE_GPT55_MODEL ?? 'gpt-5.5',
  roles:[...productiveVideoCrewRoles],
  tasks:{ generateStoryAngle:generateCrewStoryAngle, generateScript:generateCrewScript, runProductiveVideoCrew }
};
export { runProductiveVideoCrew, runDeterministicProductiveCrew } from './productive_video_crew';
