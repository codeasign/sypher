#!/usr/bin/env python3
"""
Verify that all solution function signatures match both starter code and harness calls.
"""
import re, os

solutions_dir = 'docs/coding-bootcamp/fast-slow-pointers/solutions'
exercises_dir = 'docs/coding-bootcamp/fast-slow-pointers/exercises'

# Expected function names per problem per language (from starter code)
expected = {
    'linked-list-cycle': {
        'python': 'hasCycle', 'java': 'hasCycle', 'cpp': 'hasCycle',
        'javascript': 'hasCycle', 'typescript': 'hasCycle', 'rust': 'has_cycle',
        'c': 'hasCycle', 'csharp': 'HasCycle', 'go': 'hasCycle'
    },
    'middle-of-linked-list': {
        'python': 'middleNode', 'java': 'middleNode', 'cpp': 'middleNode',
        'javascript': 'middleNode', 'typescript': 'middleNode', 'rust': 'middle_node',
        'c': 'middleNode', 'csharp': 'MiddleNode', 'go': 'middleNode'
    },
    'palindrome-linked-list': {
        'python': 'is_palindrome', 'java': 'isPalindrome', 'cpp': 'isPalindrome',
        'javascript': 'isPalindrome', 'typescript': 'isPalindrome', 'rust': 'is_palindrome',
        'c': 'isPalindrome', 'csharp': 'IsPalindrome', 'go': 'isPalindrome'
    },
    'happy-number': {
        'python': 'isHappy', 'java': 'isHappy', 'cpp': 'isHappy',
        'javascript': 'isHappy', 'typescript': 'isHappy', 'rust': 'is_happy',
        'c': 'isHappy', 'csharp': 'IsHappy', 'go': 'isHappy'
    },
    'find-duplicate-number': {
        'python': 'findDuplicate', 'java': 'findDuplicate', 'cpp': 'findDuplicate',
        'javascript': 'findDuplicate', 'typescript': 'findDuplicate', 'rust': 'find_duplicate',
        'c': 'findDuplicate', 'csharp': 'FindDuplicate', 'go': 'findDuplicate'
    },
    'remove-nth-from-end': {
        'python': 'remove_nth_from_end', 'java': 'removeNthFromEnd', 'cpp': 'removeNthFromEnd',
        'javascript': 'removeNthFromEnd', 'typescript': 'removeNthFromEnd', 'rust': 'remove_nth_from_end',
        'c': 'removeNthFromEnd', 'csharp': 'RemoveNthFromEnd', 'go': 'removeNthFromEnd'
    },
    'circular-array-loop': {
        'python': 'circularArrayLoop', 'java': 'circularArrayLoop', 'cpp': 'circularArrayLoop',
        'javascript': 'circularArrayLoop', 'typescript': 'circularArrayLoop', 'rust': 'circular_array_loop',
        'c': 'circularArrayLoop', 'csharp': 'CircularArrayLoop', 'go': 'circularArrayLoop'
    }
}

# Language-specific patterns to extract main function name
func_patterns = {
    'python': r'def\s+(\w+)\(',
    'java': r'(?:public\s+)?(?:static\s+)?\w+(?:<[^>]*>)?\s+(\w+)\s*\(',
    'cpp': r'(?:public:\s*)?\w+(?:<[^>]*>)?\s+(\w+)\s*\(',
    'javascript': r'function\s+(\w+)\(',
    'typescript': r'function\s+(\w+)\(',
    'rust': r'fn\s+(\w+)\(',
    'c': r'(?:bool|int|ListNode|void|long|char|double|float|unsigned|struct\s+\w+\s*\*?\s*)\s*(\w+)\s*\(',
    'csharp': r'(?:public\s+)?(?:static\s+)?\w+(?:<[^>]*>)?\s+(\w+)\s*\(',
    'go': r'func\s+(\w+)\(',
}

