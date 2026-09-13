import React from 'react';
import { GameContainer } from './components/GameContainer.js';
import { getGameDefinition } from './adapters/GameRegistry.js';

// Game Implementations
import BlackjackGame from './implementations/BlackjackGame.js';
import CrashGame from './implementations/CrashGame.js';
import MinesGame from './implementations/MinesGame.js';
import SlotsGame from './implementations/SlotsGame.js';
import DiceGame from './implementations/DiceGame.js';
import CoinFlipGame from './implementations/CoinFlipGame.js';
import LimboGame from './implementations/LimboGame.js';
import HiLoGame from './implementations/HiLoGame.js';
import BaccaratGame from './implementations/BaccaratGame.js';
import DragonTigerGame from './implementations/DragonTigerGame.js';
import KenoGame from './implementations/KenoGame.js';
import SicboGame from './implementations/SicboGame.js';
import TowerGame from './implementations/TowerGame.js';
import VideoPokerGame from './implementations/VideoPokerGame.js';
import ThreeCardPokerGame from './implementations/ThreeCardPokerGame.js';
import ScratchCardsGame from './implementations/ScratchCardsGame.js';
import WarGame from './implementations/WarGame.js';
import TicTacToeGame from './implementations/TicTacToeGame.js';
import AndarBaharGame from './implementations/AndarBaharGame.js';
import { RouletteBoard } from '../components/games/RouletteBoard.js';

interface GamePlayerProps {
  slug: string;
  onBack: () => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ slug, onBack }) => {
  const gameDef = getGameDefinition(slug);

  const renderGameComponent = () => {
    switch (slug.toLowerCase()) {
      case 'blackjack':
        return <BlackjackGame />;
      case 'crash':
        return <CrashGame />;
      case 'mines':
        return <MinesGame />;
      case 'slots':
        return <SlotsGame />;
      case 'dice':
        return <DiceGame />;
      case 'coinflip':
        return <CoinFlipGame />;
      case 'limbo':
        return <LimboGame />;
      case 'hilo':
        return <HiLoGame />;
      case 'baccarat':
        return <BaccaratGame />;
      case 'dragontiger':
        return <DragonTigerGame />;
      case 'keno':
        return <KenoGame />;
      case 'sicbo':
        return <SicboGame />;
      case 'tower':
        return <TowerGame />;
      case 'videopoker':
        return <VideoPokerGame />;
      case 'threecardpoker':
        return <ThreeCardPokerGame />;
      case 'scratchcards':
        return <ScratchCardsGame />;
      case 'war':
        return <WarGame />;
      case 'tictactoe':
        return <TicTacToeGame />;
      case 'andarbahar':
        return <AndarBaharGame />;
      case 'roulette':
      case 'european-roulette':
        return (
          <div className="py-4">
            <RouletteBoard
              gameSlug="roulette"
              onBetPlaced={() => {}}
            />
          </div>
        );
      default:
        return (
          <div className="text-center py-16 text-slate-400">
            <h3 className="text-lg font-bold text-white mb-2">Game Not Found</h3>
            <p className="text-sm mb-6">The requested game identifier "{slug}" is not currently available.</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        );
    }
  };

  return (
    <GameContainer
      gameSlug={slug}
      gameTitle={gameDef?.displayName || slug.toUpperCase()}
      category={gameDef?.category}
      onBack={onBack}
    >
      {renderGameComponent()}
    </GameContainer>
  );
};

export default GamePlayer;
