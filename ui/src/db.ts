import type { DailyBuy } from "@common/daily-buy.model";

/**
 * IndexedDB utility for offline persistence
 */

const DB_NAME = "DailyBuyTrackerDB";
const PENDING_STORE_NAME = "pendingOperations";
const ENTRIES_STORE_NAME = "entries";
const DB_VERSION = 2;

export interface PendingOperation {
  id: string; // Operation ID (UUID)
  entryId: string; // ID of the DailyBuy record
  type: "ADD" | "UPDATE" | "DELETE";
  data: any; // The entry data for ADD/UPDATE
  timestamp: string;
  retries: number;
  lastError?: string;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PENDING_STORE_NAME)) {
        db.createObjectStore(PENDING_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ENTRIES_STORE_NAME)) {
        db.createObjectStore(ENTRIES_STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Add an operation to the pending queue
 */
export async function addPendingOperation(
  entryId: string,
  type: "ADD" | "UPDATE" | "DELETE",
  data?: any
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PENDING_STORE_NAME);

    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      entryId,
      type,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    const request = store.add(operation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE_NAME, "readonly");
    const store = transaction.objectStore(PENDING_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a pending operation by ID
 */
export async function removePendingOperation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PENDING_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all pending operations
 */
export async function clearAllPendingOperations(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PENDING_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark one pending operation as failed and increment retry count.
 */
export async function markPendingOperationFailed(id: string, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PENDING_STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const operation = getRequest.result as PendingOperation | undefined;
      if (!operation) {
        resolve();
        return;
      }

      const updateRequest = store.put({
        ...operation,
        retries: (operation.retries || 0) + 1,
        lastError: error,
      } satisfies PendingOperation);

      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getAllEntries(): Promise<DailyBuy[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRIES_STORE_NAME, "readonly");
    const store = transaction.objectStore(ENTRIES_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as DailyBuy[]);
    request.onerror = () => reject(request.error);
  });
}

export async function upsertEntry(entry: DailyBuy): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRIES_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE_NAME);
    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function replaceAllEntries(entries: DailyBuy[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRIES_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE_NAME);
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      if (entries.length === 0) {
        resolve();
        return;
      }

      let pendingWrites = entries.length;
      for (const entry of entries) {
        const putRequest = store.put(entry);
        putRequest.onsuccess = () => {
          pendingWrites -= 1;
          if (pendingWrites === 0) {
            resolve();
          }
        };
        putRequest.onerror = () => reject(putRequest.error);
      }
    };

    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

export async function deleteStoredEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRIES_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
