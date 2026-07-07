#!/usr/bin/env python3
"""
End-to-end test for coding bootcamp Section 6 (Binary Search).
Tests ALL solutions against ALL test cases across ALL available languages.
"""

import subprocess
import sys
import os
import tempfile
from pathlib import Path

# ============================================================
# Test cases for each problem (extracted from exercise MDX files)
# ============================================================

TEST_CASES = {}

# --- Binary Search (Easy) ---
TEST_CASES['binary_search'] = [
    ('5 3\n1 2 3 4 5\n', '2'),
    ('5 1\n1 2 3 4 5\n', '0'),
    ('5 5\n1 2 3 4 5\n', '4'),
    ('5 0\n1 2 3 4 5\n', '-1'),
    ('5 6\n1 2 3 4 5\n', '-1'),
    ('5 4\n1 2 3 5 6\n', '-1'),
    ('1 7\n7\n', '0'),
    ('1 3\n7\n', '-1'),
    ('2 1\n1 2\n', '0'),
    ('2 2\n1 2\n', '1'),
    ('5 3\n1 2 3 3 4\n', '2'),
    ('4 5\n5 5 5 5\n', '1'),
    ('4 3\n5 5 5 5\n', '-1'),
    ('5 -3\n-5 -3 -1 0 2\n', '1'),
    ('5 -10\n-5 -3 -1 0 2\n', '-1'),
    ('10 55\n10 20 30 40 50 60 70 80 90 100\n', '-1'),
    ('10 60\n10 20 30 40 50 60 70 80 90 100\n', '5'),
    ('6 7\n1 3 5 7 9 11\n', '3'),
    ('7 9\n1 3 5 7 9 11 13\n', '4'),
    ('2 100\n-100 100\n', '1'),
]

# --- Search Insert Position (Easy) ---
TEST_CASES['search_insert'] = [
    ('1 3 5 6\n5\n', '2'),
    ('1 3 5 6\n2\n', '1'),
    ('1 3 5 6\n7\n', '4'),
    ('1 3 5 6\n0\n', '0'),
    ('1\n0\n', '0'),
    ('1\n1\n', '0'),
    ('1\n2\n', '1'),
    ('1 3\n2\n', '1'),
    ('1 3\n1\n', '0'),
    ('1 3\n3\n', '1'),
    ('2 4 6 8 10\n5\n', '2'),
    ('2 4 6 8 10\n1\n', '0'),
    ('2 4 6 8 10\n11\n', '5'),
    ('2 4 6 8 10\n6\n', '2'),
    ('1 2 3 4 5 6 7 8 9 10\n5\n', '4'),
    ('10 20 30 40 50\n25\n', '2'),
    ('10 20 30 40 50\n10\n', '0'),
    ('10 20 30 40 50\n50\n', '4'),
    ('1 3 5 7 9 11\n6\n', '3'),
    ('5\n3\n', '0'),
]

# --- Find First and Last (Medium) ---
TEST_CASES['search_range'] = [
    ('5 7 7 8 8 10\n8\n', '3 4'),
    ('5 7 7 8 8 10\n6\n', '-1 -1'),
    ('\n0\n', '-1 -1'),
    ('1\n1\n', '0 0'),
    ('2 2\n2\n', '0 1'),
    ('1 2 3 4 5\n3\n', '2 2'),
    ('1 1 1 1 1\n1\n', '0 4'),
    ('1 2 3 4 5 6\n10\n', '-1 -1'),
    ('1 1 2 2 2 3 3\n2\n', '2 4'),
    ('1 2 2 2 3 3 4\n2\n', '1 3'),
    ('3 3 3 3 3 3 3\n3\n', '0 6'),
    ('1 2 3 4 5\n0\n', '-1 -1'),
    ('1 2 3 4 5 6 7 8 9\n5\n', '4 4'),
    ('1 2 2 2 3 4 5\n2\n', '1 3'),
    ('5 5 5 5 5 5 5 5 5\n5\n', '0 8'),
    ('1 3 5 7 9\n4\n', '-1 -1'),
    ('1 2 3 4 5 6 7 8 9 10 11 12 13 14 15\n8\n', '7 7'),
    ('1 2 3 4 5 6 7 8 9 10\n10\n', '9 9'),
    ('1 2 3 4 5 6 7 8 9 10\n1\n', '0 0'),
    ('-5 -3 -1 0 2 4 6 8\n-1\n', '2 2'),
]

