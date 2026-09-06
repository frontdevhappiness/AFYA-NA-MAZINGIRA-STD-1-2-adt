# AFYA NA MAZINGIRA STD 1 — Work Handoff

Updated: 2026-08-09

## Purpose

Continue correcting and visually refining the Swahili ADT book without losing the accessibility, narration, highlighting, activity, or navigation behavior already implemented.

## Start Here

Open this directory as the actual Codex/VS Code workspace before starting a new chat:

`/home/echad/Documents/AFYA-NA-MAZINGIRA-STD-1-2-adt`

Then read these files before editing:

1. `AGENTS.md` — ADT structure and editing rules.
2. `HANDOFF.md` — current work and user preferences.
3. The applicable validation report listed below.
4. The original PDF or corresponding rendered page image before making layout decisions.

## Reference Files

- Original source PDF: `/home/echad/Documents/adtbooks/AFYA NA MAZINGIRA STD 1.pdf`
- First validation report: `/home/echad/Downloads/AFYA NA MAZINGIRA DRS LA KWANZA.docx`
- New correction report: `/home/echad/Downloads/AFYA NA MAZINGIRA STD 1-MABORESHO.docx`
- Sassoon font supplied by the user: `/home/echad/Downloads/sassoon-primary-std-regular/Sassoon Primary Std Regular/Sassoon Primary Std Regular.otf`
- Original page renders, when present: `images/pgNNN_page.png`

## Git State

- Branch: `main`
- Baseline commit: `241ae36 Complete ADT validation accessibility and narration fixes`
- The working tree currently contains important uncommitted work. Do not reset, discard, or overwrite it.
- Review with `git status --short` and `git diff --check` before and after each change.
- Current uncommitted work includes font/layout styling, new UI image assets, page fixes, narration files, timecodes, text/audio mappings, and the offline preloader.

## User's Preferred Workflow

- Follow the validation report literally unless the user gives a specific correction.
- Work one report issue or clearly related page group at a time.
- State the page, section, and exact issue being fixed before the user tests it.
- Let the user review in the browser and say `done` before marking the item complete or moving on.
- Do not jump over details in maps, images, tables, captions, numbers, letters, or report wording.
- Preserve all previously accepted fixes.
- Do not change Geography project files while working on AFYA.

## Accessibility and Narration Rules

- Preserve the relationship between HTML `data-id`, `texts.json`, `audios.json`, the MP3, and timecodes.
- When text changes, update the inline HTML fallback and `content/i18n/sw-TZ/texts.json`.
- When narration changes, update the MP3, `audios.json`, and `content/i18n/sw-TZ/timecode/timecode_output.json`.
- Refresh the affected entries embedded in `assets/offline-preloader.js` after changing HTML or localization JSON. Otherwise the browser can load stale embedded content.
- Use a new audio filename when replacing cached audio, and use a versioned `offline-preloader.js?v=...` URL on the affected page if needed.
- Do not add duplicate visible narration merely to make content readable. Existing visible text/table content should be highlighted and read in place.
- Avoid duplicate narration between an image alt description and a nearby visible caption. Make decorative or duplicate images presentational with `alt=""`, `role="presentation"`, and `aria-hidden="true"`.
- Swahili numbers and letters must be pronounced naturally in Swahili. Watch especially `nne`, `mbili`, `mbu`, `nzi`, and letter names.
- Use `kipengele` before lettered items when the user requests it.
- For images, generally start descriptions with `Picha ya ...`, unless the report or user specifies exact wording.
- Do not add unnecessary descriptive details beyond report requirements.
- Tables must remain real, accessible tables. Where a table description is required, use accessible hidden text/alt narration without creating a duplicate visible table. Preserve word-by-word highlighting for the actual table content.
- Keep the accessibility controls and bottom navigation functional.

## Layout and Font Rules

- The user supplied and approved Sassoon Primary Std Regular for the book. The local copy is `assets/fonts/SassoonPrimaryStd-Regular.otf` and related rules are in `assets/fonts.css`.
- Keep body text sizes consistent and suitable for young learners. Do not mix arbitrary oversized and undersized body text.
- Match the source PDF design where practical, while retaining responsive HTML and accessibility behavior.
- Do not convert readable text into an image.
- Decorative frame images must use transparent backgrounds, be presentational, and must not receive TTS IDs.
- Do not let decorative outer-page elements cover text, images, captions, or the bottom reader controls.
- Do not edit compiled/minified runtime files or `content/tailwind_output.css` directly.

## Current New-Report Corrections

### Page 1 — Cover and Certificate

- Duplicate narration from the title image and certificate image was removed.
- The images in `index.html` are now presentational; the existing hidden text remains the reading source.
- Page 1 Swahili number narration audio was corrected.

