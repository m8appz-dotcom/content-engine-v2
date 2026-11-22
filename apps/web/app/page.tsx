import PipelineConsole from './components/PipelineConsole';
import WorkspaceAccess from './components/WorkspaceAccess';
export const dynamic='force-dynamic';
export default function Page(){return <WorkspaceAccess><PipelineConsole/></WorkspaceAccess>;}
