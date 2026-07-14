/**
 * Vybe Oracle (Pyth) API wrappers.
 *
 * Endpoints:
 * - GET /v4/oracle/pyth/pricefeeds
 * - GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/price
 * - GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/price-ts
 * - GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/candles
 * - GET /v4/oracle/pyth/products/{productAddress}
 */

import type { AxiosInstance } from 'axios';
import { withRetry } from './client.js';
import type {
  CandlesParams,
  ListPriceFeedsParams,
  PythPriceFeed,
  PythPriceOhlc,
  PythPriceProductPair,
  PythProduct,
  TimeSeriesParams,
} from '../types/api.js';

function cleanPubkey(value: string, label: string): string {
  const v = value.trim();
  if (!v) throw new Error(`${label} is required.`);
  if (v.length < 32 || v.length > 44) {
    throw new Error(`${label} looks invalid (expected a Solana pubkey).`);
  }
  return v;
}

function pickParams(source: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (raw == null) continue;
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) continue;
      out[key] = s;
      continue;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
      continue;
    }
    if (typeof raw === 'boolean') {
      out[key] = raw;
    }
  }
  return out;
}

/** List Pyth price feeds (optional product / feed filters). */
export async function listPythPriceFeeds(
  http: AxiosInstance,
  params: ListPriceFeedsParams = {},
): Promise<PythPriceProductPair[]> {
  const res = await withRetry(() =>
    http.get<{ data?: PythPriceProductPair[] }>('/v4/oracle/pyth/pricefeeds', {
      params: pickParams({
        productAddress: params.productAddress,
        priceFeedAddress: params.priceFeedAddress,
      }),
    }),
  );
  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  return data
    .map((row) => ({
      priceFeedAddress: String(row.priceFeedAddress ?? '').trim(),
      productAddress: String(row.productAddress ?? '').trim(),
      symbol: String(row.symbol ?? '').trim(),
    }))
    .filter((row) => row.priceFeedAddress && row.productAddress);
}

/** Current price for a Pyth price feed. */
export async function getPythPrice(
  http: AxiosInstance,
  priceFeedAddress: string,
): Promise<PythPriceFeed> {
  const feed = cleanPubkey(priceFeedAddress, 'priceFeedAddress');
  const res = await withRetry(() =>
    http.get<PythPriceFeed>(`/v4/oracle/pyth/pricefeeds/${encodeURIComponent(feed)}/price`),
  );
  return res.data;
}

/** Historical price time series for a Pyth price feed. */
export async function getPythPriceHistory(
  http: AxiosInstance,
  priceFeedAddress: string,
  params: TimeSeriesParams = {},
): Promise<PythPriceFeed[]> {
  const feed = cleanPubkey(priceFeedAddress, 'priceFeedAddress');
  const res = await withRetry(() =>
    http.get<{ data?: PythPriceFeed[] }>(
      `/v4/oracle/pyth/pricefeeds/${encodeURIComponent(feed)}/price-ts`,
      {
        params: pickParams({
          resolution: params.resolution,
          timeStart: params.timeStart,
          timeEnd: params.timeEnd,
          limit: params.limit,
          page: params.page,
        }),
      },
    ),
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** OHLC candles for a Pyth price feed. */
export async function getPythCandles(
  http: AxiosInstance,
  priceFeedAddress: string,
  params: CandlesParams = {},
): Promise<PythPriceOhlc[]> {
  const feed = cleanPubkey(priceFeedAddress, 'priceFeedAddress');
  const res = await withRetry(() =>
    http.get<{ data?: PythPriceOhlc[] }>(
      `/v4/oracle/pyth/pricefeeds/${encodeURIComponent(feed)}/candles`,
      {
        params: pickParams({
          resolution: params.resolution,
          timeStart: params.timeStart,
          timeEnd: params.timeEnd,
          limit: params.limit,
          page: params.page,
          eliminateCloseToOpenGaps: params.eliminateCloseToOpenGaps,
        }),
      },
    ),
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** Product metadata for a Pyth product account. */
export async function getPythProduct(
  http: AxiosInstance,
  productAddress: string,
): Promise<PythProduct> {
  const product = cleanPubkey(productAddress, 'productAddress');
  const res = await withRetry(() =>
    http.get<PythProduct>(`/v4/oracle/pyth/products/${encodeURIComponent(product)}`),
  );
  return res.data;
}
