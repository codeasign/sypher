#!/bin/bash
# usage: gt.sh name... -> gate the named mmds (short names)
SP="C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/74c2c3fe-13e6-4765-bad9-06431cbcfc67/scratchpad"
: > $SP/lists/gt.list
for n in "$@"; do echo "D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-$n.mmd" >> $SP/lists/gt.list; done
cd $SP && node gate.mjs "$SP/lists/gt.list" "$SP/lists/gt.fail" | sed -E 's/outside landscape band( after direction-flip retry)?//' | cut -c1-120
