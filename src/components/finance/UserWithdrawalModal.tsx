import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Alert } from '../ui/Alert.js';
import { Badge } from '../ui/Badge.js';
import { ArrowUpRight, Plus, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../utils/money.js';
import { WithdrawalDestination } from '../../types/finance.js';

interface UserWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: string;
  currency: string;
}

export const UserWithdrawalModal: React.FC<UserWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
  currency
}) => {
  const [destinations, setDestinations] = useState<WithdrawalDestination[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Destination Form state
  const [showAddDest, setShowAddDest] = useState(false);
  const [destType, setDestType] = useState<'bank_account' | 'crypto_address' | 'paypal'>('bank_account');
  const [destProvider, setDestProvider] = useState('Chase Bank NA');
  const [destDisplayName, setDestDisplayName] = useState('Checking Account');
  const [destMasked, setDestMasked] = useState('****9921');
  const [addingDest, setAddingDest] = useState(false);

  const fetchDestinations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/withdrawal-destinations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setDestinations(data.data);
        if (data.data.length > 0 && !selectedDestId) {
          setSelectedDestId(String(data.data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to fetch destinations', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
      setError(null);
      setSuccessMsg(null);
      setAmount('');
    }
  }, [isOpen]);

  // Fee estimation (1.5% min $2.00 cap $50.00)
  const amtNum = Number(amount) || 0;
  let feeNum = amtNum * 0.015;
  if (feeNum < 2.00 && amtNum > 0) feeNum = 2.00;
  if (feeNum > 50.00) feeNum = 50.00;
  const netNum = Math.max(0, amtNum - feeNum);

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingDest(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/withdrawal-destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: destType,
          currency,
          provider: destProvider,
          display_name: destDisplayName,
          masked_identifier: destMasked
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add destination');

      setDestinations(prev => [...prev, data.data]);
      setSelectedDestId(String(data.data.id));
      setShowAddDest(false);
      setSuccessMsg('Withdrawal destination successfully added');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingDest(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestId || amtNum <= 0) {
      setError('Please select a destination and enter a valid withdrawal amount');
      return;
    }

    if (amtNum > Number(availableBalance)) {
      setError(`Requested amount exceeds available balance (${formatMoney(availableBalance, { currency })})`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/v1/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          destination_id: Number(selectedDestId),
          amount: amount,
          currency
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request withdrawal');

      if (data.data?.new_balance !== undefined) {
        window.dispatchEvent(new CustomEvent('balance_updated', { detail: { balance: data.data.new_balance } }));
      }

      setSuccessMsg(`Withdrawal successfully requested (#${data.data.public_reference}). Funds locked in ledger.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Withdrawal">
      <div className="space-y-5 text-left">
        {error && <Alert type="error">{error}</Alert>}
        {successMsg && <Alert type="success">{successMsg}</Alert>}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Available Balance</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(availableBalance, { currency })}</p>
          </div>
          <Badge variant="success" size="sm">
            <ShieldCheck className="w-3 h-3 mr-1" /> Ledger Verified
          </Badge>
        </div>

        {!showAddDest ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payout Destination</label>
                <button
                  type="button"
                  onClick={() => setShowAddDest(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Destination
                </button>
              </div>

              {destinations.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  <p className="text-sm text-slate-500 mb-2">No verified payout destinations found.</p>
                  <Button size="sm" onClick={() => setShowAddDest(true)}>Add Payout Destination</Button>
                </div>
              ) : (
                <select
                  value={selectedDestId}
                  onChange={e => setSelectedDestId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {destinations.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.display_name} ({d.masked_identifier}) - {d.provider}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Withdrawal Amount ({currency})</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              {amtNum > 0 && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Requested Gross Amount:</span>
                    <span className="font-semibold">{formatMoney(amount, { currency })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Estimated Withdrawal Fee (1.5%):</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatMoney(feeNum.toFixed(2), { currency })}</span>
                  </div>
                  <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                    <span>Net Recipient Payout:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(netNum.toFixed(2), { currency })}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit" isLoading={loading} disabled={destinations.length === 0 || amtNum <= 0}>
                  Request Withdrawal
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleAddDestination} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Payout Destination</h3>
              <button type="button" onClick={() => setShowAddDest(false)} className="text-xs text-slate-500 hover:underline">Back</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Destination Type</label>
              <select
                value={destType}
                onChange={e => setDestType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="bank_account">Bank Account (ACH / Wire)</option>
                <option value="crypto_address">Crypto Address (USDT / USDC)</option>
                <option value="paypal">PayPal / Local Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Provider / Institution Name</label>
              <Input value={destProvider} onChange={e => setDestProvider(e.target.value)} placeholder="e.g. Chase Bank, Coinbase" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Account Display Name</label>
              <Input value={destDisplayName} onChange={e => setDestDisplayName(e.target.value)} placeholder="e.g. Primary Checking" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Masked Identifier / Account Number</label>
              <Input value={destMasked} onChange={e => setDestMasked(e.target.value)} placeholder="e.g. ****4891" required />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowAddDest(false)}>Cancel</Button>
              <Button type="submit" isLoading={addingDest}>Save Destination</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
