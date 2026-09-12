#!/usr/bin/env python3
"""Install validated Kore recordings and measured word timings, with rollback."""
import datetime
import hashlib
import json
import re
from pathlib import Path
import shutil
import subprocess
import sys

from align_kore_audio import tokens

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / '.kore-tts/gemini-3.1-flash-tts-preview'


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    jobs, completed = read(STAGE / 'transcripts.json'), read(STAGE / 'completed.json')
    mapping = read(STAGE / 'audios.proposed.json')
    texts = read(ROOT / 'content/i18n/sw-TZ/texts.json')
    active_mapping = read(ROOT / 'content/i18n/sw-TZ/audios.json')
    if set(mapping) != set(active_mapping):
        raise ValueError('Reader audio IDs changed since generation')
    measured, missing = {}, []
    for name, job in jobs.items():
        if any(texts[i] != job['text'] for i in job['ids']):
            raise ValueError('Reader text changed since generation: ' + job['ids'][0])
        audio = STAGE / 'audio' / name
        expected = completed[name]['sha256']
        if hashlib.sha256(audio.read_bytes()).hexdigest() != expected:
            raise ValueError('Audio checksum failed: ' + name)
        timing = None
        for model in ('small', 'base'):
            path = STAGE / ('alignment-' + model) / (Path(name).stem + '.json')
            if path.exists():
                candidate = read(path)
                if candidate.get('sha256') == expected:
                    timing = candidate['word_timestamps']
                    break
        if timing is None:
            missing.append(job['ids'][0])
            continue
        if [w['text'] for w in timing] != tokens(job['text']):
            raise ValueError('Timing words mismatch: ' + name)
        previous = 0
        for word in timing:
            if not 0 <= word['start'] < word['end'] <= completed[name]['seconds'] + .1:
                raise ValueError('Invalid word time: ' + name)
            if word['start'] < previous - .03:
                raise ValueError('Overlapping word times: ' + name)
            previous = word['end']
        measured[name] = {'timecodes': [None, {'word_timestamps': timing}]}
    if missing:
        raise ValueError(f'{len(missing)} recordings still need valid timings; first: {missing[:5]}')
    timecodes = {text_id: measured[name] for text_id, name in mapping.items()}
    if '--check' in sys.argv:
        print(f'Validated {len(jobs)} audio files and {len(timecodes)} timing entries. Reader unchanged.')
        return
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = ROOT / '.kore-tts' / ('reader-backup-' + stamp)
    backup.mkdir()
    pages = read(ROOT / 'content/pages.json')
    changed = [p['href'] for p in pages] + [
        'content/i18n/sw-TZ/audios.json', 'content/i18n/sw-TZ/timecode/timecode_output.json',
        'assets/config.json', 'assets/offline-preloader.js', 'imsmanifest.xml']
    for relative in changed:
        target = backup / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, target)
    staged_audio = backup / 'new-audio'
    staged_audio.mkdir()
    for name in jobs:
        shutil.copy2(STAGE / 'audio' / name, staged_audio / name)
    active_audio = ROOT / 'content/i18n/sw-TZ/audio'
    old_audio = backup / 'original-audio'
    active_audio.rename(old_audio)
    try:
        staged_audio.rename(active_audio)
        save(ROOT / 'content/i18n/sw-TZ/audios.json', mapping)
        save(ROOT / 'content/i18n/sw-TZ/timecode/timecode_output.json', timecodes)
        config = read(ROOT / 'assets/config.json')
        config['bundleVersion'] = config['bundleVersion'] + '-kore-' + stamp
        save(ROOT / 'assets/config.json', config)
        subprocess.run(['node', 'scripts/prepare-release.cjs'], cwd=ROOT, check=True)
        subprocess.run(['node', 'scripts/verify-release.cjs'], cwd=ROOT, check=True)
        for page in pages:
            pattern = r'<main\b[\s\S]*?</main>'
            before = re.search(pattern, (backup / page['href']).read_text())
            after = re.search(pattern, (ROOT / page['href']).read_text())
            if not before or not after or before[0] != after[0]:
                raise ValueError('Page content changed during installation: ' + page['href'])
    except BaseException:
        if active_audio.exists():
            active_audio.rename(backup / 'failed-new-audio')
        old_audio.rename(active_audio)
        for relative in changed:
            shutil.copy2(backup / relative, ROOT / relative)
        raise
    save(backup / 'installation.json', {'version': config['bundleVersion'],
                                      'files': changed, 'audio_count': len(jobs)})
    print(f'Installed Kore voice and timings. Original reader backup: {backup}')


if __name__ == '__main__':
    main()