### Page 4 — Credits Narration (Awaiting Review)

- The visible “FOR ONLINE READING ONLY” watermark no longer has a narration target.
- Normal and Easy Read recordings for `pg004_n0005`, `pg004_n0012`, `pg004_n0022`, `pg004_n0027`, and `pg004_n0032` were regenerated on 2026-09-06.
- Narration expands `Bw.` to “Bwana” and pronounces `DUCE` as “Dyuse”; printed abbreviations remain unchanged.
- Seven versioned MP3 files serve the ten narration entries, with matching word timestamps and refreshed offline mappings.
- Awaiting the user’s listening review, including confirmation of the intended `DUCE` pronunciation.

### Page 6 — Remove Unwanted “Namba ...” Narration

Report requirement: remove the unwanted phrase about the class numbers being written in Roman numerals after the first introduction paragraph.

Current implementation:

- The visible first paragraph uses the new ID `pg006_n0024`; the old `pg006_n0004` ID is no longer attached to page HTML.
- Normal audio mapping: `pg006_n0024` → `pg006_n0024_clean_end_v3.mp3`.
- Easy Read mapping: `pg006_n0024_easy_read` → `pg006_n0004_easy_read_corrected.mp3`.
- The normal clip was shortened at the silent boundary to remove the faint beginning of “namba” after “Teknolojia”.
- Final `Teknolojia` timecode ends at `17.52` seconds.
- `pg006_sec001.html` currently loads `offline-preloader.js?v=pg006-clean-end-v3-highlight-20260809`.
- The offline preloader contains the new HTML, mapping, and timecode.
- A Page 6 highlight override in `assets/fonts.css` removes transition and box-model changes that caused the active word to shake.
- The user confirmed both the narration ending and stable highlighting on 2026-08-09. Page 6 is complete.

### Page 8 — Tooth-Brushing Image

- Duplicate narration for “Mtoto anaweka dawa ya meno kwenye mswaki” was removed by making `pg008_im003` presentational.
- The visible caption `pg008_n0007` remains the narration/highlight source.
- Page-specific bottom spacing was added in `assets/fonts.css` so the final caption is not covered by the decorative/footer area.
- The cat description `pg008_im002` was moved to accessible hidden text so normal Read Aloud includes it exactly once without enabling duplicate image narration.
- Page 8 now uses PDF-matched image limits and a narrower composition on desktop, with a responsive mobile layout.
- The lesson heading has stable spacing in both plain-text and retained word-span states after the full narration playlist finishes.
- The user confirmed Page 8 narration and layout corrections on 2026-08-09. Page 8 is complete.

### Page 10, Section 1 — Swahili Question Numbers

- Question 1 uses `pg010_n0004_moja.mp3` and begins with “moja” before “Taja vifaa...”.
- Question 2 uses `pg010_n0005_mbili_v2.mp3` and begins with “mbili” before “Kwa nini...”.
- Normal and Easy Read use the same corrected clips and aligned timecodes.
- The user confirmed both pronunciations on 2026-08-09. Page 10, Section 1 is complete.

### Page 10, Section 2 — Removed Instruction and Narration Fixes

- The unwanted instruction “Chagua picha zote za vifaa unavyotumia kusafisha uso wako.” was removed from the page, localization data, audio mapping, timecodes, and offline cache.
- The six selectable image choices remain functional and retain individual Swahili accessibility labels.
- The cat image is presentational, while an adjacent hidden `pg010_im002` element supplies its description exactly once during normal Read Aloud.
- The orange lesson heading has page-scoped word spacing that remains stable after TTS wraps and restores its words.
- The user confirmed the complete Page 10, Section 2 correction on 2026-08-09.

### Page 12, Section 2 — Cat Narration and Heading Spacing

- The cat image is presentational, while an adjacent hidden `pg012_im002` element supplies its description exactly once during normal Read Aloud.
- The orange lesson heading `pg012_n0008` has page-scoped spacing for both plain text and retained TTS word spans.
- The offline page entry was refreshed and cache-busted with `pg012-sec002-v2-20260809`.
- The user confirmed both corrections on 2026-08-09. Page 12, Section 2 is complete.

### Page 13, Section 1 — Repeated Picture Narration

- All five image elements are presentational; the existing five hidden caption IDs remain the single narration sources in visual order.
- The offline page entry was refreshed and cache-busted with `pg013-audio-v2-20260809`.
- Automated checks found five caption narration IDs and no attached image narration IDs.
- The user confirmed that each picture is narrated once on 2026-08-09. Page 13, Section 1 is complete.

