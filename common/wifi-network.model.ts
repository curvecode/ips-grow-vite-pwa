export interface WifiNetwork {
  ssid: string;
  signal: number | null;
  authentication: string;
  encryption: string;
  radioTypes: string[];
  channels: number[];
  bssidCount: number;
}

export interface WifiScanResult {
  networks: WifiNetwork[];
  scannedAt: string;
}