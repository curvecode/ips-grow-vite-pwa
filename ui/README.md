# IPS Grow — UI

Offline-first PWA built with Vite + TypeScript. Entries are always written to IndexedDB first, then synced to the API when online.

---

## Architecture Overview

| File | Responsibility |
|---|---|
| `main.ts` | App bootstrap, form handling, event wiring |
| `store.ts` | Reactive state (`ObservableStore`) |
| `db.ts` | IndexedDB access (entries + pending operations) |
| `sync.ts` | Pending queue management, sync-on-reconnect |
| `api.ts` | HTTP client for `localhost:3000/api` |
| `offline.ts` | `online`/`offline` event listeners + toast |
| `ui.ts` | Pure render functions (no side effects) |
| `pages/list.ts` | List page renders + delete logic (lazy loaded) |
| `public/sw.js` | Service worker — caching, notification click |

---

## Online Mode — Entry Submit Flow

```mermaid
flowchart TD
    A([User submits form]) --> B[handleSubmit]
    B --> C{Quantity present?}
    C -- No --> Z([Return — validation error])
    C -- Yes --> D[saveEntry]

    D --> D1[upsertEntry\nIndexedDB: entries store]
    D --> D2[entriesStore.set\nnotify subscribers]
    D1 & D2 --> E{saveEntry\nsucceeded?}

    E -- No --> F([alert: reverted\nreturn])
    E -- Yes --> G[showEntryNotification\nPush Notification via SW]

    G --> H[isApiReachable\nnavigator.onLine + GET /health]
    H -- offline / unreachable --> I[addToPendingSync\nIndexedDB: pendingOperations]
    I --> I2[refreshPendingCount\nsyncStatusStore.update pendingCount]

    H -- online --> J{formData.id?}
    J -- UPDATE --> K[apiUpdateDailyBuy\nPUT /api/daily-buys/:id]
    J -- ADD --> L[apiAddDailyBuys\nPOST /api/daily-buys]

    K & L -- success --> M[Reset form]
    K & L -- error --> N[addToPendingSync\nIndexedDB: pendingOperations]
    N --> N2[refreshPendingCount\nsyncStatusStore.update pendingCount]

    M --> O[navigateTo list\npageStore.set list]
    I2 --> O
    N2 --> O
    O --> P([renderAppView\nList page shown])
```

---

## Offline Mode — Reconnection & Sync Flow

```mermaid
flowchart TD
    A([Device goes offline]) --> B[window: offline event]
    B --> C[syncStatusStore.update\nisOnline: false]
    C --> D[syncStatusBar shows Offline]

    E([User submits entry while offline]) --> F[saveEntry\nIndexedDB: entries store]
    F --> G[entriesStore.set]
    G --> H[isApiReachable → false]
    H --> I[addToPendingSync]
    I --> I1[addPendingOperation\nIndexedDB: pendingOperations]
    I1 --> I2[refreshPendingCount\nsyncStatusStore.update pendingCount N]
    I2 --> J[syncStatusBar shows N pending]

    K([Device comes back online]) --> L[window: online event]
    L --> M[syncStatusStore.update\nisOnline: true]
    M --> N[syncPendingEntries]

    N --> N1[getPendingOperations\nIndexedDB]
    N1 --> N2[Sort by timestamp\ncollapse ops per entryId]
    N2 --> N3{ADD then DELETE\nfor same entry?}
    N3 -- Yes --> N4[Skip — remove from DB\nno-op on server]
    N3 -- No --> N5[isApiReachable]

    N5 -- false --> N6([Abort sync\nkeep in queue])
    N5 -- true --> N7[setSyncInProgress true\nsyncStatusStore.update isSyncing: true]

    N7 --> N8[For each op in order]
    N8 --> N9{op.type}
    N9 -- ADD --> N10[apiAddDailyBuys\nPOST /api/daily-buys]
    N9 -- UPDATE --> N11[apiUpdateDailyBuy\nPUT /api/daily-buys/:id]
    N9 -- DELETE --> N12[apiDeleteDailyBuy\nDELETE /api/daily-buys/:id]

    N10 & N11 & N12 -- success --> N13[removePendingOperation\nIndexedDB]
    N10 & N11 & N12 -- error --> N14[markPendingOperationFailed\nincrement retries\nmax 5 attempts]

    N13 --> N15[setSyncInProgress false\nsyncStatusStore.update isSyncing: false\nrefreshPendingCount]
    N15 --> N16[onReconnect callback\nloadEntriesFromAPI]
    N16 --> N17[GET /api/daily-buys\nmerge with local\npersistEntries]
    N17 --> N18[entriesStore.set\nreplaceAllEntries IndexedDB]
    N18 --> N19([renderAppView\nList page refreshed])
```