### Page 12, Section 1 — Added Picture Sentences

- The three object sentences now end with “Picha ya kitambaa/beseni/kopo imeoneshwa,” as required by the correction report.
- New Tanzanian Swahili recordings use the configured `gpt-4o-mini-tts` `coral` voice and have matching Whisper word timestamps.
- Normal and Easy Read map to the corrected `pg012_n0002_report_v2.mp3`, `pg012_n0004_report_v2.mp3`, and `pg012_n0006_report_v2.mp3` clips.
- The three pictures are presentational so their old image descriptions do not repeat the new sentence narration.
- Responsive bottom clearance keeps the final picture and pink frame above the decorative footer.
- The offline page/data entries were refreshed and cache-busted with `pg012-content-v3-20260809`.
- The user confirmed the content, narration, and layout on 2026-08-09. Page 12, Section 1 is complete.

### Page 14, Section 2 — Corrections in Progress

- The unwanted “MAFUTA YA KUPAKA” caption was removed from both desktop and mobile markup, plus normal/Easy Read localization, audio mappings, and timecodes. Its image description remains.
- Exercise 2 now uses the report wording: “Oanisha picha ya vifaa vya kusafisha uso na matumizi yake ambayo yameoneshwa kwa njia ya picha.”
- The new instruction uses `pg014_n0013_report_v2.mp3` in normal and Easy Read modes with 16 aligned word timestamps.
- The user confirmed both the caption removal and corrected instruction on 2026-08-09.
- The answer table headings are now the confirmed plural forms “Picha za vifaa” and “Matumizi ya vifaa,” with corrected normal/Easy Read audio and timings.
- Read Aloud uses one hidden column-major sequence: the first column’s items 1–4 and equipment descriptions, followed by the second column’s A–D usage descriptions.
- The sequence announces “Jedwali lina safu mbili. Safu ya kwanza ni picha za vifaa.” and later “Safu ya pili, matumizi ya vifaa.”
- All duplicated desktop/mobile pictures are presentational; each of the eight requested descriptions has one narration target.
- The user confirmed the completed Page 14 table wording, descriptions, and read order on 2026-08-09. Page 14, Section 2 is complete.

### Page 16, Section 1 — Five-Step Narration Flow

- Each action caption is narrated first, followed by one hidden image description beginning “Imeonyeshwa picha ya…”.
- The five step images are presentational, preventing their descriptions from playing before the captions or repeating.
- New Tanzanian Swahili recordings and word timings are mapped to `pg016_im004`, `pg016_im005`, `pg016_im006`, `pg016_im007`, and `pg017_im003`.
- Responsive bottom clearance keeps the final question panel above the decorative footer.
- The offline page/data entries were refreshed and cache-busted with `pg016-layout-v3-20260809`.
- The user confirmed the narration and layout on 2026-08-09. Page 16, Section 1 is complete.

## Current Layout Pilots

These uncommitted pages use the new PDF-inspired layout system and should be preserved and reviewed rather than replaced wholesale:

- `pg042_sec002.html` — exercise panel classes and answer lines.
- `pg047_sec002.html` — activity frame using `images/ui/shughuli-frame-transparent.png`.
- `pg053_sec003.html` — exercise frame using `images/ui/zoezi-frame-transparent.png`.
- `pg055_sec002.html` — song panel and questions frame.

Current reusable assets in `images/ui/` include:

- `maswali-frame-transparent.png`
- `maswali-header-transparent.png`
- `orange-title-banner.png`
- `safety-callout-transparent.png`
- `shughuli-frame-transparent.png`
- `shughuli-header-transparent.png`
- `zoezi-frame-transparent.png`
- `zoezi-label-original.png`

These assets are decorative only. Keep their text as live HTML positioned over or inside them.

## Verification Checklist

For every edited issue:

1. Compare the page to the report and original PDF/page render.
2. Confirm the HTML contains the intended `data-id` exactly once.
3. Confirm the same ID exists in `texts.json`, `audios.json`, and timecodes when narration is expected.
4. Check that no old or duplicate narration ID remains attached to the visible page.
5. Refresh the corresponding entries inside `assets/offline-preloader.js`.
6. Run `git diff --check`.
7. Open through the ADT reader or local server, not only as a raw HTML file.
8. Test normal Read Aloud, Easy Read when applicable, highlighting, image descriptions, tables, and bottom controls.
9. Ask the user to verify before proceeding.

## Suggested Opening Message for the New Chat

> Continue the AFYA correction work using `AGENTS.md` and `HANDOFF.md`. Preserve all uncommitted changes. First verify the final page 6 narration fix, then continue the new `MABORESHO` report one issue at a time and wait for my review after each issue.
