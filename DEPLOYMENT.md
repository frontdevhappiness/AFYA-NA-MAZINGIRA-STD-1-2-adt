# Local release readiness — 2026-09-11

Release version: `4-clean-release-20260911`.

## Scope and status

Prepared and verified locally. No remote publication or push was performed.
No SCORM/export directory or ZIP/archive was generated. The pre-existing
`imsmanifest.xml` was refreshed in place; the existing LMS adapter was retained.

## Cleanup

Removed 468 confirmed-unused files (42,137,532 bytes, approximately 40.2 MiB):

- 424 superseded/unmapped audio files.
- Four superseded video segments.
- Thirteen unreachable HTML pages: eleven standalone generated quizzes and two
  old redirects for sections already combined into live pages.
- Sixteen unused runtime/source-map/style/helper/symbol/sound files.
- Eight unused images, an unused cover image, and two obsolete navigation/import files.

All removed files were tracked and remain recoverable from Git history. The
user's replacement videos and their current mappings were retained. The 102 live
pages' main content, their order, text/audio/video mappings, narration timecodes,
and contents-page references were checked against a pre-cleanup SHA-256 snapshot.
Mapped recordings, including variants and dynamically requested resources, remain
available. Attribution, fonts, active libraries, and maintenance documentation
are retained intentionally.

## Checks completed

- Dependency audit: no broken local references or unreferenced website files.
- Release verification: 102 pages, 102 video mappings, 2,529 audio mappings,
  112 current offline entries, and 2,737 manifest resources.
- HTTP checks: all 2,737 resources served successfully by the local server.
- Browser traversal of every page at desktop size and 375 × 812 mobile size:
  sequential navigation, visible content, all page images loaded, all 102 videos
  reached ready state 4 without media errors, and players remained within the viewport.
- Short landscape (568 × 260): video repositions within the viewport after resize.
- Smoke tests: cover video close/reopen, read-aloud controls, glossary (116 entries),
  Easy Read on/off, mobile accessibility drawer, and live exercise submission/feedback.
- Test selection and Easy Read were returned to their previous states; temporary
  viewport overrides were cleared.
- JavaScript syntax, inline scripts, JSON parsing, offline/source equality, manifest
  uniqueness, and Git whitespace checks passed.

These are local checks, not CI results or a production deployment. No external
hosting target, credentials, or production monitoring were used.

## Existing observations outside cleanup scope

- The contents-page text and recordings still speak the earlier page references,
  as expressly requested when website numbering was changed.
- Two settings-section headings still display untranslated interface keys.
  This cleanup preserves interface translations and does not change their wording.
- The contents data includes two entries for the merged `pg042_sec002` page with
  different anchors. Its links work, but the shared reader can warn about duplicate
  React keys when that contents drawer is rendered. This predates cleanup.

## Recovery and publication gate

Keep the local release commit before copying files to any authorized host. If
navigation, media loading, narration, or exercise feedback fails on that host,
stop publication and restore the previous known-good release through a reviewed
Git revert or restore the specific removed file from prior history. Do not use a
destructive reset, discard the replacement videos, or rewrite shared history.

Publication, push, and package generation require a separate instruction.
