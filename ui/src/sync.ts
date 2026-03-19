import type { DailyBuy } from "@common/daily-buy.model";
import {
  addDailyBuys as apiAddDailyBuys,
  deleteDailyBuy as apiDeleteDailyBuy,
  updateDailyBuy as apiUpdateDailyBuy,
  checkApiHealth
} from "./api";
import {
  getPendingOperations,
  removePendingOperation,
  addPendingOperation,
} from "./db";
import type { PendingOperation } from "./db";

import { syncStatusStore } from "./store";

const SYNC_IN_PROGRESS_KEY = "syncInProgress";

/**
 * Refresh the pending operations count from DB and update store
 */
export async function refreshPendingCount(): Promise<number> {
  const operations = await getPendingOperations();
  syncStatusStore.update(s => ({ ...s, pendingCount: operations.length }));
  return operations.length;
}

/**
 * Add entry to sync queue
 */
export async function addToPendingSync(entry: DailyBuy, type: "ADD" | "UPDATE" = "ADD"): Promise<void> {
  console.log(`[Sync] Adding ${type} for ${entry.id} to storage`);
  await addPendingOperation(entry.id, type, entry);
  await refreshPendingCount();
}

/**
 * Add delete to sync queue
 */
export async function addToPendingDeletes(id: string): Promise<void> {
  console.log(`[Sync] Adding DELETE for ${id} to storage`);
  await addPendingOperation(id, "DELETE");
  await refreshPendingCount();
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
 * Sync pending operations to API
 */
export async function syncPendingEntries(): Promise<number> {
  if (isSyncInProgress()) {
    console.log("[Sync] Already in progress, skipping...");
    return 0;
  }

  const operations = await getPendingOperations();
  if (operations.length === 0) {
    await refreshPendingCount();
    return 0;
  }

  // 1. Sort all operations by timestamp to ensure chronological order
  const chronologicalOps = [...operations].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 2. Group and collapse operations by entryId to avoid redundant syncs
  const collapsedOps: Record<string, PendingOperation> = {};
  for (const op of chronologicalOps) {
    const existing = collapsedOps[op.entryId];
    if (!existing) {
      collapsedOps[op.entryId] = op;
      continue;
    }

    // Collapse logic:
    // - If we have an existing ADD, all subsequent operations remain an ADD with latest data
    // - Unless the final operation is DELETE, in which case it stays DELETE
    if (op.type === "DELETE") {
      collapsedOps[op.entryId] = op;
    } else {
      const type = existing.type === "ADD" ? "ADD" : op.type;
      collapsedOps[op.entryId] = { ...op, type };
    }
  }

  // 3. Prepare final list of operations to sync
  // Items that were added and then deleted while offline have no effect on the server
  const finalOpsToSync: PendingOperation[] = [];
  for (const entryId of Object.keys(collapsedOps)) {
    const group = operations.filter(o => o.entryId === entryId);
    const hasAdd = group.some(o => o.type === "ADD");
    const op = collapsedOps[entryId];

    if (hasAdd && op.type === "DELETE") {
      console.log(`[Sync] Skipping ${entryId}: Added and deleted while offline`);
      // Cleanup IndexedDB for these skipped operations
      for (const sameOp of group) {
        await removePendingOperation(sameOp.id);
      }
      continue;
    }
    finalOpsToSync.push(op);
  }

  // 4. Sort final operations by timestamp to preserve overall chronological logic
  const sortedOps = finalOpsToSync.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const isOnline = await checkApiHealth();
  syncStatusStore.update(s => ({ ...s, isOnline }));
  
  if (!isOnline) {
    console.log("[Sync] API not reachable, cannot sync");
    return 0;
  }

  setSyncInProgress(true);
  syncStatusStore.update(s => ({ ...s, isSyncing: true }));
  let totalSynced = 0;

  try {
    for (const op of sortedOps) {
      try {
        console.log(`[Sync] Processing ${op.type} for ${op.entryId}`);
        
        switch (op.type) {
          case "ADD":
            await apiAddDailyBuys(op.data);
            break;
          case "UPDATE":
            await apiUpdateDailyBuy(op.data);
            break;
          case "DELETE":
            await apiDeleteDailyBuy(op.entryId);
            break;
        }

        // Remove ALL operations for this entryId from the DB once successfully synced
        const sameIdOps = operations.filter(o => o.entryId === op.entryId);
        for (const sameOp of sameIdOps) {
          await removePendingOperation(sameOp.id);
        }
        
        totalSynced++;
      } catch (error) {
        console.error(`[Sync] Failed to process ${op.type} for ${op.entryId}:`, error);
        // If it fails, we keep it in the DB to try again later
      }
    }

    if (totalSynced > 0) {
      console.log(`[Sync] Successfully synced ${totalSynced} items`);
    }
    return totalSynced;
  } catch (error) {
    console.error("[Sync] Error during processing:", error);
    return totalSynced;
  } finally {
    setSyncInProgress(false);
    syncStatusStore.update(s => ({ ...s, isSyncing: false }));
    await refreshPendingCount();
  }
}

/**
 * Initialize sync listeners
 */
export function initSync(): void {
  window.addEventListener("online", async () => {
    console.log("[Sync] Back online, triggering sync...");
    syncStatusStore.update(s => ({ ...s, isOnline: true }));
    await syncPendingEntries();
  });

  window.addEventListener("offline", () => {
    console.log("[Sync] Offline mode");
    syncStatusStore.update(s => ({ ...s, isOnline: false }));
  });

  // Initial check
  syncStatusStore.update(s => ({ ...s, isOnline: navigator.onLine }));
  if (navigator.onLine) {
    syncPendingEntries();
  }
}

// Re-export for compatibility if needed elsewhere
export async function getPendingSyncEntries(): Promise<DailyBuy[]> {
  const ops = await getPendingOperations();
  return ops.filter(op => op.type !== "DELETE").map(op => op.data);
}

