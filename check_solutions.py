#!/usr/bin/env python3
"""
Extract Python solutions and test cases from coding bootcamp MDX files,
then run each solution against its test cases.

Usage: python check_solutions.py [problem_filter]
  problem_filter: optional substring to filter problem names (e.g. "two-sum", "bst")
"""

import re
import sys
import os
import subprocess
import tempfile
import json
from pathlib import Path

BASE = Path("docs/coding-bootcamp")
PYTHON = sys.executable or "python3"

def decode_js_unicode_escapes(text):
    """Decode \\uXXXX sequences in text (used in JSX template literals)."""
    def replace_escape(match):
        return chr(int(match.group(1), 16))
    return re.sub(r'\\u([0-9a-fA-F]{4})', replace_escape, text)


def extract_test_cases(exercise_text):
    """Extract testCases array from a ProblemEditor component."""
    # Find the start of testCases
    start = exercise_text.find('testCases={')
    if start < 0:
        return []

    test_section = exercise_text[start + 11:]  # skip 'testCases={'
    # Now we need the matching } for the JSX expression
    depth = 0
    end = 0
    for i, ch in enumerate(test_section):
        if ch == '{':
            depth += 1
        elif ch == '}':
            if depth == 0:
                end = i
                break
            depth -= 1
    if end == 0:
        return []

    test_cases_text = test_section[:end]
    test_cases = []

    # Find each {stdin, expectedOutput} pair using brace-matching
    i = 0
    while i < len(test_cases_text):
        # Find opening brace
        i = test_cases_text.find('{', i)
        if i < 0:
            break
        # Find matching closing brace
        depth = 1
        j = i + 1
        while j < len(test_cases_text) and depth > 0:
            if test_cases_text[j] == '{':
                depth += 1
            elif test_cases_text[j] == '}':
                depth -= 1
            j += 1
        if depth == 0:
            case_text = test_cases_text[i:j]
            i = j
            # Extract stdin and expectedOutput
            stdin_m = re.search(r"stdin:\s*'((?:[^'\\]|\\.)*)'", case_text)
            expected_m = re.search(r"expectedOutput:\s*'((?:[^'\\]|\\.)*)'", case_text)
            if stdin_m and expected_m:
                stdin_val = decode_js_unicode_escapes(stdin_m.group(1)).replace('\\n', '\n')
                expected_val = decode_js_unicode_escapes(expected_m.group(1)).replace('\\n', '\n')
                test_cases.append({
                    'stdin': stdin_val,
                    'expectedOutput': expected_val
                })
        else:
            break

    return test_cases


def extract_python_harness(exercise_text):
    """Extract the Python harness code."""
    # Find the harness section: it comes after starterCode and before defaultLanguage
    start = exercise_text.find('harness={{')
    if start < 0:
        start = exercise_text.find('harness={')
        if start < 0:
            return None
    # Find the closing }} of the harness section
    # Count braces to find the matching close
    harness_section = exercise_text[start:]
    depth = 0
    end = 0
    for i, ch in enumerate(harness_section):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end == 0:
        return None

    harness_section = harness_section[:end]

    # Now find the python: `...` part within the harness section
    # Match python: followed by backtick, handling nested backticks
    match = re.search(r'python:\s*`([\s\S]*?)`\s*', harness_section)
    if not match:
        return None
    return decode_js_unicode_escapes(match.group(1))


def extract_python_solution(solution_text):
    """Extract Python solution code from the solution MDX file."""
    import textwrap

    # Find the Python code block inside a TabItem value="python"
    patterns = [
        r'TabItem\s+value="python"[^>]*>[\s\S]*?```python\s*\n([\s\S]*?)```',
        r'TabItem\s+value="python"[^>]*>[\s\S]*?```\s*\n([\s\S]*?)```\s*\n',
        r'```python\s*\n([\s\S]*?)```',
    ]

    for pattern in patterns:
        match = re.search(pattern, solution_text)
        if match:
            code = match.group(1).rstrip()
            if code and len(code) > 10:  # Sanity check
                # Dedent the code - it may be indented from being inside Markdown/JSX
                code = textwrap.dedent(code)
                return code
    return None


def find_pairs():
    """Find all exercise-solution pairs."""
    pairs = []

    for topic_dir in sorted(BASE.iterdir()):
        if not topic_dir.is_dir():
            continue

        exercises_dir = topic_dir / 'exercises'
        solutions_dir = topic_dir / 'solutions'

        if not exercises_dir.exists() or not solutions_dir.exists():
            continue

        for difficulty_dir in ['easy', 'medium', 'hard']:
            ex_diff_dir = exercises_dir / difficulty_dir
            sol_diff_dir = solutions_dir / difficulty_dir

            if not ex_diff_dir.exists() or not sol_diff_dir.exists():
                continue

            for ex_file in sorted(ex_diff_dir.glob('*.mdx')):
                sol_file = sol_diff_dir / ex_file.name
                if sol_file.exists():
                    pairs.append((ex_file, sol_file, topic_dir.name, difficulty_dir))

    return pairs


def normalize_output(output):
    """Normalize output for comparison."""
    return output.rstrip().strip()


