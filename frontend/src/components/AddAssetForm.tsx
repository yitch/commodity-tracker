import { useState, useEffect, useRef } from 'react';
import { searchAssets } from '../services/api';
import { SearchResult } from '../types/asset';

interface AddAssetFormProps {
  onAdd: (ticker: string, type: string) => Promise<void>;
}

export function AddAssetForm({ onAdd }: AddAssetFormProps) {
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState('stock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search for suggestions when ticker changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (ticker.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchAssets(ticker);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [ticker]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      await onAdd(ticker.toUpperCase(), type);
      setTicker('');
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setTicker(suggestion.symbol);
    // Auto-detect type based on suggestion
    if (suggestion.type) {
      const lowerType = suggestion.type.toLowerCase();
      if (lowerType.includes('crypto') || lowerType.includes('currency')) {
        setType('crypto');
      } else if (lowerType.includes('etf')) {
        setType('etf');
      } else if (lowerType.includes('commodity') || lowerType.includes('future')) {
        setType('commodity');
      } else {
        setType('stock');
      }
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-xs">
        <input
          ref={inputRef}
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ticker (e.g., AAPL, MSFT)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
          autoComplete="off"
        />
        {searchLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.symbol}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{suggestion.symbol}</span>
                  <span className="text-xs text-gray-500 capitalize">
                    {suggestion.type}
                  </span>
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {suggestion.name}
                </div>
              </div>
            ))}
          </div>
        )}
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
