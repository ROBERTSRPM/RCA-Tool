#!/bin/bash
# usage: mix.sh <scene wav dir> <out.wav> [gain dB]   joins s1..s8, +gain and limiter
set -e
D=$1; OUT=$2
ls $D/s?.wav | sort | sed "s/^/file '/;s/$/'/" > /tmp/concat.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i /tmp/concat.txt -c copy /tmp/joined.wav
# gain then look-ahead limiter: reaches -14.0 LUFS with true peak at -1.5 dBTP for this recording (measured with ebur128)
GAIN=${3:-5.5}
ffmpeg -loglevel error -y -i /tmp/joined.wav -af "volume=${GAIN}dB,alimiter=limit=0.78:attack=3:release=60:level=disabled" -ar 48000 -ac 1 $OUT
ffmpeg -hide_banner -nostats -i $OUT -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tr -s ' ' | tr '\n' ' '; echo
