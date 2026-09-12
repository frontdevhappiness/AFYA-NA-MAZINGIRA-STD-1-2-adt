#!/usr/bin/env python3
"""Generate resumable Kore samples/audio separately from the active ADT reader."""
import argparse
import base64
from email.message import Message
import fcntl
import getpass
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STYLE = (
    'Read the transcript exactly in clear Tanzanian Swahili, with a warm, patient '
    'teaching tone and an unhurried pace for young primary-school children. '
    'Read all numbers in Swahili, never English. Read telephone digits individually; '
    'read quantities and years naturally in Swahili. Do not translate the text, '
    'add introductions, speak these instructions, or announce decorative emoji.\nTranscript:\n'
)


def spoken_text(text):
    if re.match(r'^\s*Simu\s*:', text, re.I):
        digits = ('sifuri', 'moja', 'mbili', 'tatu', 'nne', 'tano',
                  'sita', 'saba', 'nane', 'tisa')
        text = re.sub(r'[0-9]', lambda m: digits[int(m[0])] + ' ', text)
        # Speak the international plus as requested; preserve the displayed text.
        text = text.replace('+', ' jumlisha ').replace('/', '; au ')
        return ' '.join(text.split())
    return text


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)


def plan(model):
    source = ROOT / 'content/i18n/sw-TZ'
    texts = json.loads((source / 'texts.json').read_text())
    old = json.loads((source / 'audios.json').read_text())
    override_path = ROOT / 'scripts/kore_narration_overrides.json'
    overrides = json.loads(override_path.read_text()) if override_path.exists() else {}
    jobs, mapping = {}, {}
    for text_id in old:
        text = texts[text_id]
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f'Empty text: {text_id}')
        narration = spoken_text(text)
        style = STYLE
        if text in overrides:
            override = overrides[text]
            narration = override['narration']
            style = (
                'Generate a single-speaker recording in Tanzanian Swahili. '
                + override['context'] + ' '
                'Use a clear, calm teaching voice. Speak only the transcript below. '
                'Pronounce letter names and numbers in Swahili. '
                'Do not translate, explain, or add other words.\nTranscript:\n'
            )
        identity = sha(json.dumps([model, 'Kore', style, text, narration], ensure_ascii=False).encode())
        name = f'kore_{identity}.mp3'
        jobs.setdefault(name, {'text': text, 'narration': narration, 'style': style, 'ids': []})['ids'].append(text_id)
        mapping[text_id] = name
    return jobs, mapping


class IncompleteAudioError(RuntimeError):
    """A response with no usable audio that may succeed on a bounded retry."""


class BlockedAudioError(RuntimeError):
    """An explicitly rejected clip, retained for later review without retrying."""


class RejectedClipError(RuntimeError):
    """A generic invalid-argument response that persisted through retries."""


def parse_audio(result):
    candidates = result.get('candidates', [])
    blocked = result.get('promptFeedback', {}).get('blockReason')
    if blocked:
        raise BlockedAudioError(f'Gemini blocked the prompt ({blocked}); no clip saved.')
    reason = candidates[0].get('finishReason') if candidates else None
    if not candidates or reason != 'STOP':
        message = f'No complete audio candidate (finish reason: {reason or "missing"}); no clip saved.'
        if reason in (None, 'OTHER', 'FINISH_REASON_UNSPECIFIED'):
            raise IncompleteAudioError(message)
        if reason in ('SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'):
            raise BlockedAudioError(message)
        raise RuntimeError(message)
    chunks, rate = [], None
    for part in candidates[0].get('content', {}).get('parts', []):
        inline = part.get('inlineData')
        if not inline:
            continue
        mime = Message()
        mime['Content-Type'] = inline.get('mimeType', '')
        value = mime.get_param('rate', '')
        if (mime.get_content_type().lower() != 'audio/l16'
                or str(mime.get_param('codec', 'pcm')).lower() != 'pcm'
                or mime.get_param('channels', '1') != '1'
                or not re.fullmatch(r'[0-9]+', str(value))
                or not 8000 <= int(value) <= 192000):
            raise RuntimeError(f'Unsupported audio format: {mime["Content-Type"]}')
        if rate is not None and rate != int(value):
            raise RuntimeError('Mixed sample rates in audio response.')
        rate = int(value)
        chunks.append(base64.b64decode(inline['data'], validate=True))
    pcm = b''.join(chunks)
    if not pcm:
        raise IncompleteAudioError('No PCM audio returned; no clip saved.')
    if len(pcm) % 2:
        raise RuntimeError('Invalid PCM audio.')
    return pcm, rate


