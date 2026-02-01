import { useState } from 'react';

interface AddAssetFormProps {
  onAdd: (ticker: string, type: string) => Promise<void>;
}

export function AddAssetForm({ onAdd }: AddAssetFormProps) {
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState('stock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onAdd(ticker.toUpperCase(), type);
      setTicker('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-4">
      <div className="flex-1 max-w-xs">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g., AAPL, BTC-USD, GC=F)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
        />
      </div>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        disabled={loading}
      >
        <option value="stock">Stock</option>
        <option value="crypto">Crypto</option>
        <option value="commodity">Commodity</option>
        <option value="etf">ETF</option>
      </select>
      <button
        type="submit"
        disabled={loading || !ticker.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {loading ? 'Adding...' : 'Add'}
      </button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </form>
  );
}
