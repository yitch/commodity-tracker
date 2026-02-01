interface PerformanceCellProps {
  value: number | null;
  showSign?: boolean;
}

function getPerformanceColor(value: number): string {
  if (value <= -50) return 'bg-red-600 text-white';
  if (value <= -30) return 'bg-red-500 text-white';
  if (value <= -20) return 'bg-red-400 text-white';
  if (value <= -10) return 'bg-orange-500 text-white';
  if (value < 0) return 'bg-orange-400 text-white';
  if (value === 0) return 'bg-yellow-400 text-gray-800';
  if (value <= 10) return 'bg-lime-400 text-gray-800';
  if (value <= 20) return 'bg-green-400 text-gray-800';
  if (value <= 30) return 'bg-green-500 text-white';
  return 'bg-green-600 text-white';
}

export function PerformanceCell({ value, showSign = true }: PerformanceCellProps) {
  if (value == null || !isFinite(value)) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
        n/a
      </span>
    );
  }

  const colorClass = getPerformanceColor(value);
  const formattedValue = showSign && value > 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}>
      {formattedValue}
    </span>
  );
}
