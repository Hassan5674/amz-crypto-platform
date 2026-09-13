import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Bug, X } from 'lucide-react';

export const AppKitDiagnostics: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    isClient: boolean;
    hasEthereum: boolean;
    hasSolana: boolean;
    projectId: string;
    errors: string[];
  }>({
    isClient: false,
    hasEthereum: false,
    hasSolana: false,
    projectId: '',
    errors: []
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const anyWindow = window as any;
    const errors: string[] = [];

    try {
      const meta = import.meta as any;
      const pid = (meta.env && meta.env.VITE_REOWN_PROJECT_ID) || 'b562829b71329c4e207936a11a141295';
      
      setDiagnostics({
        isClient: true,
        hasEthereum: !!anyWindow.ethereum,
        hasSolana: !!anyWindow.solana,
        projectId: pid,
        errors
      });
    } catch (e: any) {
      errors.push(e?.message || String(e));
      setDiagnostics(prev => ({ ...prev, errors }));
    }
  }, []);

  // Only show in development or when explicitly opened
  if (!diagnostics.isClient) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/95 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all"
        >
          <Bug className="w-4 h-4 animate-pulse" />
          AppKit Diagnostics
        </button>
      ) : (
        <div className="bg-slate-950/95 text-slate-200 border border-slate-800 w-80 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-bold">Diagnostics Panel</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Environment:</span>
              <span className="text-emerald-400">Client Ready</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Injected Ethereum:</span>
              <span className={diagnostics.hasEthereum ? "text-emerald-400" : "text-amber-400"}>
                {diagnostics.hasEthereum ? "Detected" : "Not Found (Simulated)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Injected Solana:</span>
              <span className={diagnostics.hasSolana ? "text-emerald-400" : "text-amber-400"}>
                {diagnostics.hasSolana ? "Detected" : "Not Found (Simulated)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Project ID Config:</span>
              <span className="text-indigo-400 truncate max-w-[140px]">{diagnostics.projectId}</span>
            </div>

            {diagnostics.errors.length > 0 ? (
              <div className="mt-3 p-2 bg-red-950/50 border border-red-800/50 rounded-lg text-red-300 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Errors detected:
                </div>
                {diagnostics.errors.map((err, idx) => (
                  <div key={idx} className="text-[10px] truncate">{err}</div>
                ))}
              </div>
            ) : (
              <div className="mt-3 p-2 bg-emerald-950/30 border border-emerald-800/30 rounded-lg text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> No initialization errors. All systems operational.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
