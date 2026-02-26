import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

try:
    from .models import BankInterestRate, MonthlyRate
except ImportError:
    from models import BankInterestRate, MonthlyRate

REQUEST_TIMEOUT = 20
MAX_BANKS = 12
HISTORY_FILE = Path(__file__).resolve().parent / "data" / "interest_history.json"
SUPPORTED_TERMS = (6, 12)

THEBANK_LIST_URL = "https://thebank.vn/lai-suat-ngan-hang"
THEBANK_BASE_URL = "https://thebank.vn"
LAODONG_BASE_URL = "https://laodong.vn"
LAODONG_SEARCH_URL = f"{LAODONG_BASE_URL}/tim-kiem?q={quote('lãi suất tiết kiệm')}"
TECHCOMBANK_RATE_URL = "https://techcombank.com/thong-tin/blog/lai-suat-tiet-kiem"

SOURCE_CONFIG: Dict[str, Dict[str, str]] = {
    "thebank": {
        "label": "thebank.vn",
    },
    "laodong": {
        "label": "laodong.vn (keyword: lai suat tiet kiem)",
    },
    "techcombank": {
        "label": "techcombank.com",
    },
}

BANK_ALIASES: Dict[str, List[str]] = {
    "BIDV": ["bidv"],
    "VIETCOMBANK": ["vietcombank", "vcb"],
    "MBBANK": ["mbbank", "mb bank", "mb"],
    "VPBANK": ["vpbank"],
    "SCB": ["scb"],
    "SACOMBANK": ["sacombank"],
    "VIETINBANK": ["vietinbank", "ctg"],
    "SEABANK": ["seabank"],
    "VIB": ["vib"],
    "ACB": ["acb"],
    "HSBC": ["hsbc"],
    "DONGA BANK": ["donga bank", "dongabank", "đông á", "dong a"],
}


def _normalize_source(source_key: str | None) -> str:
    normalized = (source_key or "thebank").strip().lower()
    if normalized not in SOURCE_CONFIG:
        return "thebank"
    return normalized


def _month_labels_last_12() -> List[str]:
    now = datetime.now()
    labels: List[str] = []
    year = now.year
    month = now.month

    for _ in range(12):
        labels.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    labels.reverse()
    return labels


def _safe_float(value: str) -> float | None:
    matched = re.search(r"\d+(?:[.,]\d+)?", value)
    if not matched:
        return None

    normalized = matched.group(0).replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return None


def _extract_bank_name_from_slug(slug: str) -> str:
    cleaned = slug.split("#", 1)[0].split("?", 1)[0]
    matched = re.search(r"gui-tiet-kiem-ngan-hang-(.+)-\d+\.html$", cleaned)
    if not matched:
        return ""

    return matched.group(1).replace("-", " ").upper()


def _extract_bank_links(list_html: str) -> Dict[str, str]:
    soup = BeautifulSoup(list_html, "html.parser")
    links: Dict[str, str] = {}

    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if "/gui-tiet-kiem/gui-tiet-kiem-ngan-hang-" not in href:
            continue

        href_clean = href.split("#", 1)[0].split("?", 1)[0]
        full_url = f"{THEBANK_BASE_URL}{href_clean}" if href_clean.startswith("/") else href_clean
        slug = href_clean.split("/")[-1]
        bank_name = _extract_bank_name_from_slug(slug)
        if bank_name and bank_name not in links:
            links[bank_name] = full_url

        if len(links) >= MAX_BANKS:
            break

    return links


def _normalize_bank_name(value: str) -> str | None:
    text = value.lower()
    for canonical_name, aliases in BANK_ALIASES.items():
        for alias in aliases:
            if alias in text:
                return canonical_name
    return None


def _extract_term_rates_from_tables(page_html: str, term_months: tuple[int, ...]) -> Dict[int, float]:
    soup = BeautifulSoup(page_html, "html.parser")
    extracted_rates: Dict[int, float] = {}

    for table in soup.select("table"):
        headers = [header.get_text(" ", strip=True).lower() for header in table.select("thead th")]
        term_indexes: Dict[int, int] = {}

        for term in term_months:
            for index, header_text in enumerate(headers):
                if re.search(rf"\b{term}\b", header_text) and (
                    "tháng" in header_text or "thang" in header_text
                ):
                    term_indexes[term] = index
                    break

        if not term_indexes:
            continue

        for term, term_index in term_indexes.items():
            column_rates: List[float] = []
            for row in table.select("tbody tr"):
                cells = row.select("td")
                if len(cells) <= term_index:
                    continue

                value = cells[term_index].get_text(" ", strip=True)
                rate = _safe_float(value)
                if rate is not None and "%" in value and 0 < rate < 20:
                    column_rates.append(rate)

            if column_rates:
                extracted_rates[term] = max(column_rates)

    return extracted_rates


