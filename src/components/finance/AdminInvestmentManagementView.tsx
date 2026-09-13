import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, CheckCircle2, RefreshCw, Layers, TrendingUp, AlertTriangle } from 'lucide-react';

export const AdminInvestmentManagementView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [processingMaturities, setProcessingMaturities] = useState(false);
  const [maturityResult, setMaturityResult] = useState<any | null>(null);

  const fetchAdminInvestments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/investments', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setInvestments(data.data || []);
      } else {
        setError(data.message || 'Failed to load investments');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    try {
      const res = await fetch('/api/admin/investments/reconciliation', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setReconciliation(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processMaturities = async () => {
    try {
      setProcessingMaturities(true);
      setMaturityResult(null);
      const res = await fetch('/api/admin/investments/process-maturities', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setMaturityResult(data.data);
        fetchAdminInvestments();
      } else {
        alert(data.message || 'Failed to process maturities');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setProcessingMaturities(false);
    }
  };

  useEffect(() => {
    fetchAdminInvestments();
    runReconciliation();
  }, []);

  const totalPrincipalAll = investments
    .filter(i => i.status === 'ACTIVE')
    .reduce((sum, i) => sum + Number(i.principal_amount), 0);

  const totalExpectedAll = investments
    .filter(i => i.status === 'ACTIVE')
    .reduce((sum, i) => sum + Number(i.expected_return), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Loading administrative investment oversight...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Investment Oversight & Administration</h2>
          <p className="text-sm text-slate-600">Monitor institutional investment portfolios, trigger maturity processing, and audit ledger reconciliation.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={processMaturities}
            disabled={processingMaturities}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition text-sm shadow-sm disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${processingMaturities ? 'animate-spin' : ''}`} />
            {processingMaturities ? 'Processing...' : 'Run Maturity Engine'}
          </button>
          <button
            onClick={() => { fetchAdminInvestments(); runReconciliation(); }}
            className="p-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {maturityResult && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-sm flex items-center justify-between">
          <div>
            <span className="font-bold">Maturity Job Result:</span> Successfully processed {maturityResult.processed} maturities ({maturityResult.errors.length} errors).
          </div>
          <button onClick={() => setMaturityResult(null)} className="text-indigo-600 font-bold">&times;</button>
        </div>
      )}

      {/* Reconciliation Status Banner */}
      {reconciliation && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          reconciliation.status === 'RECONCILIATION PASSED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-3">
            {reconciliation.status === 'RECONCILIATION PASSED' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sm">Ledger Reconciliation Status: {reconciliation.status}</h4>
              <p className="text-xs opacity-80">Checked {reconciliation.investmentsChecked} active investments against authoritative USER_INVESTMENT ledger balances.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white/60 px-3 py-1 rounded-lg">
            {new Date(reconciliation.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Principal</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalPrincipalAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-indigo-600 font-medium mt-2 inline-block">System-wide locked</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Projected Returns</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">+${totalExpectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-emerald-700 font-medium mt-2 inline-block">Liability exposure</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Investments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{investments.length}</p>
          <span className="text-xs text-slate-500 font-medium mt-2 inline-block">Active: {investments.filter(i => i.status === 'ACTIVE').length}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Admin Investments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">All User Investments</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Investor</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Principal</th>
                <th className="px-6 py-3">Expected Return</th>
                <th className="px-6 py-3">Maturity Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{inv.public_reference}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{inv.user_name}</div>
                    <div className="text-xs text-slate-500">{inv.user_email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{inv.plan_name}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    ${Number(inv.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">
                    +${Number(inv.expected_return).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {new Date(inv.maturity_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      inv.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                      inv.status === 'MATURED' ? 'bg-indigo-50 text-indigo-700' :
                      inv.status === 'EARLY_EXIT' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
