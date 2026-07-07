#!/usr/bin/env python3
"""
Final verification script for sypher coding bootcamp problems
"""
from typing import List, Optional


def two_sum(nums: List[int], target: int) -> List[int]:
    """Optimal hash map solution for TwoSum"""
    seen = {}  # val -> index
    for i, val in enumerate(nums):
        complement = target - val
        if complement in seen:
            return [seen[complement], i]
        seen[val] = i
    return [-1, -1]


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


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_linked_list(head: Optional[ListNode]) -> Optional[ListNode]:
    """Iterative reversal solution"""
    prev = None
    current = head

    while current:
        next_temp = current.next   # Save the next node before we overwrite the pointer
        current.next = prev        # Reverse: point current node backward to prev
        prev = current             # Move prev forward: current joins the reversed portion
        current = next_temp        # Move current forward to the next original node

    return prev                  # prev is the new head of the reversed list


def product_except_self(nums: List[int]) -> List[int]:
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


def remove_duplicates(nums: List[int]) -> int:
    """Correct implementation from the solution"""
    if not nums:
        return 0
    k = 1
    for i in range(1, len(nums)):
        if nums[i] != nums[k - 1]:
            nums[k] = nums[i]
            k += 1
    return k


def coin_change(coins: List[int], amount: int) -> int:
    """DP implementation of coin change problem"""
    # dp[i] = minimum coins needed to make amount i
    # Use 'amount + 1' as a sentinel (larger than any possible answer)
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0  # Base case: 0 coins for amount 0

    # Build bottom-up from 1 to amount
    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                # dp[i] = min(dp[i], dp[i - coin] + 1)
                dp[i] = min(dp[i], dp[i - coin] + 1)

    # If dp[amount] is still the sentinel, return -1
    return dp[amount] if dp[amount] <= amount else -1


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


def main():
    print("SYMPHER CODING BOOTCAMP - FINAL VERIFICATION")
    print("="*60)

    print("\nTesting Two Sum...")
    assert two_sum([2, 7, 11, 15], 9) == [0, 1]
    assert two_sum([3, 2, 4], 6) == [1, 2]
    assert two_sum([3, 3], 6) == [0, 1]
    test_cases = [
        ("2 7 11 15", "9", "0 1"),
        ("3 2 4", "6", "1 2"),
        ("-3 4 3 90", "0", "0 2"),
    ]
    for nums_str, target_str, expected_str in test_cases:
        nums = list(map(int, nums_str.split()))
        target = int(target_str)
        expected_nums = list(map(int, expected_str.split()))
        result = two_sum(nums, target)
        assert result == expected_nums
    print("✓ Two Sum tests passed!")

    print("\nTesting Max Profit (Buy and Sell Stock)...")
    assert max_profit([7, 1, 5, 3, 6, 4]) == 5
    assert max_profit([7, 6, 4, 3, 1]) == 0
    assert max_profit([1, 2, 3, 4, 5]) == 4
    print("✓ Max Profit tests passed!")

    print("\nTesting Reverse Linked List...")
    # Test case 1: [1, 2, 3, 4, 5] -> [5, 4, 3, 2, 1]
    lst1 = [1, 2, 3, 4, 5]
    linked_lst1 = list_to_linked_list(lst1)
    reversed_linked_lst1 = reverse_linked_list(linked_lst1)
    result1 = linked_list_to_list(reversed_linked_lst1)
    expected1 = [5, 4, 3, 2, 1]
    assert result1 == expected1

    # Test empty and single cases
    lst2 = []
    linked_lst2 = list_to_linked_list(lst2)
    reversed_linked_lst2 = reverse_linked_list(linked_lst2)
    result2 = linked_list_to_list(reversed_linked_lst2)
    expected2 = []
    assert result2 == expected2

    lst3 = [1]
    linked_lst3 = list_to_linked_list(lst3)
    reversed_linked_lst3 = reverse_linked_list(linked_lst3)
    result3 = linked_list_to_list(reversed_linked_lst3)
    expected3 = [1]
    assert result3 == expected3
    print("✓ Reverse Linked List tests passed!")

    print("\nTesting Product of Array Except Self...")
    assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]
    assert product_except_self([-1, 1, 0, -3, 3]) == [0, 0, 9, 0, 0]
    assert product_except_self([2, 3, 4, 5]) == [60, 40, 30, 24]
    print("✓ Product of Array Except Self tests passed!")

    print("\nTesting Remove Duplicates...")
    nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
    expected_length = 5
    result_length = remove_duplicates(nums)
    assert result_length == expected_length
    expected_first_part = [0, 1, 2, 3, 4]
    assert nums[:result_length] == expected_first_part
    print("✓ Remove Duplicates tests passed!")

    print("\nTesting Coin Change...")
    assert coin_change([1, 2, 5], 11) == 3  # 5+5+1
    assert coin_change([2], 3) == -1   # impossible
    assert coin_change([1], 0) == 0
    assert coin_change([1, 3, 4], 6) == 2  # 3+3
    print("✓ Coin Change tests passed!")

    print("\n" + "="*60)
    print("SUCCESS: All coding bootcamp problems verified!")
    print("✓ Examples work correctly")
    print("✓ All test cases pass")
    print("✓ All solutions are correct")
    print("✓ Students can successfully complete all coding exercises")
    print("="*60)


if __name__ == "__main__":
    main()