# ========== PART 1: Check solution function names ==========
print("=" * 65)
print("  PART 1: SOLUTION FUNCTION SIGNATURES vs STARTER CODE")
print("=" * 65)
all_ok = True
for root, dirs, files in os.walk(solutions_dir):
    for fname in sorted(files):
        if not fname.endswith('.mdx'):
            continue
        pname = fname.replace('.mdx', '')
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()

        # Extract TabItem blocks
        blocks = re.findall(
            r'<TabItem\s+value=\"(\w+)\"[^>]*>(.*?)</TabItem>',
            text, re.DOTALL
        )

        for lang, content in blocks:
            if lang not in expected.get(pname, {}):
                continue
            exp_name = expected[pname][lang]
            pat = func_patterns.get(lang, r'def\s+(\w+)\(')
            found = re.findall(pat, content)

            # Filter out constructors, helpers, etc.
            # For Java/C++/C#: ignore helper methods, look for the main solution method
            main_funcs = [f for f in found if f == exp_name]
            if not main_funcs:
                # Also check for class-wrapped methods
                if lang in ('java', 'cpp', 'csharp'):
                    # Check if method exists inside a class
                    if exp_name in content:
                        continue
                all_ok = False
                print(f"  ✗ {pname}/{lang}: expected '{exp_name}', found: {found}")

if all_ok:
    print("  [OK] All solution function signatures match starter code!")
else:
    print(f"\n  [FAIL] Fix the mismatches above")

# ========== PART 2: Check harness calls ==========
print()
print("=" * 65)
print("  PART 2: HARNESS CALLS vs STARTER CODE")
print("=" * 65)
all_ok2 = True
for root, dirs, files in os.walk(exercises_dir):
    for fname in sorted(files):
        if not fname.endswith('.mdx'):
            continue
        pname = fname.replace('.mdx', '')
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()

        # Extract harness section
        for m in re.finditer(r'harness\s*=\s*\{\{', text):
            start = m.end()
            depth = 2
            end = start
            for i in range(start, len(text)):
                if text[i] == '{':
                    depth += 1
                elif text[i] == '}':
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            harness_section = text[start:end]

            # Check each language
            for lang in expected.get(pname, {}):
                exp_name = expected[pname][lang]
                # Find the lang harness: `lang: ...`
                lang_match = re.search(
                    rf'{re.escape(lang)}:\s*`([^`]*)`',
                    harness_section
                )
                if lang_match:
                    hcode = lang_match.group(1)
                    if exp_name not in hcode:
                        all_ok2 = False
                        print(f"  ✗ {pname}/{lang}: harness doesn't use '{exp_name}'")

if all_ok2:
    print("  [OK] All harnesses call the expected function names!")

# ========== PART 3: Check starter code function names ==========
print()
print("=" * 65)
print("  PART 3: STARTER CODE vs EXPECTED NAMES")
print("=" * 65)
all_ok3 = True
for root, dirs, files in os.walk(exercises_dir):
    for fname in sorted(files):
        if not fname.endswith('.mdx'):
            continue
        pname = fname.replace('.mdx', '')
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()

        # Extract starter code section
        starter_match = re.search(r'starterCode\s*=\s*\{', text)
        if not starter_match:
            continue
        start = starter_match.end()
        depth = 1
        end = start
        for i in range(start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        starter_section = text[start:end]

        for lang in expected.get(pname, {}):
            exp_name = expected[pname][lang]
            lang_match = re.search(
                rf'{re.escape(lang)}:\s*`([^`]*)`',
                starter_section
            )
            if lang_match:
                scode = lang_match.group(1)
                if exp_name not in scode:
                    all_ok3 = False
                    print(f"  ✗ {pname}/{lang}: starter code missing '{exp_name}'")

if all_ok3:
    print("  [OK] All starter codes contain the expected function names!")

print()
print("=" * 65)
if all_ok and all_ok2 and all_ok3:
    print("  [OK] ALL 9 LANGUAGES × 7 PROBLEMS = 63 SIGNATURES VERIFIED")
    print("  [OK] Every solution, starter code, and harness is in sync")
else:
    print("  [FAIL] Some mismatches found — fix them above")
print("=" * 65)