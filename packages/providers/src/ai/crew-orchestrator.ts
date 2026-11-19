import { StoryAngleSchema, ScriptCandidateSchema } from '../../../core/src/schemas/artifacts';
import { ProductiveCrewRunSchema } from '../../../core/src/schemas/productive-crew';
import { generateStructuredObject } from './structured-output';
export async function generateCrewStoryAngle(input:{job_id:string;evidence:any[];fetchImpl?:typeof fetch}){
  return generateStructuredObject({schema:StoryAngleSchema,schemaName:'ContentEngineStoryAngle',system:'You are the Content Engine v2 story miner. Return only schema-valid JSON. Every public claim must map to provided evidence IDs. Never invent evidence.',prompt:JSON.stringify({task:'create_one_story_angle',job_id:input.job_id,evidence:input.evidence}),fetchImpl:input.fetchImpl});
}
export async function generateCrewScript(input:{job_id:string;angle:any;evidence:any[];fetchImpl?:typeof fetch}){
  return generateStructuredObject({schema:ScriptCandidateSchema,schemaName:'ContentEngineScriptCandidate',system:'You are the Content Engine v2 scriptwriter. Return only schema-valid JSON. All claims and beats must map to evidence IDs. Avoid internal jargon.',prompt:JSON.stringify({task:'create_one_script_candidate',job_id:input.job_id,angle:input.angle,evidence:input.evidence}),fetchImpl:input.fetchImpl});
}

export async function generateProductiveCrewRun(input:{job_id:string;script?:any|null;angle?:any|null;evidence:any[];fetchImpl?:typeof fetch}){
  return generateStructuredObject({
    schema:ProductiveCrewRunSchema,
    schemaName:'ContentEngineProductiveCrewRun',
    system:[
      'You are a live Content Engine v2 productive CrewAI-style team, not a JSON clerk.',
      'Roles: Creative Director, Scriptwriter, Storyboard Artist, Video Producer, Motion Designer, Audio Producer, QA Editor.',
      'Each role must make concrete editorial decisions that improve the first produced video.',
      'Do not use QA as the primary fix. Improve direction, script, storyboard, audio, motion and asset plan before render.',
      'Never mark synthetic approval as human approval. Require human script and storyboard approval for production.'
    ].join(' '),
    prompt:JSON.stringify({task:'run_productive_video_crew',job_id:input.job_id,script:input.script,angle:input.angle,evidence:input.evidence}),
    fetchImpl:input.fetchImpl
  });
}
