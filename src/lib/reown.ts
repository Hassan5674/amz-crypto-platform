/**
 * Lightweight, direct Web3 Ethers & Solana provider gateway.
 * Fully active real wallet connection without sandbox defaults.
 */

let cachedAddress: string | null = null;
let currentChainId = 1;

export const createAppKitInstance = async (): Promise<any> => {
  return {
    open: async () => {
      const anyWindow = window as any;
      if (anyWindow.ethereum) {
        try {
          const accounts = await anyWindow.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts[0]) {
            cachedAddress = accounts[0];
            const chainIdHex = await anyWindow.ethereum.request({ method: 'eth_chainId' }).catch(() => '0x1');
            currentChainId = parseInt(chainIdHex, 16) || 1;
            return { address: accounts[0], chainId: currentChainId };
          }
        } catch (e: any) {
          console.warn('[AppKit] eth_requestAccounts error:', e);
          throw e;
        }
      }
      if (anyWindow.solana) {
        try {
          const resp = await anyWindow.solana.connect();
          if (resp?.publicKey) {
            cachedAddress = resp.publicKey.toString();
            return { address: cachedAddress, chainId: 999999 };
          }
        } catch (e: any) {
          console.warn('[AppKit] solana.connect error:', e);
          throw e;
        }
      }
      throw new Error('No Web3 wallet extension (MetaMask, Phantom, etc.) detected in this browser window.');
    },
    getAddress: async () => {
      const anyWindow = window as any;
      if (anyWindow.ethereum?.selectedAddress) return anyWindow.ethereum.selectedAddress;
      if (anyWindow.solana?.publicKey) return anyWindow.solana.publicKey.toString();
      return cachedAddress;
    },
    getChainId: async () => {
      const anyWindow = window as any;
      if (anyWindow.ethereum?.chainId) {
        return parseInt(anyWindow.ethereum.chainId, 16) || 1;
      }
      return currentChainId;
    },
    getIsConnected: async () => {
      const anyWindow = window as any;
      return !!(anyWindow.ethereum?.selectedAddress || anyWindow.solana?.isConnected || cachedAddress);
    },
    disconnect: async () => {
      cachedAddress = null;
      const anyWindow = window as any;
      if (anyWindow.solana?.disconnect) {
        try {
          await anyWindow.solana.disconnect();
        } catch {}
      }
    }
  };
};

export const initializeAppKit = async () => {
  return await createAppKitInstance();
};

export const appKit = {
  open: async (options?: any) => {
    const inst = await createAppKitInstance();
    return await inst.open(options);
  },
  getAddress: async () => {
    const inst = await createAppKitInstance();
    return await inst.getAddress();
  },
  getChainId: async () => {
    const inst = await createAppKitInstance();
    return await inst.getChainId();
  },
  getIsConnected: async () => {
    const inst = await createAppKitInstance();
    return await inst.getIsConnected();
  },
  disconnect: async () => {
    const inst = await createAppKitInstance();
    return await inst.disconnect();
  }
};
