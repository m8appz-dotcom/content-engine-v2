import { runEvals } from '../evals/run-evals';
runEvals().then(summary=>{ const result=summary.results.find((r:any)=>r.name.toLowerCase().includes('scriptwriter')) ?? summary; console.log(JSON.stringify(result,null,2)); if(!summary.ok) process.exit(1); });
