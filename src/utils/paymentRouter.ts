export type Ecosystem = 'EVM' | 'SOLANA' | 'BITCOIN' | 'TRON' | 'TON' | 'OTHER';
export type AssetType = 'native' | 'token';
export type TokenStandard = 'ERC20' | 'BEP20' | 'SPL' | 'TRC20' | 'JETTON' | 'NONE';

export interface CoinRouteConfig {
  symbol: string;
  name: string;
  ecosystem: Ecosystem;
  network: string;
  chainId?: number;
  assetType: AssetType;
  tokenStandard?: TokenStandard;
  contractAddress?: string;
  decimals: number;
}

export interface PaymentRouteResult {
  ecosystem: Ecosystem;
  network: string;
  provider: string;
  transactionMethod: string;
  supported: boolean;
  error?: string;
}

export function resolvePaymentRoute(
  coinSymbol: string,
  networkKey: string,
  wallet: { walletType: string; address?: string } | null
): PaymentRouteResult {
  const symbol = coinSymbol.toUpperCase();
  const net = networkKey.toLowerCase();

  // Determine ecosystem & asset type
  let ecosystem: Ecosystem = 'OTHER';
  let assetType: AssetType = 'native';
  let tokenStandard: TokenStandard = 'NONE';

  if (net.includes('solana') || symbol === 'SOL') {
    ecosystem = 'SOLANA';
    assetType = symbol === 'SOL' ? 'native' : 'token';
    tokenStandard = assetType === 'token' ? 'SPL' : 'NONE';
  } else if (net.includes('tron') || symbol === 'TRX') {
    ecosystem = 'TRON';
    assetType = symbol === 'TRX' ? 'native' : 'token';
    tokenStandard = assetType === 'token' ? 'TRC20' : 'NONE';
  } else if (net.includes('bitcoin') || symbol === 'BTC') {
    ecosystem = 'BITCOIN';
    assetType = 'native';
  } else if (net.includes('ton') || symbol === 'TON' || symbol === 'JETTON') {
    ecosystem = 'TON';
    assetType = symbol === 'TON' ? 'native' : 'token';
    tokenStandard = assetType === 'token' ? 'JETTON' : 'NONE';
  } else {
    // Default to EVM for ETH, BNB, MATIC, AVAX, ARB, OPT, BASE, USDT (ERC20), etc.
    ecosystem = 'EVM';
    if (['ETH', 'BNB', 'MATIC', 'POL', 'AVAX', 'FTM'].includes(symbol)) {
      assetType = 'native';
    } else {
      assetType = 'token';
      tokenStandard = net.includes('bsc') ? 'BEP20' : 'ERC20';
    }
  }

  // Check wallet compatibility
  if (!wallet) {
    return {
      ecosystem,
      network: net,
      provider: 'None',
      transactionMethod: 'None',
      supported: false,
      error: 'No wallet connected'
    };
  }

  const wType = wallet.walletType.toLowerCase();

  // Validate wallet ecosystem support
  let isWalletCompatible = false;
  let providerName = 'Injected';
  let txMethod = 'eth_sendTransaction';

  if (ecosystem === 'EVM') {
    if (['metamask', 'trustwallet', 'coinbase', 'rabby', 'okx', 'binance', 'safe', 'rainbow', 'walletconnect'].some(w => wType.includes(w))) {
      isWalletCompatible = true;
      providerName = wallet.walletType;
      txMethod = assetType === 'token' ? 'erc20_transfer' : 'eth_sendTransaction';
    }
  } else if (ecosystem === 'SOLANA') {
    if (['phantom', 'solflare', 'backpack', 'glow', 'solana'].some(w => wType.includes(w))) {
      isWalletCompatible = true;
      providerName = wallet.walletType;
      txMethod = 'signAndSendTransaction';
    }
  } else if (ecosystem === 'TRON') {
    if (['tronlink', 'tron'].some(w => wType.includes(w))) {
      isWalletCompatible = true;
      providerName = wallet.walletType;
      txMethod = 'tron_sendTransaction';
    }
  } else if (ecosystem === 'TON') {
    if (['tonkeeper', 'mytonwallet', 'ton'].some(w => wType.includes(w))) {
      isWalletCompatible = true;
      providerName = wallet.walletType;
      txMethod = 'ton_sendTransfer';
    }
  } else if (ecosystem === 'BITCOIN') {
    if (['unisat', 'xverse', 'leather', 'bitcoin'].some(w => wType.includes(w))) {
      isWalletCompatible = true;
      providerName = wallet.walletType;
      txMethod = 'btc_sendTransfer';
    }
  }

  if (!isWalletCompatible) {
    return {
      ecosystem,
      network: net,
      provider: wallet.walletType,
      transactionMethod: 'Unsupported',
      supported: false,
      error: `Connected wallet (${wallet.walletType}) does not support ${ecosystem} network for ${coinSymbol}`
    };
  }

  return {
    ecosystem,
    network: net,
    provider: providerName,
    transactionMethod: txMethod,
    supported: true
  };
}
