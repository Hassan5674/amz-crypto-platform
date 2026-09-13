import React from 'react';

interface HistoryItem {
  number: number;
  color: 'red' | 'black' | 'green';
}

interface GameHistoryDetailsProps {
  history: HistoryItem[];
}

export const GameHistoryDetails: React.FC<GameHistoryDetailsProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
        No recent roulette spins yet. Place a wager to start live round history!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase font-bold tracking-wider text-slate-400 px-1">
        <span>Recent Round History (Last 10 Spins)</span>
        <span className="text-emerald-400 flex items-center gap-1 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Feed
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        {history.slice(0, 10).map((item, index) => {
          const bgClass = 
            item.color === 'green' ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/50' :
            item.color === 'red' ? 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50' :
            'bg-slate-900 text-slate-200 border-slate-700 shadow-slate-950';

          return (
            <div
              key={index}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm border-2 shadow-lg transform transition-all hover:scale-105 ${bgClass}`}
              title={`Number ${item.number} (${item.color.toUpperCase()})`}
            >
              {item.number}
            </div>
          );
        })}
      </div>
    </div>
  );
};