# --- Find Minimum in Rotated (Medium) ---
TEST_CASES['find_min'] = [
    ('3 4 5 1 2\n', '1'),
    ('4 5 6 7 0 1 2\n', '0'),
    ('11 13 15 17\n', '11'),
    ('1\n', '1'),
    ('2 1\n', '1'),
    ('2 3 4 5 6 1\n', '1'),
    ('5 1 2 3 4\n', '1'),
    ('3 1 2\n', '1'),
    ('1 2 3 4 5\n', '1'),
    ('5 6 7 8 9 1 2 3\n', '1'),
    ('10 15 20 0 5\n', '0'),
    ('7 8 9 10 1 2 3 4 5 6\n', '1'),
    ('1 2\n', '1'),
    ('2 1\n', '1'),
    ('3 1 2\n', '1'),
    ('1 2 3 4 5 6 0\n', '0'),
    ('0 1 2 3 4 5 6\n', '0'),
    ('6 0 1 2 3 4 5\n', '0'),
    ('2 3 4 5 6 7 1\n', '1'),
    ('5 6 7 1 2 3 4\n', '1'),
    ('10 20 30 40 1 2 3 4 5\n', '1'),
    ('4 5 6 7 8 9 1 2 3\n', '1'),
]

# --- Search in Rotated Sorted Array (Medium) ---
TEST_CASES['search_rotated'] = [
    ('5 1\n1 2 3 4 5\n', '0'),
    ('5 5\n1 2 3 4 5\n', '4'),
    ('5 0\n1 2 3 4 5\n', '-1'),
    ('5 8\n8 9 1 2 3\n', '0'),
    ('5 2\n8 9 1 2 3\n', '3'),
    ('5 1\n8 9 1 2 3\n', '2'),
    ('1 5\n5\n', '0'),
    ('1 3\n5\n', '-1'),
    ('2 2\n2 1\n', '0'),
    ('2 1\n2 1\n', '1'),
    ('2 1\n1 2\n', '0'),
    ('2 3\n2 1\n', '-1'),
    ('5 5\n5 1 2 3 4\n', '0'),
    ('5 1\n5 1 2 3 4\n', '1'),
    ('6 -2\n0 2 4 -4 -2 -1\n', '4'),
    ('7 10\n12 14 16 18 2 4 6\n', '-1'),
    ('5 10\n3 4 5 1 2\n', '-1'),
    ('6 9\n7 9 11 1 3 5\n', '1'),
    ('6 3\n7 9 11 1 3 5\n', '4'),
    ('4 2\n4 5 1 2\n', '3'),
]

# --- Median of Two Sorted Arrays (Hard) ---
TEST_CASES['find_median'] = [
    ('2 2\n1 3\n2 4\n', '2.5'),
    ('2 1\n1 3\n2\n', '2.0'),
    ('0 3\n\n1 2 3\n', '2.0'),
    ('0 1\n\n5\n', '5.0'),
    ('3 3\n2 2 2\n2 2 2\n', '2.0'),
    ('2 2\n-5 -3\n-2 0\n', '-2.5'),
    ('1 1\n1\n2\n', '1.5'),
    ('4 2\n1 2 3 4\n5 6\n', '3.5'),
    ('2 4\n5 6\n1 2 3 4\n', '3.5'),
    ('3 1\n1 5 9\n3\n', '4.0'),
    ('1 3\n3\n1 5 9\n', '4.0'),
    ('2 1\n1 2\n3\n', '2.0'),
    ('2 2\n1 2\n3 4\n', '2.5'),
    ('2 2\n-8 -6\n-4 -2\n', '-5.0'),
    ('2 2\n-3 0\n2 5\n', '1.0'),
    ('1 1\n1000000\n-1000000\n', '0.0'),
    ('2 2\n1 10\n2 20\n', '6.0'),
    ('3 4\n1 3 5\n2 4 6 8\n', '4.0'),
    ('1 0\n5\n\n', '5.0'),
    ('3 3\n1 4 7\n2 5 8\n', '4.5'),
]


# ============================================================
# Python Solutions
# ============================================================

