import { Asset } from '../types/asset';
import { SparklineChart } from './SparklineChart';
import { PerformanceCell } from './PerformanceCell';
import { MAIndicators } from './MAIndicators';
import { RSRankBar } from './RSRankBar';

interface AssetRowProps {
  asset: Asset;
  onRemove: (ticker: string) => void;
}

function formatPrice(price: number | null | undefined): string {
  if (price == null || !isFinite(price)) return 'n/a';
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatMarketCap(cap: number | null | undefined): string {
  if (cap == null || !isFinite(cap)) return 'n/a';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatRatio(ratio: number | null | undefined): string {
  if (ratio == null || !isFinite(ratio)) return 'n/a';
  return ratio.toFixed(2);
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'crypto':
      return '₿';
    case 'commodity':
      return '⚡';
    case 'etf':
      return '📊';
    default:
      return '📈';
  }
}

export function AssetRow({ asset, onRemove }: AssetRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={asset.type}>
            {getTypeIcon(asset.type)}
          </span>
          <div>
            <span className="font-mono font-semibold text-gray-900">{asset.ticker}</span>
          </div>
        </div>
      </td>
      <td className="py-2 px-3">
        <span className="text-sm text-gray-600 max-w-[150px] truncate block" title={asset.name}>
          {asset.name || 'n/a'}
        </span>
      </td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatPrice(asset.price)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm text-gray-600">
        {formatMarketCap(asset.marketCap)}
      </td>
      <td className="py-2 px-3 text-right font-mono text-sm text-gray-600">
        {formatRatio(asset.priceToSales)}
      </td>
      <td className="py-2 px-3 text-right font-mono text-sm text-gray-600">
        {formatRatio(asset.priceToEarnings)}
      </td>
      <td className="py-2 px-3 text-center">
        <PerformanceCell value={asset.ytdChange} />
      </td>
      <td className="py-2 px-3">
        <SparklineChart data={asset.historicalPrices} width={100} height={28} />
      </td>
      <td className="py-2 px-3 text-center">
        <PerformanceCell value={asset.oneYearChange} />
      </td>
      <td className="py-2 px-3 text-center">
        <PerformanceCell value={asset.deltaFrom52WeekHigh} />
      </td>
      <td className="py-2 px-3">
        <RSRankBar deltaFrom52WeekHigh={asset.deltaFrom52WeekHigh} />
      </td>
      <td className="py-2 px-3">
        <MAIndicators
          oneMonthChange={asset.oneMonthChange}
          priceVsSma20={asset.priceVsSma20}
          priceVsSma50={asset.priceVsSma50}
          priceVsSma200={asset.priceVsSma200}
        />
      </td>
      <td className="py-2 px-3">
        <button
          onClick={() => onRemove(asset.ticker)}
          className="text-red-500 hover:text-red-700 transition-colors text-sm"
          title="Remove from watchlist"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
