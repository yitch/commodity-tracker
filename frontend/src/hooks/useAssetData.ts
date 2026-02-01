import { useState, useEffect, useCallback } from 'react';
import { Asset } from '../types/asset';
import { fetchAssets, addAsset as apiAddAsset, removeAsset as apiRemoveAsset } from '../services/api';

const REFRESH_INTERVAL = 30000; // 30 seconds

export function useAssetData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      const data = await fetchAssets();
      setAssets(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  const addAsset = useCallback(async (ticker: string, type: string = 'stock') => {
    try {
      const newAsset = await apiAddAsset(ticker, type);
      setAssets((prev) => [...prev, newAsset]);
      return newAsset;
    } catch (err) {
      throw err;
    }
  }, []);

  const removeAsset = useCallback(async (ticker: string) => {
    try {
      await apiRemoveAsset(ticker);
      setAssets((prev) => prev.filter((a) => a.ticker !== ticker));
    } catch (err) {
      throw err;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAssets();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadAssets]);

  return {
    assets,
    loading,
    error,
    lastUpdated,
    addAsset,
    removeAsset,
    refresh: loadAssets,
  };
}
