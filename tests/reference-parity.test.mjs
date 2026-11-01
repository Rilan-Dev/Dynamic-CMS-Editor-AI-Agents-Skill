import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("pinned SMTS reference matches 288 source blobs",()=>{
 const run=spawnSync(process.execPath,[new URL("../scripts/check-source-parity.mjs",import.meta.url).pathname],{encoding:"utf8"});
 assert.equal(run.status,0,run.stdout+"\n"+run.stderr);
 const manifest=JSON.parse(read("reference/SMTS_UAT_MANIFEST.json"));
 assert.equal(manifest.files.length,288);
 for(const path of ["reference/cms/GlobalEditToolbar.tsx","reference/cms/ClickBlocker.tsx","reference/cms/store.ts","reference/cms/CmsHistoryCompareRestore.tsx","reference/server/cmsRestore.ts","reference/server/cmsRelease.ts","reference/theme/siteTheme.ts","reference/db/migrations/202610280003_cms_restore_revision.sql"]){
  assert.ok(manifest.files.some(x=>x.path===path),path);
 }
});
test("current skill documents UAT mode, release, and migration constraints",()=>{
 const skill=read("SKILL.md"),audit=read("SMTS_REFERENCE_AUDIT.md");
 assert.match(skill,/draft.*preview.*published/s);
 assert.match(skill,/api\/cms\/releases/);
 assert.match(skill,/\?edit=1/);
 assert.match(skill,/not a standalone installable npm package/i);
 assert.match(audit,/Not yet verified/);
 assert.match(read("IN_PAGE_EDITOR_INTEGRATION.md"),/ClickBlocker/);
});
