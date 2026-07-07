#!/usr/bin/env python3
"""
Test script to verify that solutions work correctly with the provided examples and test cases
"""
import sys
from typing import List, Tuple


def two_sum(nums: List[int], target: int) -> List[int]:
    """Optimal hash map solution for TwoSum"""
    seen = {}  # val -> index
    for i, val in enumerate(nums):
        complement = target - val
        if complement in seen:
            return [seen[complement], i]
        seen[val] = i
    return [-1, -1]


def test_two_sum():
    """Test the two_sum function with the examples from the problem"""
    print("Testing Two Sum solution...")

    # Test case 1: nums = [2, 7, 11, 15], target = 9 → expect [0, 1]
    nums1 = [2, 7, 11, 15]
    target1 = 9
    result1 = two_sum(nums1, target1)
    expected1 = [0, 1]
    print(f"Test 1: {result1} == {expected1}? {result1 == expected1}")
    if result1 != expected1:
        print(f"ERROR: Expected [0, 1], got {result1}")

    # Test case 2: nums = [3, 2, 4], target = 6 → expect [1, 2]
    nums2 = [3, 2, 4]
    target2 = 6
    result2 = two_sum(nums2, target2)
    expected2 = [1, 2]
    print(f"Test 2: {result2} == {expected2}? {result2 == expected2}")
    if result2 != expected2:
        print(f"ERROR: Expected [1, 2], got {result2}")

    # Test case 3: nums = [3, 3], target = 6 → expect [0, 1]
    nums3 = [3, 3]
    target3 = 6
    result3 = two_sum(nums3, target3)
    expected3 = [0, 1]
    print(f"Test 3: {result3} == {expected3}? {result3 == expected3}")
    if result3 != expected3:
        print(f"ERROR: Expected [0, 1], got {result3}")

    # Additional test cases from the MDX file
    test_cases = [
        ("2 7 11 15", "9", "0 1"),
        ("3 2 4", "6", "1 2"),
        ("3 3", "6", "0 1"),
        ("1 5 9 12", "10", "0 2"),
        ("-3 4 3 90", "0", "0 2"),
        ("0 4 3 0", "0", "0 3"),
        ("-1 -2 -3 -4 -5", "-8", "2 4"),
        ("1 2 3 4 5", "9", "3 4"),
        ("10 20 30 40 50", "90", "3 4"),
        ("-10 -5 0 5 10", "0", "1 3"),
        ("100 200 300 400", "500", "1 2"),
        ("7 1 5 3 6 4", "8", "0 1"),
        ("2 5 5 11", "10", "1 2"),
        ("1 6 3 2 5", "11", "1 4"),
        ("0 0 0 0", "0", "0 1"),
        ("-5 0 5 10", "-5", "0 1"),
        ("3 2 4 1", "5", "0 1"),
        ("8 7 2 5 3 1", "10", "0 2"),
        ("1 15 2 7 11", "9", "2 3"),
        ("4 5 6 7 8", "13", "2 3"),
    ]

    print("\nRunning all test cases from the MDX file:")
    all_passed = True
    for i, (nums_str, target_str, expected_str) in enumerate(test_cases, 1):
        nums = list(map(int, nums_str.split()))
        target = int(target_str)
        result = two_sum(nums, target)

        # Format the expected output string to be comparable
        expected_nums = list(map(int, expected_str.split()))
        result_str = f"{result[0]} {result[1]}"
        expected_formatted = f"{expected_nums[0]} {expected_nums[1]}"

        passed = result_str == expected_formatted
        all_passed = all_passed and passed

        if not passed:
            print(f"FAIL Test case {i}: Input nums={nums}, target={target} | Expected [{expected_formatted}], got [{result_str}]")
        else:
            print(f"PASS Test case {i}: [{result_str}]")

    print(f"\nTwo Sum tests passed: {all_passed}")
    return all_passed


def max_profit(prices: List[int]) -> int:
    """Optimal one-pass solution for Best Time to Buy and Sell Stock"""
    # Track the minimum price seen so far and the maximum profit possible
    min_price = float('inf')
    max_profit_val = 0

    for price in prices:
        # Update the minimum buying price encountered so far
        if price < min_price:
            min_price = price
        else:
            # Calculate profit if we sell at the current price
            profit = price - min_price
            # Update the maximum profit if this is better
            if profit > max_profit_val:
                max_profit_val = profit

    return max_profit_val


