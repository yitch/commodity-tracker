import { useState } from 'react';
import { TradingSignal, SignalType } from '../types/asset';

interface SignalCellProps {
  signal: TradingSignal | null;
  label: string;
}

function getSignalColor(signal: SignalType): string {
  switch (signal) {
    case 'strong_buy':
      return 'bg-green-600 text-white';
    case 'buy':
      return 'bg-green-400 text-gray-800';
    case 'hold':
      return 'bg-yellow-400 text-gray-800';
    case 'sell':
      return 'bg-orange-400 text-white';
    case 'strong_sell':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-200 text-gray-600';
  }
}

function getSignalLabel(signal: SignalType): string {
  switch (signal) {
    case 'strong_buy':
      return 'Strong Buy';
    case 'buy':
      return 'Buy';
    case 'hold':
      return 'Hold';
    case 'sell':
      return 'Sell';
    case 'strong_sell':
      return 'Strong Sell';
    default:
      return 'N/A';
  }
}

export function SignalCell({ signal, label }: SignalCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!signal) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
        n/a
      </span>
    );
  }

  const colorClass = getSignalColor(signal.signal);

  return (
    <div className="relative inline-block">
      <button
        className={`px-2 py-0.5 text-xs font-medium rounded cursor-help ${colorClass}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {getSignalLabel(signal.signal)}
      </button>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          <div className="font-semibold mb-1">{label}</div>
          <div className="mb-1">Score: {signal.score}</div>
          <div className="text-gray-300">
            {signal.reasons.length > 0 ? (
              <ul className="list-disc pl-3 space-y-0.5">
                {signal.reasons.slice(0, 3).map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            ) : (
              'No specific signals'
            )}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      )}
    </div>
  );
}
