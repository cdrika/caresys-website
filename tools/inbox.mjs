import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const data=process.env.DATA_DIR||path.join(root,'var');
async function read(name){try{return(await fs.readFile(path.join(data,name+'.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return[];throw error;}}
if(process.argv[2]==='publish'){
 const id=process.argv[3];const entry=(await read('feedback')).find(record=>record.id===id);
 if(!entry||!entry.publishConsent)throw new Error('A matching feedback record with explicit publication consent is required.');
 let approved=[];const target=path.join(data,'published-feedback.json');try{approved=JSON.parse(await fs.readFile(target,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(approved.some(record=>record.id===id))throw new Error('This feedback is already published.');
 approved.push({id:entry.id,firstName:entry.name.split(/\s+/)[0],role:entry.role,rating:entry.rating,feedback:entry.feedback});
 await fs.writeFile(target,JSON.stringify(approved,null,2),{mode:0o600});console.log('Approved feedback published. Review public wording and personal details before using this command.');
}else{for(const kind of ['contact','feedback']){const records=await read(kind);console.log(`\n${kind.toUpperCase()}: ${records.length} submission(s)`);for(const record of records)console.log(JSON.stringify(record,null,2));}}
