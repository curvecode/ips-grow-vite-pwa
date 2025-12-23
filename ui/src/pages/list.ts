import type { DailyBuy } from "@common/daily-buy.model";

/**
 * List Page Module
 * This module is lazy-loaded when the list page is navigated to
 */

// Storage management for list page
const STORAGE_KEY = "dailyBuyEntries";

export function getEntries(): DailyBuy[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function deleteEntry(id: string): void {
  const entries = getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function renderListPage(entries: DailyBuy[]): string {
  if (entries.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-text">No entries yet</p>
        <p class="empty-subtext">Add your first entry to get started</p>
      </div>
    `;
  }

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    const date = new Date(entry.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, DailyBuy[]>);

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return `
    <div class="list-container">
      ${sortedDates
        .map(
          (date) => `
        <div class="date-group">
          <h2 class="date-header">${date}</h2>
          <div class="entries-list">
            ${grouped[date].map((entry) => renderEntryItem(entry)).join("")}
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderEntryItem(entry: DailyBuy): string {
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div class="entry-item" data-id="${entry.id}">
      <div class="entry-main">
        <div class="entry-header">
          <span class="entry-type">${entry.type}</span>
          <span class="entry-datetime">
            <span class="entry-date">${dateStr}</span>
            <span class="entry-time">${timeStr}</span>
          </span>
        </div>
        ${
          entry.description
            ? `<p class="entry-description">${entry.description}</p>`
            : ""
        }
        <div class="entry-details">
          ${entry.price ? `<span>Price: $${entry.price.toFixed(2)}</span>` : ""}
          ${entry.quantity ? `<span>Qty: ${entry.quantity}</span>` : ""}
        </div>
      </div>
      <button class="delete-btn" data-id="${
        entry.id
      }" aria-label="Delete entry">🗑️</button>
    </div>
  `;
}

/**
 * Setup event listeners for the list page
 */
export function setupListPageListeners(
  onDelete: (id: string) => void,
  onRefresh: () => void
): void {
  // Delete buttons
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) {
        if (confirm("Are you sure you want to delete this entry?")) {
          deleteEntry(id);
          onDelete(id);
          onRefresh();
        }
      }
    });
  });
}

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("[HMR] List page module updated");
    // The module will be reloaded automatically
  });
}
