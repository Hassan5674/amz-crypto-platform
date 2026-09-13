import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  Send,
  Clock
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Alert } from '../ui/Alert.js';
import { CryptoCurrency, CryptoPayoutOrderEntity } from '../../types/crypto.js';
import { WalletConnectModal, ConnectedWalletState } from './WalletConnectModal.js';
import { formatMoney } from '../../utils/money.js';

interface CryptoWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: string;
  currency: string;
}

export const CryptoWithdrawalModal: React.FC<CryptoWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
  currency = 'USD'
}) => {
  const [wallet, setWallet] = useState<ConnectedWalletState | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Form states
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency | null>(null);
  const [useConnectedWallet, setUseConnectedWallet] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [extraId, setExtraId] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [confirmedDestination, setConfirmedDestination] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPayout, setSuccessPayout] = useState<CryptoPayoutOrderEntity | null>(null);
  const [minWithdrawal, setMinWithdrawal] = useState('1.00');

  // Fetch currencies
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessPayout(null);
      setAmount('');
      setPassword('');
      setTotpCode('');
      setConfirmedDestination(false);

      fetch('/api/crypto/currencies?operation=withdrawal')
        .then(res => res.json())
        .then(data => {
          if (data.data && Array.isArray(data.data)) {
            setCurrencies(data.data);
            if (!selectedCurrency && data.data.length > 0) {
              const first = data.data[0];
              setSelectedCurrency(first);
              const initialMin = first.effective_min_withdrawal_usd || first.min_withdrawal_usd || '1.00';
              setMinWithdrawal(initialMin);
            }
          }
        })
        .catch(err => console.error('Failed to load withdrawal currencies', err));
    }
  }, [isOpen]);

  // Fetch dynamic min withdrawal when currency changes
  useEffect(() => {
    if (selectedCurrency) {
      const fallback = selectedCurrency.effective_min_withdrawal_usd || selectedCurrency.min_withdrawal_usd || '1.00';
      setMinWithdrawal(fallback);

      fetch(`/api/crypto/currencies/min-amount?currency=${selectedCurrency.code}&operation=withdrawal`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.min_amount) {
            const parsed = parseFloat(data.data.min_amount);
            if (!isNaN(parsed) && parsed > 0) {
              setMinWithdrawal(parsed.toFixed(2));
            }
          }
        })
        .catch(() => setMinWithdrawal(fallback));
    }
  }, [selectedCurrency]);

  const targetAddress = useConnectedWallet && wallet ? wallet.address : manualAddress.trim();

  // Fee calculation (1% fee, min $0.20, max $50.00)
  const amtNum = parseFloat(amount) || 0;
  let feeNum = amtNum * 0.01;
  if (feeNum < 0.20 && amtNum > 0) feeNum = 0.20;
  if (feeNum > 50.0) feeNum = 50.0;
  const netNum = Math.max(0, amtNum - feeNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrency) return;

    if (!targetAddress) {
      setError('Please provide or connect a valid destination address');
      return;
    }

    // Address regex validation
    if (selectedCurrency.wallet_regex) {
      const regex = new RegExp(selectedCurrency.wallet_regex);
      if (!regex.test(targetAddress)) {
        setError(`Address does not match valid ${selectedCurrency.network} specifications.`);
        return;
      }
    }

    if (selectedCurrency.extra_id_exists && !extraId) {
      setError(`Destination Tag / Memo is strictly required for ${selectedCurrency.symbol} withdrawals.`);
      return;
    }

    if (amtNum <= 0) {
      setError('Withdrawal amount must be greater than zero.');
      return;
    }

    const minWdNum = parseFloat(minWithdrawal) || 1.0;
    if (amtNum < minWdNum) {
      setError(`Minimum withdrawal amount for ${selectedCurrency.symbol} (${selectedCurrency.network_display || selectedCurrency.network}) is $${minWithdrawal} USD.`);
      return;
    }

    if (amtNum > parseFloat(availableBalance)) {
      setError(`Requested withdrawal ($${amtNum.toFixed(2)}) exceeds ledger balance ($${availableBalance})`);
      return;
    }

    if (!confirmedDestination) {
      setError('Please review and explicitly confirm the withdrawal destination address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || 'demo-user-4';
      const res = await fetch('/api/crypto/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currency_code: selectedCurrency.code,
          network: selectedCurrency.network,
          destination_address: targetAddress,
          extra_id: extraId || undefined,
          amount: amount,
          password: password || undefined,
          totp_code: totpCode || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Withdrawal rejected');
      }

      setSuccessPayout(data.data);
      if (data.data?.new_balance !== undefined) {
        window.dispatchEvent(new CustomEvent('balance_updated', { detail: { balance: data.data.new_balance } }));
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Cryptocurrency Withdrawal & Payout">
        <div className="space-y-5 text-left" id="crypto-withdrawal-modal">
          {error && (
            <Alert type="error" title="Security & Compliance Notice">
              {error}
            </Alert>
          )}

          {successPayout ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Withdrawal Request Sent to Admin</h3>
                <p className="text-xs text-slate-400">
                  Your withdrawal request has been submitted to the Admin Panel. Once approved by the administrator, the automated blockchain payout will disburse the funds directly to your wallet address.
                </p>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> PENDING ADMIN APPROVAL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Amount:</span>
                  <span className="text-white">${successPayout.amount} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Network Fee:</span>
                  <span className="text-rose-400">-${successPayout.fee_amount} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Disbursement:</span>
                  <span className="text-emerald-400 font-bold">${successPayout.net_amount} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset & Network:</span>
                  <span className="text-white">{(successPayout.currency || (successPayout as any).currency_code || '').toUpperCase()} ({successPayout.network})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{successPayout.destination_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ledger Reservation:</span>
                  <span className="text-indigo-400">#LTX-{successPayout.ledger_transaction_id}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2 text-left">
                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Capital is locked in the system ledger. Once the admin clicks Approve, the system automatically disburses the cryptocurrency payout without manual intervention.</span>
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
                Got it, Return to Dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Balance Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Available Ledger Balance:</span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {formatMoney(availableBalance, { currency })}
                  </div>
                </div>
                <Badge variant="success" size="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </Badge>
              </div>

              {/* Notice Banner explaining Admin Approval and Auto-Send */}
              <div className="p-3 bg-slate-900 border border-indigo-500/20 rounded-xl text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                  <ShieldCheck className="w-4 h-4" /> Admin Approval & Automated Blockchain Disbursement
                </div>
                <p className="text-[11px] text-slate-400">
                  Select your desired coin and network. Your withdrawal request will be recorded with double-entry reservation. Once approved by the administrator, the cryptocurrency is automatically sent to your destination address.
                </p>
              </div>

              {/* Currency & Network Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Supported Crypto & Network
                  </label>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Payout Enabled
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {currencies.map(coin => (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(coin);
                        setConfirmedDestination(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        selectedCurrency?.code === coin.code
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{coin.symbol}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {coin.network}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {coin.network_display || coin.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Source: Connected Wallet OR Manual Entry */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Destination Address</span>
                  {wallet ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUseConnectedWallet(!useConnectedWallet);
                        setConfirmedDestination(false);
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" />
                      {useConnectedWallet ? 'Enter Different Address' : 'Use Connected Wallet'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWalletModalOpen(true)}
                      className="text-xs font-semibold text-indigo-400 hover:underline"
                    >
                      Connect Wallet for 1-Click Payout
                    </button>
                  )}
                </div>

                {useConnectedWallet && wallet ? (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-indigo-200">
                      <span>Connected wallet:</span>
                      <span className="font-bold">{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold">
                      <span>Destination address:</span>
                      <span className="text-emerald-400">{wallet.address}</span>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={e => {
                      setManualAddress(e.target.value);
                      setConfirmedDestination(false);
                    }}
                    placeholder={`Enter recipient ${selectedCurrency?.network || 'crypto'} address`}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}

                {/* Destination Tag / Memo if required */}
                {selectedCurrency?.extra_id_exists && (
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                      Destination Tag / Memo (Mandatory for {selectedCurrency.symbol})
                    </label>
                    <input
                      type="text"
                      value={extraId}
                      onChange={e => setExtraId(e.target.value)}
                      placeholder="e.g. 10293847"
                      required
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Amount & Fee Estimation */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Gross Withdrawal Amount (USD)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">
                      Min: <strong className="text-indigo-600 dark:text-indigo-400">${minWithdrawal} USD</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance)}
                      className="text-xs text-indigo-400 font-semibold hover:underline"
                    >
                      Max (${availableBalance})
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min={parseFloat(minWithdrawal) || 1.0}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-12 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={minWithdrawal}
                  />
                </div>

                {/* Quick Presets based dynamically on withdrawal minimum */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(() => {
                    const parsed = parseFloat(minWithdrawal) || 1.0;
                    const dynamicPresets = parsed <= 1.0
                      ? ['1.00', '5', '10', '25', '50', '100']
                      : parsed <= 5.0
                      ? [parsed.toFixed(2), '10', '25', '50', '100', '250']
                      : parsed <= 15.0
                      ? [parsed.toFixed(2), '20', '35', '50', '100', '250']
                      : [parsed.toFixed(2), (Math.ceil(parsed / 5) * 5).toString(), '50', '100', '250', '500'];

                    return dynamicPresets.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors ${
                          amount === val
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ${val}
                      </button>
                    ));
                  })()}
                </div>

                {parseFloat(amount) > 0 && parseFloat(amount) < (parseFloat(minWithdrawal) || 1.0) && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs mt-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Minimum withdrawal for <strong>{selectedCurrency?.symbol} ({selectedCurrency?.network_display || selectedCurrency?.network})</strong> is <strong>${minWithdrawal} USD</strong>.
                    </span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Disbursement Fee (1%):</span>
                    <span>${feeNum.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Net Received:</span>
                    <span className="text-emerald-400 font-mono">${netNum.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Destination Verification Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedDestination}
                  onChange={e => setConfirmedDestination(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  I have verified that the destination address{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {targetAddress ? `${targetAddress.slice(0, 10)}...${targetAddress.slice(-8)}` : '[Address]'}
                  </strong>{' '}
                  strictly belongs to the <strong>{selectedCurrency?.network}</strong> blockchain.
                </span>
              </label>

              {/* Password or MFA Confirmation */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Account Authorization Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your account password to authorize"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                className="w-full font-bold"
                isLoading={loading}
                disabled={!confirmedDestination}
                leftIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Authorize & Disburse Payout
              </Button>
            </form>
          )}
        </div>
      </Modal>

      <WalletConnectModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onConnected={w => {
          setWallet(w);
          setUseConnectedWallet(true);
        }}
        currentWallet={wallet}
      />
    </>
  );
};
