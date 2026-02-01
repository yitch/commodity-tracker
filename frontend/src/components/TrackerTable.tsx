import { useState } from 'react';
import { Asset, SortField, SortDirection } from '../types/asset';
import { AssetRow } from './AssetRow';

interface TrackerTableProps {
  assets: Asset[];
  onRemove: (ticker: string) => void;
}

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const columns: { key: SortField | 'chart' | 'rsRank' | 'ma' | 'actions'; label: string; sortable: boolean }[] = [
  { key: 'ticker', label: 'Ticker', sortable: true },
  { key: 'name', label: 'Company', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'marketCap', label: 'Market Cap', sortable: true },
  { key: 'priceToSales', label: 'P/S', sortable: true },
  { key: 'priceToEarnings', label: 'P/E', sortable: true },
  { key: 'ytdChange', label: '% YTD', sortable: true },
  { key: 'chart', label: 'Chart 1Y', sortable: false },
  { key: 'oneYearChange', label: '% 1Y', sortable: true },
  { key: 'deltaFrom52WeekHigh', label: 'Δ 52w High', sortable: true },
  { key: 'rsRank', label: 'RS Rank', sortable: false },
  { key: 'ma', label: '1M 20 50 200', sortable: false },
  { key: 'actions', label: '', sortable: false },
];

export function TrackerTable({ assets, onRemove }: TrackerTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'ticker', direction: 'asc' });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedAssets = [...assets].sort((a, b) => {
    const { field, direction } = sortConfig;
    const aValue = a[field];
    const bValue = b[field];

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    const comparison = typeof aValue === 'string'
      ? aValue.localeCompare(bValue as string)
      : (aValue as number) - (bValue as number);

    return direction === 'asc' ? comparison : -comparison;
  });

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No assets in your watchlist</p>
        <p className="text-sm">Add stocks, crypto, or commodities using the form above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key as SortField)}
                className={`py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortConfig.field === col.key && (
                    <span className="text-blue-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => (
            <AssetRow key={asset.ticker} asset={asset} onRemove={onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
