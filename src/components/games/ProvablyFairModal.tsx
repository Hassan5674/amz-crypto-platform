import React from 'react';

export interface ProvablyFairModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  preCommittedHash?: string;
  currentServerSeedHash?: string;
  gameSlug?: string;
  revealedServerSeed?: string;
  clientSeed?: string;
  nonce?: number;
  actualOutcome?: any;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = () => {
  return null;
};
