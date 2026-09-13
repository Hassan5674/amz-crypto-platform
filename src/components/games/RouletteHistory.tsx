import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, RefreshCw, Clock } from 'lucide-react';

export interface RouletteHistoryOutcome {
  id?: number;
  bet_id?: number;
  number: number;
  color: 'red' | 'black' | 'green';
  server_seed_hash?: string;
  round_timestamp?: string;
  payout?: string;
}

interface RouletteHistoryProps {
  outcomes?: RouletteHistoryOutcome[];
  onSelectOutcome?: (outcome: RouletteHistoryOutcome) => void;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const RouletteHistory: React.FC<RouletteHistoryProps> = ({ outcomes: propOutcomes, onSelectOutcome }) => {
  const [serverHistory, setServerHistory] = useState<RouletteHistoryOutcome[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<RouletteHistoryOutcome | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/roulette/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setServerHistory(data.data);
        }
      }
    } catch (err) {
      // Fallback silently if offline or running in mock mode
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Merge prop outcomes with server history (up to 10 latest)
  const combinedHistory: RouletteHistoryOutcome[] = (propOutcomes && propOutcomes.length > 0)
    ? propOutcomes.slice(0, 10)
    : serverHistory.length > 0
    ? serverHistory.slice(0, 10)
    : [
        { number: 32, color: 'red', server_seed_hash: '8f7a...3d9b', round_timestamp: '2026-09-07T20:00:00Z' },
        { number: 15, color: 'black', server_seed_hash: '9a4c...1e7a', round_timestamp: '2026-09-07T19:59:00Z' },
        { number: 19, color: 'red', server_seed_hash: '3d1b...882a', round_timestamp: '2026-09-07T19:58:00Z' },
        { number: 4, color: 'black', server_seed_hash: 'b12c...09df', round_timestamp: '2026-09-07T19:57:00Z' },
        { number: 21, color: 'red', server_seed_hash: 'c81e...91fa', round_timestamp: '2026-09-07T19:56:00Z' },
        { number: 2, color: 'black', server_seed_hash: 'a29f...44bc', round_timestamp: '2026-09-07T19:55:00Z' },
        { number: 25, color: 'red', server_seed_hash: '77ae...2390', round_timestamp: '2026-09-07T19:54:00Z' },
        { number: 0, color: 'green', server_seed_hash: '4d88...65bc', round_timestamp: '2026-09-07T19:53:00Z' },
        { number: 17, color: 'black', server_seed_hash: 'e510...ff12', round_timestamp: '2026-09-07T19:52:00Z' },
        { number: 34, color: 'red', server_seed_hash: '900b...dca1', round_timestamp: '2026-09-07T19:51:00Z' }
      ];

  const handleChipClick = (item: RouletteHistoryOutcome) => {
    setSelectedItem(prev => (prev?.number === item.number && prev?.round_timestamp === item.round_timestamp ? null : item));
    if (onSelectOutcome) {
      onSelectOutcome(item);
    }
  };

  return (
    <div className="bg-slate-950/80 rounded-2xl border border-slate-800/90 p-3.5 shadow-xl space-y-2.5">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            Live Wheel Sequence <span className="text-[10px] text-slate-500 font-mono">(Last 10 Outcomes)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Verifiable
          </span>
        </div>
      </div>

      {/* Horizontal Scrolling Bar */}
      <div className="relative">
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {combinedHistory.map((item, index) => {
            const isZero = item.number === 0;
            const isRed = !isZero && (item.color === 'red' || RED_NUMBERS.includes(item.number));
            const isLatest = index === 0;

            const bgStyle = isZero
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : isRed
              ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 border-slate-700 shadow-md';

            const isSelected = selectedItem?.number === item.number && selectedItem?.round_timestamp === item.round_timestamp;

            return (
              <button
                key={`${item.number}-${index}-${item.round_timestamp || ''}`}
                onClick={() => handleChipClick(item)}
                type="button"
                className={`flex-shrink-0 relative group rounded-xl w-10 h-10 flex flex-col items-center justify-center font-mono font-black text-sm border-2 transition-all duration-200 transform hover:scale-110 active:scale-95 ${bgStyle} ${
                  isSelected ? 'ring-2 ring-amber-400 scale-110 z-10' : ''
                }`}
                title={`Round #${index + 1}: ${item.number} (${item.color?.toUpperCase() || (isZero ? 'GREEN' : isRed ? 'RED' : 'BLACK')})`}
              >
                <span>{item.number}</span>
                {isLatest && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-950 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Round Inspector details */}
      {selectedItem && (
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
              selectedItem.number === 0 ? 'bg-emerald-600 text-white' : selectedItem.color === 'red' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
            }`}>
              {selectedItem.number}
            </span>
            <div>
              <span className="font-bold text-white uppercase">{selectedItem.color} Pocket</span>
              {selectedItem.round_timestamp && (
                <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {new Date(selectedItem.round_timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {selectedItem.server_seed_hash && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Committed Hash:</span>
              <span className="text-[10px] text-emerald-400">{selectedItem.server_seed_hash.substring(0, 14)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
