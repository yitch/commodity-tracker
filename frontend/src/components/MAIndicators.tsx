interface MAIndicatorsProps {
  oneMonthChange: number | null;
  priceVsSma20: 'above' | 'below' | null;
  priceVsSma50: 'above' | 'below' | null;
  priceVsSma200: 'above' | 'below' | null;
}

function Indicator({ value, label }: { value: 'above' | 'below' | null; label: string }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center justify-center w-6 text-gray-400 text-xs" title={label}>
        -
      </span>
    );
  }

  const isUp = value === 'above';
  const color = isUp ? 'text-green-500' : 'text-red-500';
  const arrow = isUp ? '▲' : '▼';

  return (
    <span className={`inline-flex items-center justify-center w-6 ${color} text-sm`} title={label}>
      {arrow}
    </span>
  );
}

function MonthIndicator({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center justify-center w-6 text-gray-400 text-xs" title="1M">
        -
      </span>
    );
  }

  const isUp = value >= 0;
  const color = isUp ? 'text-green-500' : 'text-red-500';
  const arrow = isUp ? '▲' : '▼';

  return (
    <span className={`inline-flex items-center justify-center w-6 ${color} text-sm`} title="1 Month">
      {arrow}
    </span>
  );
}

export function MAIndicators({
  oneMonthChange,
  priceVsSma20,
  priceVsSma50,
  priceVsSma200,
}: MAIndicatorsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <MonthIndicator value={oneMonthChange} />
      <Indicator value={priceVsSma20} label="20 SMA" />
      <Indicator value={priceVsSma50} label="50 SMA" />
      <Indicator value={priceVsSma200} label="200 SMA" />
    </div>
  );
}
