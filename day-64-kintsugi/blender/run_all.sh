#!/bin/sh
# Rebuild every 3D asset from the Python sources, then pack for the web.
#   npm run assets            (or: sh blender/run_all.sh)
# Needs Blender 4.5+ (tested on 5.2 LTS). Override the binary with BLENDER_BIN.
set -e
cd "$(dirname "$0")/.."
BLENDER_BIN="${BLENDER_BIN:-$(command -v blender || echo /Applications/Blender.app/Contents/MacOS/Blender)}"
echo "using $BLENDER_BIN"
run() { "$BLENDER_BIN" -b --factory-startup -P "blender/$1" -- ${2:-} | grep -E '^\[' || true; }
run build_bowl.py
run build_fracture.py
run build_tray_tools.py
node scripts/pack.mjs