def run_test_with_subprocess(solution_code, harness_code, test_cases, problem_name):
    """
    Run the solution against test cases by creating a temp Python file
    and running it with subprocess.
    """
    results = {'pass': 0, 'fail': 0, 'errors': []}

    for i, tc in enumerate(test_cases):
        stdin_val = tc['stdin']
        expected = normalize_output(tc['expectedOutput'])

        # Create temp file with combined solution + harness
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            # Write solution code
            f.write(solution_code)
            f.write('\n\n')
            # Remove the if __name__ guard and just call main()
            # The harness typically has: if __name__ == '__main__': main()
            modified_harness = harness_code
            # Replace the if __name__ guard with just calling main()
            modified_harness = re.sub(
                r'if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:\s*\n\s*main\(\)',
                'main()',
                modified_harness
            )
            # Also handle the case where there's just a bare call
            f.write(modified_harness)
            f.write('\n')
            temp_path = f.name

        try:
            proc = subprocess.run(
                [PYTHON, temp_path],
                input=stdin_val,
                capture_output=True,
                text=True,
                timeout=5,
                cwd=str(BASE.parent.parent)  # project root
            )

            actual = normalize_output(proc.stdout)
            stderr = proc.stderr.strip()

            if proc.returncode != 0:
                results['fail'] += 1
                results['errors'].append((i, repr(stdin_val[:50]), expected, f"EXIT CODE {proc.returncode}: {stderr[:200]}"))
            elif actual == expected:
                results['pass'] += 1
            else:
                results['fail'] += 1
                results['errors'].append((i, repr(stdin_val[:50]), expected, actual))

        except subprocess.TimeoutExpired:
            results['fail'] += 1
            results['errors'].append((i, repr(stdin_val[:50]), expected, "TIMEOUT (>5s)"))
        except Exception as e:
            results['fail'] += 1
            results['errors'].append((i, repr(stdin_val[:50]), expected, f"EXCEPTION: {e}"))
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass

    return results


def main():
    filter_str = sys.argv[1] if len(sys.argv) > 1 else None
    pairs = find_pairs()

    if filter_str:
        pairs = [(e, s, t, d) for e, s, t, d in pairs if filter_str.lower() in str(e).lower() or filter_str.lower() in t.lower()]

    print(f"Found {len(pairs)} exercise-solution pairs")
    if filter_str:
        print(f"Filtered by: {filter_str}")
    print()

    results_by_topic = {}
    total_pass = 0
    total_fail = 0
    total_skip = 0
    all_failures = []

    for ex_path, sol_path, topic, difficulty in pairs:
        relative = f"{topic}/{difficulty}/{ex_path.stem}"
        print(f"{'='*70}")
        print(f"  {relative}")
        print(f"{'='*70}")

        with open(ex_path, 'r', encoding='utf-8') as f:
            exercise_text = f.read()

        test_cases = extract_test_cases(exercise_text)
        if not test_cases:
            print(f"  !! SKIP: No test cases found")
            total_skip += 1
            continue

        harness_code = extract_python_harness(exercise_text)
        if not harness_code:
            print(f"  !! SKIP: No Python harness found")
            total_skip += 1
            continue

        with open(sol_path, 'r', encoding='utf-8') as f:
            solution_text = f.read()

        solution_code = extract_python_solution(solution_text)
        if not solution_code:
            print(f"  !! SKIP: No Python solution found")
            total_skip += 1
            continue

        results = run_test_with_subprocess(solution_code, harness_code, test_cases, ex_path.stem)

        if topic not in results_by_topic:
            results_by_topic[topic] = {'pass': 0, 'fail': 0, 'skip': 0, 'total': 0}

        results_by_topic[topic]['total'] += 1

        if results['fail'] == 0:
            results_by_topic[topic]['pass'] += 1
            total_pass += 1
            print(f"  OK PASS ({results['pass']}/{len(test_cases)} tests)")
        else:
            results_by_topic[topic]['fail'] += 1
            total_fail += 1
            print(f"  X FAIL ({results['fail']}/{len(test_cases)} tests failed)")
            for idx, stdin_val, expected, actual in results['errors']:
                print(f"    Test #{idx}:")
                print(f"      Input:    {stdin_val[:80]}")
                print(f"      Expected: {repr(expected)[:80]}")
                print(f"      Actual:   {repr(actual)[:80]}")
            all_failures.append((relative, results['errors']))

    # Print summary
    print(f"\n\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Total: {len(pairs)}, PASS: {total_pass}, FAIL: {total_fail}, SKIP: {total_skip}")

    if all_failures:
        print(f"\n  FAILURES:")
        for rel, errors in all_failures:
            print(f"  - {rel}")
            for idx, stdin_val, expected, actual in errors[:3]:
                print(f"      Test #{idx}: expected {repr(expected)[:60]}, got {repr(actual)[:60]}")

    # Topic breakdown
    print(f"\n  BREAKDOWN BY TOPIC:")
    for topic, data in sorted(results_by_topic.items()):
        status = "OK" if data['fail'] == 0 else "XX"
        print(f"    {status} {topic}: {data['pass']}/{data['total']} pass, {data['fail']} fail")

    print()
    return 1 if total_fail > 0 else 0


if __name__ == '__main__':
    sys.exit(main())