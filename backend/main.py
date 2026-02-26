import os

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware

try:
    from .scraper import fetch_interest_rates, get_data_source, get_history_summary, get_latest_crawl_at
except ImportError:
    from scraper import fetch_interest_rates, get_data_source, get_history_summary, get_latest_crawl_at

app = FastAPI(title="Bank Interest Tracker API")


def get_allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    if configured:
        origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
        return origins or ["http://localhost:5173"]

    return ["http://localhost:5173", "http://127.0.0.1:5173"]


allowed_origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Data-Source", "X-Last-Crawl-At", "X-Selected-Term", "X-Selected-Source"],
)


@app.get("/api/interest-rates")
def get_interest_rates(
    response: Response,
    term: int = Query(default=12, ge=6, le=12),
    source: str = Query(default="thebank"),
):
    selected_term = 6 if term == 6 else 12
    selected_source = source.strip().lower() if source else "thebank"
    if selected_source not in {"thebank", "laodong", "techcombank"}:
        selected_source = "thebank"

    data = fetch_interest_rates(selected_term, selected_source)
    response.headers["X-Data-Source"] = get_data_source(selected_source)
    response.headers["X-Selected-Term"] = str(selected_term)
    response.headers["X-Selected-Source"] = selected_source

    latest_crawl_at = get_latest_crawl_at(selected_source)
    if latest_crawl_at:
        response.headers["X-Last-Crawl-At"] = latest_crawl_at

    return data


@app.get("/api/history/summary")
def history_summary(source: str = Query(default="thebank")):
    selected_source = source.strip().lower() if source else "thebank"
    if selected_source not in {"thebank", "laodong", "techcombank"}:
        selected_source = "thebank"
    return get_history_summary(selected_source)
