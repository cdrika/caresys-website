import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const roles={agency:'Agency team',caregiver:'Caregiver',other:'Exploring CareSys'};
const text=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
class RequestError extends Error{constructor(status,message){super(message);this.status=status;}}

export function validateSubmission(kind,data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError(400,'Please submit a valid form.');
 const allowed=kind==='contact'?['name','email','organization','phone','enquiry','plan','message','website','consent']:['name','role','rating','feedback','website','consent','publishConsent'];
 if(Object.keys(data).some(key=>!allowed.includes(key)))throw new RequestError(400,'The form contains unsupported fields.');
 if(data.website)throw new RequestError(422,'Please leave the hidden website field empty.');
 if(!text(data.name,2,100))throw new RequestError(422,'Please enter your name (2–100 characters).');
 if(data.consent!==true)throw new RequestError(422,'Please confirm the privacy consent before submitting.');
 if(kind==='contact'){
  if(!text(data.email,3,254)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))throw new RequestError(422,'Please enter a valid email address.');
  if(data.organization!==undefined&&!text(data.organization,0,120))throw new RequestError(422,'Please keep the organization name under 120 characters.');
  if(data.phone!==undefined&&(!text(data.phone,0,40)||!/^[+0-9() .-]*$/.test(data.phone)))throw new RequestError(422,'Please enter a valid phone number or leave it empty.');
  if(!['demo','pricing','support','other'].includes(data.enquiry))throw new RequestError(422,'Please choose a reason for your enquiry.');
  if(!['none','starter','operations','growth','custom'].includes(data.plan))throw new RequestError(422,'Please choose one of the listed plans.');
  if(!text(data.message,20,3000))throw new RequestError(422,'Please write a message between 20 and 3,000 characters.');
  return {name:data.name.trim(),email:data.email.trim(),organization:(data.organization||'').trim(),phone:(data.phone||'').trim(),enquiry:data.enquiry,plan:data.plan,message:data.message.trim(),consent:true};
 }
 if(!Object.hasOwn(roles,data.role))throw new RequestError(422,'Please choose your perspective.');
 if(!Number.isInteger(data.rating)||data.rating<1||data.rating>5)throw new RequestError(422,'Please select a rating from 1 to 5.');
 if(!text(data.feedback,20,1500))throw new RequestError(422,'Please write feedback between 20 and 1,500 characters.');
 if(data.publishConsent!==undefined&&typeof data.publishConsent!=='boolean')throw new RequestError(422,'Please confirm your publication preference.');
 return {name:data.name.trim(),role:roles[data.role],rating:data.rating,feedback:data.feedback.trim(),consent:true,publishConsent:data.publishConsent===true};
}

export function createWebsiteServer({publicDir=path.join(ROOT,'public'),dataDir=process.env.DATA_DIR||path.join(ROOT,'var'),origin=process.env.SITE_ORIGIN,rateLimit=10}={}){
 const counters=new Map();
 const reply=(response,status,data)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});response.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/api/feedback'&&req.method==='GET'){
    let records=[];try{records=JSON.parse(await fs.readFile(path.join(dataDir,'published-feedback.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    return reply(res,200,records.map(item=>({firstName:item.firstName,role:item.role,rating:item.rating,feedback:item.feedback})));
   }
   if(['/api/contact','/api/feedback'].includes(pathname)&&req.method==='POST'){
    const expected=origin||`http://${req.headers.host}`;
    if((req.headers.origin&&req.headers.origin!==expected)||req.headers['sec-fetch-site']==='cross-site')throw new RequestError(403,'Please submit this form from the CareSys website.');
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw new RequestError(415,'Please enable JavaScript and submit the website form.');
    const now=Date.now(),key=`${req.socket.remoteAddress}:${pathname}`;
    if(counters.size>2000)for(const [name,value]of counters)if(value.until<now)counters.delete(name);
    let count=counters.get(key);if(!count||count.until<now){count={until:now+15*60*1000,count:0};counters.set(key,count);}
    if(++count.count>rateLimit){res.setHeader('Retry-After',String(Math.ceil((count.until-now)/1000)));throw new RequestError(429,'Too many requests. Please wait before trying again.');}
    const chunks=[];let received=0;for await(const chunk of req){received+=chunk.length;if(received>10000)throw new RequestError(413,'The form is too large. Please shorten your message.');chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
    let data;try{data=JSON.parse(body);}catch{throw new RequestError(400,'The form could not be read. Please try again.');}
    const kind=pathname.endsWith('contact')?'contact':'feedback';const clean=validateSubmission(kind,data);
    const record={id:randomUUID(),createdAt:new Date().toISOString(),...clean};
    await fs.mkdir(dataDir,{recursive:true,mode:0o700});await fs.appendFile(path.join(dataDir,kind+'.jsonl'),JSON.stringify(record)+'\n',{mode:0o600});
    return reply(res,201,{received:true,reference:record.id.slice(0,8)});
   }
   if(pathname.startsWith('/api/'))throw new RequestError(404,'This website endpoint is not available.');
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');throw new RequestError(405,'Method not allowed.');}
   let decoded;try{decoded=decodeURIComponent(pathname);}catch{throw new RequestError(400,'Invalid path.');}
   if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(part=>part.startsWith('.')))throw new RequestError(404,'Page not found.');
   const relative=decoded==='/'?'index.html':decoded.slice(1);const filename=path.resolve(publicDir,relative);
   if(!filename.startsWith(path.resolve(publicDir)+path.sep))throw new RequestError(404,'Page not found.');
   let stat;try{stat=await fs.stat(filename);}catch{throw new RequestError(404,'Page not found.');}
   if(!stat.isFile())throw new RequestError(404,'Page not found.');
   const mime=MIME[path.extname(filename)]||'application/octet-stream';res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes');
   res.setHeader('Cache-Control',mime.startsWith('text/html')?'no-cache':'public, max-age=3600');
   let start=0,end=stat.size-1,status=200;
   if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.setHeader('Content-Range',`bytes */${stat.size}`);throw new RequestError(416,'Requested range is not available.');}
    if(!match[1]){const suffix=Number(match[2]);if(suffix<=0)throw new RequestError(416,'Requested range is not available.');start=Math.max(0,stat.size-suffix);}else{start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
    if(start>end||start>=stat.size){res.setHeader('Content-Range',`bytes */${stat.size}`);throw new RequestError(416,'Requested range is not available.');}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
   }
   res.setHeader('Content-Length',stat.size===0?0:end-start+1);res.writeHead(status);if(req.method==='HEAD'||stat.size===0)return res.end();
   const stream=createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){if(res.headersSent){res.destroy();return;}res.removeHeader('Content-Length');if(error instanceof RequestError)return reply(res,error.status,{error:error.message});console.error('Website request failed:',error.code||error.name);return reply(res,500,{error:'We could not complete that request. Please try again later.'});}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const port=Number(process.env.PORT||8090),host=process.env.HOST||'127.0.0.1';const server=createWebsiteServer();server.listen(port,host,()=>console.log(`CareSys website: http://localhost:${port}\nWebsite-only inbox: ${process.env.DATA_DIR||path.join(ROOT,'var')}\nNo application database or session access.`));}
