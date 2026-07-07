#!/usr/bin/env python3
"""
Test the remove_duplicates function specifically
"""


def remove_duplicates(nums):
    """Correct implementation from the solution"""
    if not nums:
        return 0
    k = 1
    for i in range(1, len(nums)):
        if nums[i] != nums[k - 1]:
            nums[k] = nums[i]
            k += 1
    return k


def test_remove_duplicates():
    """Test the corrected remove_duplicates function"""
    print("Testing Remove Duplicates solution...")

    # Test with the example from the problem description
    nums = [0,0,1,1,1,2,2,3,3,4]
    original_nums = nums[:]  # Make a copy to compare
    result_length = remove_duplicates(nums)
    expected_length = 5
    expected_first_part = [0, 1, 2, 3, 4]

    print(f"Input: {original_nums}")
    print(f"Length returned: {result_length} (expected: {expected_length})")
    print(f"First {result_length} elements: {nums[:result_length]}")
    print(f"Expected first part: {expected_first_part}")

    length_correct = result_length == expected_length
    values_correct = nums[:result_length] == expected_first_part

    print(f"Length correct: {length_correct}")
    print(f"Values correct: {values_correct}")

    if length_correct and values_correct:
        print("SUCCESS: Remove duplicates test passed!")
        return True
    else:
        print("FAILURE: Remove duplicates test failed!")
        return False


def test_another_case():
    """Test another example"""
    print("\nAnother test case: [1,1,2]")
    nums = [1,1,2]
    original_nums = nums[:]
    result_length = remove_duplicates(nums)
    expected_length = 2
    expected_first_part = [1, 2]

    print(f"Input: {original_nums}")
    print(f"Length returned: {result_length} (expected: {expected_length})")
    print(f"First {result_length} elements: {nums[:result_length]}")
    print(f"Expected first part: {expected_first_part}")

    length_correct = result_length == expected_length
    values_correct = nums[:result_length] == expected_first_part

    print(f"Length correct: {length_correct}")
    print(f"Values correct: {values_correct}")

    if length_correct and values_correct:
        print("SUCCESS: Second test passed!")
        return True
    else:
        print("FAILURE: Second test failed!")
        return False


if __name__ == "__main__":
    print("Testing the remove_duplicates function from the coding bootcamp solution...")
    print("="*65)

    first_test = test_remove_duplicates()
    second_test = test_another_case()

    print("\n" + "="*65)
    if first_test and second_test:
        print("SUCCESS: All remove_duplicates tests passed!")
        print("The solution in the coding bootcamp is correct!")
    else:
        print("FAILURE: Some tests failed!")
        print("The solution in the coding bootcamp needs correction!")