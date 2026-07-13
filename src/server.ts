/**
 * Solana Pyth oracle API server.
 */

import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  getDataApiKey,
  PUBLIC_DIR,
  VYBE_DATA_API_BASE,
  DEFAULT_PORT,
} from './config.js';
import { createDataHttpClient, toHumanReadableError } from './api/client.js';
import {
  getPythCandles,
  getPythPrice,
  getPythPriceHistory,
  getPythProduct,
  listPythPriceFeeds,
} from './api/pyth.js';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
void __dirname;
const dataApiKey = getDataApiKey();
const dataHttp = createDataHttpClient(dataApiKey);
const port = Number(process.env.PORT ?? DEFAULT_PORT);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

function setStaticCacheHeaders(res: Response, filePath: string): void {
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return;
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

app.use(
  express.static(PUBLIC_DIR, {
    setHeaders: setStaticCacheHeaders,
  }),
);

function q(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return String(v[0] ?? '');
  return String(v ?? '');
}

function qNum(req: Request, key: string): number | undefined {
  const raw = q(req, key).trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function qBool(req: Request, key: string): boolean | undefined {
  const raw = q(req, key).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return undefined;
}

function sendError(res: Response, err: unknown, fallbackStatus = 500): void {
  const status =
    typeof err === 'object' &&
    err &&
    'response' in err &&
    typeof (err as { response?: { status?: number } }).response?.status === 'number'
      ? (err as { response: { status: number } }).response.status
      : fallbackStatus;
  const message = toHumanReadableError(err);
  res.status(status >= 400 && status < 600 ? status : fallbackStatus).json({ error: message });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'solana-pyth-api',
    vybeDataApiBase: VYBE_DATA_API_BASE,
  });
});

/** GET /api/pyth/pricefeeds — list / filter Pyth price feeds. */
app.get('/api/pyth/pricefeeds', async (req, res) => {
  try {
    const data = await listPythPriceFeeds(dataHttp, {
      productAddress: q(req, 'productAddress') || undefined,
      priceFeedAddress: q(req, 'priceFeedAddress') || undefined,
    });
    res.json({ data, count: data.length });
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/pyth/pricefeeds/:feed/price — current price. */
app.get('/api/pyth/pricefeeds/:feed/price', async (req, res) => {
  try {
    const data = await getPythPrice(dataHttp, String(req.params.feed ?? ''));
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/pyth/pricefeeds/:feed/price-ts — historical price series. */
app.get('/api/pyth/pricefeeds/:feed/price-ts', async (req, res) => {
  try {
    const data = await getPythPriceHistory(dataHttp, String(req.params.feed ?? ''), {
      resolution: q(req, 'resolution') || undefined,
      timeStart: qNum(req, 'timeStart'),
      timeEnd: qNum(req, 'timeEnd'),
      limit: qNum(req, 'limit'),
      page: qNum(req, 'page'),
    });
    res.json({ data, count: data.length });
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/pyth/pricefeeds/:feed/candles — OHLC candles. */
app.get('/api/pyth/pricefeeds/:feed/candles', async (req, res) => {
  try {
    const data = await getPythCandles(dataHttp, String(req.params.feed ?? ''), {
      resolution: q(req, 'resolution') || undefined,
      timeStart: qNum(req, 'timeStart'),
      timeEnd: qNum(req, 'timeEnd'),
      limit: qNum(req, 'limit'),
      page: qNum(req, 'page'),
      eliminateCloseToOpenGaps: qBool(req, 'eliminateCloseToOpenGaps'),
    });
    res.json({ data, count: data.length });
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/pyth/products/:product — product metadata. */
app.get('/api/pyth/products/:product', async (req, res) => {
  try {
    const data = await getPythProduct(dataHttp, String(req.params.product ?? ''));
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(port, () => {
  console.info(
    `[solana-pyth-api] listening on http://localhost:${port} (Vybe data: ${VYBE_DATA_API_BASE})`,
  );
});
