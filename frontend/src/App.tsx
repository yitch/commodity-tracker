import { useAssetData } from './hooks/useAssetData';
import { TrackerTable } from './components/TrackerTable';
import { AddAssetForm } from './components/AddAssetForm';

function App() {
  const { assets, loading, error, lastUpdated, addAsset, removeAsset, refresh } = useAssetData();

  const handleAddAsset = async (ticker: string, type: string) => {
    await addAsset(ticker, type);
  };

  const handleRemoveAsset = async (ticker: string) => {
    try {
      await removeAsset(ticker);
    } catch (err) {
      console.error('Failed to remove asset:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Commodity Tracker</h1>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            Track stocks, cryptocurrencies, and commodities in real-time
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <AddAssetForm onAdd={handleAddAsset} />

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading && assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-pulse">Loading assets...</div>
            </div>
          ) : (
            <TrackerTable assets={assets} onRemove={handleRemoveAsset} />
          )}
        </div>

        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>Data updates every 30 seconds • Powered by Yahoo Finance</p>
          <p className="mt-1 text-xs">
            Tip: Use BTC-USD for Bitcoin, ETH-USD for Ethereum, GC=F for Gold, CL=F for Crude Oil
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
