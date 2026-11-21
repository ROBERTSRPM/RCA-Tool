#!/bin/bash
# Re-make the voice, captions and final video after the owner's re-recorded scene-10 lines are dropped into recordings/:
#   recordings/scene10-line-a.m4a  "It also suggests the seal plate is marked and not flat. The inspection found those marks. So that one goes in too."
#   recordings/scene10-line-b.m4a  "That's fair, so I link the film specification."
# (any audio extension; one take each, speak close to the phone, a second of silence either side). Missing files = the current audio is used.
# Env (same as the rest of the pipeline): PY (python with the audio packages), AUD (audio work dir), CLIPS (captured clips), WORK (build dir), PART1/PART2 (48 kHz mono wavs of the two recordings, see audio-edit-log.md)
set -e
cd "$(dirname "$0")"
$PY audio/process.py "$PART1" "$PART2" "$AUD"
$PY audio/transcribe.py "$AUD"
node gen-srt.mjs "$AUD"
node build.mjs "$CLIPS" "$AUD" "$WORK" s10
node assemble.mjs "$AUD" "$WORK" out
