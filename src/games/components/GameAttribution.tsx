import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const GameAttribution: React.FC = () => {
  return (
    <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span>Enterprise Certified Gaming Engine • Verified Secure RNG</span>
      </div>
    </div>
  );
};

export default GameAttribution;
