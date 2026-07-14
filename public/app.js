'use strict';

const SUGGESTED_SYMBOLS = ['Crypto.BTC/USD', 'Crypto.SOL/USD', 'Crypto.ETH/USD', 'Crypto.USDC/USD'];

const feedSearch = document.getElementById('feedSearch');
const resolutionSelect = document.getElementById('resolution');
const lookbackSelect = document.getElementById('lookbackDays');
const chartTypeSelect = document.getElementById('chartType');
const eliminateGapsInput = document.getElementById('eliminateGaps');
const loadFeedsBtn = document.getElementById('loadFeedsBtn');
const refreshBtn = document.getElementById('refreshBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const statusLine = document.getElementById('statusLine');
const feedsBody = document.getElementById('feedsBody');
const feedsMeta = document.getElementById('feedsMeta');
const selectedFeedMeta = document.getElementById('selectedFeedMeta');
const priceUsdEl = document.getElementById('priceUsd');
const priceMetaEl = document.getElementById('priceMeta');
const productSymbolEl = document.getElementById('productSymbol');
const productMetaEl = document.getElementById('productMeta');
const chartEl = document.getElementById('chart');
const chartEmpty = document.getElementById('chartEmpty');
const quickPickBtns = document.getElementById('quickPickBtns');

/** @type {Array<{priceFeedAddress:string,productAddress:string,symbol:string}>} */
let allFeeds = [];
/** @type {{priceFeedAddress:string,productAddress:string,symbol:string}|null} */
let selectedFeed = null;
/** @type {Array<object>} */
let lastSeries = [];
let lastSeriesKind = 'candles';

let chart = null;
let candleSeries = null;
let lineSeries = null;

function setStatus(msg, isError = false) {
  if (!statusLine) return;
  statusLine.textContent = msg || '';
  statusLine.classList.toggle('is-error', Boolean(isError));
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shorten(addr, left = 4, right = 4) {
  const a = String(addr || '');
  if (a.length <= left + right + 1) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

function formatUsd(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw ?? '—');
  if (Math.abs(n) >= 1000) {
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (Math.abs(n) >= 1) {
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return `$${n.toLocaleString(undefined, { maximumSignificantDigits: 6 })}`;
}

function formatTs(unixSec) {
  const n = Number(unixSec);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Date(n * 1000).toLocaleString();
}

function lookbackBounds() {
  const days = Number(lookbackSelect?.value || 30);
  const timeEnd = Math.floor(Date.now() / 1000);
  const timeStart = timeEnd - Math.max(1, days) * 24 * 60 * 60;
  return { timeStart, timeEnd, limit: 500 };
}

async function apiGet(path) {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }
  return body;
}

function filteredFeeds() {
  const q = String(feedSearch?.value || '')
    .trim()
    .toLowerCase();
  if (!q) return allFeeds;
  return allFeeds.filter((f) => {
    return (
      f.symbol.toLowerCase().includes(q) ||
      f.priceFeedAddress.toLowerCase().includes(q) ||
      f.productAddress.toLowerCase().includes(q)
    );
  });
}

function renderFeedsTable() {
  const rows = filteredFeeds();
  feedsMeta.textContent = `${rows.length.toLocaleString()} feed(s)${
    feedSearch?.value?.trim() ? ' matching filter' : ''
  } · ${allFeeds.length.toLocaleString()} total`;

  if (!rows.length) {
    feedsBody.innerHTML =
      '<tr class="holders-row holders-row--placeholder"><td colspan="5" class="meta">No matching feeds.</td></tr>';
    return;
  }

  feedsBody.innerHTML = rows
    .slice(0, 400)
    .map((f, i) => {
      const selected = selectedFeed?.priceFeedAddress === f.priceFeedAddress ? ' is-selected' : '';
      return `<tr class="holders-row pyth-feed-row${selected}" data-feed="${escapeHtml(f.priceFeedAddress)}">
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(f.symbol || '—')}</strong></td>
        <td><code title="${escapeHtml(f.priceFeedAddress)}">${escapeHtml(shorten(f.priceFeedAddress, 6, 6))}</code></td>
        <td><code title="${escapeHtml(f.productAddress)}">${escapeHtml(shorten(f.productAddress, 6, 6))}</code></td>
        <td><button type="button" class="vybe-action-btn vybe-action-btn--sm" data-select-feed="${escapeHtml(f.priceFeedAddress)}">Select</button></td>
      </tr>`;
    })
    .join('');
}

function renderQuickPicks() {
  if (!quickPickBtns) return;
  const picks = SUGGESTED_SYMBOLS.map((sym) => allFeeds.find((f) => f.symbol === sym)).filter(Boolean);
  if (!picks.length) {
    quickPickBtns.innerHTML = '<span class="meta">Load feeds to enable suggestions.</span>';
    return;
  }
  quickPickBtns.innerHTML = picks
    .map(
      (f) =>
        `<button type="button" class="vybe-action-btn vybe-action-btn--sm" data-select-feed="${escapeHtml(f.priceFeedAddress)}">${escapeHtml(f.symbol)}</button>`,
    )
    .join('');
}

function ensureChart() {
  if (chart || !chartEl || typeof LightweightCharts === 'undefined') return;
  chart = LightweightCharts.createChart(chartEl, {
    layout: {
      background: { color: '#121218' },
      textColor: '#a1a1aa',
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.04)' },
      horzLines: { color: 'rgba(255,255,255,0.04)' },
    },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
    width: chartEl.clientWidth,
    height: 360,
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
  });
  lineSeries = chart.addLineSeries({
    color: '#60a5fa',
    lineWidth: 2,
  });
  window.addEventListener('resize', () => {
    if (chart && chartEl) chart.applyOptions({ width: chartEl.clientWidth });
  });
}

function clearChart() {
  ensureChart();
  candleSeries?.setData([]);
  lineSeries?.setData([]);
  if (chartEmpty) chartEmpty.hidden = false;
}

function renderCandleChart(rows) {
  ensureChart();
  const data = rows
    .map((r) => ({
      time: Number(r.timeBucketStart),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
    }))
    .filter(
      (r) =>
        Number.isFinite(r.time) &&
        Number.isFinite(r.open) &&
        Number.isFinite(r.high) &&
        Number.isFinite(r.low) &&
        Number.isFinite(r.close),
    )
    .sort((a, b) => a.time - b.time);

  lineSeries?.setData([]);
  candleSeries?.setData(data);
  chart?.timeScale().fitContent();
  if (chartEmpty) chartEmpty.hidden = data.length > 0;
}

function renderHistoryChart(rows) {
  ensureChart();
  const data = rows
    .map((r) => ({
      time: Number(r.lastUpdated),
      value: Number(r.priceUsd),
    }))
    .filter((r) => Number.isFinite(r.time) && Number.isFinite(r.value))
    .sort((a, b) => a.time - b.time);

  candleSeries?.setData([]);
  lineSeries?.setData(data);
  chart?.timeScale().fitContent();
  if (chartEmpty) chartEmpty.hidden = data.length > 0;
}

function renderDl(el, entries) {
  if (!el) return;
  el.innerHTML = entries
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<div class="pyth-card__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`,
    )
    .join('');
}

function renderPrice(price) {
  priceUsdEl.textContent = formatUsd(price?.priceUsd);
  renderDl(priceMetaEl, [
    ['Confidence', price?.confidence],
    ['EMA price 1h', price?.emap1H],
    ['EMA conf 1h', price?.emac1H],
    ['Valid slot', price?.validSlot],
    ['Updated', formatTs(price?.lastUpdated)],
    ['Feed', price?.priceFeedAddress],
  ]);
}

function renderProduct(product) {
  productSymbolEl.textContent = product?.symbol || product?.description || '—';
  renderDl(productMetaEl, [
    ['Description', product?.description],
    ['Asset type', product?.assetType],
    ['Base', product?.base],
    ['Quote', product?.quote],
    ['Generic symbol', product?.genericSymbol],
    ['Product', product?.productAddress],
  ]);
}

async function loadFeeds() {
  setStatus('Loading price feeds…');
  loadFeedsBtn.disabled = true;
  try {
    const body = await apiGet('/api/pyth/pricefeeds');
    allFeeds = Array.isArray(body.data) ? body.data : [];
    renderFeedsTable();
    renderQuickPicks();
    setStatus(`Loaded ${allFeeds.length.toLocaleString()} Pyth feeds.`);
    const sol = allFeeds.find((f) => f.symbol === 'Crypto.SOL/USD');
    if (sol && !selectedFeed) await selectFeed(sol.priceFeedAddress);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    loadFeedsBtn.disabled = false;
  }
}

async function selectFeed(feedAddress) {
  const feed = allFeeds.find((f) => f.priceFeedAddress === feedAddress);
  if (!feed) {
    setStatus('Feed not found in loaded list.', true);
    return;
  }
  selectedFeed = feed;
  refreshBtn.disabled = false;
  exportCsvBtn.disabled = true;
  selectedFeedMeta.textContent = `${feed.symbol} · feed ${shorten(feed.priceFeedAddress, 6, 6)} · product ${shorten(feed.productAddress, 6, 6)}`;
  renderFeedsTable();
  await refreshSelected();
}

async function refreshSelected() {
  if (!selectedFeed) return;
  const feed = selectedFeed.priceFeedAddress;
  const product = selectedFeed.productAddress;
  const resolution = resolutionSelect?.value || '1d';
  const { timeStart, timeEnd, limit } = lookbackBounds();
  const kind = chartTypeSelect?.value === 'history' ? 'history' : 'candles';
  const gaps = eliminateGapsInput?.checked !== false;

  setStatus(`Loading ${selectedFeed.symbol}…`);
  refreshBtn.disabled = true;
  try {
    const qs = new URLSearchParams({
      resolution,
      timeStart: String(timeStart),
      timeEnd: String(timeEnd),
      limit: String(limit),
    });
    if (kind === 'candles') qs.set('eliminateCloseToOpenGaps', gaps ? 'true' : 'false');

    const [price, productBody, seriesBody] = await Promise.all([
      apiGet(`/api/pyth/pricefeeds/${encodeURIComponent(feed)}/price`),
      apiGet(`/api/pyth/products/${encodeURIComponent(product)}`),
      kind === 'candles'
        ? apiGet(`/api/pyth/pricefeeds/${encodeURIComponent(feed)}/candles?${qs}`)
        : apiGet(`/api/pyth/pricefeeds/${encodeURIComponent(feed)}/price-ts?${qs}`),
    ]);

    renderPrice(price);
    renderProduct(productBody);
    lastSeries = Array.isArray(seriesBody.data) ? seriesBody.data : [];
    lastSeriesKind = kind;
    if (kind === 'candles') renderCandleChart(lastSeries);
    else renderHistoryChart(lastSeries);

    exportCsvBtn.disabled = lastSeries.length === 0;
    setStatus(
      `${selectedFeed.symbol}: ${formatUsd(price.priceUsd)} · ${lastSeries.length} ${kind === 'candles' ? 'candles' : 'points'}`,
    );
  } catch (err) {
    clearChart();
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    refreshBtn.disabled = false;
  }
}

function exportCsv() {
  if (!lastSeries.length || !selectedFeed) return;
  let header;
  let lines;
  if (lastSeriesKind === 'candles') {
    header = 'timeBucketStart,open,high,low,close,avgPrice,avgConf';
    lines = lastSeries.map((r) =>
      [r.timeBucketStart, r.open, r.high, r.low, r.close, r.avgPrice, r.avgConf].join(','),
    );
  } else {
    header = 'lastUpdated,priceUsd,confidence,emap1H,emac1H,validSlot';
    lines = lastSeries.map((r) =>
      [r.lastUpdated, r.priceUsd, r.confidence, r.emap1H, r.emac1H, r.validSlot].join(','),
    );
  }
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = selectedFeed.symbol.replace(/[^\w.-]+/g, '_');
  a.href = url;
  a.download = `pyth-${safe}-${lastSeriesKind}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-select-feed]');
  if (!btn) return;
  const feed = btn.getAttribute('data-select-feed');
  if (feed) void selectFeed(feed);
});

feedSearch?.addEventListener('input', () => renderFeedsTable());
loadFeedsBtn?.addEventListener('click', () => void loadFeeds());
refreshBtn?.addEventListener('click', () => void refreshSelected());
exportCsvBtn?.addEventListener('click', () => exportCsv());
chartTypeSelect?.addEventListener('change', () => {
  if (selectedFeed) void refreshSelected();
});
resolutionSelect?.addEventListener('change', () => {
  if (selectedFeed) void refreshSelected();
});
lookbackSelect?.addEventListener('change', () => {
  if (selectedFeed) void refreshSelected();
});
eliminateGapsInput?.addEventListener('change', () => {
  if (selectedFeed && chartTypeSelect?.value === 'candles') void refreshSelected();
});

ensureChart();
clearChart();
renderQuickPicks();
void loadFeeds();