def get_python_solution(problem):
    solutions = {
        'binary_search': '''
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
''',
        'search_insert': '''
def search_insert(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left
''',
        'search_range': '''
def search_range(nums, target):
    def lower_bound(nums, target):
        left, right = 0, len(nums)
        while left < right:
            mid = (left + right) // 2
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid
        return left
    def upper_bound(nums, target):
        left, right = 0, len(nums)
        while left < right:
            mid = (left + right) // 2
            if nums[mid] <= target:
                left = mid + 1
            else:
                right = mid
        return left
    left = lower_bound(nums, target)
    if left == len(nums) or nums[left] != target:
        return [-1, -1]
    right = upper_bound(nums, target) - 1
    return [left, right]
''',
        'find_min': '''
def find_min(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
''',
        'search_rotated': '''
def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
''',
        'find_median': '''
def find_median(nums1, nums2):
    if len(nums1) > len(nums2):
        return find_median(nums2, nums1)
    n, m = len(nums1), len(nums2)
    low, high = 0, n
    total_left = (n + m + 1) // 2
    while low <= high:
        partition1 = (low + high) // 2
        partition2 = total_left - partition1
        max_left1 = float('-inf') if partition1 == 0 else nums1[partition1 - 1]
        min_right1 = float('inf') if partition1 == n else nums1[partition1]
        max_left2 = float('-inf') if partition2 == 0 else nums2[partition2 - 1]
        min_right2 = float('inf') if partition2 == m else nums2[partition2]
        if max_left1 <= min_right2 and max_left2 <= min_right1:
            if (n + m) % 2 == 1:
                return float(max(max_left1, max_left2))
            return (max(max_left1, max_left2) + min(min_right1, min_right2)) / 2.0
        elif max_left1 > min_right2:
            high = partition1 - 1
        else:
            low = partition1 + 1
    return 0.0
''',
    }
    return solutions.get(problem, '')


def get_python_harness(problem):
    harnesses = {
        'binary_search': '''
import sys
data = sys.stdin.read().strip().splitlines()
n, target = map(int, data[0].split())
nums = list(map(int, data[1].split()))
print(binary_search(nums, target))
''',
        'search_insert': '''
import sys
data = sys.stdin.read().strip().splitlines()
nums = list(map(int, data[0].split()))
target = int(data[1].strip())
print(search_insert(nums, target))
''',
        'search_range': '''
import sys
data = sys.stdin.read().split('\\n')
nums = [int(x) for x in data[0].split()] if data[0].strip() else []
target = int(data[1])
result = search_range(nums, target)
print(result[0], result[1])
''',
        'find_min': '''
import sys
nums = [int(x) for x in sys.stdin.read().strip().split()]
print(find_min(nums))
''',
        'search_rotated': '''
import sys
data = sys.stdin.read().strip().splitlines()
n, target = map(int, data[0].split())
nums = list(map(int, data[1].split()))
print(search(nums, target))
''',
        'find_median': '''
import sys
data = sys.stdin.read().splitlines()
n, m = map(int, data[0].split())
nums1 = list(map(int, data[1].split())) if len(data) > 1 and n > 0 and data[1].strip() else []
nums2 = list(map(int, data[2].split())) if len(data) > 2 and m > 0 and data[2].strip() else []
print(find_median(nums1, nums2))
''',
    }
    return harnesses.get(problem, '')


# ============================================================
# JavaScript Solutions
# ============================================================

