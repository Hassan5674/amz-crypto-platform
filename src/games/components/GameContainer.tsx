import React from 'react';
import { GameHeader } from './GameHeader.js';
import { WinEffects } from './WinEffects.js';
import { GameAttribution } from './GameAttribution.js';
import { InsufficientFundsNotification } from './InsufficientFundsNotification.js';
import { CryptoDepositModal } from '../../components/crypto/CryptoDepositModal.js';
import { useCasino } from '../context/CasinoContext.js';

interface GameContainerProps {
  gameSlug: string;
  gameTitle: string;
  category?: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  gameSlug,
  gameTitle,
  category,
  onBack,
  children
}) => {
  const {
    winEffect,
    clearWinEffect,
    insufficientFundsNotice,
    dismissInsufficientFundsNotice,
    isDepositModalOpen,
    openDepositModal,
    closeDepositModal,
    refreshBackendBalance
  } = useCasino();

  const handleDepositSuccess = () => {
    refreshBackendBalance().catch(() => {});
    dismissInsufficientFundsNotice();
    closeDepositModal();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <GameHeader
          gameSlug={gameSlug}
          gameTitle={gameTitle}
          category={category}
          onBack={onBack}
        />

        <div className="p-4 sm:p-6 md:p-8 bg-slate-950/60 min-h-[500px] flex flex-col justify-between">
          <div className="w-full">
            {/* Authoritative Insufficient Funds Notification Alert */}
            <InsufficientFundsNotification
              notice={insufficientFundsNotice}
              onDismiss={dismissInsufficientFundsNotice}
              onDepositClick={openDepositModal}
            />

            {children}
          </div>

          <GameAttribution />
        </div>
      </div>

      <WinEffects win={winEffect} onComplete={clearWinEffect} />

      {/* Embedded Crypto Deposit Flow for Rapid Fund Replenishment */}
      {isDepositModalOpen && (
        <CryptoDepositModal
          isOpen={isDepositModalOpen}
          onClose={closeDepositModal}
          onDepositFinalized={handleDepositSuccess}
        />
      )}
    </div>
  );
};

export default GameContainer;
