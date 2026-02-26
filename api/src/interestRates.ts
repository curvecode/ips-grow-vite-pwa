import { existsSync, readFileSync } from "fs";
import { join } from "path";

const HISTORY_FILE = join(process.cwd(), "..", "backend", "data", "interest_history.json");

const SOURCE_LABELS: Record<string, string> = {
  thebank: "thebank.vn",
  laodong: "laodong.vn",
  techcombank: "techcombank.com",
};

type TermKey = "6" | "12";
type SourceKey = "thebank" | "laodong" | "techcombank";

type SnapshotSource = {
  terms?: Record<string, Record<string, number>>;
  crawled_at?: string;
};

type Snapshot = {
  month: string;
  rates?: Record<string, number>;
  terms?: Record<string, Record<string, number>>;
  crawled_at?: string;
  sources?: Record<string, SnapshotSource>;
};

type HistoryPayload = {
  snapshots?: Snapshot[];
};

export type MonthlyRate = {
  month: string;
  rate: number;
};

export type BankInterestRate = {
  bank_name: string;
  rates_12_months: MonthlyRate[];
};

export type InterestRatesResult = {
  data: BankInterestRate[];
  dataSource: string;
  lastCrawlAt: string;
  selectedTerm: number;
  selectedSource: SourceKey;
};

export type HistorySummary = {
  source: SourceKey;
  source_label: string;
  total_snapshots: number;
  source_snapshots: number;
  oldest_month: string;
  latest_month: string;
  latest_crawled_at: string;
  bank_counts_by_term: Record<string, number>;
};

function normalizeSource(source?: string): SourceKey {
  const normalized = (source ?? "thebank").trim().toLowerCase();
  if (normalized === "laodong" || normalized === "techcombank") {
    return normalized;
  }

  return "thebank";
}

function normalizeTerm(term?: number): TermKey {
  return term === 6 ? "6" : "12";
}

function readHistorySnapshots(): Snapshot[] {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const raw = readFileSync(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(raw) as HistoryPayload;

    if (!Array.isArray(parsed.snapshots)) {
      return [];
    }

    return parsed.snapshots
      .filter((snapshot) => typeof snapshot?.month === "string")
      .sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

function toMonthDate(month: string): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function getLastMonthsFrom(latestMonth: string, count: number): string[] {
  const base = toMonthDate(latestMonth);
  if (Number.isNaN(base.valueOf())) {
    return [];
  }

  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const value = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1));
    months.push(formatMonth(value));
  }

  return months;
}

function extractRates(snapshot: Snapshot, source: SourceKey, term: TermKey): Record<string, number> {
  const sourceTermRates = snapshot.sources?.[source]?.terms?.[term];
  if (sourceTermRates && Object.keys(sourceTermRates).length > 0) {
    return sourceTermRates;
  }

  if (source === "thebank") {
    const legacyTermRates = snapshot.terms?.[term];
    if (legacyTermRates && Object.keys(legacyTermRates).length > 0) {
      return legacyTermRates;
    }

    if (snapshot.rates && Object.keys(snapshot.rates).length > 0) {
      return snapshot.rates;
    }
  }

  return {};
}

function fillSeries(months: string[], knownPoints: Map<string, number>): MonthlyRate[] {
  const knownEntries = Array.from(knownPoints.entries()).sort(([monthA], [monthB]) => monthA.localeCompare(monthB));
  const firstKnownRate = knownEntries[0]?.[1] ?? 0;

  let lastRate = firstKnownRate;

  return months.map((month) => {
    const rate = knownPoints.get(month);
    if (typeof rate === "number") {
      lastRate = rate;
      return { month, rate };
    }

    return { month, rate: lastRate };
  });
}

function getLatestSourceCrawlAt(snapshots: Snapshot[], source: SourceKey): string {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index];
    const sourceCrawl = snapshot.sources?.[source]?.crawled_at;
    if (sourceCrawl) {
      return sourceCrawl;
    }

    if (source === "thebank" && snapshot.crawled_at) {
      return snapshot.crawled_at;
    }
  }

  return "";
}

export function getInterestRates(termInput?: number, sourceInput?: string): InterestRatesResult {
  const snapshots = readHistorySnapshots();
  const source = normalizeSource(sourceInput);
  const term = normalizeTerm(termInput);

  if (snapshots.length === 0) {
    return {
      data: [],
      dataSource: SOURCE_LABELS[source],
      lastCrawlAt: "",
      selectedTerm: Number(term),
      selectedSource: source,
    };
  }

  const latestMonth = snapshots[snapshots.length - 1].month;
  const months = getLastMonthsFrom(latestMonth, 12);
  const seriesMap = new Map<string, Map<string, number>>();

  for (const snapshot of snapshots) {
    if (!months.includes(snapshot.month)) {
      continue;
    }

    const rates = extractRates(snapshot, source, term);
    for (const [bankName, rate] of Object.entries(rates)) {
      if (typeof rate !== "number" || Number.isNaN(rate)) {
        continue;
      }

      if (!seriesMap.has(bankName)) {
        seriesMap.set(bankName, new Map<string, number>());
      }

      seriesMap.get(bankName)?.set(snapshot.month, rate);
    }
  }

  const data = Array.from(seriesMap.entries())
    .sort(([bankA], [bankB]) => bankA.localeCompare(bankB))
    .map(([bankName, points]) => ({
      bank_name: bankName,
      rates_12_months: fillSeries(months, points),
    }));

  return {
    data,
    dataSource: SOURCE_LABELS[source],
    lastCrawlAt: getLatestSourceCrawlAt(snapshots, source),
    selectedTerm: Number(term),
    selectedSource: source,
  };
}

export function getInterestHistorySummary(sourceInput?: string): HistorySummary {
  const snapshots = readHistorySnapshots();
  const source = normalizeSource(sourceInput);

  const sourceSnapshots = snapshots.filter((snapshot) => {
    if (snapshot.sources?.[source]?.terms && Object.keys(snapshot.sources[source].terms ?? {}).length > 0) {
      return true;
    }

    if (source === "thebank") {
      return Boolean(snapshot.terms && Object.keys(snapshot.terms).length > 0);
    }

    return false;
  });

  const latestSnapshot = sourceSnapshots[sourceSnapshots.length - 1];
  const latestTerms = latestSnapshot?.sources?.[source]?.terms
    ?? (source === "thebank" ? latestSnapshot?.terms : undefined)
    ?? {};

  const bankCountsByTerm = Object.fromEntries(
    Object.entries(latestTerms).map(([term, rates]) => [term, Object.keys(rates ?? {}).length]),
  );

  return {
    source,
    source_label: SOURCE_LABELS[source],
    total_snapshots: snapshots.length,
    source_snapshots: sourceSnapshots.length,
    oldest_month: snapshots[0]?.month ?? "",
    latest_month: snapshots[snapshots.length - 1]?.month ?? "",
    latest_crawled_at: getLatestSourceCrawlAt(snapshots, source),
    bank_counts_by_term: bankCountsByTerm,
  };
}
