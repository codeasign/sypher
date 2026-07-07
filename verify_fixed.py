#!/usr/bin/env python3
"""
Script to do final verification that all files use 'expectedOutput' and none use 'stdout:'
"""
import os
from pathlib import Path

# Find all mdx files in coding-bootcamp
docs_dir = Path("docs") / "coding-bootcamp"

all_files_found = list(docs_dir.rglob("*.mdx"))

stdout_files = []
expected_output_files = []

for file_path in all_files_found:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    if ': stdout:' in content:
        stdout_files.append(file_path)

    if ': expectedOutput:' in content:
        expected_output_files.append(file_path)

print(f"Files with 'stdout:' issue: {len(stdout_files)}")
for f in stdout_files[:5]:  # Show first 5 at most
    print(f"  - {f}")

print(f"\nFiles with correct 'expectedOutput': {len(expected_output_files)}")

if len(stdout_files) == 0:
    print("\nSUCCESS: No files with the 'stdout:' issue detected!")
    print("The expectedOutput format is correctly fixed in all coding bootcamp exercises.")
else:
    print(f"FAILURE: Found {len(stdout_files)} files still need fixing.")