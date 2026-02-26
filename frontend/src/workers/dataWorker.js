const API_URL = '/api/interest-rates';
const POLLING_INTERVAL_MS = 5 * 60 * 1000;

let timerId = null;
let selectedTerm = 12;
let selectedSource = 'thebank';

async function fetchInterestRates() {
  postMessage({
    type: 'loading',
    value: true,
  });

  try {
    const response = await fetch(`${API_URL}?term=${selectedTerm}&source=${encodeURIComponent(selectedSource)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const dataSource = response.headers.get('X-Data-Source');
    const lastCrawlAt = response.headers.get('X-Last-Crawl-At');
    const selectedTermHeader = response.headers.get('X-Selected-Term');
    const selectedSourceHeader = response.headers.get('X-Selected-Source');
    const termMonths = Number.parseInt(selectedTermHeader ?? `${selectedTerm}`, 10);
    const sourceKey = selectedSourceHeader ?? selectedSource;

    postMessage({
      type: 'interest-rates',
      payload,
      fetchedAt: Date.now(),
      dataSource,
      lastCrawlAt,
      termMonths,
      sourceKey,
    });
  } catch (error) {
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown worker error',
    });
  } finally {
    postMessage({
      type: 'loading',
      value: false,
    });
  }
}

function startPolling() {
  if (timerId !== null) {
    return;
  }

  fetchInterestRates();
  timerId = setInterval(fetchInterestRates, POLLING_INTERVAL_MS);
}

function stopPolling() {
  if (timerId === null) {
    return;
  }

  clearInterval(timerId);
  timerId = null;
}

self.onmessage = (event) => {
  if (event.data === 'start') {
    startPolling();
    return;
  }

  if (event.data === 'stop') {
    stopPolling();
    return;
  }

  if (event.data?.type === 'set-options') {
    const incomingTerm = Number.parseInt(event.data.termMonths, 10);
    const incomingSource = typeof event.data.sourceKey === 'string' ? event.data.sourceKey : selectedSource;

    if (incomingTerm !== 6 && incomingTerm !== 12) {
      return;
    }

    if (!['thebank', 'laodong', 'techcombank'].includes(incomingSource)) {
      return;
    }

    const hasChanged = selectedTerm !== incomingTerm || selectedSource !== incomingSource;
    selectedSource = incomingSource;

    if (hasChanged) {
      selectedTerm = incomingTerm;
      fetchInterestRates();
    }
  }
};
