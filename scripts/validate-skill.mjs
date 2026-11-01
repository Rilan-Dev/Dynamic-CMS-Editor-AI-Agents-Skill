import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = p => { const f=resolve(root,p); if(!existsSync(f)){errors.push('Missing '+p);return '';} return readFileSync(f,'utf8'); };
const skill=read('SKILL.md');
const playbook=read('WEBSITE_MIGRATION_PLAYBOOK.md');
const contract=read('MIGRATION_ACCEPTANCE_CONTRACT.md');
const fixture=read('fixtures/migration-example.json');
if(!/^---\s*\nname:\s*[^\n]+\ndescription:/m.test(skill)) errors.push('SKILL.md needs valid name/description frontmatter');
if(!skill.includes('WEBSITE_MIGRATION_PLAYBOOK.md')) errors.push('Skill entrypoint must reference migration playbook');
for(const [label,source,terms] of [
 ['playbook',playbook,['Phase 0','Phase 1','Phase 2','Phase 3','Phase 4','UI','rollback','authorization','screenshots']],
 ['acceptance',contract,['visual','security','coverage','rollback','unverified']]
]) for(const term of terms) if(!source.toLowerCase().includes(term.toLowerCase())) errors.push(label+' missing '+term);
try {
 const data=JSON.parse(fixture);
 for(const k of ['target','routes','contentFields','baseline','acceptance']) if(!(k in data)) errors.push('fixture missing '+k);
 if(!Array.isArray(data.routes)||!data.routes.length) errors.push('fixture routes empty');
 if(!Array.isArray(data.contentFields)||!data.contentFields.length) errors.push('fixture fields empty');
 for(const f of data.contentFields||[]) for(const k of ['route','source','cmsPath','kind','verification']) if(!f[k]) errors.push('fixture field missing '+k);
} catch(e){errors.push('Invalid fixture JSON: '+e.message);}
if(errors.length){console.error(errors.map(e=>'FAIL: '+e).join('\n'));process.exitCode=1;}
else console.log('PASS: CMS migration skill structure and example contract');