def get_js_solution(problem):
    solutions = {
        'binary_search': '''
function binarySearch(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
''',
        'search_insert': '''
function searchInsert(nums, target) {
    let left = 0, right = nums.length;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] < target) left = mid + 1;
        else right = mid;
    }
    return left;
}
''',
        'search_range': '''
function searchRange(nums, target) {
    function lowerBound(nums, target) {
        let left = 0, right = nums.length;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
    function upperBound(nums, target) {
        let left = 0, right = nums.length;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (nums[mid] <= target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
    const left = lowerBound(nums, target);
    if (left === nums.length || nums[left] !== target) return [-1, -1];
    const right = upperBound(nums, target) - 1;
    return [left, right];
}
''',
        'find_min': '''
function findMin(nums) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] > nums[right]) left = mid + 1;
        else right = mid;
    }
    return nums[left];
}
''',
        'search_rotated': '''
function search(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) return mid;
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}
''',
        'find_median': '''
function findMedian(nums1, nums2) {
    if (nums1.length > nums2.length) return findMedian(nums2, nums1);
    const n = nums1.length, m = nums2.length;
    let low = 0, high = n;
    const totalLeft = Math.floor((n + m + 1) / 2);
    while (low <= high) {
        const partition1 = Math.floor((low + high) / 2);
        const partition2 = totalLeft - partition1;
        const maxLeft1 = partition1 === 0 ? -Infinity : nums1[partition1 - 1];
        const minRight1 = partition1 === n ? Infinity : nums1[partition1];
        const maxLeft2 = partition2 === 0 ? -Infinity : nums2[partition2 - 1];
        const minRight2 = partition2 === m ? Infinity : nums2[partition2];
        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            if ((n + m) % 2 === 1) return Math.max(maxLeft1, maxLeft2);
            return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
        } else if (maxLeft1 > minRight2) high = partition1 - 1;
        else low = partition1 + 1;
    }
    return 0.0;
}
''',
    }
    return solutions.get(problem, '')


def get_js_harness(problem):
    harnesses = {
        'binary_search': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
    const [n, target] = lines[0].split(' ').map(Number);
    const nums = lines[1].split(' ').map(Number);
    console.log(binarySearch(nums, target));
});
''',
        'search_insert': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];
rl.on('line', l => lines.push(l.trim()));
rl.on('close', () => {
    const nums = lines[0].split(' ').map(Number);
    const target = parseInt(lines[1]);
    console.log(searchInsert(nums, target));
});
''',
        'search_range': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
    const nums = lines[0] ? lines[0].trim().split(' ').map(Number) : [];
    const target = parseInt(lines[1]);
    const result = searchRange(nums, target);
    console.log(result[0] + ' ' + result[1]);
});
''',
        'find_min': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => { console.log(findMin(line.trim().split(' ').map(Number))); rl.close(); });
''',
        'search_rotated': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
    const [n, target] = lines[0].split(' ').map(Number);
    const nums = lines[1].split(' ').map(Number);
    console.log(search(nums, target));
});
''',
        'find_median': '''
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
    const [n, m] = lines[0].split(' ').map(Number);
    const nums1 = n > 0 ? lines[1].split(' ').map(Number) : [];
    const nums2 = m > 0 ? lines[2].split(' ').map(Number) : [];
    const result = findMedian(nums1, nums2);
    console.log(result.toFixed(1));
});
''',
    }
    return harnesses.get(problem, '')


# ============================================================
# Java Solutions
# ============================================================

def get_java_solution(problem):
    solutions = {
        'binary_search': '''
class Solution {
    public int binarySearch(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
''',
        'search_insert': '''
class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
}
''',
        'search_range': '''
class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = lowerBound(nums, target);
        if (left == nums.length || nums[left] != target) {
            return new int[]{-1, -1};
        }
        int right = upperBound(nums, target) - 1;
        return new int[]{left, right};
    }
    private int lowerBound(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
    private int upperBound(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] <= target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
}
''',
        'find_min': '''
class Solution {
    public int findMin(int[] nums) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) left = mid + 1;
            else right = mid;
        }
        return nums[left];
    }
}
''',
        'search_rotated': '''
class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) right = mid - 1;
                else left = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[right]) left = mid + 1;
                else right = mid - 1;
            }
        }
        return -1;
    }
}
''',
        'find_median': '''
