import '../../polyfills.js';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).global = (window as any).global || window;
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Send,
  ExternalLink,
  Shield,
  Clock,
  Wallet,
  AlertCircle,
  Info,
  PlusCircle,
  Power,
  Sparkles,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Alert } from '../ui/Alert.js';
import { Badge } from '../ui/Badge.js';
import { WalletConnectModal, ConnectedWalletState, CHAIN_NAMES } from './WalletConnectModal.js';
import { PaymentOrderEntity, CryptoCurrency } from '../../types/crypto.js';
import QRCode from 'qrcode';
import { BrowserProvider, parseUnits, parseEther, Contract, isAddress } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

interface CryptoDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConnectedWallet?: ConnectedWalletState | null;
  onDepositFinalized?: () => void;
}

interface DiagnosticLogItem {
  time: string;
  stage: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  data?: any;
}

export const CryptoDepositModal: React.FC<CryptoDepositModalProps> = ({
  isOpen,
  onClose,
  initialConnectedWallet = null,
  onDepositFinalized
}) => {
  const [step, setStep] = useState<'CONNECT' | 'SELECT_COIN' | 'PAYMENT_ACTIVE' | 'SETTLED'>('SELECT_COIN');
  const [wallet, setWallet] = useState<ConnectedWalletState | null>(() => {
    if (initialConnectedWallet) return initialConnectedWallet;
    try {
      const saved = localStorage.getItem('apex_connected_wallet');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency | null>(null);
  const [amountUsd, setAmountUsd] = useState('10');
  const [minAmount, setMinAmount] = useState('0.55');
  const [activeOrder, setActiveOrder] = useState<PaymentOrderEntity | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingWalletTx, setIsSendingWalletTx] = useState(false);
  const [manualTxHashInput, setManualTxHashInput] = useState('');
  const [isSubmittingManualHash, setIsSubmittingManualHash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txNotice, setTxNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<DiagnosticLogItem[]>([]);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Clean reset function for payment lifecycle
  const resetPaymentSession = () => {
    setActiveOrder(null);
    setStep('SELECT_COIN');
    setError(null);
    setTxNotice(null);
    setIsSendingWalletTx(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      sessionStorage.removeItem('apex_auto_open_deposit');
    }
  };

  const handleModalClose = () => {
    if (step === 'SETTLED' || activeOrder?.status === 'FINISHED' || activeOrder?.status === 'OVERPAID') {
      resetPaymentSession();
    }
    onClose();
  };

  const handleMakeAnotherDeposit = () => {
    resetPaymentSession();
  };

  const handleDone = () => {
    resetPaymentSession();
    if (onDepositFinalized) onDepositFinalized();
    onClose();
  };

  const handleViewTransactions = () => {
    resetPaymentSession();
    if (onDepositFinalized) onDepositFinalized();
    onClose();
    window.dispatchEvent(new CustomEvent('navigate_dashboard_view', { detail: 'deposits' }));
  };

  const addLog = (stage: string, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info', data?: any) => {
    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    const logItem: DiagnosticLogItem = { time, stage, message, type, data };
    console.log(`[DEPOSIT_DIAG] [${type.toUpperCase()}] ${stage}: ${message}`, data || '');
    setDiagnosticsLogs(prev => [logItem, ...prev]);
  };

  const getClientAuthToken = (): string => {
    try {
      const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
      if (match) return match[2];
      const apexToken = localStorage.getItem('apex_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (apexToken) return apexToken;
      const sessionUser = localStorage.getItem('apex_session_user');
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        if (parsed?.token) return parsed.token;
      }
    } catch {
      // ignore
    }
    return 'token_user_123';
  };

  const fetchCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      setError(null);
      const token = getClientAuthToken();
      const res = await fetch('/api/crypto/currencies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCurrencies(data.data);
        if (data.data.length > 0 && !selectedCurrency) {
          const defaultCoin = data.data.find((c: any) => c.code === 'sol') || data.data[0];
          setSelectedCurrency(defaultCoin);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cryptocurrencies');
    } finally {
      setLoadingCurrencies(false);
    }
  };

  // Dynamically update minimum amount based on selected currency
  useEffect(() => {
    if (selectedCurrency) {
      const defaultUsd = 
        selectedCurrency.effective_min_deposit_usd || 
        selectedCurrency.provider_min_deposit_usd || 
        (selectedCurrency.code === 'sol' ? '0.55' : '1.00');
      setMinAmount(defaultUsd);

      // Query dynamic minimum from backend
      fetch(`/api/crypto/currencies/min-amount?currency=${selectedCurrency.code}&operation=deposit`)
        .then(r => r.json())
        .then(res => {
          if (res?.data?.effective_min) {
            setMinAmount(String(res.data.effective_min));
          }
        })
        .catch(() => {});
    }
  }, [selectedCurrency]);

  // Synchronize wallet whenever modal opens or wallet state changes in storage / custom event
  useEffect(() => {
    const syncWalletFromStorage = () => {
      try {
        const saved = localStorage.getItem('apex_connected_wallet');
        if (saved) {
          const parsed = JSON.parse(saved);
          setWallet(parsed);
          addLog('WALLET_SYNC', `Synchronized ${parsed.walletType} (${parsed.address.slice(0, 8)}...)`, 'success');
        } else if (!initialConnectedWallet) {
          setWallet(null);
        }
      } catch {}
    };

    if (initialConnectedWallet) {
      setWallet(initialConnectedWallet);
    } else {
      syncWalletFromStorage();
    }

    window.addEventListener('storage', syncWalletFromStorage);
    window.addEventListener('apex_wallet_connected', syncWalletFromStorage);

    return () => {
      window.removeEventListener('storage', syncWalletFromStorage);
      window.removeEventListener('apex_wallet_connected', syncWalletFromStorage);
    };
  }, [initialConnectedWallet, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchCurrencies();
      // If modal is opened and active order is already settled/expired/failed or null, ensure clean SELECT_COIN
      if (!activeOrder || activeOrder.status === 'FINISHED' || activeOrder.status === 'OVERPAID' || activeOrder.status === 'EXPIRED' || activeOrder.status === 'FAILED') {
        setActiveOrder(null);
        setStep('SELECT_COIN');
        setError(null);
        setTxNotice(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeOrder?.payment_address) {
      QRCode.toDataURL(activeOrder.payment_address, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [activeOrder?.payment_address]);

  // Polling order status
  useEffect(() => {
    if (!activeOrder || step !== 'PAYMENT_ACTIVE') return;

    const interval = setInterval(async () => {
      try {
        const token = getClientAuthToken();
        const res = await fetch(`/api/crypto/deposits/${activeOrder.id}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setActiveOrder(data.data);
          if (data.data.status === 'FINISHED' || data.data.status === 'OVERPAID') {
            addLog('SETTLED', 'Payment confirmed on-chain & verified by backend!', 'success');
            setStep('SETTLED');
            setError(null);
            setTxNotice(null);
            if (onDepositFinalized) onDepositFinalized();
          }
        }
      } catch (err) {
        console.warn('Status poll warning:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [step, activeOrder, onDepositFinalized]);

  // Auto-resume order and payment when app opens inside mobile wallet
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('active_order_id');
    const actionParam = params.get('action');

    if (orderIdParam && !activeOrder) {
      const token = getClientAuthToken();
      fetch(`/api/crypto/deposits/${orderIdParam}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data?.data) {
            setActiveOrder(data.data);
            setStep('PAYMENT_ACTIVE');
            addLog('AUTO RESUME', `Resumed deposit order #${orderIdParam} from mobile wallet URL`, 'success');
            if (actionParam === 'pay') {
              setTimeout(() => {
                const anyWin = window as any;
                if (anyWin.ethereum || anyWin.solana || anyWin.phantom) {
                  addLog('AUTO PAY', 'Prompting in-app wallet transaction confirmation popup...', 'info');
                  handleDirectWalletSend();
                }
              }, 1200);
            }
          }
        })
        .catch(err => console.warn('[AUTO_RESUME_ERROR]', err));
    }
  }, [isOpen, activeOrder]);

  const handleWalletConnected = (connectedWallet: ConnectedWalletState | null) => {
    setWallet(connectedWallet);
    if (connectedWallet) {
      addLog('WALLET CONNECTED', `Connected: ${connectedWallet.address} (${connectedWallet.walletType})`, 'success');
    } else {
      addLog('WALLET DISCONNECTED', 'Wallet session cleared by user.', 'info');
    }
  };

  const handleDisconnectWallet = () => {
    localStorage.removeItem('apex_connected_wallet');
    setWallet(null);
    addLog('WALLET DISCONNECTED', 'Disconnected successfully.', 'info');
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrency) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const numAmount = parseFloat(amountUsd);
      const minUsdNum = parseFloat(minAmount);
      if (isNaN(numAmount) || numAmount < (minUsdNum - 0.001)) {
        setError(`Deposit amount ($${numAmount || 0}) is below the required minimum of $${minAmount} USD for ${selectedCurrency.symbol.toUpperCase()}.`);
        setIsSubmitting(false);
        return;
      }

      addLog('ORDER CREATION', `Creating deposit order for ${amountUsd} USD in ${selectedCurrency.code}...`, 'info');

      const token = getClientAuthToken();
      const res = await fetch('/api/crypto/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currency_code: selectedCurrency.code,
          currency: selectedCurrency.code,
          network: selectedCurrency.network,
          amount: String(numAmount),
          amount_usd: numAmount,
          wallet_address: wallet?.address || null,
          customer_wallet_address: wallet?.address || null,
          wallet_type: wallet?.walletType || null,
          customer_wallet_type: wallet?.walletType || null,
          deposit_mode: 'ORDER'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize deposit order');
      }

      setActiveOrder(data.data);
      setStep('PAYMENT_ACTIVE');
      addLog('ORDER CREATED', `Payment Order #${data.data.id} Created! Address: ${data.data.payment_address}`, 'success', data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating payment order';
      setError(msg);
      addLog('CREATION ERROR', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Direct Wallet Payment Handler
  const handleDirectWalletSend = async () => {
    if (!activeOrder) {
      setError('No active payment order to settle.');
      return;
    }

    try {
      setIsSendingWalletTx(true);
      setError(null);
      const anyWindow = window as any;
      let txHash = '';

      const currencyCode = activeOrder.pay_currency.toLowerCase();
      const network = (activeOrder.pay_network || '').toUpperCase();
      const recipientAddress = (activeOrder.payment_address || '').trim();

      const isSolana = network === 'SOL' || network === 'SOLANA' || currencyCode === 'sol';
      const isTron = network === 'TRC20' || network === 'TRON' || currencyCode === 'trx' || currencyCode.includes('trc20') || recipientAddress.startsWith('T');
      const isEvm = recipientAddress.startsWith('0x');

      addLog('PAY CLICKED', `Pay initiated for ${activeOrder.expected_amount} ${activeOrder.pay_currency.toUpperCase()}`, 'info');
      addLog('ORDER DETAILS', `Network: ${network} | Recipient: ${recipientAddress} | Amount: ${activeOrder.expected_amount}`, 'info');

      // -------------------------------------------------------------
      // 1. SOLANA PAYMENT FLOW (Phantom, Solflare)
      // -------------------------------------------------------------
      if (isSolana) {
        addLog('ADAPTER', 'Selected Solana SPL/Native Adapter', 'info');
        const solProvider = anyWindow.solana || anyWindow.phantom?.solana;
        const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

        if (!solProvider) {
          if (isMobile) {
            // Native Solana Payment Protocol: Directly triggers Phantom/Solflare mobile app's Send/Confirm sheet!
            const solanaUri = `solana:${recipientAddress}?amount=${activeOrder.expected_amount}&label=AMZDistributor&message=AMZDistributor%20Deposit%20Order%20${activeOrder.id}`;
            addLog('MOBILE PAYMENT', 'Launching Phantom native payment confirmation sheet (solana: protocol)...', 'info');

            try {
              const link = document.createElement('a');
              link.href = solanaUri;
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch {
              window.location.href = solanaUri;
            }

            setError(
              'Opening Phantom payment confirmation... Please confirm the transaction in Phantom to complete your deposit.'
            );
            setIsSendingWalletTx(false);
            return;
          }
          throw new Error(
            'Solana wallet extension (Phantom, Solflare) was not detected in this browser window. Please install Phantom.'
          );
        }

        if (!solProvider.isConnected) {
          addLog('WALLET CONNECT', 'Prompting Phantom wallet connection popup...', 'info');
          await solProvider.connect({ onlyIfTrusted: false });
        }

        const senderPubkeyStr = solProvider.publicKey?.toString() || wallet?.address;
        if (!senderPubkeyStr) {
          throw new Error('Unable to retrieve public key from Solana wallet.');
        }

        addLog('WALLET ACCOUNT', `Sender Pubkey: ${senderPubkeyStr}`, 'info');
        const fromPubkey = new PublicKey(senderPubkeyStr);
        const toPubkey = new PublicKey(recipientAddress);
        const lamports = Math.round(parseFloat(activeOrder.expected_amount) * 1e9);

        addLog('BUILDING TRANSACTION', `Constructing Solana transfer: ${lamports} lamports -> ${recipientAddress}`, 'info');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports
          })
        );

        // Fetch recent blockhash with multi-RPC fallback
        addLog('RPC', 'Fetching latest confirmed Solana blockhash...', 'info');
        let blockhash = '';
        try {
          const bhRes = await fetch('/api/crypto/solana/blockhash');
          const bhJson = await bhRes.json();
          if (bhJson?.data?.blockhash) {
            blockhash = bhJson.data.blockhash;
            addLog('RPC', `Gateway blockhash obtained: ${blockhash.substring(0, 10)}...`, 'info');
          }
        } catch {
          // fallback
        }

        if (!blockhash) {
          const endpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://solana-rpc.publicnode.com',
            'https://rpc.ankr.com/solana'
          ];
          for (const ep of endpoints) {
            try {
              const conn = new Connection(ep, 'confirmed');
              const { blockhash: bh } = await conn.getLatestBlockhash('confirmed');
              if (bh) {
                blockhash = bh;
                addLog('RPC FALLBACK', `Blockhash from ${ep}: ${bh.substring(0, 10)}...`, 'info');
                break;
              }
            } catch {}
          }
        }

        if (!blockhash) {
          throw new Error('Could not obtain latest Solana blockhash. Please check your internet connection and retry.');
        }

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        addLog('REQUESTING WALLET SIGNATURE', 'Invoking Phantom signAndSendTransaction popup...', 'info');
        const sendResult = await solProvider.signAndSendTransaction(transaction);
        txHash = sendResult?.signature || (typeof sendResult === 'string' ? sendResult : '');

        if (!txHash) {
          throw new Error('No transaction signature returned by Solana wallet.');
        }

        addLog('USER APPROVED', `Transaction Signature: ${txHash}`, 'success');

      // -------------------------------------------------------------
      // 2. TRON PAYMENT FLOW (TronLink)
      // -------------------------------------------------------------
      } else if (isTron) {
        addLog('ADAPTER', 'Selected TRON (TRC-20) Adapter', 'info');
        const tronWeb = anyWindow.tronWeb;
        const tronLink = anyWindow.tronLink;

        if (!tronWeb && !tronLink) {
          throw new Error(
            `Recipient address ${recipientAddress} is on the TRON (TRC-20) network. EVM extensions (like MetaMask) cannot execute TRON transactions. Please send ${activeOrder.expected_amount} ${activeOrder.pay_currency.toUpperCase()} directly using TronLink, Trust Wallet TRC-20, Binance, or by copying the deposit address above.`
          );
        }

        if (tronLink && typeof tronLink.request === 'function') {
          addLog('WALLET CONNECT', 'Requesting TronLink account authorization...', 'info');
          await tronLink.request({ method: 'tron_requestAccounts' });
        }

        const tronAddress = tronWeb?.defaultAddress?.base58;
        if (!tronAddress) {
          throw new Error('Please unlock your TronLink extension and select an active account.');
        }

        addLog('WALLET ACCOUNT', `Tron Signer: ${tronAddress}`, 'info');

        if (currencyCode === 'trx') {
          const sun = Math.round(parseFloat(activeOrder.expected_amount) * 1e6);
          addLog('BUILDING TRANSACTION', `Constructing TRX transfer: ${sun} SUN -> ${recipientAddress}`, 'info');
          const tx = await tronWeb.trx.sendTransaction(recipientAddress, sun);
          txHash = tx?.txid || tx?.transaction?.txID || (typeof tx === 'string' ? tx : '');
        } else {
          // TRC-20 token (e.g. USDT)
          const usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
          addLog('TOKEN CONTRACT', `Connecting to TRC-20 token contract: ${usdtContractAddress}`, 'info');
          const contract = await tronWeb.contract().at(usdtContractAddress);
          const amountUnits = Math.round(parseFloat(activeOrder.expected_amount) * 1e6);
          addLog('REQUESTING WALLET SIGNATURE', 'Invoking TronLink token transfer approval popup...', 'info');
          const tx = await contract.transfer(recipientAddress, amountUnits).send();
          txHash = tx?.txid || (typeof tx === 'string' ? tx : '');
        }

        if (!txHash) {
          throw new Error('No transaction ID returned by TronLink.');
        }
        addLog('USER APPROVED', `TRON Transaction ID: ${txHash}`, 'success');

      // -------------------------------------------------------------
      // 3. EVM PAYMENT FLOW (MetaMask, Coinbase, Trust)
      // -------------------------------------------------------------
      } else if (isEvm) {
        addLog('ADAPTER', 'Selected EVM (Ethers v6) Adapter', 'info');

        if (!isAddress(recipientAddress)) {
          throw new Error(`Invalid EVM recipient address: "${recipientAddress}". EVM transactions require a valid 0x address.`);
        }

        const rawProvider = anyWindow.ethereum || anyWindow.coinbaseWalletExtension || anyWindow.trustwallet;

        if (!rawProvider) {
          const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
          if (isMobile) {
            // Direct native EVM payment confirmation - launches MetaMask / Trust / Rainbow directly to Send screen!
            const mmSendUri = `https://metamask.app.link/send/${recipientAddress}?value=${activeOrder.expected_amount}`;
            let ethAmountWei = '0';
            try {
              ethAmountWei = parseEther(String(activeOrder.expected_amount)).toString();
            } catch {
              ethAmountWei = '0';
            }
            const ethSendUri = `ethereum:${recipientAddress}?value=${ethAmountWei}`;

            addLog('MOBILE PAYMENT', 'Launching native mobile wallet transaction confirmation sheet...', 'info');

            try {
              const link = document.createElement('a');
              link.href = mmSendUri;
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch {
              window.location.href = ethSendUri;
            }

            setError(
              'Opening MetaMask payment confirmation sheet... Please confirm the transaction in MetaMask to complete your deposit.'
            );
            setIsSendingWalletTx(false);
            return;
          }
          throw new Error(
            'EVM wallet extension (MetaMask, Trust, Coinbase) was not detected in this browser window. Please install MetaMask.'
          );
        }

        const browserProvider = new BrowserProvider(rawProvider);
        addLog('ETHERS', 'Requesting signer accounts from EVM wallet...', 'info');

        const signer = await browserProvider.getSigner();
        const activeSignerAddress = await signer.getAddress();
        addLog('WALLET ACCOUNT', `Active EVM Signer: ${activeSignerAddress}`, 'info');

        // Check Network
        const networkInfo = await browserProvider.getNetwork();
        const currentChainId = Number(networkInfo.chainId);
        addLog('CHAIN CHECK', `Current Wallet Chain ID: ${currentChainId} (${CHAIN_NAMES[currentChainId] || 'Custom'})`, 'info');

        // Determine expected chain for order
        let expectedChainId = 1;
        if (network.includes('BSC') || network.includes('BEP20')) expectedChainId = 56;
        else if (network.includes('POLYGON') || network.includes('MATIC')) expectedChainId = 137;
        else if (network.includes('ARB') || network.includes('ARBITRUM')) expectedChainId = 42161;
        else if (network.includes('OPT') || network.includes('OPTIMISM')) expectedChainId = 10;
        else if (network.includes('BASE')) expectedChainId = 8453;
        else if (network.includes('AVAX')) expectedChainId = 43114;

        if (currentChainId !== expectedChainId && expectedChainId !== 1) {
          addLog('CHAIN SWITCH', `Prompting wallet to switch from ${currentChainId} to ${expectedChainId}...`, 'warn');
          try {
            await rawProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${expectedChainId.toString(16)}` }]
            });
            addLog('CHAIN SWITCH', `Switched chain to ${expectedChainId} successfully.`, 'success');
          } catch (switchErr: any) {
            addLog('CHAIN WARNING', `Chain switch prompt: ${switchErr?.message || switchErr}`, 'warn');
          }
        }

        const isNative = ['eth', 'bnb', 'matic', 'avax', 'arb', 'opt'].includes(currencyCode);
        const amountFloat = parseFloat(activeOrder.expected_amount);

        // Native coin transfer
        if (isNative) {
          addLog('BUILDING TRANSACTION', `Preparing Native ${activeOrder.pay_currency.toUpperCase()} transfer of ${amountFloat} to ${recipientAddress}...`, 'info');
          const valueWei = parseUnits(activeOrder.expected_amount, 18);

          addLog('REQUESTING WALLET SIGNATURE', 'Invoking MetaMask / EVM confirmation popup...', 'info');
          const txResponse = await signer.sendTransaction({
            to: recipientAddress,
            value: valueWei
          });

          addLog('WALLET SIGNATURE REQUEST SENT', 'Transaction broadcasted to mempool!', 'info');
          txHash = txResponse.hash;
          addLog('USER APPROVED', `Transaction Hash: ${txHash}`, 'success');
        } else {
          // Token Contract Transfer (e.g. USDT / USDC)
          const tokenContracts: Record<string, { address: string; decimals: number }> = {
            usdtbsc: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
            usdtbep20: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
            usdterc20: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
            usdcerc20: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
            usdc: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
            matic: { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', decimals: 18 }
          };

          const tokenMeta = tokenContracts[currencyCode];
          if (tokenMeta) {
            addLog('TOKEN CONTRACT', `Detected standard token contract: ${tokenMeta.address} (${tokenMeta.decimals} decimals)`, 'info');
            const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
            const tokenContract = new Contract(tokenMeta.address, erc20Abi, signer);
            const tokenUnits = parseUnits(activeOrder.expected_amount, tokenMeta.decimals);

            addLog('REQUESTING WALLET SIGNATURE', 'Invoking ERC-20 token transfer approval popup...', 'info');
            const txResponse = await tokenContract.transfer(recipientAddress, tokenUnits);
            txHash = txResponse.hash;
            addLog('USER APPROVED', `Token Transfer Hash: ${txHash}`, 'success');
          } else {
            throw new Error(`Unsupported EVM token contract for: ${currencyCode}. Please transfer directly to the deposit address.`);
          }
        }
      } else {
        // Native UTXO or unsupported chains
        throw new Error(
          `${activeOrder.pay_currency.toUpperCase()} is on a native blockchain. Browser extensions cannot sign this transaction directly. Please copy the deposit address and exact amount above to transfer from your wallet or exchange.`
        );
      }

      // Submit transaction hash to backend
      if (txHash) {
        addLog('SUBMITTING', `Submitting hash ${txHash} for backend settlement...`, 'info');
        const token = getClientAuthToken();
        const res = await fetch(`/api/crypto/deposits/${activeOrder.id}/tx-hash`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tx_hash: txHash })
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setActiveOrder(data.data);
          addLog('VERIFIED', 'Backend registered transaction hash. Awaiting confirmation.', 'success');
        } else {
          addLog('BACKEND NOTICE', data.message || 'Transaction broadcast recorded locally.', 'warn');
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[POP_TRANSACTION_ERROR]', err);
      let friendlyMsg = msg;

      if (err?.code === 4001 || msg.includes('rejected') || msg.includes('User denied') || msg.includes('User rejected')) {
        friendlyMsg = 'Transaction cancelled: You declined or closed the confirmation popup in your wallet.';
        addLog('USER REJECTED', friendlyMsg, 'warn');
      } else if (msg.includes('insufficient funds')) {
        friendlyMsg = 'Insufficient balance in your wallet to cover the payment amount and network gas fees.';
        addLog('INSUFFICIENT FUNDS', friendlyMsg, 'error');
      } else if (msg.includes('not detected')) {
        addLog('WALLET NOT FOUND', friendlyMsg, 'error');
      } else {
        addLog('TRANSACTION ERROR', friendlyMsg, 'error', err);
      }

      setError(friendlyMsg);
    } finally {
      setIsSendingWalletTx(false);
    }
  };

  const handleManualTxHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTxHashInput.trim() || !activeOrder) return;
    setIsSubmittingManualHash(true);
    setError(null);
    try {
      const token = getClientAuthToken();
      const res = await fetch(`/api/crypto/deposits/${activeOrder.id}/tx-hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tx_hash: manualTxHashInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setActiveOrder(data.data);
        setStep('SETTLED');
        setTxNotice('Transaction hash (HRX) submitted successfully! Payment verified and credited.');
        if (onDepositFinalized) onDepositFinalized();
      } else {
        throw new Error(data.message || 'Failed to submit transaction hash');
      }
    } catch (err: any) {
      setError(err?.message || 'Error submitting transaction hash');
    } finally {
      setIsSubmittingManualHash(false);
    }
  };

  const copyDiagnostics = () => {
    const text = diagnosticsLogs
      .map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.stage}: ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Diagnostics log copied to clipboard!');
  };

  // Helper to determine network compatibility for connected wallet
  const getWalletCompatibilityNotice = () => {
    if (!activeOrder || !wallet) return null;
    const orderNet = (activeOrder.pay_network || '').toUpperCase();
    const isSolanaOrder = orderNet === 'SOL' || orderNet === 'SOLANA' || activeOrder.pay_currency.toLowerCase() === 'sol';
    const isTronOrder = orderNet === 'TRC20' || orderNet === 'TRON' || activeOrder.pay_currency.toLowerCase() === 'trx';
    const isEvmOrder = activeOrder.payment_address.startsWith('0x');

    if (isSolanaOrder && wallet.walletType !== 'PHANTOM' && wallet.walletType !== 'SOLFLARE') {
      return {
        type: 'mismatch',
        message: `This deposit is on Solana. Your connected wallet is ${wallet.walletType} (EVM). Connect Phantom or send directly to the address below.`,
        action: () => setShowWalletModal(true),
        actionText: 'Switch to Phantom'
      };
    }
    if (isTronOrder && wallet.walletType !== 'TRONLINK') {
      return {
        type: 'mismatch',
        message: `This deposit is on TRON (TRC-20). Your connected wallet is ${wallet.walletType}. Use TronLink, Binance, or send directly to the address below.`,
        action: () => setShowWalletModal(true),
        actionText: 'Connect TronLink'
      };
    }
    if (isEvmOrder && (wallet.walletType === 'PHANTOM' || wallet.walletType === 'SOLFLARE' || wallet.walletType === 'TRONLINK')) {
      return {
        type: 'mismatch',
        message: `This deposit is on EVM (${activeOrder.pay_network}). Your connected wallet is ${wallet.walletType}. Connect MetaMask or Trust Wallet.`,
        action: () => setShowWalletModal(true),
        actionText: 'Switch to EVM Wallet'
      };
    }
    return null;
  };

  const walletCompat = getWalletCompatibilityNotice();

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} title="AMZDistributor Crypto Deposit">
        <div className="space-y-4 text-left max-h-[82vh] overflow-y-auto pr-1" id="crypto-deposit-modal">
          {/* Global Connected Wallet Banner (Fully Responsive) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-xs">
            {wallet ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-slate-400 shrink-0">Wallet:</span>
                  <span className="font-mono text-white font-bold truncate max-w-[120px] sm:max-w-[160px]" title={wallet.address}>
                    {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
                  </span>
                  <Badge variant="success" size="sm">{wallet.walletType}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowWalletModal(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-1"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition"
                    id="disconnect-wallet-btn"
                  >
                    <Power className="w-3 h-3" /> Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <Wallet className="w-4 h-4 text-slate-500" />
                  <span>No wallet connected</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWalletModal(true)}
                  className="text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                  id="connect-wallet-header-btn"
                >
                  Connect Wallet
                </Button>
              </>
            )}
          </div>

          {/* User Notifications */}
          {error && step !== 'SETTLED' && (
            <Alert type="error" title="Notice">
              {error}
            </Alert>
          )}

          {txNotice && step !== 'SETTLED' && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-2 text-xs text-indigo-300">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">{txNotice}</div>
              <button
                type="button"
                onClick={() => setTxNotice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* 1. SELECT COIN & AMOUNT STEP                                      */}
          {/* ================================================================= */}
          {step === 'SELECT_COIN' && (
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Cryptocurrency Asset & Network
                </label>
                {loadingCurrencies ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading supported currencies...
                  </div>
                ) : (
                  <select
                    value={selectedCurrency?.code || ''}
                    onChange={e => {
                      const found = currencies.find(c => c.code === e.target.value);
                      if (found) setSelectedCurrency(found);
                    }}
                    className="w-full text-xs font-medium px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    id="crypto-currency-select"
                  >
                    {currencies.map(c => (
                      <option key={`${c.code}-${c.network}`} value={c.code}>
                        {c.name} ({c.symbol.toUpperCase()}) — Network: {c.network_display || c.network.toUpperCase()} (Min: ${c.effective_min_deposit_usd || c.provider_min_deposit_usd || '0.55'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Deposit Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min={minAmount}
                    step="any"
                    value={amountUsd}
                    onChange={e => setAmountUsd(e.target.value)}
                    className="w-full text-xs font-mono font-bold pl-7 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    id="crypto-amount-input"
                  />
                </div>

                {/* Quick Presets & Minimum Chip */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAmountUsd(minAmount)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md transition"
                    id="set-min-amount-chip"
                  >
                    Min (${minAmount})
                  </button>
                  {['5', '10', '25', '50', '100'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountUsd(preset)}
                      className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Minimum deposit: ${minAmount} USD</span>
                  <span>Instant Verification</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center justify-center gap-2 py-2.5"
                type="submit"
                isLoading={isSubmitting}
                id="generate-deposit-order-btn"
              >
                Proceed to Deposit Address & Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* ================================================================= */}
          {/* 2. PAYMENT ACTIVE STEP                                            */}
          {/* ================================================================= */}
          {step === 'PAYMENT_ACTIVE' && activeOrder && (
            <div className="space-y-4">
              {/* Order Status Header */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="text-xs font-bold text-white">Deposit Order #{activeOrder.id} Active</span>
                  </div>
                  <Badge
                    variant={
                      activeOrder.status === 'FINISHED' || activeOrder.status === 'OVERPAID'
                        ? 'success'
                        : activeOrder.status === 'CONFIRMING'
                        ? 'info'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {activeOrder.status === 'WAITING' ? 'Awaiting Funds' : activeOrder.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                    1. Invoice ✓
                  </div>
                  <div
                    className={`p-1 rounded font-semibold ${
                      wallet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    2. Wallet {wallet ? '✓' : ''}
                  </div>
                  <div
                    className={`p-1 rounded font-semibold ${
                      activeOrder.status === 'CONFIRMING' || activeOrder.status === 'FINISHED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-300 animate-pulse'
                    }`}
                  >
                    3. Sign & Send
                  </div>
                  <div
                    className={`p-1 rounded font-semibold ${
                      activeOrder.status === 'FINISHED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    4. Settled
                  </div>
                </div>
              </div>

              {/* Deposit Information Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 mx-auto sm:mx-0">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Deposit QR Code" className="w-32 h-32 sm:w-28 sm:h-28 rounded-lg" />
                    ) : (
                      <div className="w-32 h-32 sm:w-28 sm:h-28 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-center text-slate-500 mt-1">Scan to Pay</div>
                  </div>

                  <div className="space-y-2 text-xs flex-1 w-full">
                    <div>
                      <span className="text-slate-500 block">Exact Amount to Send:</span>
                      <div className="flex items-center justify-between font-mono font-bold text-base text-slate-900 dark:text-white">
                        <span>
                          {activeOrder.expected_amount} {activeOrder.pay_currency.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeOrder.expected_amount, 'amount')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-sans"
                        >
                          {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Copy
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Amount: ${activeOrder.price_amount} USD | Network: {activeOrder.pay_network}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Recipient Deposit Address:</span>
                      <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
                          {activeOrder.payment_address}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeOrder.payment_address, 'address')}
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0 flex items-center gap-1"
                          title="Copy Address"
                        >
                          {copiedField === 'address' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compatibility Warning if connected wallet doesn't match currency network */}
                {walletCompat && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-300">
                    <span>{walletCompat.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={walletCompat.action}
                      className="text-xs shrink-0 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                    >
                      {walletCompat.actionText}
                    </Button>
                  </div>
                )}

                {/* Primary Action: Direct Wallet Pay / Connect Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="space-y-1.5">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg py-3 text-sm flex items-center justify-center gap-2"
                      onClick={handleDirectWalletSend}
                      isLoading={isSendingWalletTx}
                      leftIcon={<Send className="w-4 h-4" />}
                      id="pay-via-connected-wallet-btn"
                    >
                      Pay {activeOrder.expected_amount} {activeOrder.pay_currency.toUpperCase()} (Trigger Wallet Popup)
                    </Button>
                    <p className="text-[11px] text-indigo-300 text-center">
                      ⚡ Triggers Phantom for Solana, MetaMask/Trust for EVM, or TronLink for TRON.
                    </p>
                  </div>

                  {/* Dedicated Native Wallet Payment Protocols */}
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 mt-2" id="mobile-quick-pay-container">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        Direct Mobile Wallet Confirmation
                      </span>
                      <span className="text-[10px] text-emerald-400">1-Tap Protocol</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Solana Quick Pay */}
                      {activeOrder.pay_network?.toUpperCase() === 'SOL' || activeOrder.pay_currency?.toLowerCase() === 'sol' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const solanaPayUri = `solana:${activeOrder.payment_address}?amount=${activeOrder.expected_amount}&label=AMZDistributor&message=AMZDistributor%20Deposit%20Order%20${activeOrder.id}`;
                              window.location.href = solanaPayUri;
                              setTxNotice('Opening Phantom Confirmation Sheet... Please approve payment in Phantom.');
                            }}
                            className="p-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 rounded-lg flex items-center gap-2 text-xs font-semibold text-white transition text-left"
                            id="mobile-pay-phantom-btn"
                          >
                            <span className="text-lg">👻</span>
                            <div className="truncate">
                              <div>Phantom Pop-Up</div>
                              <div className="text-[9px] text-purple-300">App confirmation</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const solanaPayUri = `solana:${activeOrder.payment_address}?amount=${activeOrder.expected_amount}&label=AMZDistributor&message=AMZDistributor%20Deposit%20Order%20${activeOrder.id}`;
                              window.location.href = solanaPayUri;
                              setTxNotice('Opening Solana Pay protocol...');
                            }}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 text-xs font-semibold text-white transition text-left"
                            id="mobile-solana-pay-protocol-btn"
                          >
                            <span className="text-lg">⚡</span>
                            <div className="truncate">
                              <div>Solana Pay</div>
                              <div className="text-[9px] text-slate-400">Native Transfer</div>
                            </div>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const mmSendUri = `https://metamask.app.link/send/${activeOrder.payment_address}?value=${activeOrder.expected_amount}`;
                              let ethWei = '0';
                              try {
                                ethWei = parseEther(String(activeOrder.expected_amount)).toString();
                              } catch {
                                ethWei = '0';
                              }
                              const ethSendUri = `ethereum:${activeOrder.payment_address}?value=${ethWei}`;
                              try {
                                const a = document.createElement('a');
                                a.href = mmSendUri;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              } catch {
                                window.location.href = ethSendUri;
                              }
                              setTxNotice('Opening MetaMask confirmation sheet... Please approve payment.');
                            }}
                            className="p-2 bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/40 rounded-lg flex items-center gap-2 text-xs font-semibold text-white transition text-left"
                            id="mobile-pay-metamask-btn"
                          >
                            <span className="text-lg">🦊</span>
                            <div className="truncate">
                              <div>MetaMask Pop-Up</div>
                              <div className="text-[9px] text-orange-300">App confirmation</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const trustSendUri = `trust://send?address=${activeOrder.payment_address}&amount=${activeOrder.expected_amount}`;
                              const ethSendUri = `ethereum:${activeOrder.payment_address}`;
                              try {
                                const a = document.createElement('a');
                                a.href = trustSendUri;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              } catch {
                                window.location.href = ethSendUri;
                              }
                              setTxNotice('Opening Trust Wallet confirmation sheet...');
                            }}
                            className="p-2 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 rounded-lg flex items-center gap-2 text-xs font-semibold text-white transition text-left"
                            id="mobile-pay-trust-btn"
                          >
                            <span className="text-lg">🛡️</span>
                            <div className="truncate">
                              <div>Trust Wallet</div>
                              <div className="text-[9px] text-cyan-300">App confirmation</div>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Manual Transaction Hash (HRX / TxID) Submission for External Exchange / Wallet Transfers */}
                  <div className="p-3 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 mt-2" id="manual-tx-hash-container">
                    <div className="text-[11px] font-semibold text-indigo-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                        Paid manually from Exchange (Binance, Bybit) or Wallet?
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono">HRX / Tx Hash</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      After transferring SOL or other coin to the address above, paste your Transaction Hash (HRX / TxID) below to instantly credit your account.
                    </p>
                    <form onSubmit={handleManualTxHashSubmit} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={manualTxHashInput}
                        onChange={e => setManualTxHashInput(e.target.value)}
                        placeholder="Paste Transaction Hash (HRX / TxID)..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        id="manual-tx-hash-input"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmittingManualHash}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 shrink-0"
                        id="submit-manual-tx-hash-btn"
                      >
                        Submit HRX
                      </Button>
                    </form>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <button
                      type="button"
                      onClick={handleMakeAnotherDeposit}
                      className="text-xs text-slate-400 hover:text-slate-300 transition"
                    >
                      ← Cancel / Choose Different Asset
                    </button>
                    {wallet && (
                      <button
                        type="button"
                        onClick={handleDisconnectWallet}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Power className="w-3 h-3" /> Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. SETTLED STEP (Payment Completed Confirmation)                  */}
          {/* ================================================================= */}
          {step === 'SETTLED' && activeOrder && (
            <div className="text-center py-4 space-y-4" id="deposit-success-view">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Payment Received
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Your payment has been detected successfully and credited to your AMZDistributor account.
                </p>
              </div>

              {/* Structured Confirmation Details Card */}
              <div className="bg-slate-50 dark:bg-slate-900/90 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Amount Credited:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    ${activeOrder.price_amount} USD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Crypto Received:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {activeOrder.actually_paid || activeOrder.expected_amount} {activeOrder.pay_currency.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Network:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeOrder.pay_network}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Payment Order:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    #{activeOrder.id} ({activeOrder.internal_payment_id})
                  </span>
                </div>
                {activeOrder.tx_hash && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Transaction Ref:</span>
                    <span className="font-mono text-indigo-400 text-[11px] truncate max-w-[150px]" title={activeOrder.tx_hash}>
                      {activeOrder.tx_hash.substring(0, 10)}...{activeOrder.tx_hash.substring(activeOrder.tx_hash.length - 8)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <Badge variant="success" size="sm">Confirmed</Badge>
                </div>
              </div>

              {/* Clear Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleMakeAnotherDeposit}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 flex items-center justify-center gap-2"
                  id="make-another-deposit-btn"
                >
                  <PlusCircle className="w-4 h-4" /> Make Another Deposit
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleDone}
                    className="w-full text-xs font-semibold py-2.5"
                    id="back-to-wallet-btn"
                  >
                    Back to Wallet
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleViewTransactions}
                    className="w-full text-xs font-semibold py-2.5"
                    id="view-transaction-history-btn"
                  >
                    View Transactions
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Reown Multi-Wallet Selection Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={handleWalletConnected}
        currentWallet={wallet}
      />
    </>
  );
};