def _extract_term_rate_from_text(page_html: str, term: int) -> float | None:
    soup = BeautifulSoup(page_html, "html.parser")
    text = soup.get_text(" ", strip=True)
    patterns = [
        rf"{term}\s*th[aá]ng[^\d]{{0,40}}(\d+(?:[.,]\d+)?)\s*%",
        rf"(\d+(?:[.,]\d+)?)\s*%[^\d]{{0,40}}{term}\s*th[aá]ng",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        rate = _safe_float(match.group(1))
        if rate is not None and 0 < rate < 20:
            return rate

    return None


def _fetch_current_rates_from_thebank() -> Dict[int, Dict[str, float]]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }

    list_response = requests.get(THEBANK_LIST_URL, headers=headers, timeout=REQUEST_TIMEOUT)
    list_response.raise_for_status()
    bank_links = _extract_bank_links(list_response.text)

    rates_by_term: Dict[int, Dict[str, float]] = {term: {} for term in SUPPORTED_TERMS}
    for bank_name, detail_url in bank_links.items():
        try:
            detail_response = requests.get(detail_url, headers=headers, timeout=REQUEST_TIMEOUT)
            detail_response.raise_for_status()
            page_html = detail_response.text

            parsed_from_table = _extract_term_rates_from_tables(page_html, SUPPORTED_TERMS)

            for term in SUPPORTED_TERMS:
                rate = parsed_from_table.get(term)
                if rate is None:
                    rate = _extract_term_rate_from_text(page_html, term)

                if rate is not None:
                    rates_by_term[term][bank_name] = rate
        except requests.RequestException:
            continue

    if not rates_by_term[12]:
        raise RuntimeError("Cannot fetch real 12-month interest rates from source")

    if not rates_by_term[6]:
        rates_by_term[6] = dict(rates_by_term[12])

    return rates_by_term


def _laodong_request(session: requests.Session, url: str) -> requests.Response:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }
    response = session.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

    if "D1N=" in response.text:
        matched = re.search(r"D1N=([0-9a-f]+)", response.text)
        if matched:
            session.cookies.set("D1N", matched.group(1), domain="laodong.vn", path="/")
            response = session.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

    return response


def _extract_latest_laodong_article_url(search_html: str) -> str | None:
    candidates = re.findall(r'href="(https?://laodong\.vn/[^"]+|/[^"]+)"', search_html)
    cleaned: List[str] = []
    for candidate in candidates:
        url = candidate if candidate.startswith("http") else f"{LAODONG_BASE_URL}{candidate}"
        if not url.startswith(LAODONG_BASE_URL):
            continue
        if any(part in url for part in ["/tim-kiem", "/rss", "#", "javascript:"]):
            continue
        if ".html" not in url:
            continue
        if url not in cleaned:
            cleaned.append(url)

    return cleaned[0] if cleaned else None


