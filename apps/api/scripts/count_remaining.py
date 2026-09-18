#!/usr/bin/env python3
"""Count rows in each question list of gen_med_remaining.py."""
import re

src = open("apps/api/scripts/gen_med_remaining.py", encoding="utf-8").read()
for name in ("CT_PT", "CT_SEC", "CT_TAS", "CT_TAE"):
    m = re.search(rf"^{name} = \[(.*?)^\]", src, re.S | re.M)
    if not m:
        print(f"{name}: NOT FOUND")
        continue
    rows = re.findall(r"^\(", m.group(1), re.M)
    print(f"{name}: {len(rows)} rows")