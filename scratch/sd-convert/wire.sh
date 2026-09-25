#!/bin/bash
# usage: wire.sh <topic[,topic]>  (after post.sh) -> shows non-artifact advisories, wires, refreshes manifest, verifies
SP="C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/3391a65d-3f53-4640-9990-906472278e2e/scratchpad"
cd /d/jenny/sypher
node scripts/check-diagram-fidelity.mjs --list $SP/lists/finish-pass.list 2>&1 | grep "^REVIEW" | python3 -c "
import sys,re
for l in sys.stdin:
    ws=set(re.findall(r'(\w+) ←',l))
    ws-= {'nbsp','quot'}
    if ws: print('ADVISORY', l[:60].strip(), sorted(ws))
"
if node scripts/check-diagram-fidelity.mjs --list $SP/lists/finish-pass.list 2>&1 | grep -q "^FAIL"; then echo "BLOCKING FIDELITY FINDINGS - NOT WIRING"; exit 1; fi
node scripts/wire-mermaid-from-map.mjs $SP/lists/finish-map.json | head -2
node scripts/update-diagram-manifest.mjs system-design-fundamentals 2>&1 | head -1
cd "$SP"
for t in ${1//,/ }; do node topic-verify.mjs $t; done
node mdxcheck.mjs ${1//,/ } | tail -2
cp done.txt deferred.txt /d/jenny/sypher/scratch/sd-convert/; cp -r bundles /d/jenny/sypher/scratch/sd-convert/
