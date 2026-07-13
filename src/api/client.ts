/**
 * Vybe API HTTP client with retries and human-readable errors.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';
import {
  VYBE_DATA_API_BASE,
  VYBE_MAX_RETRIES,
  VYBE_RETRY_DELAY_MS,
  VYBE_TIMEOUT_MS,
} from '../config.js';

export function toHumanReadableError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ message?: string; error?: string }>;
    const status = ax.response?.status;
    const endpoint = ax.config?.url ?? 'endpoint';
    const body = ax.response?.data;
    const msg = typeof body === 'object' && body && (body.message ?? body.error);
    if (status === 403) {
      return `API returned 403 Forbidden — verify your API key has access to ${endpoint}.`;
    }
    if (status === 404) {
      return `API returned 404 Not Found for ${endpoint}.`;
    }
    if (status && status >= 500) {
      const detail =
        msg && typeof msg === 'string' ? msg : 'Vybe server error. Try again later.';
      return detail;
    }
    if (msg && typeof msg === 'string') return msg;
    if (status) return `API returned ${status} for ${endpoint}.`;
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    return msg || 'An unexpected error occurred.';
  }
  const s = String(err).trim();
  return s || 'An unexpected error occurred.';
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= VYBE_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < VYBE_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, VYBE_RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function vybeRequestHeaders(apiKey: string): Record<string, string> {
  const key = apiKey.trim();
  return {
    ...(key ? { 'X-API-Key': key } : {}),
    Accept: 'application/json',
  };
}

export function createDataHttpClient(apiKey: string): AxiosInstance {
  const key = apiKey.trim();
  if (!key) throw new Error('Vybe API key is required.');
  return axios.create({
    baseURL: VYBE_DATA_API_BASE,
    timeout: VYBE_TIMEOUT_MS,
    headers: vybeRequestHeaders(apiKey),
  });
}
