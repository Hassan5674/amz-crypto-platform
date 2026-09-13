import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserInvestment } from '../../types/investment';
import { TrendingUp, ShieldCheck, Clock, DollarSign, ArrowUpRight, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const UserInvestmentsDashboard: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment & { events?: any[] } | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/investments', {
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

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleViewDetail = async (invId: number) => {
    try {
      const res = await fetch(`/api/investments/${invId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setSelectedInvestment(data.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEarlyExit = async (invId: number) => {
    if (!window.confirm('Are you sure you want to execute an early exit? Applicable early exit fees will apply.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/investments/${invId}/early-exit`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        alert('Early exit successfully processed. Principal refunded to available balance.');
        setDetailModalOpen(false);
        fetchInvestments();
      } else {
        alert(data.message || 'Early exit failed');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalInvested = investments
    .filter(i => i.status === 'ACTIVE')
    .reduce((sum, i) => sum + Number(i.principal_amount), 0);

  const expectedReturnsTotal = investments
    .filter(i => i.status === 'ACTIVE')
    .reduce((sum, i) => sum + Number(i.expected_return), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Loading your investments portfolio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Principal</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-indigo-600 font-medium mt-2 inline-block">Locked in Ledger</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Returns</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">+${expectedReturnsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-emerald-700 font-medium mt-2 inline-block">Projected at Maturity</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Positions</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{investments.filter(i => i.status === 'ACTIVE').length}</p>
          <span className="text-xs text-slate-500 font-medium mt-2 inline-block">Total history: {investments.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Your Investment Portfolio</h3>
          <button
            onClick={fetchInvestments}
            className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition"
            title="Refresh Portfolio"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-3">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-medium text-slate-700">No active investments found</p>
            <p className="text-sm text-slate-500">Explore the investment plan lobby to fund your first position.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Reference / Plan</th>
                  <th className="px-6 py-3">Principal</th>
                  <th className="px-6 py-3">Expected Return</th>
                  <th className="px-6 py-3">Maturity Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {investments.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{inv.plan_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{inv.public_reference}</div>
                    </td>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetail(inv.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investment Detail Modal */}
      {detailModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedInvestment.plan_name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedInvestment.public_reference}</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-xs">Principal Amount:</span>
                <span className="font-bold text-slate-900">${Number(selectedInvestment.principal_amount).toLocaleString()} {selectedInvestment.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Expected Return:</span>
                <span className="font-bold text-emerald-600">+${Number(selectedInvestment.expected_return).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Maturity Payout:</span>
                <span className="font-bold text-slate-900">${Number(selectedInvestment.maturity_amount).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Status:</span>
                <span className="font-bold text-indigo-600">{selectedInvestment.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Start Date:</span>
                <span className="text-slate-800">{new Date(selectedInvestment.start_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Maturity Date:</span>
                <span className="text-slate-800">{new Date(selectedInvestment.maturity_at).toLocaleString()}</span>
              </div>
            </div>

            {selectedInvestment.events && selectedInvestment.events.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Investment Event Timeline</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {selectedInvestment.events.map((evt: any) => (
                    <div key={evt.id} className="text-xs bg-white border border-slate-200 p-2.5 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">{evt.event_type}</span>
                        <span className="text-slate-500 block">{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      {evt.amount && (
                        <span className="font-semibold text-slate-900">${Number(evt.amount).toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end space-x-3">
              {selectedInvestment.status === 'ACTIVE' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleEarlyExit(selectedInvestment.id)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition text-xs shadow-sm"
                >
                  {actionLoading ? 'Processing...' : 'Request Early Exit'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
