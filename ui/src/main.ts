import "./style.css";
import type { DailyBuy, BuyType } from "@common/daily-buy.model";
import {
  renderApp,
  renderAddPage,
  getCurrentDateTimeLocal,
  type Page,
} from "./ui";
import { initOfflineDetection } from "./offline";
import {
  addDailyBuys as apiAddDailyBuys,
  getDailyBuys as apiGetDailyBuys,
  checkApiHealth,
} from "./api";
import {
  addToPendingSync,
  initSync,
  syncPendingEntries,
  getPendingSyncEntries,
} from "./sync";

// Dynamic import for list page (lazy loading)
let listPageModule: typeof import("./pages/list") | null = null;

// Theme management
type Theme = "light" | "dark";

function getTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme;
  return (
    saved ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
  );
}

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function initTheme() {
  setTheme(getTheme());
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === "light" ? "dark" : "light");
}

// Storage management
const STORAGE_KEY = "dailyBuyEntries";

function getEntries(): DailyBuy[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveEntry(entry: DailyBuy): void {
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Load entries from API and merge with local storage
 */
async function loadEntriesFromAPI(): Promise<void> {
  console.log("[API] loadEntriesFromAPI: Starting...");
  try {
    console.log("[API] Checking API health...");
    const isOnline = await checkApiHealth();
    console.log("[API] API health check result:", isOnline);

    if (isOnline) {
      console.log("[API] Fetching entries from API...");
      const apiEntries = await apiGetDailyBuys();
      console.log("[API] Received entries from API:", apiEntries.length);

      // Merge with local entries, avoiding duplicates
      const localEntries = getEntries();
      const localIds = new Set(localEntries.map((e) => e.id));
      const newApiEntries = apiEntries.filter((e) => !localIds.has(e.id));

      if (newApiEntries.length > 0) {
        const merged = [...localEntries, ...newApiEntries];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        console.log(
          "[API] Merged",
          newApiEntries.length,
          "new entries from API"
        );
      } else if (apiEntries.length > 0) {
        // If API has entries but local doesn't, use API entries
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiEntries));
        console.log("[API] Loaded", apiEntries.length, "entries from API");
      } else {
        console.log("[API] No entries found in API");
      }
    } else {
      console.log("[API] API is offline, skipping load");
    }
  } catch (error) {
    console.error("[API] Failed to load entries from API:", error);
  }
}

// Note: deleteEntry is now in the list page module

// Navigation
let currentPage: Page = "add";

async function navigateTo(page: Page) {
  currentPage = page;
  await renderAppView();
  updateTabButtons();
}

// Form state
let formData: Partial<DailyBuy> = {
  type: "food",
  date: getCurrentDateTimeLocal(),
};

// Render app view with lazy loading for list page
async function renderAppView() {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  let pageContent: string;

  if (currentPage === "add") {
    pageContent = renderAddPage(formData);
  } else {
    // Lazy load list page module
    if (!listPageModule) {
      console.log("[Lazy Load] Loading list page module...");
      listPageModule = await import("./pages/list");
      console.log("[Lazy Load] List page module loaded");
    }
    const entries = listPageModule.getEntries();
    pageContent = listPageModule.renderListPage(entries);
  }

  app.innerHTML = renderApp(currentPage, () => pageContent);

  await setupEventListeners();
  updateThemeIcon();
}

async function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    toggleTheme();
    updateThemeIcon();
  });

  // Navigation tabs
  const navTabs = document.querySelectorAll(".nav-tab");
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const page = (tab as HTMLElement).dataset.page as Page;
      navigateTo(page);
    });
  });

  // Form submit
  if (currentPage === "add") {
    const form = document.getElementById("dailyBuyForm") as HTMLFormElement;
    form?.addEventListener("submit", handleSubmit);
  }

  // List page event listeners (lazy loaded)
  if (currentPage === "list" && listPageModule) {
    listPageModule.setupListPageListeners(
      (id: string) => {
        // onDelete callback
        console.log("[List] Entry deleted:", id);
      },
      () => {
        // onRefresh callback
        renderAppView();
      }
    );
  }
}

