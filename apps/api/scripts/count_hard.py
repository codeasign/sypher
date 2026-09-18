#!/usr/bin/env python3
"""Count rows in each question list of gen_hard_remaining.py."""
import re

src = open("apps/api/scripts/gen_hard_remaining.py", encoding="utf-8").read()
for name in ("AI200_HARD", "AIP_HARD", "CTAI_HARD", "CTGENAI_HARD", "CTPT_HARD", "CTSEC_HARD", "CTTAS_HARD", "CTTAE_HARD"):
    m = re.search(rf"^{name} = \[(.*?)^\]", src, re.S | re.M)
    if not m:
        print(f"{name}: NOT FOUND")
        continue
    rows = re.findall(r"^\(", m.group(1), re.M)
    print(f"{name}: {len(rows)} rows")