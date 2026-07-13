/**
 * Application configuration: env loading and Vybe API constants.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

/** Path to public static assets (web demo). */
export const PUBLIC_DIR = path.join(projectRoot, 'public');

dotenv.config({ path: path.join(projectRoot, '.env') });

export function loadEnv(): void {
  dotenv.config({ path: path.join(projectRoot, '.env') });
}

export function getDataApiKey(): string {
  const key = (process.env.VYBE_DATA_API_KEY ?? process.env.VYBE_API_KEY ?? '').trim();
  if (!key) {
    throw new Error(
      'VYBE_DATA_API_KEY is required. Get a key at https://vybe.fyi/api-pricing',
    );
  }
  return key;
}

export const VYBE_DATA_API_BASE = (
  process.env.VYBE_DATA_API_BASE ?? 'https://api.vybenetwork.xyz'
)
  .trim()
  .replace(/\/$/, '');

export const VYBE_TIMEOUT_MS = 60_000;
export const VYBE_MAX_RETRIES = 3;
export const VYBE_RETRY_DELAY_MS = 2000;

export const DEFAULT_PORT = 3009;
