interface RSRankBarProps {
  deltaFrom52WeekHigh: number | null;
}

function getRankColor(delta: number): string {
  // delta is negative (how far below 52w high)
  // 0 = at high, -100 = 100% below high
  const pctFromHigh = Math.abs(delta);

  if (pctFromHigh <= 5) return 'bg-green-500';
  if (pctFromHigh <= 15) return 'bg-lime-500';
  if (pctFromHigh <= 25) return 'bg-yellow-400';
  if (pctFromHigh <= 40) return 'bg-orange-400';
  if (pctFromHigh <= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

export function RSRankBar({ deltaFrom52WeekHigh }: RSRankBarProps) {
  if (deltaFrom52WeekHigh === null) {
    return <span className="text-gray-400 text-xs">n/a</span>;
  }

  // Convert to a 0-100 scale where 100 = at 52w high
  const rsRank = Math.max(0, Math.min(100, 100 + deltaFrom52WeekHigh));
  const color = getRankColor(deltaFrom52WeekHigh);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${rsRank}%` }}
        />
      </div>
    </div>
  );
}