def _extract_rates_from_laodong_article(article_html: str) -> Dict[int, Dict[str, float]]:
    soup = BeautifulSoup(article_html, "html.parser")
    text = soup.get_text(" ", strip=True)

    rates_by_term: Dict[int, Dict[str, float]] = {term: {} for term in SUPPORTED_TERMS}

    for table in soup.select("table"):
        headers = [header.get_text(" ", strip=True).lower() for header in table.select("thead th")]
        term_indexes: Dict[int, int] = {}
        bank_name_index = 0

        for index, header_text in enumerate(headers):
            if "ngân hàng" in header_text or "ngan hang" in header_text or "bank" in header_text:
                bank_name_index = index
                break

        for term in SUPPORTED_TERMS:
            for index, header_text in enumerate(headers):
                if re.search(rf"\b{term}\b", header_text) and (
                    "tháng" in header_text or "thang" in header_text
                ):
                    term_indexes[term] = index
                    break

        if not term_indexes:
            continue

        for row in table.select("tbody tr"):
            cells = row.select("td")
            if len(cells) <= bank_name_index:
                continue

            bank_name = _normalize_bank_name(cells[bank_name_index].get_text(" ", strip=True))
            if not bank_name:
                continue

            for term, term_index in term_indexes.items():
                if len(cells) <= term_index:
                    continue

                value = cells[term_index].get_text(" ", strip=True)
                rate = _safe_float(value)
                if rate is not None and 0 < rate < 20:
                    rates_by_term[term][bank_name] = rate

    for canonical_name, aliases in BANK_ALIASES.items():
        if all(canonical_name not in rates_by_term[term] for term in SUPPORTED_TERMS):
            for alias in aliases:
                for term in SUPPORTED_TERMS:
                    patterns = [
                        rf"{re.escape(alias)}[\s\S]{{0,140}}?{term}\s*th[aá]ng[\s\S]{{0,24}}?(\d+(?:[.,]\d+)?)\s*%",
                        rf"{re.escape(alias)}[\s\S]{{0,140}}?(\d+(?:[.,]\d+)?)\s*%[\s\S]{{0,24}}?{term}\s*th[aá]ng",
                    ]
                    for pattern in patterns:
                        match = re.search(pattern, text, flags=re.IGNORECASE)
                        if not match:
                            continue

                        rate = _safe_float(match.group(1))
                        if rate is not None and 0 < rate < 20:
                            rates_by_term[term][canonical_name] = rate
                            break

    return rates_by_term


def _fetch_current_rates_from_laodong() -> Dict[int, Dict[str, float]]:
    session = requests.Session()
    search_response = _laodong_request(session, LAODONG_SEARCH_URL)
    if search_response.status_code >= 400:
        raise RuntimeError("Cannot access laodong search page")

    article_url = _extract_latest_laodong_article_url(search_response.text)
    if not article_url:
        raise RuntimeError("Cannot find latest laodong article URL")

    article_response = _laodong_request(session, article_url)
    if article_response.status_code >= 400:
        raise RuntimeError("Cannot access laodong article")

    rates_by_term = _extract_rates_from_laodong_article(article_response.text)
    if not rates_by_term[12]:
        raise RuntimeError("Cannot extract 12-month rates from laodong article")

    if not rates_by_term[6]:
        rates_by_term[6] = dict(rates_by_term[12])

    return rates_by_term