---

## ObservableStore — Data Flow

```mermaid
flowchart LR
    subgraph store.ts
        ES["entriesStore\nObservableStore&lt;DailyBuy[]&gt;"]
        PS["pageStore\nObservableStore&lt;Page&gt;"]
        SS["syncStatusStore\nObservableStore&lt;SyncStatus&gt;"]
    end

    subgraph Writers
        W1["saveEntry()\nmain.ts"]
        W2["persistEntries()\nmain.ts"]
        W3["deleteEntry()\npages/list.ts"]
        W4["navigateTo()\nmain.ts"]
        W5["initSync()\nsync.ts — online/offline events"]
        W6["syncPendingEntries()\nsync.ts"]
        W7["loadEntriesFromAPI()\nmain.ts"]
        W8["refreshPendingCount()\nsync.ts"]
    end

    subgraph Subscribers
        S1["main.ts subscription\n→ re-render list page\nwhen on list page"]
        S2["main.ts subscription\n→ renderAppView()\nfull re-render"]
        S3["main.ts subscription\n→ updateSyncStatusBar()\nsync dot + text"]
    end

    W1 -- set --> ES
    W2 -- set --> ES
    W3 -- set --> ES

    W4 -- set --> PS

    W5 -- update isOnline --> SS
    W6 -- update isSyncing --> SS
    W7 -- update isOnline --> SS
    W8 -- update pendingCount --> SS

    ES -- notify --> S1
    PS -- notify --> S2
    SS -- notify --> S3
```

### ObservableStore API

```
store.get()               → returns current value (synchronous)
store.set(value)          → sets value, notifies all subscribers (skips if same ref)
store.update(fn)          → store.set(fn(current))
store.subscribe(listener) → calls listener immediately + on every change
                            returns unsubscribe function
```

### SyncStatus shape

```ts
{
  isOnline: boolean      // true = API reachable
  isSyncing: boolean     // true = syncPendingEntries in progress
  pendingCount: number   // ops waiting in IndexedDB pendingOperations store
}
```

### syncStatusBar display logic

| `isSyncing` | `isOnline` | `pendingCount` | Display |
|---|---|---|---|
| true | any | any | `Syncing...` |
| false | true | 0 | `Online` |
| false | true | > 0 | `N pending` |
| false | false | any | `Offline` |

---

## IndexedDB Schema

**Database:** `DailyBuyTrackerDB` (version 2)

| Object Store | Key | Purpose |
|---|---|---|
| `entries` | `id` | Persisted local copy of all entries |
| `pendingOperations` | `id` (UUID) | Queue of ADD / UPDATE / DELETE ops not yet synced to API |

### PendingOperation shape

```ts
{
  id: string          // operation UUID
  entryId: string     // DailyBuy.id this op targets
  type: "ADD" | "UPDATE" | "DELETE"
  data: DailyBuy      // payload (omitted for DELETE)
  timestamp: string   // ISO — used for chronological ordering
  retries: number     // incremented on each failure (max 5)
  lastError?: string  // last error message
}
```

### Collapse rules (applied before sync)

| History for an entryId | Collapsed to |
|---|---|
| ADD → UPDATE | ADD (with latest data) |
| ADD → DELETE | skipped entirely — no API call needed |
| UPDATE → DELETE | DELETE |
| UPDATE → UPDATE | UPDATE (latest data wins) |
