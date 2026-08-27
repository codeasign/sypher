# Driftwood CI dataset notes

CI pipeline, 30 days.

Flaky rate by day (%): 18, 16, 20, 15, 14, 12, 13, 11, 9, 10, 8, 9, 7, 8, 6, 7, 5, 6, 5, 4, 5, 4, 3, 4, 3, 3, 2, 3, 2, 2
Fail count by test: test_checkout_timing=34, test_upload_large_file=27, test_search_pagination=21, test_login_oauth_redirect=18, test_notification_delay=12, test_cart_sync=9
Time to green buckets: [{"label":"<5m","count":61},{"label":"5-15m","count":84},{"label":"15-30m","count":38},{"label":"30-60m","count":14},{"label":"60m+","count":6}], total 203