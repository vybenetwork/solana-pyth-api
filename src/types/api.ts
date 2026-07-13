/** Shared API response types for Pyth oracle endpoints. */

export interface PythPriceProductPair {
  priceFeedAddress: string;
  productAddress: string;
  symbol: string;
}

export interface PythPriceFeed {
  priceFeedAddress: string;
  lastUpdated: number;
  validSlot: number;
  priceUsd: string;
  confidence: string;
  emac1H: string;
  emap1H: string;
}

export interface PythPriceOhlc {
  timeBucketStart: number;
  open: string;
  high: string;
  low: string;
  close: string;
  avgPrice: string;
  avgConf: string;
}

export interface PythProduct {
  productAddress: string;
  description: string;
  symbol: string;
  assetType: string;
  base?: string | null;
  quote?: string | null;
  country?: string | null;
  tenor?: string | null;
  schedule?: string;
  umtf?: string;
  genericSymbol?: string;
  cmsSymbol?: string;
  cqsSymbol?: string;
  nasdaqSymbol?: string;
  [key: string]: unknown;
}

export interface ListPriceFeedsParams {
  productAddress?: string;
  priceFeedAddress?: string;
}

export interface TimeSeriesParams {
  resolution?: string;
  timeStart?: number;
  timeEnd?: number;
  limit?: number;
  page?: number;
}

export interface CandlesParams extends TimeSeriesParams {
  eliminateCloseToOpenGaps?: boolean;
}
