#!/bin/bash
# usage: post.sh <topic[,topic]>  -> gate all, fix panel order, regate, tune fails, fidelity; prints summary; leaves finish-map ready
SP="C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/3391a65d-3f53-4640-9990-906472278e2e/scratchpad"
cd "$SP"
node finish.mjs $1 | tail -6
cd /d/jenny/sypher
node scripts/check-diagram-fidelity.mjs --fix-panel-order --list $SP/lists/finish-pass.list 2>&1 | grep "^ORDERFIX" | sed 's/system-design-fundamentals\///' | cut -c1-120
cd "$SP"
node finish.mjs $1 | tail -6
if grep -q "mmd" lists/finish-fail.list; then FAST=1 node tune3.mjs lists/finish-fail.list | tail -3; node finish.mjs $1 | tail -6; fi
cd /d/jenny/sypher
node scripts/check-diagram-fidelity.mjs --list $SP/lists/finish-pass.list 2>&1 | grep -v "^REVIEW" | cut -c1-200 | tail -6
