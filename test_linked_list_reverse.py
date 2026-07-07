#!/usr/bin/env python3
"""
Test the reverse_linked_list function
"""

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_linked_list(head: ListNode) -> ListNode:
    """Iterative reverssal solution"""
    prev = None
    current = head

    while current:
        next_temp = current.next   # Save the next node before we overwrite the pointer
        current.next = prev        # Reverse: point current node backward to prev
        prev = current             # Move prev forward: current joins the reversed portion
        current = next_temp        # Move current forward to the next original node

    return prev                  # prev is the new head of the reversed list


def list_to_linked_list(lst):
    """Helper function to convert a Python list to a linked list"""
    if not lst:
        return None

    head = ListNode(lst[0])
    current = head
    for val in lst[1:]:
        current.next = ListNode(val)
        current = current.next

    return head


def linked_list_to_list(head):
    """Helper function to convert a linked list back to a Python list"""
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result


def test_reverse_linked_list():
    """Test the reverse_linked_list function"""
    print("Testing Reverse Linked List solution...")

    # Test case 1: [1, 2, 3, 4, 5] -> [5, 4, 3, 2, 1]
    lst1 = [1, 2, 3, 4, 5]
    linked_lst1 = list_to_linked_list(lst1)
    reversed_linked_lst1 = reverse_linked_list(linked_lst1)
    result1 = linked_list_to_list(reversed_linked_lst1)
    expected1 = [5, 4, 3, 2, 1]
    print(f"Input: {lst1} -> Expected: {expected1}, Got: {result1}, Match: {result1 == expected1}")

    # Test case 2: [1, 2] -> [2, 1]
    lst2 = [1, 2]
    linked_lst2 = list_to_linked_list(lst2)
    reversed_linked_lst2 = reverse_linked_list(linked_lst2)
    result2 = linked_list_to_list(reversed_linked_lst2)
    expected2 = [2, 1]
    print(f"Input: {lst2} -> Expected: {expected2}, Got: {result2}, Match: {result2 == expected2}")

    # Test case 3: [] -> []
    lst3 = []
    linked_lst3 = list_to_linked_list(lst3)
    reversed_linked_lst3 = reverse_linked_list(linked_lst3)
    result3 = linked_list_to_list(reversed_linked_lst3)
    expected3 = []
    print(f"Input: {lst3} -> Expected: {expected3}, Got: {result3}, Match: {result3 == expected3}")

    # Test case 4: [1] -> [1]
    lst4 = [1]
    linked_lst4 = list_to_linked_list(lst4)
    reversed_linked_lst4 = reverse_linked_list(linked_lst4)
    result4 = linked_list_to_list(reversed_linked_lst4)
    expected4 = [1]
    print(f"Input: {lst4} -> Expected: {expected4}, Got: {result4}, Match: {result4 == expected4}")

    # Test cases from the mdx file (input format is slightly different - first line is n, second is values)
    test_cases = [
        ([1, 2], [2, 1]),        # Corresponds to: n=2, then "1 2"
        ([1, 2, 3], [3, 2, 1]),  # Corresponds to: n=3, then "1 2 3"
        ([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]),
        ([3, 1, 3], [3, 1, 3]),
        ([7, 7, 7, 7], [7, 7, 7, 7]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([5, 5], [5, 5]),
        ([-1, -2, -3], [-3, -2, -1]),
        ([0], [0]),
        ([-5, 0, 5], [5, 0, -5]),
        ([1, 2, 3, 4], [4, 3, 2, 1]),
        ([1000000, 2000000, 3000000], [3000000, 2000000, 1000000]),
        ([1, 0, 1, 0], [0, 1, 0, 1]),
        ([10, 20, 30, 40, 50], [50, 40, 30, 20, 10]),
        ([-10], [-10]),
        ([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    ]

    print("\nRunning additional test cases:")
    all_passed = True
    for i, (input_vals, expected_vals) in enumerate(test_cases, 1):
        linked_list = list_to_linked_list(input_vals)
        reversed_list = reverse_linked_list(linked_list)
        actual_result = linked_list_to_list(reversed_list)

        passed = actual_result == expected_vals
        all_passed = all_passed and passed

        if not passed:
            print(f"FAIL - Test {i}: Input {input_vals}, Expected {expected_vals}, Got {actual_result}")
        else:
            print(f"PASS - Test {i}: {actual_result}")

    print(f"\nAll tests passed: {all_passed}")
    return all_passed


if __name__ == "__main__":
    print("Testing the reverse_linked_list function from the coding bootcamp solution...")
    print("="*70)

    all_passed = test_reverse_linked_list()

    print("\n" + "="*70)
    if all_passed:
        print("SUCCESS: All reverse_linked_list tests passed!")
        print("The solution in the coding bootcamp is correct!")
    else:
        print("FAILURE: Some tests failed!")
        print("The solution in the coding bootcamp needs correction!")