import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cases=[
 ['nextjs','server','cache'],
 ['react-vite','VITE_','backend'],
 ['vue-nuxt','Nuxt','hydration'],
 ['angular','Angular','authorization'],
 ['static-html','static','backend']
];
for(const [name,a,b] of cases) test(name+' adapter requires framework-specific safety',()=>{
 const doc=read('frameworks/'+name+'.md');
 assert.match(doc,new RegExp(a,'i'));
 assert.match(doc,new RegExp(b,'i'));
 assert.match(doc,/preserve/i);
});
test('migration playbook requires visual verification and rollback',()=>{
 const doc=read('WEBSITE_MIGRATION_PLAYBOOK.md');
 assert.match(doc,/screenshots/i);
 assert.match(doc,/rollback/i);
 assert.match(doc,/authorization/i);
});
test('SMTS audit marks untested claims',()=>assert.match(read('SMTS_REFERENCE_AUDIT.md'),/Not yet verified/));