function updateTabButtons() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    const page = (tab as HTMLElement).dataset.page;
    if (page === currentPage) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

function updateThemeIcon() {
  const icon = document.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = getTheme() === "light" ? "🌙" : "☀️";
  }
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const formDataObj = new FormData(form);

  // Convert datetime-local value to ISO string
  const dateTimeLocal = formDataObj.get("date") as string;
  const date = new Date(dateTimeLocal).toISOString();

  const entry: DailyBuy = {
    id: crypto.randomUUID(),
    date: date,
    type: formDataObj.get("type") as BuyType,
    amount: 0, // Default value since amount field is removed
    price: formDataObj.get("price")
      ? parseFloat(formDataObj.get("price") as string)
      : undefined,
    quantity: formDataObj.get("quantity")
      ? parseInt(formDataObj.get("quantity") as string)
      : undefined,
    description: (formDataObj.get("description") as string) || undefined,
    createdAt: new Date().toISOString(),
  };

  // Always save to local storage first for immediate UI update
  saveEntry(entry);

  // Try to send to API if online, otherwise add to pending sync
  console.log("[API] handleSubmit: Attempting to sync entry", entry.id);
  try {
    console.log("[API] Checking API health and navigator.onLine...");
    const isOnline = await checkApiHealth();
    console.log(
      "[API] API health:",
      isOnline,
      "Navigator online:",
      navigator.onLine
    );

    if (isOnline && navigator.onLine) {
      try {
        console.log("[API] Sending entry to API...");
        await apiAddDailyBuys(entry);
        console.log("[API] ✅ Entry synced to API successfully");
      } catch (apiError) {
        console.error(
          "[API] ❌ Failed to sync to API, adding to pending:",
          apiError
        );
        addToPendingSync(entry);
      }
    } else {
      // Offline - add to pending sync queue
      console.log("[API] ⚠️ Offline, adding to pending sync");
      addToPendingSync(entry);
    }
  } catch (error) {
    console.error("[API] ❌ Error checking API status:", error);
    // If we can't check, assume offline and add to pending
    addToPendingSync(entry);
  }

  // Reset form
  form.reset();
  formData.date = getCurrentDateTimeLocal();
  (document.getElementById("date") as HTMLInputElement).value = formData.date;
  (document.getElementById("type") as HTMLSelectElement).value = "food";

  // Navigate to list page to show the new entry
  navigateTo("list");
}

// Initialize app
async function initApp() {
  initTheme();
  initOfflineDetection();
  initSync();
  registerServiceWorker();

  // Load entries from API on startup
  console.log("[API] initApp: Loading entries from API...");
  await loadEntriesFromAPI();

  // Merge pending sync entries into local view
  const pending = getPendingSyncEntries();
  console.log("[API] initApp: Pending sync entries:", pending.length);
  if (pending.length > 0) {
    const localEntries = getEntries();
    const localIds = new Set(localEntries.map((e) => e.id));
    const newPending = pending.filter((e) => !localIds.has(e.id));
    if (newPending.length > 0) {
      const merged = [...localEntries, ...newPending];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      console.log(
        "[API] Merged",
        newPending.length,
        "pending entries into view"
      );
    }
  }

  renderAppView();

  // Try to sync pending entries if online
  if (navigator.onLine) {
    console.log("[API] initApp: Online, attempting to sync pending entries...");
    syncPendingEntries().then((synced) => {
      console.log("[API] initApp: Synced", synced, "pending entries");
      if (synced > 0) {
        // Reload entries from API after sync
        loadEntriesFromAPI().then(() => {
          renderAppView();
        });
      }
    });
  } else {
    console.log("[API] initApp: Offline, skipping sync");
  }
}

// Register Service Worker for PWA
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "ServiceWorker registration successful:",
            registration.scope
          );
        })
        .catch((error) => {
          console.log("ServiceWorker registration failed:", error);
        });
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
