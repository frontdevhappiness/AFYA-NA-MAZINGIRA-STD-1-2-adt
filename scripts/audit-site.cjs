// Dependency audit for the standalone ADT website. Does not delete files.
// Run: node scripts/audit-site.cjs [--report <absolute-json-path>]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const files = [];
function walk(dir = '') {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (item.name === '.git') continue;
    assert(!item.isSymbolicLink(), `Review symbolic link before cleanup: ${dir}/${item.name}`);
    const file = path.posix.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk();
const inventory = new Set(files);
const used = new Set();
const reasons = {};
const missing = [];
const links = [];
const queue = [];
function use(file, from) {
  if (!inventory.has(file)) { missing.push({ from, file }); return; }
  (reasons[file] ??= []).push(from);
  if (used.has(file)) return;
  used.add(file);
  queue.push(file);
}
function ref(value, source, base = path.posix.dirname(source)) {
  value = value.trim().replace(/&amp;/g, '&');
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value) || value.includes('${')) return;
  const [pathname, fragment] = value.split('?')[0].split('#');
  if (!pathname) return;
  const file = path.posix.normalize(path.posix.join(base, decodeURIComponent(pathname)));
  if (file.startsWith('../') || path.posix.isAbsolute(file)) return;
  links.push({ from: source, file, fragment });
  use(file, source);
}
function scan(source, text, base) {
  if (source.endsWith('.html')) for (const m of text.matchAll(/(?:\bsrc|\bhref|\bposter|\bdata-toc-href)\s*=\s*["']([^"']+)["']/g)) ref(m[1], source, base);
  if (/\.(?:html|css)$/.test(source)) for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) ref(m[1], source, base);
  for (const m of text.matchAll(/(?:["'`])((?:\.\.?\/|assets\/|content\/|images\/)[^\s"'`<>]+\.(?:html|css|js|json|png|jpg|jpeg|gif|svg|webp|ico|webmanifest|mp3|mp4|woff2?|ttf|otf)(?:[?#][^\s"'`<>]*)?)["'`]/g)) ref(m[1], source, base);
}

const pages = json('content/pages.json');
const config = json('assets/config.json');
use('index.html', 'website entry');
use('content/pages.json', 'runtime reading order');
use('content/toc.json', 'runtime table of contents');
use('assets/config.json', 'runtime configuration');
for (const page of pages) ref(page.href, 'content/pages.json', '.');
for (const chapter of json('content/toc.json')) ref(chapter.href, 'content/toc.json', '.');
// These resources are loaded using computed paths, not literal HTML links.
for (const lang of config.languages.available) {
  use(`assets/interface_translations/${lang}/interface_translations.json`, 'runtime localization');
  for (const name of ['texts', 'audios', 'videos', 'images', 'glossary']) use(`content/i18n/${lang}/${name}.json`, 'runtime localization');
  use(`content/i18n/${lang}/timecode/timecode_output.json`, 'runtime narration timing');
  for (const file of Object.values(json(`content/i18n/${lang}/audios.json`))) use(`content/i18n/${lang}/audio/${file}`, 'audio mapping (normal, Easy Read, image description or glossary)');
  for (const file of Object.values(json(`content/i18n/${lang}/videos.json`))) use(`content/i18n/${lang}/video/${file}`, 'sign-language mapping');
}
for (const name of ['drop', 'success', 'error', 'reset', 'validate_success']) use(`assets/sounds/${name}.mp3`, 'runtime activity feedback');
for (const file of ['favicon.ico', 'apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png', 'site.webmanifest']) use(`assets/favicon_io/${file}`, 'runtime favicon');
// Keep repository maintenance information and attribution, not just browser assets.
const support = new Set(['.gitattributes', '.gitignore', 'AGENTS.md', 'HANDOFF.md', 'README.md', 'DEPLOYMENT.md', 'imsmanifest.xml', 'assets/favicon_io/about.txt']);
for (const file of files) if (support.has(file) || file.startsWith('scripts/')) { used.add(file); reasons[file] = ['repository maintenance / attribution']; }

while (queue.length) {
  const file = queue.shift();
  // Generated caches and packaging lists must NOT make dead source files live.
  if (file === 'assets/offline-preloader.js' || file === 'imsmanifest.xml') continue;
  if (/\.(?:html|css|js|json|webmanifest)$/.test(file)) {
    const text = read(file);
    scan(file, text, file.endsWith('.js') ? '.' : undefined);
    if (file.endsWith('.webmanifest')) for (const icon of JSON.parse(text).icons ?? []) ref(icon.src, file);
  }
}
const unused = files.filter(file => !used.has(file)).map(file => ({file, bytes:fs.statSync(path.join(root, file)).size}));
const groups = {};
for (const entry of unused) {
  const group = entry.file.startsWith('content/i18n/sw-TZ/audio/') ? 'audio' : entry.file.startsWith('content/i18n/sw-TZ/video/') ? 'video' : entry.file.split('/')[0];
  const g = groups[group] ??= {count:0, bytes:0};
  g.count++; g.bytes += entry.bytes;
}
const brokenAnchors = links.filter(link => link.fragment && inventory.has(link.file) && link.file.endsWith('.html') && !read(link.file).includes(`id="${link.fragment}"`) && !read(link.file).includes(`id='${link.fragment}'`));
const report = {root, totalFiles:files.length, usedFiles:used.size, unused, groups, missing:[...new Map(missing.map(m=>[m.from+'|'+m.file,m])).values()], brokenAnchors, reasons};
const reportIndex = process.argv.indexOf('--report');
if (require.main === module && reportIndex >= 0) fs.writeFileSync(process.argv[reportIndex + 1], JSON.stringify(report, null, 2) + '\n');
if (require.main === module) console.log(JSON.stringify({totalFiles:report.totalFiles,usedFiles:report.usedFiles,unusedFiles:unused.length,groups,missing:report.missing,brokenAnchors},null,2));
if (require.main === module && process.argv.includes('--check')) {
  assert.equal(report.missing.length, 0, 'No broken local dependencies');
  assert.equal(brokenAnchors.length, 0, 'No broken local anchors');
  assert.equal(unused.length, 0, 'No unused files');
}
module.exports = report;
