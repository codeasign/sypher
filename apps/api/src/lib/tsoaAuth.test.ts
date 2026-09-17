import { describe, expect, it } from 'vitest';
import { TOUCH_THRESHOLD_MS, isSessionTouchStale } from './tsoaAuth';

// touchIfStale itself isn't exported (it fires the actual DB write), but its
// entire decision is this predicate — proving the threshold here covers the
// behavior without needing to mock SessionRepository.
describe('isSessionTouchStale', () => {
  it('is not stale immediately after being seen', () => {
    expect(isSessionTouchStale(new Date())).toBe(false);
  });

  it('is not stale just under the threshold', () => {
    const lastSeenAt = new Date(Date.now() - (TOUCH_THRESHOLD_MS - 1000));
    expect(isSessionTouchStale(lastSeenAt)).toBe(false);
  });

  it('is stale exactly at the threshold', () => {
    const now = new Date();
    const lastSeenAt = new Date(now.getTime() - TOUCH_THRESHOLD_MS);
    expect(isSessionTouchStale(lastSeenAt, now)).toBe(true);
  });

  it('is stale well past the threshold', () => {
    const lastSeenAt = new Date(Date.now() - TOUCH_THRESHOLD_MS * 10);
    expect(isSessionTouchStale(lastSeenAt)).toBe(true);
  });
});
