import type { DailyBuy } from "@common/daily-buy.model";
import type { WifiScanResult } from "@common/wifi-network.model";

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_HEADER = "X-Auth-Type";

/**
 * API Response types
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

/**
 * Make API request with authentication header
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log("[API] apiRequest: Making request to", url, options.method || "GET");
  
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set(AUTH_HEADER, "anonymous"); // Can be changed to "authenticated" if needed

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log("[API] apiRequest: Response status", response.status, response.statusText);
    const data = await response.json();
    console.log("[API] apiRequest: Response data", data);

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("[API] apiRequest: Request failed:", error);
    throw error;
  }
}

/**
 * Get all daily buys from API
 */
export async function getDailyBuys(): Promise<DailyBuy[]> {
  const response = await apiRequest<DailyBuy[]>("/daily-buys");
  return response.data || [];
}

/**
 * Add daily buy entries to API
 * Can accept single entry or array of entries
 */
export async function addDailyBuys(
  entries: DailyBuy | DailyBuy[]
): Promise<DailyBuy[]> {
  const entriesArray = Array.isArray(entries) ? entries : [entries];
  const response = await apiRequest<DailyBuy[]>("/daily-buys", {
    method: "POST",
    body: JSON.stringify(entriesArray),
  });
  return response.data || [];
}

/**
 * Update an existing daily buy entry in API
 */
export async function updateDailyBuy(entry: DailyBuy): Promise<DailyBuy> {
  const response = await apiRequest<DailyBuy>(`/daily-buys/${entry.id}`, {
    method: "PUT",
    body: JSON.stringify(entry),
  });
  return response.data!;
}

/**
 * Delete a daily buy entry from API
 */
export async function deleteDailyBuy(id: string): Promise<void> {
  await apiRequest<void>(`/daily-buys/${id}`, {
    method: "DELETE",
  });
}

/**
 * Scan nearby Wi-Fi networks via the local API.
 */
export async function scanWifiNetworks(): Promise<WifiScanResult> {
  const response = await apiRequest<WifiScanResult>("/wifi/scan");
  return response.data || {
    networks: [],
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Check if API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    console.log("[API] checkApiHealth: Checking http://localhost:3000/health");
    const response = await fetch("http://localhost:3000/health");
    const isOk = response.ok;
    console.log("[API] checkApiHealth: Response", response.status, isOk ? "✅" : "❌");
    return isOk;
  } catch (error) {
    console.log("[API] checkApiHealth: Failed", error);
    return false;
  }
}

/**
 * Browser-level network + backend health gate.
 * Use this before write operations to avoid unnecessary request attempts.
 */
export async function isApiReachable(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  return checkApiHealth();
}

