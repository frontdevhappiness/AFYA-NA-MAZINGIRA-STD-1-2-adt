// Local release checks. Optional --baseline <path> checks preservation against an audit snapshot.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const audit = require('./audit-site.cjs');
assert.deepEqual(audit.missing, [], 'Missing local assets');
assert.deepEqual(audit.brokenAnchors, [], 'Broken links to sections');
assert.deepEqual(audit.unused, [], 'Unused files');
const pages = json('content/pages.json');
const config = json('assets/config.json');
const language = config.languages.default;
const videos = json(`content/i18n/${language}/videos.json`);
const audios = json(`content/i18n/${language}/audios.json`);
assert.equal(pages.length, 102);
assert.equal(Object.keys(videos).length, pages.length);
assert.equal(new Set(pages.map(p => p.section_id)).size, pages.length);
assert.equal(new Set(pages.map(p => p.href)).size, pages.length);
for (const [index, page] of pages.entries()) {
  const html = read(page.href);
  assert.equal(html.match(/name="title-id" content="([^"]+)"/)[1], page.section_id, page.href);
  assert.equal(Number(html.match(/name="page-section-id" content="(\d+)"/)[1]), index + 1, page.href);
  assert(videos[`video-${index + 1}`], `${page.href}: mapped video`);
  assert(html.includes(`offline-preloader.js?v=${config.bundleVersion}`), `${page.href}: stale cache version`);
  assert(!html.includes('data-cover-hidden-sign-language'), `${page.href}: hidden hand-sign control`);
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(script[1]) || /type="application\/json"/.test(script[1])) continue;
    new vm.Script(script[2], {filename:page.href});
  }
}
for (const file of Object.keys(audit.reasons)) {
  if (file.endsWith('.js')) new vm.Script(read(file), {filename:file});
  if (file.endsWith('.json')) json(file);
}
const inline = JSON.parse(read('assets/offline-preloader.js').match(/^  var INLINE = (.*);$/m)[1]);
for (const [file, value] of Object.entries(inline)) assert.deepEqual(value, file.endsWith('.json') ? json(file) : read(file), `${file}: offline payload differs`);
for (const page of pages) assert.equal(inline['./' + page.href], read(page.href));
const listed = [...read('imsmanifest.xml').matchAll(/<file href="([^"]+)"\s*\/>/g)].map(m=>m[1].replace(/&amp;/g, '&'));
assert.equal(new Set(listed).size, listed.length, 'Duplicate manifest files');
for (const file of listed) assert(fs.existsSync(path.join(root, file)), `Missing manifest file: ${file}`);
for (const [file, why] of Object.entries(audit.reasons)) {
  if (why[0] !== 'repository maintenance / attribution') assert(listed.includes(file), `Missing from manifest: ${file}`);
}
const bi = process.argv.indexOf('--baseline');
if (bi >= 0) {
  const baseline = JSON.parse(fs.readFileSync(process.argv[bi + 1], 'utf8'));
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  for (const [file, expected] of Object.entries(baseline.hashes)) assert.equal(hash(fs.readFileSync(path.join(root,file))), expected, `${file}: mappings/content changed`);
  for (const [file, expected] of Object.entries(baseline.contentHashes)) assert.equal(hash(read(file).match(/<main\b[\s\S]*?<\/main>/)[0]), expected, `${file}: narration/layout changed`);
}
console.log(JSON.stringify({result:'PASS',pages:pages.length,videos:Object.keys(videos).length,audioMappings:Object.keys(audios).length,offlineEntries:Object.keys(inline).length,manifestFiles:listed.length,unusedFiles:audit.unused.length,brokenReferences:audit.missing.length},null,2));