def generate(text, model, key, style=STYLE):
    payload = {
        'contents': [{'parts': [{'text': style + text}]}],
        'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {
            'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': 'Kore'}}}},
    }
    for attempt in range(5):
        request = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return parse_audio(json.load(response))
        except IncompleteAudioError as error:
            if attempt >= 2:
                raise
            delay = 5 * 2 ** attempt
            print(f'{error} Retrying in {delay}s.', flush=True)
            time.sleep(delay)
        except urllib.error.HTTPError as error:
            detail = 'No error detail returned.'
            try:
                body = json.loads(error.read(65536))
                message = body.get('error', {}).get('message')
                if isinstance(message, str):
                    # Show only the API message, never headers or credentials.
                    detail = message.replace(key, '[REDACTED]')
                    detail = re.sub(r'AIza[\w-]+', '[REDACTED]', detail)
                    detail = ' '.join(detail.split())[:1500]
            except (ValueError, AttributeError):
                pass
            # This generic 400 has succeeded on an unchanged retry in this book.
            # Limit it to two retries; do not retry other invalid requests.
            retry_generic_400 = (error.code == 400 and attempt < 2
                                 and detail == 'Request contains an invalid argument.')
            if (not retry_generic_400 and error.code not in (429, 500, 502, 503, 504)) or attempt == 4:
                if error.code == 400 and detail == 'Request contains an invalid argument.':
                    raise RejectedClipError(f'Gemini HTTP {error.code}: {detail}') from None
                raise RuntimeError(f'Gemini HTTP {error.code}: {detail}') from None
            delay = min(60, 5 * 2 ** attempt)
            print(f'Gemini HTTP {error.code}; retrying in {delay}s.', flush=True)
            time.sleep(delay)


def encode(pcm, rate, target):
    with tempfile.TemporaryDirectory(dir=target.parent) as directory:
        raw, mp3 = Path(directory) / 'clip.pcm', Path(directory) / 'clip.mp3'
        raw.write_bytes(pcm)
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(rate), '-ac', '1',
                        '-i', str(raw), '-codec:a', 'libmp3lame', '-b:a', '96k', str(mp3)],
                       check=True, capture_output=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-f', 'null', '-'],
                       check=True, capture_output=True)
        mp3.replace(target)