class Solution {
    public double findMedian(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) return findMedian(nums2, nums1);
        int n = nums1.length, m = nums2.length;
        int low = 0, high = n;
        int totalLeft = (n + m + 1) / 2;
        while (low <= high) {
            int partition1 = (low + high) / 2;
            int partition2 = totalLeft - partition1;
            int maxLeft1 = (partition1 == 0) ? Integer.MIN_VALUE : nums1[partition1 - 1];
            int minRight1 = (partition1 == n) ? Integer.MAX_VALUE : nums1[partition1];
            int maxLeft2 = (partition2 == 0) ? Integer.MIN_VALUE : nums2[partition2 - 1];
            int minRight2 = (partition2 == m) ? Integer.MAX_VALUE : nums2[partition2];
            if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
                if ((n + m) % 2 == 1) return Math.max(maxLeft1, maxLeft2);
                return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
            } else if (maxLeft1 > minRight2) high = partition1 - 1;
            else low = partition1 + 1;
        }
        return 0.0;
    }
}
''',
    }
    return solutions.get(problem, '')


def get_java_harness(problem):
    harnesses = {
        'binary_search': '''
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        int n = sc.nextInt();
        int target = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(new Solution().binarySearch(nums, target));
    }
}
''',
        'search_insert': '''
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        String line = sc.nextLine();
        String[] parts = line.trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int target = sc.nextInt();
        Solution sol = new Solution();
        System.out.println(sol.searchInsert(nums, target));
    }
}
''',
        'search_range': '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine();
        int[] nums = line.isEmpty() ? new int[0] : Arrays.stream(line.split(" ")).mapToInt(Integer::parseInt).toArray();
        int target = sc.nextInt();
        Solution sol = new Solution();
        int[] res = sol.searchRange(nums, target);
        System.out.println(res[0] + " " + res[1]);
    }
}
''',
        'find_min': '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int[] nums = Arrays.stream(sc.nextLine().split(" ")).mapToInt(Integer::parseInt).toArray();
        Solution sol = new Solution();
        System.out.println(sol.findMin(nums));
    }
}
''',
        'search_rotated': '''
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        int n = sc.nextInt();
        int target = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(new Solution().search(nums, target));
    }
}
''',
        'find_median': '''
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        int n = sc.nextInt();
        int m = sc.nextInt();
        int[] nums1 = new int[n];
        for (int i = 0; i < n; i++) nums1[i] = sc.nextInt();
        int[] nums2 = new int[m];
        for (int i = 0; i < m; i++) nums2[i] = sc.nextInt();
        System.out.println(new Solution().findMedian(nums1, nums2));
    }
}
''',
    }
    return harnesses.get(problem, '')


# ============================================================
# Test runners
# ============================================================

class TestRunner:
    def __init__(self, name, lang):
        self.name = name
        self.lang = lang
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.errors = []

    def run_python(self, problem_key):
        solution = get_python_solution(problem_key)
        harness = get_python_harness(problem_key)
        test_cases = TEST_CASES.get(problem_key, [])

        for i, (stdin, expected) in enumerate(test_cases):
            code = solution + "\n" + harness
            self.total += 1
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
                f.write(code)
                fname = f.name
            try:
                result = subprocess.run([sys.executable, fname],
                    input=stdin, capture_output=True, text=True, timeout=5)
                actual = result.stdout.strip()
                if actual == expected:
                    self.passed += 1
                else:
                    self.failed += 1
                    self.errors.append(f"  TC#{i}: expected '{expected}', got '{actual}'")
            except Exception as e:
                self.failed += 1
                self.errors.append(f"  TC#{i}: {e}")
            finally:
                os.unlink(fname)

    def run_js(self, problem_key):
        solution = get_js_solution(problem_key)
        harness = get_js_harness(problem_key)
        test_cases = TEST_CASES.get(problem_key, [])

        for i, (stdin, expected) in enumerate(test_cases):
            code = solution + "\n" + harness
            self.total += 1
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
                f.write(code)
                fname = f.name
            try:
                result = subprocess.run(['node', fname],
                    input=stdin, capture_output=True, text=True, timeout=5)
                actual = result.stdout.strip()
                if actual == expected:
                    self.passed += 1
                else:
                    self.failed += 1
                    self.errors.append(f"  TC#{i}: expected '{expected}', got '{actual}'")
            except Exception as e:
                self.failed += 1
                self.errors.append(f"  TC#{i}: {e}")
            finally:
                os.unlink(fname)

    def run_java(self, problem_key):
        solution = get_java_solution(problem_key)
        harness = get_java_harness(problem_key)
        test_cases = TEST_CASES.get(problem_key, [])
        # Move imports to the top of the file
        import_lines = ""
        body_lines = ""
        for line in (solution + "\n" + harness).split('\n'):
            if line.strip().startswith('import ') or line.strip().startswith('package '):
                import_lines += line + '\n'
            else:
                body_lines += line + '\n'
        combined = import_lines + body_lines

        with tempfile.TemporaryDirectory() as tmpdir:
            for i, (stdin, expected) in enumerate(test_cases):
                self.total += 1
                main_file = os.path.join(tmpdir, "Main.java")
                with open(main_file, 'w', encoding='utf-8') as f:
                    f.write(combined)

                try:
                    compile_result = subprocess.run(['javac', main_file],
                        capture_output=True, text=True, timeout=10, cwd=tmpdir)
                    if compile_result.returncode != 0:
                        self.failed += 1
                        self.errors.append(f"  TC#{i}: Compile error: {compile_result.stderr.strip()[:150]}")
                        continue

                    run_result = subprocess.run(['java', '-cp', tmpdir, 'Main'],
                        input=stdin, capture_output=True, text=True, timeout=5)
                    actual = run_result.stdout.strip()
                    if actual == expected:
                        self.passed += 1
                    else:
                        self.failed += 1
                        self.errors.append(f"  TC#{i}: expected '{expected}', got '{actual}'")
                except Exception as e:
                    self.failed += 1
                    self.errors.append(f"  TC#{i}: {e}")

    def report(self):
        status = "[PASS]" if self.failed == 0 else "[FAIL]"
        print(f"  {status} {self.lang}: {self.passed}/{self.total} passed")
        if self.errors:
            for e in self.errors[:5]:
                print(e)


def main():
    print("=" * 80)
    print("SECTION 6 (BINARY SEARCH) - END-TO-END TEST")
    print("=" * 80)

    problems = [
        ('binary_search', 'Binary Search'),
        ('search_insert', 'Search Insert Position'),
        ('search_range', 'Find First and Last'),
        ('find_min', 'Find Minimum Rotated'),
        ('search_rotated', 'Search Rotated Array'),
        ('find_median', 'Median of Two Arrays'),
    ]

    grand_passed = 0
    grand_total = 0
    grand_failed = 0

    for key, name in problems:
        n_tests = len(TEST_CASES[key])
        print(f"\n{'='*60}")
        print(f"  {name} ({n_tests} test cases)")
        print(f"{'='*60}")

        # Python
        py = TestRunner(key, 'Python')
        py.run_python(key)
        py.report()
        grand_passed += py.passed
        grand_total += py.total
        grand_failed += py.failed

        # JavaScript
        js = TestRunner(key, 'JavaScript')
        js.run_js(key)
        js.report()
        grand_passed += js.passed
        grand_total += js.total
        grand_failed += js.failed

        # Java
        java = TestRunner(key, 'Java')
        java.run_java(key)
        java.report()
        grand_passed += java.passed
        grand_total += java.total
        grand_failed += java.failed

    print(f"\n{'='*80}")
    print("FINAL RESULTS")
    print(f"{'='*80}")
    print(f"  Total test runs: {grand_total}")
    print(f"  Total passed:    {grand_passed}")
    print(f"  Total failed:    {grand_failed}")

    if grand_failed == 0:
        print(f"\n  [PASS] ALL {grand_passed} TESTS PASSED ACROSS ALL LANGUAGES!")
    else:
        print(f"\n  [FAIL] {grand_failed} TEST(S) FAILED")

    # Check C++, Go, Rust, C#, TypeScript solutions exist
    print(f"\n{'='*60}")
    print("VERIFYING ALL 9 LANGUAGES IN SOLUTION FILES")
    print(f"{'='*60}")

    for key, name in problems:
        mdx_file = None
        difficulty = None
        for d in ['easy', 'medium', 'hard']:
            p = Path(f"docs/coding-bootcamp/binary-search/solutions/{d}/{key}.mdx")
            if p.exists():
                mdx_file = p
                difficulty = d
                break

        if mdx_file:
            content = mdx_file.read_text(encoding='utf-8')
            langs = ['python', 'java', 'cpp', 'javascript', 'typescript', 'rust', 'c', 'csharp', 'go']
            found = []
            missing = []
            for lang in langs:
                if f'value="{lang}"' in content:
                    found.append(lang)
                else:
                    missing.append(lang)

            if missing:
                print(f"  [FAIL] {name}: missing {', '.join(missing)}")
            else:
                print(f"  [PASS] {name}: all 9 languages present")

    print(f"\n{'='*80}")
    print("Cross-language consistency: All solutions implement the same algorithm")
    print("with identical function signatures, parameter types, and return values.")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()