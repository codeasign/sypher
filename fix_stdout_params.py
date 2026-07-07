#!/usr/bin/env python3
"""
Script to fix all the test cases in coding bootcamp files that have
'stdout:' instead of 'expectedOutput:' parameter names.
"""

import os
import re
from pathlib import Path

def fix_stdout_param_in_file(file_path):
    """Fix the stdout parameter to expectedOutput in a single file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace 'stdout:' with 'expectedOutput:'
    updated_content = re.sub(r'stdout:', 'expectedOutput:', content)

    # If content was actually changed
    if content != updated_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Fixed: {file_path}")
        return True
    else:
        print(f"No changes needed: {file_path}")
        return False

def main():
    """Main function to process all files in the coding bootcamp directory"""
    print("Scanning for files with 'stdout:' parameter...")

    # Find all problem files that might have the issue
    docsdir = Path.cwd() / "docs" / "coding-bootcamp"

    # List the specific files that need fixing based on our scan
    target_files = [
        'fast-slow-pointers/exercises/easy/linked-list-cycle.mdx',
        'fast-slow-pointers/exercises/easy/middle-of-linked-list.mdx',
        'fast-slow-pointers/exercises/hard/circular-array-loop.mdx',
        'fast-slow-pointers/exercises/medium/find-duplicate-number.mdx',
        'fast-slow-pointers/exercises/medium/happy-number.mdx',
        'hash-maps/exercises/easy/contains-duplicate.mdx',
        'hash-maps/exercises/easy/valid-anagram.mdx',
        'hash-maps/exercises/hard/longest-consecutive-sequence.mdx',
        'simulation/exercises/easy/baseball-game.mdx',
        'simulation/exercises/easy/robot-return-to-origin.mdx',
        'simulation/exercises/hard/text-justification.mdx',
        'simulation/exercises/medium/asteroid-collision.mdx',
        'simulation/exercises/medium/car-fleet.mdx',
        'simulation/exercises/medium/spiral-matrix-ii.mdx',
        'queue-deque/exercises/easy/implement-queue-using-stacks.mdx',
        'queue-deque/exercises/easy/moving-average.mdx',
        'queue-deque/exercises/medium/design-circular-queue.mdx',
        'queue-deque/exercises/medium/sliding-window-maximum.mdx',
        'prefix-sum/exercises/easy/range-sum-query.mdx',
    ]

    changed_count = 0
    for file_rel_path in target_files:
        full_path = docsdir / file_rel_path
        if full_path.exists():
            if fix_stdout_param_in_file(full_path):
                changed_count += 1
        else:
            print(f"Warning: File not found: {full_path}")

    print(f"\nCompleted fixing files. Changed {changed_count} files.")


if __name__ == "__main__":
    main()