def review_page(output, jobs, completed):
    cards = []
    for name, job in jobs.items():
        if name in completed and (output / 'audio' / name).exists():
            cards.append(f'<article><h2>{html.escape(job["ids"][0])}</h2>'
                         f'<p lang="sw-TZ">{html.escape(job["text"])}</p>'
                         f'<audio controls preload="none" src="audio/{name}"></audio></article>')
    page = ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Kore voice samples</title><style>body{font:18px sans-serif;max-width:800px;'
            'margin:32px auto;padding:16px}article{border-bottom:1px solid #aaa;padding:16px 0}'
            'audio{width:100%}</style><h1>Kore voice samples</h1>'
            '<p>Listen for clear Swahili pronunciation, numbers, and reading speed.</p>'
            + ''.join(cards) + '</html>')
    (output / 'review.html').write_text(page, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', default='gemini-3.1-flash-tts-preview')
    parser.add_argument('--limit', type=int, default=3, help='Maximum new recordings (default 3)')
    parser.add_argument('--all', action='store_true', help='Generate all remaining recordings')
    parser.add_argument('--retry-errors', action='store_true',
                        help='Retry only pending generic HTTP 400 errors; leave content rejections for review')
    parser.add_argument('--dry-run', action='store_true', help='Audit with no API calls or writes')
    parser.add_argument('--interval', type=float, default=6)
    args = parser.parse_args()
    if args.limit < 1 or args.interval < 0 or not re.fullmatch(r'[a-zA-Z0-9._-]+', args.model):
        parser.error('Invalid limit, interval, or model')
    jobs, mapping = plan(args.model)
    print(f'{len(mapping)} text IDs; {len(jobs)} unique Kore clips.', flush=True)
    if args.dry_run:
        print('Audit passed. No API calls or reader changes.')
        return
    if not shutil.which('ffmpeg'):
        parser.error('ffmpeg is required')
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        if not sys.stdin.isatty():
            parser.error('Run in a terminal to enter the key, or set GEMINI_API_KEY.')
        key = getpass.getpass('Gemini API key (hidden; not saved): ').strip()
    if not key:
        parser.error('An API key is required')
    output = ROOT / '.kore-tts' / args.model
    (output / 'audio').mkdir(parents=True, exist_ok=True)
    with (output / 'run.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.error('Another Kore generation run is active.')
        state_path = output / 'completed.json'
        failed_path = output / 'pending.json'
        pending = json.loads(failed_path.read_text()) if failed_path.exists() else {}
        if pending:
            # Preserve the history when revised narration creates new clip identities.
            history_path = output / 'pending-history.json'
            history = json.loads(history_path.read_text()) if history_path.exists() else {}
            history.update(pending)
            save(history_path, history)
        state = json.loads(state_path.read_text()) if state_path.exists() else {}
        completed = {name: state[name] for name in jobs if name in state
                     and (output / 'audio' / name).exists()
                     and sha((output / 'audio' / name).read_bytes()) == state[name].get('sha256')}
        pending = {name: entry for name, entry in pending.items()
                   if name in jobs and name not in completed}
        save(failed_path, pending)
        save(output / 'transcripts.json', jobs)
        save(output / 'audios.proposed.json', mapping)
        review_page(output, jobs, completed)
        count, attempted, start = 0, 0, time.monotonic()
        for name, job in jobs.items():
            retry_error = (name in pending and args.retry_errors
                           and pending[name].get('error') ==
                           'Gemini HTTP 400: Request contains an invalid argument.')
            if name in completed or (name in pending and not retry_error):
                continue
            if args.retry_errors and not retry_error:
                continue
            if not args.all and attempted >= args.limit:
                break
            if attempted:
                time.sleep(args.interval)
            attempted += 1
            print(f'Generating {job["ids"][0]}… (waiting for Gemini)', flush=True)
            try:
                pcm, rate = generate(job['narration'], args.model, key, job['style'])
            except (BlockedAudioError, IncompleteAudioError, RejectedClipError) as error:
                pending[name] = {'ids': job['ids'], 'error': str(error)}
                save(failed_path, pending)
                print(f'Pending review: {job["ids"][0]} — {error} Continuing.', flush=True)
                continue
            target = output / 'audio' / name
            encode(pcm, rate, target)
            completed[name] = {'sha256': sha(target.read_bytes()), 'seconds': len(pcm) / (2 * rate)}
            save(state_path, completed)
            if name in pending:
                del pending[name]
                save(failed_path, pending)
            review_page(output, jobs, completed)
            count += 1
            print(f'Generated {count}: {job["ids"][0]} ({len(pcm) / (2 * rate):.1f}s)', flush=True)
        print(f'Generated {count} clips in {time.monotonic() - start:.1f}s.')
        print(f'Total complete: {len(completed)}/{len(jobs)}; pending review: {len(pending)}; '
              f'not attempted: {len(jobs) - len(completed) - len(pending)}.')
        if pending:
            print(f'Batch is incomplete. Review unresolved clips in {failed_path}')
        print(f'Preview: http://127.0.0.1:5500/.kore-tts/{args.model}/review.html')
        print('Reader unchanged. Installation also requires new highlighting timecodes and offline cache updates.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit('Stopped. Completed recordings are saved; run again to resume.')
    except (RuntimeError, ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f'Generation stopped: {error}')
