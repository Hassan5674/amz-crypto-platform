import React, { useState } from 'react';

interface GameThumbnailProps {
  slug: string;
  name?: string;
  category?: string;
  src?: string;
  className?: string;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({
  slug,
  name = '',
  category = 'CASINO',
  src,
  className = 'w-full h-full'
}) => {
  const [imgError, setImgError] = useState(false);

  // Professional 3D cinematic commercial casino artwork SVG generator for ALL 20 games
  const renderCasinoArtwork = () => {
    const gameSlug = slug.toLowerCase();

    // 1. TIGER & DRAGON (Dragon Tiger)
    if (gameSlug.includes('dragontiger') || gameSlug.includes('tiger') || gameSlug.includes('dragon')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_dt)" />
          <defs>
            <radialGradient id="bg_dt" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="60%" stopColor="#180505" />
              <stop offset="100%" stopColor="#090202" />
            </radialGradient>
            <linearGradient id="gold_dt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <filter id="glow_dt" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Dramatic Background Aura / Fireball */}
          <circle cx="200" cy="125" r="85" fill="#f59e0b" opacity="0.15" filter="url(#glow_dt)" />
          <circle cx="200" cy="125" r="50" fill="#dc2626" opacity="0.2" filter="url(#glow_dt)" />

          {/* Left: Tiger Motif */}
          <g transform="translate(100, 110)">
            <circle cx="0" cy="0" r="48" fill="#b45309" stroke="#f59e0b" strokeWidth="3" />
            <path d="M-30,-20 L30,-20 L0,30 Z" fill="#fef08a" opacity="0.8" />
            <text x="0" y="8" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="sans-serif">🐅</text>
            <text x="0" y="65" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">TIGER</text>
          </g>

          {/* Center VS Crest */}
          <g transform="translate(200, 115)">
            <circle cx="0" cy="0" r="28" fill="#09090b" stroke="url(#gold_dt)" strokeWidth="3" />
            <text x="0" y="8" textAnchor="middle" fill="#fef08a" fontSize="16" fontWeight="900" fontFamily="sans-serif">VS</text>
          </g>

          {/* Right: Dragon Motif */}
          <g transform="translate(300, 110)">
            <circle cx="0" cy="0" r="48" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="3" />
            <path d="M-30,-20 L30,-20 L0,30 Z" fill="#93c5fd" opacity="0.8" />
            <text x="0" y="8" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="sans-serif">🐉</text>
            <text x="0" y="65" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">DRAGON</text>
          </g>

          {/* Title Banner */}
          <rect x="70" y="200" width="260" height="32" rx="16" fill="#09090b" stroke="url(#gold_dt)" strokeWidth="2" />
          <text x="200" y="221" textAnchor="middle" fill="url(#gold_dt)" fontSize="13" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            TIGER & DRAGON DUEL
          </text>
        </svg>
      );
    }

