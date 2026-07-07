#!/usr/bin/env python3
"""
Test the product_except_self function
"""


def product_except_self(nums):
    """Optimal prefix and suffix solution for Product of Array Except Self"""
    n = len(nums)
    result = [1] * n

    # Left pass: compute prefix products
    prefix = 1
    for i in range(n):
        result[i] = prefix          # Store product of elements to the left
        prefix *= nums[i]           # Update prefix for the next position

    # Right pass: multiply by suffix products
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix         # Multiply by product of elements to the right
        suffix *= nums[i]           # Update suffix for the next position

    return result


def test_product_except_self():
    """Test the product_except_self function with examples from the problem"""
    print("Testing Product of Array Except Self solution...")

    # Test case 1: [1,2,3,4] → [24,12,8,6]
    nums1 = [1, 2, 3, 4]
    expected1 = [24, 12, 8, 6]
    result1 = product_except_self(nums1)
    print(f"Input: {nums1}")
    print(f"Expected: {expected1}")
    print(f"Got: {result1}")
    print(f"Match: {result1 == expected1}")
    print()

    # Test case 2: [-1,1,0,-3,3] → [0,0,9,0,0]
    nums2 = [-1, 1, 0, -3, 3]
    expected2 = [0, 0, 9, 0, 0]
    result2 = product_except_self(nums2)
    print(f"Input: {nums2}")
    print(f"Expected: {expected2}")
    print(f"Got: {result2}")
    print(f"Match: {result2 == expected2}")
    print()

    # Test cases from the MDX file
    test_cases = [
        ([1, 2, 3, 4], [24, 12, 8, 6]),
        ([-1, 1, 0, -3, 3], [0, 0, 9, 0, 0]),
        ([2, 3, 4, 5], [60, 40, 30, 24]),
        ([1, 1, 1, 1], [1, 1, 1, 1]),
        ([10, 20, 30, 40], [24000, 12000, 8000, 6000]),
        ([1, 2], [2, 1]),
        ([5, 6, 7, 8], [336, 280, 240, 210]),
        ([2, 4, 6, 8, 10], [1920, 960, 640, 480, 384]),
        ([3, 1, 2], [2, 6, 3]),
        ([6, 2, 3, 4], [24, 72, 48, 36]),
        ([1, 2, 3, 4, 5, 6], [720, 360, 240, 180, 144, 120]),
        ([-2, -3, 4, -5], [60, 40, -30, 24]),
        ([7, 8, 9, 10], [720, 630, 560, 504]),
        ([2, 2, 2, 2], [8, 8, 8, 8]),
        ([10, 1, 10, 1], [10, 100, 10, 100]),
        ([4, 5, 6], [30, 24, 20]),
        ([3, 5, 2, 4], [40, 24, 60, 30]),
        ([100, 200, 300], [60000, 30000, 20000]),
        ([1, 2, 3, 0, 5], [0, 0, 0, 30, 0]),
        ([0, 0, 1, 2], [0, 0, 0, 0]),
    ]

    print("Running all test cases from the MDX file:")
    all_passed = True
    for i, (nums, expected) in enumerate(test_cases, 1):
        result = product_except_self(nums[:])  # Pass a copy to avoid modifying originals
        passed = result == expected
        all_passed = all_passed and passed

        if not passed:
            print(f"FAIL Test case {i}: Input {nums} | Expected {expected}, got {result}")
        else:
            print(f"PASS Test case {i}: Match = {result == expected}")

    print(f"\nProduct Array tests passed: {all_passed}")
    return all_passed


if __name__ == "__main__":
    print("Testing the product_except_self function from the coding bootcamp solution...")
    print("="*70)

    all_passed = test_product_except_self()

    print("\n" + "="*70)
    if all_passed:
        print("SUCCESS: All product_except_self tests passed!")
        print("The solution in the coding bootcamp is correct!")
    else:
        print("FAILURE: Some tests failed!")
        print("The solution in the coding bootcamp needs correction!")