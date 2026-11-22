export async function readWorkspaceResponse(response:Response){
  let data;
  try{data=await response.json();}
  catch{throw Error("Couldn't read the reply. Check the project before trying again.");}
  if(!response.ok)throw Error(data?.error?.message||'This step could not finish. Check the project before trying again.');
  return data;
}
