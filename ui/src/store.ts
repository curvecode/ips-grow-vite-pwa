/**
 * Functional Reactive Store for app state
 */

export type Listener<T> = (value: T) => void;

export class ObservableStore<T> {
  private value: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get current value
   */
  get(): T {
    return this.value;
  }

  /**
   * Set new value and notify subscribers
   */
  set(newValue: T): void {
    if (this.value === newValue) return;
    this.value = newValue;
    this.notify();
  }

  /**
   * Update value using a producer function
   */
  update(producer: (current: T) => T): void {
    this.set(producer(this.value));
  }

  /**
   * Subscribe to changes
   * returns an unsubscribe function
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Notify immediately with current value
    listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.value));
  }
}

import type { DailyBuy } from "@common/daily-buy.model";
import type { Page } from "./ui";

// Reactive state for entries
export const entriesStore = new ObservableStore<DailyBuy[]>([]);

// Reactive state for current page
export const pageStore = new ObservableStore<Page>("add");

// Reactive state for API health/Sync status
export const syncStatusStore = new ObservableStore<{
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}>({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
});
