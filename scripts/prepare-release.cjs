// Refresh this static website IN PLACE. Never creates archives or export folders.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, data) => fs.writeFileSync(path.join(root, file), data);
const pages = JSON.parse(read('content/pages.json'));
const version = JSON.parse(read('assets/config.json')).bundleVersion;
assert(/^[a-zA-Z0-9.-]+$/.test(version), 'A safe release version is required');
for (const {href} of pages) {
  let html = read(href);
  const main = html.match(/<main\b[\s\S]*?<\/main>/);
  assert(main, `${href}: expected reading content`);
  html = html.replace(/(\b(?:src|href)=["']\.\/assets\/[^"'?]+\.(?:js|css))(?:\?[^"']*)?(["'])/g, `$1?v=${version}$2`);
  html = html.replace(/[ \t]+$/gm, '');
  html = html.replace(/<main\b[\s\S]*?<\/main>/, () => main[0]);
  write(href, html);
}
const audit = require('./audit-site.cjs');
assert.equal(audit.missing.length, 0, 'Resolve missing dependencies before preparing release');
assert.equal(audit.unused.length, 0, 'Review unused files before preparing release');
const offline = 'assets/offline-preloader.js';
const source = read(offline);
const match = source.match(/^  var INLINE = (.*);$/m);
assert(match, 'Expected offline preloader format');
const inline = {};
// Embed current page and JSON sources, never stale exported page snapshots.
for (const file of Object.keys(audit.reasons).sort()) {
  if (!/\.(?:html|json)$/.test(file) || file.startsWith('scripts/')) continue;
  const content = read(file);
  inline['./' + file] = file.endsWith('.json') ? JSON.parse(content) : content;
}
write(offline, source.replace(match[0], '  var INLINE = ' + JSON.stringify(inline) + ';'));
// Update the pre-existing manifest only; do not build a SCORM package.
const manifest = 'imsmanifest.xml';
const originalManifest = read(manifest);
const deployFiles = Object.keys(audit.reasons).filter(file => !file.startsWith('scripts/') && !/^(?:\.|AGENTS\.md$|HANDOFF\.md$|README\.md$|DEPLOYMENT\.md$|imsmanifest\.xml$)/.test(file)).sort();
const lines = deployFiles.map(file => `      <file href="${file.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>`).join('\n');
assert(/\s*<file\b[^>]*\/>(?:\s*<file\b[^>]*\/>)*\s*/.test(originalManifest));
write(manifest, originalManifest.replace(/\s*<file\b[^>]*\/>(?:\s*<file\b[^>]*\/>)*\s*/, '\n' + lines + '\n    '));
console.log(`Prepared ${pages.length} pages, ${Object.keys(inline).length} offline entries, and ${deployFiles.length} manifest resources. No export folders or archives created.`);
