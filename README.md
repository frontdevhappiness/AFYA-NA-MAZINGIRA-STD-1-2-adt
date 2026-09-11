# Afya na Mazingira — Standard 1 reader

This repository is the standalone website root. Open `index.html` through a
static HTTP server; the existing development server uses `http://127.0.0.1:5500`.
There is no package installation or build dependency. Maintenance scripts use Node.js.

## Page and media identity

- `content/pages.json` defines the 102-page reading order, including both covers.
- Each page's `page-section-id` is its website number (1–102).
- `title-id`, section IDs, text IDs, filenames, and printed page references are
  stable content identities, not website numbers. Do not renumber them.
- `content/i18n/sw-TZ/videos.json` maps `video-N` to the clip for website page N.
- Audio mappings include normal narration, Easy Read, image descriptions,
  activity feedback, and glossary resources. Preserve these mappings and their
  recordings when making layout or numbering changes.
- The contents-page text and recorded page references remain unchanged by
  explicit user instruction.

## Release checks

Run from this directory:

```powershell
node scripts/audit-site.cjs --check
node scripts/prepare-release.cjs
node scripts/verify-release.cjs
node scripts/check-http.cjs http://127.0.0.1:5500/
git diff --check
```

`audit-site.cjs` traces the live pages, HTML/CSS/JS references, localization and
media dictionaries, dynamic runtime resources, fonts, icons, and activity sounds.
It reports unused files but never deletes them. It intentionally excludes the
generated offline cache and packaging lists as dependency roots, so stale exports
cannot keep obsolete pages or media alive. Keep attribution and repository
maintenance files even though the browser does not request them.

`prepare-release.cjs` updates versioned asset links, rebuilds the offline payload
from current sources, and refreshes the existing `imsmanifest.xml` in place. Set a
new `bundleVersion` in `assets/config.json` before preparing a changed release.
JSON remains structured data inside the offline payload, not JSON-encoded strings.

`verify-release.cjs` checks page identity, numbering, mappings, JS syntax, local
links, manifest completeness, and offline-cache consistency. `check-http.cjs`
checks that every deployment resource is served by the specified running server.

No script publishes the site or creates SCORM folders, export folders, ZIP files,
or other archives. Deploy the website files listed in the existing manifest when
publication is authorized; exclude `.git`, maintenance scripts, and internal notes.
See `DEPLOYMENT.md` for the current release verification and recovery notes.
