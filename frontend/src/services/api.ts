import { Asset, SearchResult } from '../types/asset';

// Use environment variable for production, fallback to proxy for local dev
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchAssets(): Promise<Asset[]> {
  const response = await fetch(`${API_BASE}/assets`);
  if (!response.ok) {
    throw new Error('Failed to fetch assets');
  }
  return response.json();
}

export async function addAsset(ticker: string, type: string = 'stock'): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticker, type }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add asset');
  }
  return response.json();
}

export async function removeAsset(ticker: string): Promise<void> {
  const response = await fetch(`${API_BASE}/assets/${ticker}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove asset');
  }
}

export async function searchAssets(query: string): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE}/assets/search/${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
}
