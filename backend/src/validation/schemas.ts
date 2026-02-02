import { z } from 'zod';

// Ticker validation: 1-20 alphanumeric chars, may include - = . : ^ for crypto/commodities
export const tickerSchema = z
  .string()
  .min(1, 'Ticker is required')
  .max(20, 'Ticker too long')
  .regex(/^[A-Za-z0-9.\-=^:]+$/, 'Invalid ticker format')
  .transform((val) => val.toUpperCase());

// Asset type validation
export const assetTypeSchema = z.enum(['stock', 'crypto', 'commodity', 'etf']).default('stock');

// Add asset request body
export const addAssetSchema = z.object({
  ticker: tickerSchema,
  type: assetTypeSchema,
});

// Search query validation
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query is required')
  .max(50, 'Search query too long')
  .regex(/^[A-Za-z0-9\s.\-]+$/, 'Invalid search query');

// Ticker param validation
export const tickerParamSchema = z.object({
  ticker: tickerSchema,
});

export const searchParamSchema = z.object({
  query: searchQuerySchema,
});
