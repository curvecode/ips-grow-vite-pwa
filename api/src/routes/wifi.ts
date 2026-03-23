import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Router, type Request, type Response } from "express";
import type { WifiNetwork, WifiScanResult } from "@common/wifi-network.model";

const router = Router();
const execFileAsync = promisify(execFile);

type MutableWifiNetwork = {
  ssid: string;
  signal: number | null;
  authentication: string;
  encryption: string;
  radioTypes: Set<string>;
  channels: Set<number>;
  bssidCount: number;
};

function finalizeNetwork(network: MutableWifiNetwork): WifiNetwork {
  return {
    ssid: network.ssid,
    signal: network.signal,
    authentication: network.authentication,
    encryption: network.encryption,
    radioTypes: Array.from(network.radioTypes),
    channels: Array.from(network.channels).sort((left, right) => left - right),
    bssidCount: network.bssidCount,
  };
}

function parseWifiNetworks(rawOutput: string): WifiNetwork[] {
  const networks: WifiNetwork[] = [];
  const lines = rawOutput.split(/\r?\n/);
  let currentNetwork: MutableWifiNetwork | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const ssidMatch = trimmed.match(/^SSID\s+\d+\s*:\s*(.*)$/i);
    if (ssidMatch) {
      if (currentNetwork) {
        networks.push(finalizeNetwork(currentNetwork));
      }

      const rawSsid = ssidMatch[1]?.trim() ?? "";
      currentNetwork = {
        ssid: rawSsid || "(Hidden Network)",
        signal: null,
        authentication: "Unknown",
        encryption: "Unknown",
        radioTypes: new Set<string>(),
        channels: new Set<number>(),
        bssidCount: 0,
      };
      continue;
    }

    if (!currentNetwork) {
      continue;
    }

    const authenticationMatch = trimmed.match(/^Authentication\s*:\s*(.+)$/i);
    if (authenticationMatch) {
      currentNetwork.authentication = authenticationMatch[1].trim();
      continue;
    }

    const encryptionMatch = trimmed.match(/^Encryption\s*:\s*(.+)$/i);
    if (encryptionMatch) {
      currentNetwork.encryption = encryptionMatch[1].trim();
      continue;
    }

    if (/^BSSID\s+\d+\s*:/i.test(trimmed)) {
      currentNetwork.bssidCount += 1;
      continue;
    }

    const signalMatch = trimmed.match(/^Signal\s*:\s*(\d+)%$/i);
    if (signalMatch) {
      const signal = Number.parseInt(signalMatch[1], 10);
      currentNetwork.signal = currentNetwork.signal === null
        ? signal
        : Math.max(currentNetwork.signal, signal);
      continue;
    }

    const radioTypeMatch = trimmed.match(/^Radio type\s*:\s*(.+)$/i);
    if (radioTypeMatch) {
      currentNetwork.radioTypes.add(radioTypeMatch[1].trim());
      continue;
    }

    const channelMatch = trimmed.match(/^Channel\s*:\s*(\d+)$/i);
    if (channelMatch) {
      currentNetwork.channels.add(Number.parseInt(channelMatch[1], 10));
    }
  }

  if (currentNetwork) {
    networks.push(finalizeNetwork(currentNetwork));
  }

  return networks.sort((left, right) => {
    const rightSignal = right.signal ?? -1;
    const leftSignal = left.signal ?? -1;
    return rightSignal - leftSignal;
  });
}

async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  const { stdout } = await execFileAsync(
    "netsh",
    ["wlan", "show", "networks", "mode=bssid"],
    {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );

  return parseWifiNetworks(stdout);
}

router.get("/scan", async (_req: Request, res: Response) => {
  if (process.platform !== "win32") {
    return res.status(501).json({
      success: false,
      error: "Wi-Fi scanning is only supported on Windows hosts",
    });
  }

  try {
    const result: WifiScanResult = {
      networks: await scanWifiNetworks(),
      scannedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: result,
      count: result.networks.length,
    });
  } catch (error) {
    console.error("Error scanning Wi-Fi networks:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to scan Wi-Fi networks",
      message: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;