#!/bin/bash
# usage: fid.sh name... -> gate (renders to store) then fidelity check on those files
SP="C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/74c2c3fe-13e6-4765-bad9-06431cbcfc67/scratchpad"
: > $SP/lists/fid.list
for n in "$@"; do echo "D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-$n.mmd" >> $SP/lists/fid.list; done
cd $SP && node gate.mjs "$SP/lists/fid.list" "$SP/lists/fid.fail" | sed -E 's/outside landscape band( after direction-flip retry)?//' | cut -c1-140
cd /d/jenny/sypher && node scripts/check-diagram-fidelity.mjs --list $SP/lists/fid.list 2>&1 | grep "^FAIL\|checked" | cut -c1-240
