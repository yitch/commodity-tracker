import { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
}

export function SparklineChart({
  data,
  width = 100,
  height = 30,
  strokeColor,
  fillColor,
}: SparklineChartProps) {
  const { path, fillPath, color } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', fillPath: '', color: '#666' };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    const fillPathD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    // Determine color based on trend
    const startValue = data[0];
    const endValue = data[data.length - 1];
    const trendColor = endValue >= startValue ? '#22c55e' : '#ef4444';

    return {
      path: pathD,
      fillPath: fillPathD,
      color: strokeColor || trendColor,
    };
  }, [data, width, height, strokeColor]);

  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="10" fill="#666">
          n/a
        </text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor || color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={fillColor || color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#gradient-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
