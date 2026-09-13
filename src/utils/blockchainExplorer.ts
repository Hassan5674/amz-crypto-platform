/**
 * Blockchain Explorer Helper Utilities
 * Generates direct explorer URLs for Transaction Hashes and Wallet Addresses
 */

export function getBlockchainExplorerTxUrl(
  txHash: string | null | undefined,
  network?: string | null,
  currency?: string | null
): string | null {
  if (!txHash) return null;
  const hash = txHash.trim();
  const net = (network || '').toUpperCase();
  const cur = (currency || '').toUpperCase();

  // Solana
  if (net === 'SOL' || net === 'SOLANA' || cur === 'SOL') {
    return `https://solscan.io/tx/${hash}`;
  }

  // TRON (TRC20, TRX)
  if (net === 'TRC20' || net === 'TRON' || cur === 'TRX' || cur.includes('TRC20')) {
    return `https://tronscan.org/#/transaction/${hash}`;
  }

  // Bitcoin
  if (net === 'BTC' || cur === 'BTC' || cur === 'BITCOIN') {
    return `https://www.blockchain.com/explorer/transactions/btc/${hash}`;
  }

  // Binance Smart Chain (BEP20 / BSC)
  if (net === 'BSC' || net === 'BEP20' || cur === 'BNB' || cur.includes('BEP20')) {
    return `https://bscscan.com/tx/${hash}`;
  }

  // Polygon (MATIC)
  if (net === 'POLYGON' || net === 'MATIC' || cur === 'MATIC') {
    return `https://polygonscan.com/tx/${hash}`;
  }

  // Ethereum (ERC20, ETH)
  if (net === 'ERC20' || net === 'ETH' || cur === 'ETH' || cur.includes('ERC20')) {
    return `https://etherscan.io/tx/${hash}`;
  }

  // Litecoin
  if (net === 'LTC' || cur === 'LTC') {
    return `https://blockchair.com/litecoin/transaction/${hash}`;
  }

  // Dogecoin
  if (net === 'DOGE' || cur === 'DOGE') {
    return `https://dogechain.info/tx/${hash}`;
  }

  // Fallback if starts with 0x (EVM compatible)
  if (hash.startsWith('0x')) {
    return `https://etherscan.io/tx/${hash}`;
  }

  return `https://blockchair.com/search?q=${hash}`;
}

export function getBlockchainExplorerAddressUrl(
  address: string | null | undefined,
  network?: string | null,
  currency?: string | null
): string | null {
  if (!address) return null;
  const addr = address.trim();
  const net = (network || '').toUpperCase();
  const cur = (currency || '').toUpperCase();

  // Solana
  if (net === 'SOL' || net === 'SOLANA' || cur === 'SOL') {
    return `https://solscan.io/account/${addr}`;
  }

  // TRON
  if (net === 'TRC20' || net === 'TRON' || cur === 'TRX' || cur.includes('TRC20') || addr.startsWith('T')) {
    return `https://tronscan.org/#/address/${addr}`;
  }

  // Bitcoin
  if (net === 'BTC' || cur === 'BTC' || cur === 'BITCOIN') {
    return `https://www.blockchain.com/explorer/addresses/btc/${addr}`;
  }

  // Binance Smart Chain
  if (net === 'BSC' || net === 'BEP20' || cur === 'BNB' || cur.includes('BEP20')) {
    return `https://bscscan.com/address/${addr}`;
  }

  // Polygon
  if (net === 'POLYGON' || net === 'MATIC' || cur === 'MATIC') {
    return `https://polygonscan.com/address/${addr}`;
  }

  // Ethereum / EVM
  if (addr.startsWith('0x')) {
    return `https://etherscan.io/address/${addr}`;
  }

  return `https://blockchair.com/search?q=${addr}`;
}

export function getExplorerName(network?: string | null, currency?: string | null): string {
  const net = (network || '').toUpperCase();
  const cur = (currency || '').toUpperCase();

  if (net === 'SOL' || net === 'SOLANA' || cur === 'SOL') return 'Solscan';
  if (net === 'TRC20' || net === 'TRON' || cur === 'TRX') return 'Tronscan';
  if (net === 'BTC' || cur === 'BTC') return 'Blockchain.com';
  if (net === 'BSC' || net === 'BEP20' || cur === 'BNB') return 'BscScan';
  if (net === 'POLYGON' || net === 'MATIC') return 'Polygonscan';
  if (net === 'ERC20' || net === 'ETH' || cur === 'ETH') return 'Etherscan';
  return 'Block Explorer';
}

export function formatShortHash(hash: string | null | undefined, start = 6, end = 6): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}
