import type { DailyBuy } from "@common/daily-buy.model";

export type Page = "add" | "list";

// Utility function
export function getCurrentDateTimeLocal(): string {
  const now = new Date();
  // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// UI rendering functions
export function renderApp(
  currentPage: Page,
  renderPageContent: () => string
): string {
  return `
    <div class="app-container">
      <header class="header">
        <h1>${currentPage === "add" ? "Add Entry" : "Daily Buys"}</h1>
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
          <span class="theme-icon">🌙</span>
        </button>
      </header>
      
      <main class="main-content" id="mainContent">
        ${renderPageContent()}
      </main>
      
      <nav class="bottom-nav">
        <button class="nav-tab ${
          currentPage === "add" ? "active" : ""
        }" data-page="add">
          <span class="nav-icon">➕</span>
          <span class="nav-label">Add</span>
        </button>
        <button class="nav-tab ${
          currentPage === "list" ? "active" : ""
        }" data-page="list">
          <span class="nav-icon">📋</span>
          <span class="nav-label">List</span>
        </button>
      </nav>
    </div>
  `;
}

export function renderAddPage(
  formData: Partial<DailyBuy>
): string {
  return `
    <form class="form" id="dailyBuyForm">
      <div class="form-group">
        <label for="date">Date & Time</label>
        <input 
          type="datetime-local" 
          id="date" 
          name="date" 
          required 
          value="${formData.date || getCurrentDateTimeLocal()}"
        />
      </div>
      
      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" name="type" required>
          <option value="food" ${
            formData.type === "food" ? "selected" : ""
          }>Food</option>
          <option value="beverage" ${
            formData.type === "beverage" ? "selected" : ""
          }>Beverage</option>
          <option value="snack" ${
            formData.type === "snack" ? "selected" : ""
          }>Snack</option>
          <option value="groceries" ${
            formData.type === "groceries" ? "selected" : ""
          }>Groceries</option>
          <option value="restaurant" ${
            formData.type === "restaurant" ? "selected" : ""
          }>Restaurant</option>
          <option value="coffee" ${
            formData.type === "coffee" ? "selected" : ""
          }>Coffee</option>
          <option value="other" ${
            formData.type === "other" ? "selected" : ""
          }>Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="price">Price (optional)</label>
        <input 
          type="number" 
          id="price" 
          name="price" 
          step="0.01" 
          min="0" 
          placeholder="0.00"
        />
      </div>
      
      <div class="form-group">
        <label for="quantity">Quantity (optional)</label>
        <input 
          type="number" 
          id="quantity" 
          name="quantity" 
          step="1" 
          min="1" 
          placeholder="1"
        />
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea 
          id="description" 
          name="description" 
          rows="3" 
          placeholder="Add a note..."
        ></textarea>
      </div>
      
      <button type="submit" class="submit-btn">Add Entry</button>
    </form>
  `;
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

export function renderEntryItem(entry: DailyBuy): string {
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

