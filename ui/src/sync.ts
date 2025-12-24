import type { DailyBuy } from "@common/daily-buy.model";
import { addDailyBuys as apiAddDailyBuys, deleteDailyBuy as apiDeleteDailyBuy, checkApiHealth } from "./api";

const PENDING_SYNC_KEY = "pendingSyncEntries";
const PENDING_DELETES_KEY = "pendingDeleteIds";
const SYNC_IN_PROGRESS_KEY = "syncInProgress";

/**
 * Get pending sync entries from localStorage
 */
export function getPendingSyncEntries(): DailyBuy[] {
  const stored = localStorage.getItem(PENDING_SYNC_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add entry to pending sync queue
 */
export function addToPendingSync(entry: DailyBuy): void {
  const pending = getPendingSyncEntries();
  pending.push(entry);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

/**
 * Remove entry from pending sync queue
 */
export function removeFromPendingSync(entryId: string): void {
  const pending = getPendingSyncEntries();
  const filtered = pending.filter((e) => e.id !== entryId);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
}

/**
 * Clear all pending sync entries
 */
export function clearPendingSync(): void {
  localStorage.removeItem(PENDING_SYNC_KEY);
}

/**
 * Get pending delete IDs from localStorage
 */
export function getPendingDeleteIds(): string[] {
  const stored = localStorage.getItem(PENDING_DELETES_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add entry ID to pending delete queue
 */
export function addToPendingDeletes(id: string): void {
  const pending = getPendingDeleteIds();
  if (!pending.includes(id)) {
    pending.push(id);
    localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pending));
  }
}

/**
 * Remove entry ID from pending delete queue
 */
export function removeFromPendingDeletes(id: string): void {
  const pending = getPendingDeleteIds();
  const filtered = pending.filter(deleteId => deleteId !== id);
  localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(filtered));
}

/**
 * Clear all pending deletes
 */
export function clearPendingDeletes(): void {
  localStorage.removeItem(PENDING_DELETES_KEY);
}

/**
 * Check if sync is in progress
 */
function isSyncInProgress(): boolean {
  return localStorage.getItem(SYNC_IN_PROGRESS_KEY) === "true";
}

/**
 * Set sync in progress flag
 */
function setSyncInProgress(value: boolean): void {
  if (value) {
    localStorage.setItem(SYNC_IN_PROGRESS_KEY, "true");
  } else {
    localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
  }
}

/**
 * Sync pending entries to API
 * Returns number of successfully synced entries
 */
export async function syncPendingEntries(): Promise<number> {
  // Prevent concurrent syncs
  if (isSyncInProgress()) {
    console.log("Sync already in progress, skipping...");
    return 0;
  }

  const pendingAdds = getPendingSyncEntries();
  const pendingDeletes = getPendingDeleteIds();
  
  if (pendingAdds.length === 0 && pendingDeletes.length === 0) {
    return 0;
  }

  // Check if API is available
  const isOnline = await checkApiHealth();
  if (!isOnline) {
    console.log("API not available, cannot sync");
    return 0;
  }

  setSyncInProgress(true);
  let totalSynced = 0;

  try {
    // Sync adds first
    if (pendingAdds.length > 0) {
      const syncedEntries: DailyBuy[] = [];
      const failedEntries: DailyBuy[] = [];

      for (const entry of pendingAdds) {
        try {
          await apiAddDailyBuys(entry);
          syncedEntries.push(entry);
          removeFromPendingSync(entry.id);
          totalSynced++;
        } catch (error) {
          console.error(`Failed to sync entry ${entry.id}:`, error);
          failedEntries.push(entry);
        }
      }

      // If some failed, keep them in pending
      if (failedEntries.length > 0) {
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(failedEntries));
      }

      console.log(`Synced ${syncedEntries.length} of ${pendingAdds.length} add entries`);
    }

    // Sync deletes
    if (pendingDeletes.length > 0) {
      const syncedDeletes: string[] = [];
      const failedDeletes: string[] = [];

      for (const id of pendingDeletes) {
        try {
          await apiDeleteDailyBuy(id);
          syncedDeletes.push(id);
          removeFromPendingDeletes(id);
          totalSynced++;
        } catch (error) {
          console.error(`Failed to sync delete for ${id}:`, error);
          failedDeletes.push(id);
        }
      }

      // If some failed, keep them in pending
      if (failedDeletes.length > 0) {
        localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(failedDeletes));
      }

      console.log(`Synced ${syncedDeletes.length} of ${pendingDeletes.length} delete operations`);
    }

    return totalSynced;
  } catch (error) {
    console.error("Error during sync:", error);
    return totalSynced;
  } finally {
    setSyncInProgress(false);
  }
}

/**
 * Initialize sync on online event
 */
export function initSync(): void {
  // Sync when coming online
  window.addEventListener("online", async () => {
    console.log("Online, attempting to sync pending entries...");
    await syncPendingEntries();
  });

  // Try to sync immediately if online
  if (navigator.onLine) {
    checkApiHealth().then((isOnline) => {
      if (isOnline) {
        syncPendingEntries();
      }
    });
  }
}

