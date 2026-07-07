import sys

# Check the permutations solution and exercise
with open('docs/coding-bootcamp/backtracking/exercises/medium/permutations.mdx', 'rb') as f:
    exercise = f.read().decode('utf-8')

# Find the test cases
idx = exercise.find('testCases={')
end = exercise.find('}', idx)
# Find matching closing brace
depth = 0
i = idx + 10
while i < len(exercise):
    if exercise[i] == '{':
        depth += 1
    elif exercise[i] == '}':
        if depth == 0:
            # This is the closing brace of testCases
            break
        depth -= 1
    i += 1

test_cases_section = exercise[idx+11:i]
print("Test cases extracted, length:", len(test_cases_section))

# Extract all test cases
import re
cases = []
# Find all {stdin, expectedOutput} patterns
for match in re.finditer(r"stdin:\s*'([^']*)'", test_cases_section):
    stdin_val = match.group(1).replace('\\n', '\n')
    cases.append(stdin_val)

print("Number of test cases:", len(cases))
for i, c in enumerate(cases):
    print(f"  Test {i}: stdin={repr(c[:50])}")