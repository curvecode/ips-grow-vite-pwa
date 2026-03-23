# Offline + PWA Solutions Report

This report documents 3 lightweight cases applied from the target architecture diagram.

## Case 1: Network Check Gate (Online vs Offline path)

Goal:
- Route write operations to remote API only when browser network and backend health are both available.

What was applied:
- Added a single helper named isApiReachable that combines navigator.onLine + backend health check.
- Reused this helper in submit flow, delete flow, and sync flow.

Why this helps:
- Avoids unnecessary failed calls when device is disconnected.
- Keeps behavior consistent across Add, Update, Delete, and Sync.

## Case 2: Sync + Cache for Read Path

Goal:
- Keep list loading resilient when API request fails.

What was applied:
- Added a small cached-response fallback for daily buys reads in api layer.
- On successful API read, response is saved to cache.
- If API read fails, cached response is returned (if available).

Why this helps:
- User still sees latest known server data when backend is temporarily unreachable.
- Reduces empty-state risk during unstable network.

## Case 3: Queue + Retry Tracking (Offline mutation safety)

Goal:
- Improve pending operation reliability and observability.

What was applied:
- Added retries and lastError fields for pending operations in IndexedDB queue.
- Added markPendingOperationFailed helper to increment retry count on failed sync attempt.
- Added max retry filter in sync engine to avoid infinite reprocessing loop.

Why this helps:
- Captures failure history per operation.
- Prevents one bad operation from retrying forever without limit.

## PWA Enhancements Included

What was applied in service worker:
- Added offline fallback page for navigation requests.
- Added API runtime cache for GET /api/daily-buys (network first, cache fallback).
- Added stale-while-revalidate style behavior for static assets.

Why this helps:
- Better offline experience for page navigation and repeat usage.
- Faster perceived load for already cached app resources.

## Notes

- This implementation intentionally stays light (3 cases only), as requested.
- Existing local storage + IndexedDB queue architecture in the app was preserved and extended.
