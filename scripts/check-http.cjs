// Check every deployed resource without downloading entire media files.
// Run after starting the static server: node scripts/check-http.cjs [base-url]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:5500/');
const files = [...fs.readFileSync(path.join(root, 'imsmanifest.xml'), 'utf8').matchAll(/<file href="([^"]+)"\s*\/>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
const failures = [];
let next = 0;
let checked = 0;
async function worker() {
  while (next < files.length) {
    const file = files[next++];
    try {
      const response = await fetch(new URL(file, base), {method:'HEAD',signal:AbortSignal.timeout(15000)});
      const length = Number(response.headers.get('content-length'));
      const expected = fs.statSync(path.join(root, file)).size;
      if (!response.ok || (length && length !== expected)) failures.push({file,status:response.status,length,expected});
    } catch (error) { failures.push({file,error:error.message}); }
    checked++;
  }
}
Promise.all(Array.from({length:12},worker)).then(()=>{
  console.log(JSON.stringify({base:base.href,checked,failures},null,2));
  assert.equal(failures.length,0,'All deployment files must be served successfully');
}).catch(error=>{console.error(error);process.exitCode=1;});