def _fetch_current_rates_from_techcombank() -> Dict[int, Dict[str, float]]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }

    response = requests.get(TECHCOMBANK_RATE_URL, headers=headers, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    rates_by_term: Dict[int, Dict[str, float]] = {term: {} for term in SUPPORTED_TERMS}

    for table in soup.select("table"):
        rows = table.select("tr")
        if not rows:
            continue

        header_cells = rows[0].select("th, td")
        headers_text = [cell.get_text(" ", strip=True).lower() for cell in header_cells]
        if not headers_text:
            continue

        bank_index = None
        term_indexes: Dict[int, int] = {}

        for index, header_text in enumerate(headers_text):
            if bank_index is None and ("ngân hàng" in header_text or "ngan hang" in header_text or "bank" in header_text):
                bank_index = index

            for term in SUPPORTED_TERMS:
                if term in term_indexes:
                    continue
                if re.search(rf"\b{term}\b", header_text) and ("tháng" in header_text or "thang" in header_text):
                    term_indexes[term] = index

        if bank_index is None or 12 not in term_indexes:
            continue

        for row in rows[1:]:
            cells = row.select("th, td")
            if not cells or len(cells) <= bank_index:
                continue

            bank_name = _normalize_bank_name(cells[bank_index].get_text(" ", strip=True))
            if not bank_name:
                continue

            for term, term_index in term_indexes.items():
                if len(cells) <= term_index:
                    continue

                value = cells[term_index].get_text(" ", strip=True)
                rate = _safe_float(value)
                if rate is not None and 0 < rate < 20:
                    rates_by_term[term][bank_name] = rate

        if rates_by_term[12]:
            break

    if not rates_by_term[12]:
        raise RuntimeError("Cannot extract 12-month rates from techcombank source")

    if not rates_by_term[6]:
        rates_by_term[6] = dict(rates_by_term[12])

    return rates_by_term


def _fetch_current_rates_for_terms(source_key: str) -> Dict[int, Dict[str, float]]:
    if source_key == "laodong":
        return _fetch_current_rates_from_laodong()
    if source_key == "techcombank":
        return _fetch_current_rates_from_techcombank()
    return _fetch_current_rates_from_thebank()


def _load_history() -> Dict[str, Any]:
    if not HISTORY_FILE.exists():
        return {"snapshots": []}

    with HISTORY_FILE.open("r", encoding="utf-8") as file:
        history = json.load(file)

    snapshots = history.get("snapshots", [])
    for snapshot in snapshots:
        if "sources" not in snapshot:
            snapshot["sources"] = {}

            legacy_terms = snapshot.get("terms")
            if isinstance(legacy_terms, dict):
                snapshot["sources"]["thebank"] = {
                    "terms": legacy_terms,
                    "crawled_at": snapshot.get("crawled_at"),
                }
            else:
                legacy_rates = snapshot.get("rates", {})
                if isinstance(legacy_rates, dict):
                    snapshot["sources"]["thebank"] = {
                        "terms": {"12": legacy_rates},
                        "crawled_at": snapshot.get("crawled_at"),
                    }

        if isinstance(snapshot.get("sources"), dict):
            for source_entry in snapshot["sources"].values():
                if isinstance(source_entry, dict) and not isinstance(source_entry.get("terms"), dict):
                    source_entry["terms"] = {}

    return history


def _save_history(history: Dict[str, Any]) -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with HISTORY_FILE.open("w", encoding="utf-8") as file:
        json.dump(history, file, ensure_ascii=False, indent=2)


def _upsert_month_snapshot(history: Dict[str, Any], source_key: str, rates_by_term: Dict[int, Dict[str, float]]) -> None:
    month_key = datetime.now().strftime("%Y-%m")
    crawled_at = datetime.now().isoformat(timespec="seconds")
    snapshots: List[Dict[str, Any]] = history.setdefault("snapshots", [])

    normalized_terms = {
        str(term): dict(rates_by_term.get(term, {}))
        for term in SUPPORTED_TERMS
    }

    existing = next((snapshot for snapshot in snapshots if snapshot.get("month") == month_key), None)
    if existing is not None:
        sources_bucket = existing.setdefault("sources", {})
        source_bucket = sources_bucket.setdefault(source_key, {"terms": {}, "crawled_at": crawled_at})
        terms_bucket = source_bucket.setdefault("terms", {})
        for term_key, term_rates in normalized_terms.items():
            terms_bucket[term_key] = term_rates
        source_bucket["crawled_at"] = crawled_at
        existing["crawled_at"] = crawled_at
    else:
        snapshots.append(
            {
                "month": month_key,
                "sources": {
                    source_key: {
                        "terms": normalized_terms,
                        "crawled_at": crawled_at,
                    }
                },
                "crawled_at": crawled_at,
            }
        )

    snapshots.sort(key=lambda snapshot: snapshot.get("month", ""))


def _build_response(history: Dict[str, Any], term_months: int, source_key: str) -> List[BankInterestRate]:
    labels = _month_labels_last_12()
    snapshots: List[Dict[str, Any]] = history.get("snapshots", [])
    term_key = str(term_months)

    def rates_for_snapshot(snapshot: Dict[str, Any]) -> Dict[str, float]:
        sources = snapshot.get("sources", {})
        if isinstance(sources, dict):
            source_bucket = sources.get(source_key, {})
            if isinstance(source_bucket, dict):
                terms = source_bucket.get("terms", {})
                if isinstance(terms, dict):
                    rates = terms.get(term_key)
                    if isinstance(rates, dict):
                        return rates

        if source_key == "thebank":
            terms = snapshot.get("terms", {})
            if isinstance(terms, dict):
                rates = terms.get(term_key)
                if isinstance(rates, dict):
                    return rates
            legacy_rates = snapshot.get("rates", {})
            if isinstance(legacy_rates, dict):
                return legacy_rates

        return {}

    bank_names = sorted({bank for snapshot in snapshots for bank in rates_for_snapshot(snapshot).keys()})

    month_to_rates = {
        snapshot.get("month", ""): rates_for_snapshot(snapshot)
        for snapshot in snapshots
    }

    response: List[BankInterestRate] = []
    for bank_name in bank_names:
        last_known_rate: float | None = None
        series: List[MonthlyRate] = []

        for month in labels:
            month_rates = month_to_rates.get(month, {})
            if bank_name in month_rates:
                last_known_rate = float(month_rates[bank_name])

            if last_known_rate is None:
                continue

            series.append(MonthlyRate(month=month, rate=last_known_rate))

        if not series:
            continue

        if len(series) < 12:
            first_rate = series[0].rate
            missing_labels = labels[: 12 - len(series)]
            padded = [MonthlyRate(month=month, rate=first_rate) for month in missing_labels]
            series = padded + series

        response.append(BankInterestRate(bank_name=bank_name, rates_12_months=series))

    return response


def _mock_fallback(term_months: int, source_key: str) -> List[BankInterestRate]:
    labels = _month_labels_last_12()
    source_adjust = 0.0 if source_key == "thebank" else -0.1
    term_adjust = 0.0 if term_months == 12 else -0.2
    return [
        BankInterestRate(
            bank_name="VIETCOMBANK",
            rates_12_months=[MonthlyRate(month=month, rate=4.9 + term_adjust + source_adjust) for month in labels],
        ),
        BankInterestRate(
            bank_name="BIDV",
            rates_12_months=[MonthlyRate(month=month, rate=4.8 + term_adjust + source_adjust) for month in labels],
        ),
    ]


def get_data_source(source_key: str = "thebank") -> str:
    normalized = _normalize_source(source_key)
    return SOURCE_CONFIG[normalized]["label"]


def get_latest_crawl_at(source_key: str = "thebank") -> str | None:
    normalized = _normalize_source(source_key)
    history = _load_history()
    snapshots: List[Dict[str, Any]] = history.get("snapshots", [])
    if not snapshots:
        return None

    ordered = sorted(snapshots, key=lambda snapshot: snapshot.get("month", ""), reverse=True)
    for snapshot in ordered:
        sources = snapshot.get("sources", {})
        if isinstance(sources, dict):
            source_bucket = sources.get(normalized, {})
            if isinstance(source_bucket, dict):
                latest_crawl = source_bucket.get("crawled_at")
                if isinstance(latest_crawl, str) and latest_crawl:
                    return latest_crawl

        if normalized == "thebank":
            legacy_crawl = snapshot.get("crawled_at")
            if isinstance(legacy_crawl, str) and legacy_crawl:
                return legacy_crawl

    return None


def get_history_summary(source_key: str = "thebank") -> Dict[str, Any]:
    normalized = _normalize_source(source_key)
    history = _load_history()
    snapshots: List[Dict[str, Any]] = history.get("snapshots", [])

    months = sorted(
        [
            snapshot.get("month")
            for snapshot in snapshots
            if isinstance(snapshot.get("month"), str)
            and isinstance(snapshot.get("sources", {}).get(normalized), dict)
        ]
    )

    latest_snapshot = max(
        (
            snapshot
            for snapshot in snapshots
            if isinstance(snapshot.get("sources", {}).get(normalized), dict)
        ),
        key=lambda snapshot: snapshot.get("month", ""),
        default=None,
    )
    latest_crawled_at = None
    bank_counts_by_term: Dict[str, int] = {}
    if isinstance(latest_snapshot, dict):
        source_bucket = latest_snapshot.get("sources", {}).get(normalized, {})
        crawled_at = source_bucket.get("crawled_at") if isinstance(source_bucket, dict) else None
        if isinstance(crawled_at, str) and crawled_at:
            latest_crawled_at = crawled_at

        term_bucket = source_bucket.get("terms", {}) if isinstance(source_bucket, dict) else {}
        if isinstance(term_bucket, dict):
            for term_key, rates in term_bucket.items():
                if isinstance(rates, dict):
                    bank_counts_by_term[str(term_key)] = len(rates)

    return {
        "source": normalized,
        "source_label": get_data_source(normalized),
        "total_snapshots": len(snapshots),
        "source_snapshots": len(months),
        "oldest_month": months[0] if months else None,
        "latest_month": months[-1] if months else None,
        "latest_crawled_at": latest_crawled_at,
        "bank_counts_by_term": bank_counts_by_term,
    }


def fetch_interest_rates(term_months: int = 12, source_key: str = "thebank") -> List[BankInterestRate]:
    selected_term = term_months if term_months in SUPPORTED_TERMS else 12
    selected_source = _normalize_source(source_key)
    history = _load_history()

    try:
        current_rates_by_term = _fetch_current_rates_for_terms(selected_source)
        _upsert_month_snapshot(history, selected_source, current_rates_by_term)
        _save_history(history)
    except Exception:
        history = _load_history()

    response = _build_response(history, selected_term, selected_source)
    if response:
        return response

    return _mock_fallback(selected_term, selected_source)