    // 2. ANDAR BAHAR
    if (gameSlug.includes('andarbahar')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_ab)" />
          <defs>
            <radialGradient id="bg_ab" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="60%" stopColor="#022c22" />
              <stop offset="100%" stopColor="#02100d" />
            </radialGradient>
            <linearGradient id="gold_ab" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* Ornate Mandala Center Ring */}
          <circle cx="200" cy="110" r="75" fill="none" stroke="url(#gold_ab)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
          <circle cx="200" cy="110" r="55" fill="#065f46" stroke="#34d399" strokeWidth="2" />
          {/* Joker Card */}
          <rect x="175" y="75" width="50" height="70" rx="6" fill="#ffffff" stroke="#fef08a" strokeWidth="2" />
          <text x="200" y="115" textAnchor="middle" fill="#dc2626" fontSize="24" fontWeight="900" fontFamily="sans-serif">K♠</text>
          
          {/* Left & Right Piles (Andar & Bahar) */}
          <g transform="translate(70, 95)">
            <rect x="-25" y="-15" width="50" height="65" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="0" y="75" textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="900">ANDAR (1.9x)</text>
          </g>
          <g transform="translate(330, 95)">
            <rect x="-25" y="-15" width="50" height="65" rx="6" fill="#451a03" stroke="#f59e0b" strokeWidth="2" />
            <text x="0" y="75" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="900">BAHAR (2.0x)</text>
          </g>

          <text x="200" y="225" textAnchor="middle" fill="url(#gold_ab)" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            ROYAL ANDAR BAHAR
          </text>
        </svg>
      );
    }

    // 3. ROULETTE
    if (gameSlug.includes('roulette')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_roulette)" />
          <defs>
            <radialGradient id="bg_roulette" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0f3822" />
              <stop offset="100%" stopColor="#05170d" />
            </radialGradient>
            <linearGradient id="gold_rim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="wood_outer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#1f0902" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="115" r="92" fill="url(#wood_outer)" stroke="url(#gold_rim)" strokeWidth="5" />
          <circle cx="200" cy="115" r="78" fill="#09090b" stroke="#ca8a04" strokeWidth="2" />
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={i}
              d={`M200,115 L${200 + 76 * Math.cos((i * 30 * Math.PI) / 180)},${115 + 76 * Math.sin((i * 30 * Math.PI) / 180)}`}
              stroke={i % 2 === 0 ? '#dc2626' : '#18181b'}
              strokeWidth="10"
            />
          ))}
          <circle cx="200" cy="115" r="30" fill="url(#gold_rim)" />
          <circle cx="200" cy="115" r="14" fill="#18181b" />
          <circle cx="225" cy="80" r="6" fill="#ffffff" />
          <text x="200" y="228" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            EUROPEAN GRAND ROULETTE
          </text>
        </svg>
      );
    }

    // 4. BLACKJACK
    if (gameSlug.includes('blackjack')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_bj)" />
          <defs>
            <radialGradient id="bg_bj" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090514" />
            </radialGradient>
            <linearGradient id="gold_bj" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          {/* Card 1 (Ace of Spades) */}
          <g transform="translate(150, 105) rotate(-10)">
            <rect x="-40" y="-55" width="80" height="110" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <text x="-28" y="-32" fill="#0f172a" fontSize="18" fontWeight="900" fontFamily="sans-serif">A</text>
            <path d="M0,-5 C-15,15 0,25 0,10 C0,25 15,15 0,-5 Z" fill="#0f172a" transform="translate(0, -2) scale(1.4)" />
          </g>
          {/* Card 2 (King of Hearts - Natural Blackjack 21) */}
          <g transform="translate(240, 100) rotate(12)">
            <rect x="-40" y="-55" width="80" height="110" rx="8" fill="#ffffff" stroke="#fca5a5" strokeWidth="2" />
            <text x="-28" y="-32" fill="#dc2626" fontSize="18" fontWeight="900" fontFamily="sans-serif">K</text>
            <text x="0" y="10" textAnchor="middle" fill="#dc2626" fontSize="32" fontWeight="900" fontFamily="sans-serif">♥</text>
            <text x="0" y="38" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="900">21 BJ</text>
          </g>
          <text x="200" y="225" textAnchor="middle" fill="url(#gold_bj)" fontSize="15" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            CLASSIC 21 BLACKJACK
          </text>
        </svg>
      );
    }

    // 5. BACCARAT
    if (gameSlug.includes('baccarat')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_bac)" />
          <defs>
            <radialGradient id="bg_bac" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#3b0764" />
              <stop offset="100%" stopColor="#11021f" />
            </radialGradient>
            <linearGradient id="gold_bac" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="100" r="45" fill="#581c87" stroke="url(#gold_bac)" strokeWidth="3" />
          <text x="200" y="112" textAnchor="middle" fill="#fef08a" fontSize="32" fontWeight="900" fontFamily="serif">👑</text>
          <text x="120" y="145" textAnchor="middle" fill="#c084fc" fontSize="12" fontWeight="900">PLAYER</text>
          <text x="280" y="145" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="900">BANKER</text>
          <text x="200" y="225" textAnchor="middle" fill="url(#gold_bac)" fontSize="15" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            PUNTO BANCO BACCARAT
          </text>
        </svg>
      );
    }

    // 6. CRASH / AVIATOR
    if (gameSlug.includes('crash')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_crash)" />
          <defs>
            <radialGradient id="bg_crash" cx="30%" cy="80%" r="90%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <path d="M 40,210 Q 180,190 320,50" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="6 4" />
          <path d="M 40,210 Q 180,190 320,50 L 320,210 Z" fill="#22c55e" opacity="0.15" />
          <circle cx="310" cy="60" r="18" fill="#e11d48" stroke="#fef08a" strokeWidth="2" />
          <text x="100" y="55" fill="#4ade80" fontSize="22" fontWeight="900" fontFamily="sans-serif">1000.00x</text>
          <text x="200" y="225" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            AVIATOR CURVE CRASH
          </text>
        </svg>
      );
    }

    // 7. MINES
    if (gameSlug.includes('mines')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_mines)" />
          <defs>
            <radialGradient id="bg_mines" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>
          <g transform="translate(100, 40)">
            <rect x="0" y="0" width="45" height="45" rx="8" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <text x="22" y="28" textAnchor="middle" fill="#34d399" fontSize="20">💎</text>
            <rect x="55" y="0" width="45" height="45" rx="8" fill="#881337" stroke="#f43f5e" strokeWidth="2" />
            <text x="77" y="28" textAnchor="middle" fill="#f43f5e" fontSize="20">💣</text>
            <rect x="110" y="0" width="45" height="45" rx="8" fill="#334155" stroke="#64748b" strokeWidth="2" />
          </g>
          <text x="200" y="225" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            NEON MINESWEEPER
          </text>
        </svg>
      );
    }

    // 8. SLOTS
    if (gameSlug.includes('slots')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_slots)" />
          <defs>
            <radialGradient id="bg_slots" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </radialGradient>
          </defs>
          <rect x="80" y="35" width="240" height="150" rx="16" fill="#0f172a" stroke="#a855f7" strokeWidth="4" />
          <text x="135" y="125" textAnchor="middle" fill="#eab308" fontSize="56" fontWeight="900" fontFamily="sans-serif">7</text>
          <text x="200" y="125" textAnchor="middle" fill="#eab308" fontSize="56" fontWeight="900" fontFamily="sans-serif">7</text>
          <text x="265" y="125" textAnchor="middle" fill="#eab308" fontSize="56" fontWeight="900" fontFamily="sans-serif">7</text>
          <text x="200" y="225" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            NEON 777 VIDEO SLOTS
          </text>
        </svg>
      );
    }

    // 9. DICE
    if (gameSlug.includes('dice')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_dice)" />
          <defs>
            <radialGradient id="bg_dice" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#311042" />
              <stop offset="100%" stopColor="#0a0312" />
            </radialGradient>
          </defs>
          <g transform="translate(150, 80)">
            <rect x="0" y="0" width="90" height="90" rx="16" fill="#9333ea" stroke="#c084fc" strokeWidth="3" />
            <circle cx="25" cy="25" r="8" fill="#ffffff" />
            <circle cx="65" cy="25" r="8" fill="#ffffff" />
            <circle cx="45" cy="45" r="8" fill="#ffffff" />
            <circle cx="25" cy="65" r="8" fill="#ffffff" />
            <circle cx="65" cy="65" r="8" fill="#ffffff" />
          </g>
          <text x="200" y="225" textAnchor="middle" fill="#f0abfc" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            QUANTUM DICE (99% RTP)
          </text>
        </svg>
      );
    }

    // 10. COIN FLIP
    if (gameSlug.includes('coinflip')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_cf)" />
          <defs>
            <radialGradient id="bg_cf" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="115" r="60" fill="#eab308" stroke="#fef08a" strokeWidth="4" />
          <text x="200" y="125" textAnchor="middle" fill="#713f12" fontSize="24" fontWeight="900" fontFamily="sans-serif">HEADS</text>
          <text x="200" y="225" textAnchor="middle" fill="#fde047" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            BINARY COIN FLIP
          </text>
        </svg>
      );
    }

    // 11. LIMBO
    if (gameSlug.includes('limbo')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_limbo)" />
          <defs>
            <radialGradient id="bg_limbo" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#38bdf8" fontSize="48" fontWeight="900" fontFamily="sans-serif">100x</text>
          <text x="200" y="225" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            LIMBO ROCKET
          </text>
        </svg>
      );
    }

    // 12. HILO
    if (gameSlug.includes('hilo')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_hilo)" />
          <defs>
            <radialGradient id="bg_hilo" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#022c22" />
            </radialGradient>
          </defs>
          <rect x="160" y="60" width="80" height="110" rx="8" fill="#ffffff" stroke="#a7f3d0" strokeWidth="2" />
          <text x="200" y="125" textAnchor="middle" fill="#047857" fontSize="36" fontWeight="900">7♠</text>
          <text x="200" y="225" textAnchor="middle" fill="#6ee7b7" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            HI-LO CARD LADDER
          </text>
        </svg>
      );
    }

    // 13. KENO
    if (gameSlug.includes('keno')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_keno)" />
          <defs>
            <radialGradient id="bg_keno" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#831843" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#f472b6" fontSize="36" fontWeight="900" fontFamily="sans-serif">80 BALL</text>
          <text x="200" y="225" textAnchor="middle" fill="#fbcfe8" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            CYBER KENO 80
          </text>
        </svg>
      );
    }

    // 14. SIC BO
    if (gameSlug.includes('sicbo')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_sb)" />
          <defs>
            <radialGradient id="bg_sb" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#701a75" />
              <stop offset="100%" stopColor="#3b0764" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#e879f9" fontSize="36" fontWeight="900" fontFamily="sans-serif">🎲 🎲 🎲</text>
          <text x="200" y="225" textAnchor="middle" fill="#f5d0fe" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            SIC BO ANCIENT DICE
          </text>
        </svg>
      );
    }

    // 15. TOWER
    if (gameSlug.includes('tower')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_tower)" />
          <defs>
            <radialGradient id="bg_tower" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#134e4a" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#2dd4bf" fontSize="36" fontWeight="900" fontFamily="sans-serif">🏰 TOWER</text>
          <text x="200" y="225" textAnchor="middle" fill="#99f6e4" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            NEON TOWER CLIMB
          </text>
        </svg>
      );
    }

    // 16. VIDEO POKER
    if (gameSlug.includes('videopoker')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_vp)" />
          <defs>
            <radialGradient id="bg_vp" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#172554" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#60a5fa" fontSize="32" fontWeight="900" fontFamily="sans-serif">ROYAL FLUSH</text>
          <text x="200" y="225" textAnchor="middle" fill="#bfdbfe" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            JACKS OR BETTER
          </text>
        </svg>
      );
    }

    // 17. THREE CARD POKER
    if (gameSlug.includes('threecardpoker')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_tcp)" />
          <defs>
            <radialGradient id="bg_tcp" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#022c22" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#34d399" fontSize="32" fontWeight="900" fontFamily="sans-serif">3 CARD POKER</text>
          <text x="200" y="225" textAnchor="middle" fill="#a7f3d0" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            PAIR PLUS
          </text>
        </svg>
      );
    }

    // 18. SCRATCH CARDS
    if (gameSlug.includes('scratchcards')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_sc)" />
          <defs>
            <radialGradient id="bg_sc" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#fb923c" fontSize="36" fontWeight="900" fontFamily="sans-serif">✨ SCRATCH</text>
          <text x="200" y="225" textAnchor="middle" fill="#fed7aa" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            NEON SCRATCHERS
          </text>
        </svg>
      );
    }

    // 19. CASINO WAR
    if (gameSlug.includes('war')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_war)" />
          <defs>
            <radialGradient id="bg_war" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#f87171" fontSize="36" fontWeight="900" fontFamily="sans-serif">⚔️ WAR</text>
          <text x="200" y="225" textAnchor="middle" fill="#fecaca" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            CASINO WAR CLASH
          </text>
        </svg>
      );
    }

    // 20. TIC TAC TOE
    if (gameSlug.includes('tictactoe')) {
      return (
        <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="250" fill="url(#bg_ttt)" />
          <defs>
            <radialGradient id="bg_ttt" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </radialGradient>
          </defs>
          <text x="200" y="120" textAnchor="middle" fill="#38bdf8" fontSize="36" fontWeight="900" fontFamily="sans-serif">❌ ⭕ X/O</text>
          <text x="200" y="225" textAnchor="middle" fill="#bae6fd" fontSize="14" fontWeight="900" letterSpacing="2" fontFamily="sans-serif">
            NEON TIC-TAC-TOE
          </text>
        </svg>
      );
    }

    // Default Fallback
    return (
      <svg className="w-full h-full" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="250" fill="#1e1b4b" />
        <text x="200" y="125" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="900" fontFamily="sans-serif">
          {(name || slug).toUpperCase()}
        </text>
      </svg>
    );
  };

  return <div className={className}>{renderCasinoArtwork()}</div>;
};
