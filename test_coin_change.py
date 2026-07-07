#!/usr/bin/env python3
"""
Test the coin_change function
"""


def coin_change(coins, amount):
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


def test_coin_change():
    """Test the coin_change function"""
    print("Testing Coin Change solution...")

    # Test case from examples:
    # Example 1: [1,2,5], amount=11 -> 3 (5+5+1)
    result1 = coin_change([1, 2, 5], 11)
    expected1 = 3
    print(f"([1,2,5], 11) -> Expected: {expected1}, Got: {result1}, Match: {result1 == expected1}")

    # Example 2: [2], amount=3 -> -1 (impossible)
    result2 = coin_change([2], 3)
    expected2 = -1
    print(f"([2], 3) -> Expected: {expected2}, Got: {result2}, Match: {result2 == expected2}")

    # Example 3: [1], amount=0 -> 0
    result3 = coin_change([1], 0)
    expected3 = 0
    print(f"([1], 0) -> Expected: {expected3}, Got: {result3}, Match: {result3 == expected3}")

    # Test cases from the MDX file
    test_cases = [
        # stdin: '3 11\n1 2 5\n', expectedOutput: '3\n'
        ([1, 2, 5], 11, 3),
        # stdin: '1 3\n2\n', expectedOutput: '-1\n'
        ([2], 3, -1),
        # stdin: '1 0\n1\n', expectedOutput: '0\n'
        ([1], 0, 0),
        # stdin: '1 5\n1\n', expectedOutput: '5\n'
        ([1], 5, 5),
        # stdin: '4 27\n2 5 10 1\n', expectedOutput: '4\n'
        ([2, 5, 10, 1], 27, 4),
        # stdin: '1 2\n3\n', expectedOutput: '-1\n'
        ([3], 2, -1),
        # stdin: '2 15\n3 7\n', expectedOutput: '5\n'
        ([3, 7], 15, 5),
        # stdin: '3 8\n1 3 5\n', expectedOutput: '2\n'
        ([1, 3, 5], 8, 2),
        # stdin: '3 14\n2 3 7\n', expectedOutput: '2\n'
        ([2, 3, 7], 14, 2),
        # stdin: '3 6\n1 2 3\n', expectedOutput: '2\n'
        ([1, 2, 3], 6, 2),
        # stdin: '3 30\n5 10 25\n', expectedOutput: '2\n'
        ([5, 10, 25], 30, 2),
        # stdin: '4 49\n1 5 10 25\n', expectedOutput: '7\n'
        ([1, 5, 10, 25], 49, 7),
        # stdin: '4 99\n1 5 10 25\n', expectedOutput: '9\n'
        ([1, 5, 10, 25], 99, 9),
        # stdin: '3 100\n1 2 5\n', expectedOutput: '20\n'
        ([1, 2, 5], 100, 20),
        # stdin: '3 1\n1 2 5\n', expectedOutput: '1\n'
        ([1, 2, 5], 1, 1),
        # stdin: '3 2\n1 2 5\n', expectedOutput: '1\n'
        ([1, 2, 5], 2, 1),
        # stdin: '3 4\n1 2 5\n', expectedOutput: '2\n'
        ([1, 2, 5], 4, 2),
        # stdin: '3 1\n2 5 10\n', expectedOutput: '-1\n'
        ([2, 5, 10], 1, -1),
        # stdin: '4 6249\n186 419 83 408\n', expectedOutput: '20\n'
        ([186, 419, 83, 408], 6249, 20),
        # stdin: '3 0\n1 2 5\n', expectedOutput: '0\n'
        ([1, 2, 5], 0, 0),
    ]

    print("\nRunning all test cases from the MDX file:")
    all_passed = True
    for i, (coins, amount, expected) in enumerate(test_cases, 1):
        result = coin_change(coins, amount)
        passed = result == expected
        all_passed = all_passed and passed

        if not passed:
            print(f"FAIL - Test {i}: coins={coins}, amount={amount} -> Expected: {expected}, Got: {result}")
        else:
            print(f"PASS - Test {i}: coins={coins}, amount={amount} -> Result: {result}")

    print(f"\nAll tests passed: {all_passed}")
    return all_passed


if __name__ == "__main__":
    print("Testing the coin_change function from the coding bootcamp solution...")
    print("="*70)

    all_passed = test_coin_change()

    print("\n" + "="*70)
    if all_passed:
        print("SUCCESS: All coin_change tests passed!")
        print("The solution in the coding bootcamp is correct!")
    else:
        print("FAILURE: Some tests failed!")
        print("The solution in the coding bootcamp needs correction!")