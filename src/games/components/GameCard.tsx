import React from 'react';
import { Play, Shield, Sparkles, Flame, Eye, Lock, Wrench } from 'lucide-react';
import { GameDefinition } from '../types.js';
import { GameThumbnail } from '../../components/games/GameThumbnail';

interface GameCardProps {
  game: GameDefinition;
  onPlay: (slug: string) => void;
  onViewInfo?: (slug: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay, onViewInfo }) => {
  const isMaintenance = game.status === 'MAINTENANCE';
  const isDisabled = game.status === 'DISABLED';

  return (
    <div className="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
      {/* Thumbnail & Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
        <GameThumbnail
          slug={game.slug}
          name={game.displayName}
          category={game.category}
          src={game.thumbnail}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-indigo-300 backdrop-blur-md border border-slate-700">
            {game.category}
          </span>
          <div className="flex items-center gap-1.5">
            {game.featured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-sm">
                <Flame className="w-3 h-3 fill-slate-950" />
                <span>Featured</span>
              </span>
            )}
            {game.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Maintenance / Disabled Overlay */}
        {(isMaintenance || isDisabled) && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
            {isMaintenance ? (
              <>
                <Wrench className="w-8 h-8 text-amber-400 mb-2 animate-bounce" />
                <span className="text-sm font-bold text-amber-300">Under Maintenance</span>
                <span className="text-xs text-slate-400 mt-1">Upgrading server-side RNG</span>
              </>
            ) : (
              <>
                <Lock className="w-8 h-8 text-rose-400 mb-2" />
                <span className="text-sm font-bold text-rose-400">Game Disabled</span>
                <span className="text-xs text-slate-400 mt-1">Currently unavailable</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body & Action */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-indigo-400 transition-colors">
              {game.displayName}
            </h3>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              {game.configuredRtp.toFixed(1)}% RTP
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {game.description}
          </p>
        </div>

        {/* Footer info & CTA */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400">
            <span className="text-slate-400 font-mono">Max: </span>
            <span className="text-amber-400 font-bold font-mono">{game.maxMultiplier}</span>
          </div>

          <button
            onClick={() => onPlay(game.slug)}
            disabled={isMaintenance || isDisabled}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-600/20"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Play Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
