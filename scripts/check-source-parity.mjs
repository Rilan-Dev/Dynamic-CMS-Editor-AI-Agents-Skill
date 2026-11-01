#!/usr/bin/env node
import {readFileSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest=JSON.parse(readFileSync(resolve(root,"reference/SMTS_UAT_MANIFEST.json"),"utf8"));
const errors=[];
if(manifest.schemaVersion!==1 || manifest.files.length!==288)errors.push("Unexpected CMS source manifest scope");
const seen=new Set();
for(const entry of manifest.files){
  if(!entry.path.startsWith("reference/")||entry.path.includes("..")){errors.push("Unsafe path "+entry.path);continue;}
  if(seen.has(entry.path))errors.push("Duplicate "+entry.path);
  seen.add(entry.path);
  const absolute=resolve(root,entry.path);
  if(!existsSync(absolute)){errors.push("Missing "+entry.path);continue;}
  const bytes=readFileSync(absolute);
  const gitBlobHash=createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
  if(gitBlobHash!==entry.gitBlobSha)errors.push("Source blob changed: "+entry.path);
  if(bytes.length!==entry.bytes)errors.push("Size changed: "+entry.path);
}
if(errors.length){for(const problem of errors)console.error("FAIL:",problem);process.exitCode=1;}
else console.log("PASS:",manifest.files.length,"exact reference blobs:",manifest.source.commit);
if(process.argv.includes("--remote")){
  try{
    const headers={"Accept":"application/vnd.github+json","User-Agent":"dynamic-cms-skill-parity"};
    if(process.env.GITHUB_TOKEN)headers.Authorization="Bearer "+process.env.GITHUB_TOKEN;
    const res=await fetch("https://api.github.com/repos/"+manifest.source.repository+"/branches/"+manifest.source.branch,{headers});
    if(!res.ok)throw Error("Branch check HTTP "+res.status);
    const upstream=await res.json();
    if(upstream.commit?.sha!==manifest.source.commit){
      console.error("DRIFT: UAT now at",upstream.commit?.sha,"but pinned at",manifest.source.commit,". Review and resync via separate branch.");
      process.exitCode=1;
    }else console.log("PASS: remote UAT still matches pinned source");
  }catch(error){console.error("REMOTE UNVERIFIED:",error instanceof Error?error.message:String(error));process.exitCode=1;}
}
