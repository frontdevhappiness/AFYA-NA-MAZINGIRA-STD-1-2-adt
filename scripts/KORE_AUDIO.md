# Kore narration

From the workspace terminal, run:

```bash
python3 scripts/generate_kore_audio.py --limit 3
```

If no `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable is available,
the script prompts privately for the key. It never saves it. Python 3 and
ffmpeg are required; no extra Python packages are needed. Generation sends
the narration text to Google's Gemini API and uses the account's quota.

With Live Server running on port 5500, open the printed preview address to
listen in the browser. Phone digits are expanded to Swahili words; the plus
sign is spoken as “jumlisha”. Displayed textbook content is unchanged.

To generate the remaining clips after checking the samples:

```bash
python3 scripts/generate_kore_audio.py --all
```

Completed clips are checked against saved hashes and reused. Different text
never shares an output clip. Updated text or narration instructions produces
new clip identities. `--interval` sets seconds between requests (default 6).
Temporary server errors retry, and Ctrl+C stops the run. Interrupted API
requests may consume quota even if a clip was not saved. Run only one batch
at a time. Use `--dry-run` to audit without API access or writes.

All results, transcripts, and the proposed audio mapping are staged in
`.kore-tts/gemini-3.1-flash-tts-preview/`. MP3 decoding is checked; exact speech
and pronunciation still need listening review.

The script does not install audio. Before installation, regenerate and check
word timestamps against the new recordings. Do not reuse or merely scale old
timestamps. Back up affected reader files, install new audio and mapping,
update `timecode/timecode_output.json`, refresh embedded data in
`assets/offline-preloader.js`, and change its cache version references.
Test read-aloud and highlighting, quizzes, glossary, image descriptions, and
offline loading. No runtime or book files have been changed by this setup.

API reference: https://ai.google.dev/gemini-api/docs/generate-content/speech-generation

## Word timing and installation

The local environment `.kore-tts/alignment-env` contains stable-ts and its
Whisper alignment backends. Audio alignment uses existing recordings and
transcripts; no Gemini key is needed. Downloaded model files stay in `.kore-tts`.

```bash
.kore-tts/alignment-env/bin/python scripts/align_kore_audio.py --backend faster
python3 scripts/install_kore_audio.py --check
python3 scripts/install_kore_audio.py
```

Alignment is resumable. Word positions are mapped back to the printed text,
including telephone groups and expanded labels. Clips with missing words,
zero-duration words, or overlapping timings are left for review. The installer
refuses to proceed if any clip lacks validated timings or if the reader's text
has changed since generation. Alignment results are automatic measurements
and should be spot-checked by listening with highlighting enabled.

Installation backs up the original audio, mappings, timings, page files,
configuration, offline cache and manifest under `.kore-tts/reader-backup-*`.
It refreshes the offline cache and runs the repository release checks. If these
fail, it restores the backed-up reader files and original audio. The audit
excludes local model/staging/backup directories from the deployable website.
