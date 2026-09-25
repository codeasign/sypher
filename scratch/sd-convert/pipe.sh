#!/bin/bash
# usage: pipe.sh <bundle-name-without-ext> [--nosplit]   (runs split -> gate -> tune -> gate)
SP="C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/3391a65d-3f53-4640-9990-906472278e2e/scratchpad"
cd "$SP"
B=$1
[ "$2" != "--nosplit" ] && node split.mjs bundles/$B.txt
node gate.mjs "$SP/lists/$B.list" "$SP/lists/$B.fail" | head -30
if [ -s "$SP/lists/$B.fail" ]; then
  FAST=1 node tune3.mjs "$SP/lists/$B.fail" | tail -4
  node gate.mjs "$SP/lists/$B.list" "$SP/lists/$B.fail" | head -30
fi
# mark done if everything passed
if [ -f "$SP/lists/$B.list" ] && [ -f "$SP/lists/$B.fail" ] && [ ! -s "$SP/lists/$B.fail" ]; then sed 's#.*/##; s#\.mmd$##' "$SP/lists/$B.list" >> "$SP/done.txt"; echo "MARKED DONE: $B"; fi
