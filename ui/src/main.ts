import "./style.css";
import type { DailyBuy, BuyType } from "@common/daily-buy.model";
import {
  renderApp,
  renderAddPage,
  getCurrentDateTimeLocal,
  requestCameraPermission,
  type Page,
} from "./ui";
import { initOfflineDetection } from "./offline";
import {
  addDailyBuys as apiAddDailyBuys,
  updateDailyBuy as apiUpdateDailyBuy,
  getDailyBuys as apiGetDailyBuys,
  checkApiHealth,
} from "./api";
import {
  addToPendingSync,
  initSync,
  syncPendingEntries,
  getPendingSyncEntries,
} from "./sync";
import { entriesStore, pageStore, syncStatusStore } from "./store";
import * as listPageModule from "./pages/list";

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
  const index = entries.findIndex((e) => e.id === entry.id);
  if (index !== -1) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
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
        entriesStore.set(merged); // Update store
        console.log(
          "[API] Merged",
          newApiEntries.length,
          "new entries from API",
        );
      } else if (apiEntries.length > 0) {
        // If API has entries but local doesn't, use API entries
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiEntries));
        entriesStore.set(apiEntries); // Update store
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
  pageStore.set(page);
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
    const entries = listPageModule.getEntries();
    pageContent = listPageModule.renderListPage(entries);
  }

  app.innerHTML = renderApp(currentPage, () => pageContent);

  await setupEventListeners();
  updateThemeIcon();
  updateAppInfo();
}

/**
 * Update computer and geo-location information in the UI
 */