def test_max_profit():
    """Test the max_profit function with the examples from the problem"""
    print("\nTesting Best Time to Buy and Sell Stock solution...")

    # Test case 1: prices = [7, 1, 5, 3, 6, 4] → expect 5 (buy at 1, sell at 6)
    prices1 = [7, 1, 5, 3, 6, 4]
    result1 = max_profit(prices1)
    expected1 = 5
    print(f"Test 1: {result1} == {expected1}? {result1 == expected1}")
    if result1 != expected1:
        print(f"ERROR: Expected {expected1}, got {result1}")

    # Test case 2: prices = [7, 6, 4, 3, 1] → expect 0 (decreasing, no profit)
    prices2 = [7, 6, 4, 3, 1]
    result2 = max_profit(prices2)
    expected2 = 0
    print(f"Test 2: {result2} == {expected2}? {result2 == expected2}")
    if result2 != expected2:
        print(f"ERROR: Expected {expected2}, got {result2}")

    # Additional test cases from the MDX file
    test_cases = [
        ([7, 1, 5, 3, 6, 4], 5),
        ([7, 6, 4, 3, 1], 0),
        ([1, 2, 3, 4, 5], 4),
        ([5, 4, 3, 2, 1], 0),
        ([3, 3, 3, 3, 3], 0),
        ([1], 0),
        ([2, 1], 0),
        ([1, 2], 1),
        ([2, 4, 1], 2),
        ([3, 2, 6, 5, 0, 3], 4),
        ([10, 9, 8, 7, 6, 5, 4], 0),
        ([1, 100, 2, 200, 3, 300], 299),
        ([5, 10, 5, 10, 5, 10], 5),
        ([7, 2, 5, 1, 3, 6, 4], 5),
        ([100, 80, 120, 60, 140, 40, 160], 120),
        ([1, 1, 1, 1, 1], 0),
        ([2, 2, 2, 2, 2], 0),
        ([3, 5, 1, 7, 4, 9, 2], 8),
        ([10, 20, 30, 40, 50, 25, 15], 40),
        ([5, 2, 10, 1, 12, 8], 11),
    ]

    print("\nRunning all test cases from the MDX file:")
    all_passed = True
    for i, (prices, expected) in enumerate(test_cases, 1):
        result = max_profit(prices)
        passed = result == expected
        all_passed = all_passed and passed

        if not passed:
            print(f"FAIL Test case {i}: Input prices={prices} | Expected {expected}, got {result}")
        else:
            print(f"PASS Test case {i}: {result}")

    print(f"\nMax Profit tests passed: {all_passed}")
    return all_passed


def remove_duplicates(nums: List[int]) -> int:
    """
    Solution for removing duplicates from sorted array
    Returns the length of the modified array
    """
    if not nums:
        return 0

    write_idx = 1
    for read_idx in range(1, len(nums)):
        if nums[read_idx] != nums[read_idx-1]:
            nums[write_idx] = nums[read_idx]
            write_idx += 1

    return write_idx


def test_remove_duplicates():
    """Test the remove duplicates function"""
    print("\n" + "="*50)
    print("Testing Remove Duplicates solution...")

    # Test case for [1,1,2] -> return 2, nums becomes [1, 2, ?]
    nums = [1, 1, 2]
    result_length = remove_duplicates(nums)
    expected_length = 2
    print(f"Test: nums={nums[:result_length]} has length {result_length}, expected {expected_length}: {result_length == expected_length}")

    # Another test
    nums2 = [0,0,1,1,1,2,2,3,3,4]
    expected_length2 = 5
    result_length2 = remove_duplicates(nums2.copy())  # Make copy to preserve original for comparison
    expected_prefix = [0,1,2,3,4]
    actual_prefix = nums2[:result_length2]
    print(f"Test: nums={actual_prefix} has length {result_length2}, expected length {expected_length2}: {result_length2 == expected_length2 and actual_prefix == expected_prefix}")


if __name__ == "__main__":
    print("Checking coding bootcamp solutions...\n")

    # Test the Two Sum problem
    two_sum_passed = test_two_sum()

    # Test the Max Profit Problem
    max_profit_passed = test_max_profit()

    # Test the Remove Duplicates Problem
    test_remove_duplicates()

    print(f"\nComplete.")
    print(f"Two Sum tests: {'PASSED' if two_sum_passed else 'FAILED'}")
    print(f"Max Profit tests: {'PASSED' if max_profit_passed else 'FAILED'}")

    if two_sum_passed and max_profit_passed:
        print("SUCCESS: Most solution tests passed!")
    else:
        print("FAILURE: Some solution tests failed!")
        sys.exit(1)

    print("="*50)
    print("Verification complete.")