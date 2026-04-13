---
name: vite-typescript-offline
description: "Design and implement offline-first TypeScript apps with Vite and PWA patterns. Use for service worker setup, cache strategy decisions, IndexedDB persistence, background sync, and production readiness checks."
argument-hint: "Goal and constraints, for example: add offline create/update queue for orders with eventual sync"
---

# Vite TypeScript Offline App Builder

## When To Use
- Building a new offline-capable web app with Vite + TypeScript.
- Adding offline mode to an existing Vite app.
- Hardening a PWA for poor or intermittent network conditions.
- Defining cache, storage, and sync behavior before implementation.

## Inputs To Collect First
- Product goal and critical offline user flows.
- Data consistency requirement: last-write-wins, merge, or conflict prompts.
- Platform support target: modern Chromium only, or broad browser compatibility.
- Security constraints: auth token handling, encrypted-at-rest expectations.
- App shape: greenfield or retrofit.

## Workflow
1. Scope offline behavior by user journey.
   - List the 3-5 highest-value tasks that must work offline.
   - Mark each task as read-only offline, read-write offline, or online-only.
2. Pick architecture branch.
   - If greenfield: set a clean offline-first data contract and queue model first.
   - If retrofit: wrap existing API access with a repository layer before adding offline logic.
3. Choose service worker strategy.
   - If using plugin-driven setup: use `vite-plugin-pwa` with explicit runtime caching rules.
   - If custom control is needed: implement a manual service worker and versioned cache names.
4. Define cache rules by asset and API type.
   - Static app shell: cache-first.
   - Time-sensitive API reads: stale-while-revalidate or network-first with timeout fallback.
   - Sensitive endpoints: avoid long-lived cache unless explicitly required.
5. Implement local persistence.
   - Use IndexedDB for domain data and write queue metadata.
   - Keep local schema versioned with migration functions.
   - Never persist plaintext secrets; keep tokens in safer scoped storage patterns.
6. Build a write queue + sync engine.
   - Queue mutations when offline with idempotency keys.
   - Replay in order on reconnect.
   - Add retry budget, exponential backoff, and dead-letter handling.
7. Handle conflict resolution.
   - If low-risk domain: last-write-wins with audit metadata.
   - If high-risk domain: detect version mismatch and prompt user with merge options.
8. Add connectivity and UX states.
   - Show offline banner and sync status.
   - Clearly label pending, syncing, failed, and synced entities.
   - Keep core flows usable even when sync is delayed.
9. Add observability.
   - Log queue length, replay success rate, and conflict rate.
   - Track cold start time and offline load success.
10. Validate with offline test passes.
   - Simulate offline, flaky, and high-latency network.
   - Verify installability and service worker update behavior.
   - Run production build smoke test.

## Quality Gates (Done Criteria)
- Core offline user journeys succeed without network.
- No data loss across refresh, close/open, and reconnect cycles.
- Queue replay is idempotent and resilient to duplicate sends.
- Service worker updates do not trap users on stale critical API responses.
- TypeScript build and lint pass with strict mode expectations.
- Offline and reconnect scenarios are covered by automated or scripted manual tests.

## Implementation Pattern (Code-Level)
1. Create typed domain models and repository interfaces.
2. Split read path and write path abstractions.
3. Add online adapter (HTTP) and offline adapter (IndexedDB).
4. Add sync coordinator that consumes queue and updates local state.
5. Bind UI state to repository/sync status, not raw fetch state.

## Suggested Prompts
- `/vite-typescript-offline add offline create/edit queue for inspections with conflict prompts`
- `/vite-typescript-offline migrate existing Vite API calls to repository pattern before adding sync`
- `/vite-typescript-offline design cache rules for static assets, reference data, and volatile endpoints`