async function updateAppInfo() {
  const compInfo = document.getElementById("computerInfo");
  const locInfo = document.getElementById("locationInfo");

  if (compInfo) {
    const uaData = (navigator as any).userAgentData;
    let platform = uaData?.platform || navigator.platform || "Unknown";
    let platformVersion = "";

    // Try to get high entropy values for platform version (requires modern browser)
    if (uaData?.getHighEntropyValues) {
      try {
        const entropy = await uaData.getHighEntropyValues(["platformVersion"]);
        platformVersion = entropy.platformVersion || "";
      } catch (e) {
        console.warn("[AppInfo] Could not fetch platform version");
      }
    }

    // Better browser and version detection
    let browserName = "Unknown Browser";
    let browserVersion = "";

    if (uaData?.brands) {
      const brands = uaData.brands;
      // Filter out "Not A;Brand" if possible
      const mainBrand =
        brands.find((b: any) => !b.brand.includes("Not")) || brands[0];
      browserName = mainBrand.brand;
      browserVersion = mainBrand.version;
    } else {
      const ua = navigator.userAgent;
      const match =
        ua.match(
          /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
        ) || [];
      if (/trident/i.test(match[1])) {
        browserName = "IE";
      } else if (match[1] === "Chrome") {
        const temp = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (temp != null) {
          browserName = temp[1].replace("OPR", "Opera");
        } else {
          browserName = "Chrome";
        }
      } else {
        browserName = match[1] || "Browser";
      }
      browserVersion = match[2] || "";
    }

    const platformDisplay = platformVersion
      ? `${platform} ${platformVersion}`
      : platform;
    compInfo.textContent = `${platformDisplay} · ${browserName}${browserVersion ? " " + browserVersion : ""}`;
  }

  // Helper to update metric value
  const setMetric = (id: string, value: string, icon?: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const valEl = el.querySelector(".metric-value");
    const iconEl = el.querySelector(".metric-icon");
    if (valEl) valEl.textContent = value;
    if (icon && iconEl) iconEl.textContent = icon;
  };

  // 1. Battery Status
  if ("getBattery" in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      const updateBattery = () => {
        const level = Math.round(battery.level * 100);
        const icon = battery.charging
          ? "⚡"
          : level > 80
            ? "🔋"
            : level > 20
              ? "🪫"
              : "💀";
        setMetric("batteryMetric", `${level}%`, icon);
      };
      updateBattery();
      battery.addEventListener("levelchange", updateBattery);
      battery.addEventListener("chargingchange", updateBattery);
    } catch (e) {
      setMetric("batteryMetric", "N/A");
    }
  }

  // 2. Audio Status
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioOutput = devices.some((d) => d.kind === "audiooutput");
      setMetric(
        "audioMetric",
        hasAudioOutput ? "Ready" : "None",
        hasAudioOutput ? "🔊" : "🔇",
      );
    } catch (e) {
      setMetric("audioMetric", "N/A");
    }
  }

  // 3. Fullscreen Status
  const updateFullscreen = () => {
    const isFull = !!document.fullscreenElement;
    setMetric("fullscreenMetric", isFull ? "On" : "Off");
  };
  updateFullscreen();
  document.addEventListener("fullscreenchange", updateFullscreen);

  // 4. Bluetooth Status
  if ("bluetooth" in navigator) {
    try {
      const available = await (navigator as any).bluetooth.getAvailability();
      setMetric("bluetoothMetric", available ? "Avail" : "None");
    } catch (e) {
      setMetric("bluetoothMetric", "Off");
    }
  }

  // 5. Keyboard Status
  if ("keyboard" in navigator) {
    setMetric("keyboardMetric", "Active");
  } else {
    setMetric(
      "keyboardMetric",
      navigator.maxTouchPoints > 0 ? "Touch" : "Ready",
    );
  }

  if (locInfo) {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use OpenStreetMap Nominatim for free reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
              {
                headers: {
                  "User-Agent": "DailyBuyTracker/1.0",
                },
              },
            );
            const data = await response.json();
            const city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.suburb ||
              "Unknown City";
            const country = data.address.country || "";

            locInfo.textContent = country ? `${city}, ${country}` : city;
          } catch (error) {
            console.error("[Geo] Reverse geocoding failed:", error);
            locInfo.textContent = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
        },
        (error) => {
          locInfo.textContent = "Loc Disabled";
          console.warn("[Geo] Error:", error.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    } else {
      locInfo.textContent = "Unavailable";
    }
  }
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
      if (page === "add" && currentPage !== "add") {
        // Reset form data when clicking the Add tab from another page
        formData = {
          type: "food",
          date: getCurrentDateTimeLocal(),
        };
      }
      navigateTo(page);
    });
  });

  // Form submit
  if (currentPage === "add") {
    const form = document.getElementById("dailyBuyForm") as HTMLFormElement;
    form?.addEventListener("submit", handleSubmit);

    // Image Upload Logic
    const imageInput = document.getElementById(
      "imageInput",
    ) as HTMLInputElement;
    const uploadFileBtn = document.getElementById("uploadFileBtn");
    const takePhotoBtn = document.getElementById("takePhotoBtn");
    const imagePreview = document.getElementById("imagePreview");
    const imageSizeDisplay = document.getElementById("imageSize");
    const cameraView = document.getElementById("cameraView");
    const imageOptions = document.getElementById("imageOptions");
    const video = document.getElementById("video") as HTMLVideoElement;
    const shutterBtn = document.getElementById("shutterBtn");
    const cancelCameraBtn = document.getElementById("cancelCameraBtn");

    let currentStream: MediaStream | null = null;

    const stopCamera = () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
        currentStream = null;
      }
      if (cameraView) cameraView.style.display = "none";
      if (imageOptions) imageOptions.style.display = "flex";
    };

    const updateImageSizeDisplay = (bytes: number) => {
      if (imageSizeDisplay) {
        const kb = (bytes / 1024).toFixed(1);
        imageSizeDisplay.textContent = `${kb} KB`;
        imageSizeDisplay.classList.add("active");
      }
    };

    uploadFileBtn?.addEventListener("click", () => {
      imageInput.removeAttribute("capture");
      imageInput.click();
    });

    takePhotoBtn?.addEventListener("click", async () => {
      const hasPermission = await requestCameraPermission();
      if (hasPermission && cameraView && imageOptions && video) {
        try {
          currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          video.srcObject = currentStream;
          imageOptions.style.display = "none";
          cameraView.style.display = "block";
        } catch (err) {
          console.error("Error starting camera:", err);
          alert("Could not start camera.");
        }
      } else if (!hasPermission) {
        alert("Camera permission is required to take photos.");
      }
    });

    shutterBtn?.addEventListener("click", () => {
      if (video && imagePreview) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        imagePreview.innerHTML = `<img src="${imageData}" alt="Captured Photo" />`;
        imagePreview.classList.add("active");

        // Save the captured image to formData for submission
        formData.image = imageData;

        // Calculate size for Base64 (approximate)
        const approxBytes = Math.round((imageData.length * 3) / 4);
        updateImageSizeDisplay(approxBytes);

        stopCamera();
      }
    });

    cancelCameraBtn?.addEventListener("click", stopCamera);

    imageInput?.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      if (file && imagePreview) {
        // Clear any camera-captured image
        delete formData.image;

        updateImageSizeDisplay(file.size);
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.innerHTML = `<img src="${e.target?.result}" alt="Preview" />`;
          imagePreview.classList.add("active");
        };
        reader.readAsDataURL(file);
      }
    });
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
      },
      (entry: DailyBuy) => {
        // onEdit callback
        formData = { ...entry };
        // Format date for datetime-local input
        if (typeof entry.date === "string") {
          const d = new Date(entry.date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          formData.date = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        navigateTo("add");
      },
    );
  }
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
    id: (formData.id as string) || crypto.randomUUID(),
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
    createdAt: formData.createdAt || new Date().toISOString(),
    updatedAt: formData.id ? new Date().toISOString() : undefined,
  };

  // Handle image if present
  const imageInput = document.getElementById("imageInput") as HTMLInputElement;
  if (imageInput && imageInput.files && imageInput.files[0]) {
    const file = imageInput.files[0];
    const reader = new FileReader();
    const imageData = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    entry.image = imageData;
  } else if (formData.image) {
    // Keep existing image if no new one selected
    entry.image = formData.image;
  }
  if (!entry.quantity) {
    console.error("[Form] Quantity is required!!!");
    return;
  }

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
      navigator.onLine,
    );

    if (isOnline && navigator.onLine) {
      try {
        console.log("[API] Sending entry to API...");
        if (formData.id) {
          await apiUpdateDailyBuy(entry);
          console.log("[API] ✅ Entry updated in API successfully");
        } else {
          await apiAddDailyBuys(entry);
          console.log("[API] ✅ Entry synced to API successfully");
        }
      } catch (apiError) {
        console.error(
          "[API] ❌ Failed to sync to API, adding to pending:",
          apiError,
        );
        addToPendingSync(entry, formData.id ? "UPDATE" : "ADD");
      }
    } else {
      // Offline - add to pending sync queue
      console.log("[API] ⚠️ Offline, adding to pending sync");
      addToPendingSync(entry, formData.id ? "UPDATE" : "ADD");
    }
  } catch (error) {
    console.error("[API] ❌ Error checking API status:", error);
    // If we can't check, assume offline and add to pending
    addToPendingSync(entry, formData.id ? "UPDATE" : "ADD");
  }

  // Reset form
  form.reset();
  const imagePreview = document.getElementById("imagePreview");
  if (imagePreview) {
    imagePreview.innerHTML = "";
    imagePreview.classList.remove("active");
  }
  const imageSizeDisplay = document.getElementById("imageSize");
  if (imageSizeDisplay) {
    imageSizeDisplay.textContent = "";
    imageSizeDisplay.classList.remove("active");
  }
  formData = {
    type: "food",
    date: getCurrentDateTimeLocal(),
  };

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
  const pending = await getPendingSyncEntries();
  if (pending && pending.length > 0) {
    const localEntries = getEntries();
    const localIds = new Set(localEntries.map((e) => e.id));
    const newPending = pending.filter((e) => e && !localIds.has(e.id));
    if (newPending.length > 0) {
      const merged = [...localEntries, ...newPending];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      entriesStore.set(merged);
    }
  }

  // Subscribe to page changes
  pageStore.subscribe(async (page) => {
    currentPage = page;
    await renderAppView();
  });

  // Subscribe to entry changes to refresh view
  entriesStore.subscribe(() => {
    if (currentPage === "list") {
      renderAppView();
    }
  });

  // Subscribe to sync status
  syncStatusStore.subscribe((status) => {
    const statusBar = document.getElementById("syncStatusBar");
    const statusText = statusBar?.querySelector(".sync-status-text");
    if (!statusBar || !statusText) return;

    statusBar.classList.remove("online", "offline", "syncing");

    if (status.isSyncing) {
      statusBar.classList.add("syncing");
      statusText.textContent = "Syncing...";
    } else if (status.isOnline) {
      statusBar.classList.add("online");
      statusText.textContent =
        status.pendingCount > 0 ? `${status.pendingCount} pending` : "Online";
    } else {
      statusBar.classList.add("offline");
      statusText.textContent = "Offline";
    }
  });

  // Initial render
  renderAppView();

  // Try to sync pending entries if online
  if (navigator.onLine) {
    syncStatusStore.update((s) => ({ ...s, isSyncing: true }));
    syncPendingEntries().then((synced) => {
      syncStatusStore.update((s) => ({ ...s, isSyncing: false }));
      if (synced > 0) {
        loadEntriesFromAPI();
      }
    });
  }
}

// Register Service Worker for PWA
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registration successful:", registration.scope);

          // Handle updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    // New content is available, but the user is currently using an older version
                    console.log("[SW] New version available, please refresh.");
                    // Optional: Show a "New version available" toast/alert
                  } else {
                    // Content is cached for offline use
                    console.log("[SW] Content is cached for offline use.");
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.log("[SW] Registration failed:", error);
        });
    });

    // Reload the page when the controller changes (new SW takes control)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        console.log("[SW] Controller changed, reloading page...");
        window.location.reload();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
