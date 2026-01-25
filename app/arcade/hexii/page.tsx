'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/games/hexii/store/gameStore';
import type { HexColor } from '@/games/hexii/store/gameStore';
import { audioManager } from '@/games/hexii/game/audio/AudioManager';
import { OptionsMenu } from '@/games/hexii/components/OptionsMenu';
import styles from './page.module.css';

// Dynamically import Game component to prevent SSR issues with Phaser
const Game = dynamic(
  () => import('@/games/hexii/components/Game').then((mod) => ({ default: mod.Game })),
  {
    ssr: false,
    loading: () => <div className={styles.app}>Loading game...</div>,
  }
);

interface HexPosition {
  left: number;
  top: number;
}

function MainMenu({ onStart }: { onStart: (color: HexColor) => void }) {
  const [selectedColor, setSelectedColor] = useState<HexColor>('RED');
  const [hexPositions, setHexPositions] = useState<HexPosition[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Generate random positions only on client side
    setHexPositions(
      Array.from({ length: 12 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      }))
    );
    
    // Start title music
    audioManager.playMusic('title');
  }, []);
  
  const handleColorSelect = (color: HexColor) => {
    audioManager.playSFX('ui-click');
    setSelectedColor(color);
  };
  
  const handleStartGame = () => {
    audioManager.playSFX('ui-click');
    audioManager.crossfadeTo('gameplay');
    onStart(selectedColor);
  };
  
  const handleOptions = () => {
    audioManager.playSFX('ui-click');
    setShowOptions(true);
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  const colors: { color: HexColor; name: string; desc: string }[] = [
    { color: 'RED', name: 'Damage', desc: '+5% Global Damage' },
    { color: 'GREEN', name: 'Growth', desc: '+10 Max HP' },
    { color: 'YELLOW', name: 'Speed', desc: '+5% Move Speed' },
    { color: 'BLUE', name: 'Shield', desc: '+10 Max Shield' },
  ];

  return (
    <div className={styles.mainMenu}>
      <Link href="/arcade" className={styles.backLink}>
        ← Back to Arcade
      </Link>
      <div className={styles.menuContent}>
        <h1 className={styles.gameTitle}>
          <span className={styles.titleHex}>⬡</span>
          HEXII
          <span className={styles.titleHex}>⬡</span>
        </h1>
        <p className={styles.tagline}>Prove that Hexagons are the Bestagons.</p>
        
        <div className={styles.coreSelection}>
          <h2>SELECT YOUR CORE</h2>
          <div className={styles.colorOptions}>
            {colors.map(({ color, name, desc }) => (
              <button
                key={color}
                className={`${styles.colorOption} ${styles[color.toLowerCase()]} ${selectedColor === color ? styles.selected : ''}`}
                onClick={() => handleColorSelect(color)}
                onMouseEnter={handleHover}
              >
                <div className={styles.colorHex}>⬢</div>
                <div className={styles.colorName}>{name}</div>
                <div className={styles.colorDesc}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.menuButtons}>
          <button className={styles.startBtn} onClick={handleStartGame} onMouseEnter={handleHover}>
            START GAME
          </button>
          <button className={styles.optionsBtn} onClick={handleOptions} onMouseEnter={handleHover}>
            OPTIONS
          </button>
        </div>

        <div className={styles.controlsHint}>
          <p><strong>WASD</strong> to move • <strong>MOUSE</strong> to aim</p>
        </div>
      </div>
      
      <div className={styles.floatingHexes}>
        {hexPositions.map((pos, i) => (
          <div 
            key={i} 
            className={`${styles.floatingHex} ${styles[`hex${i}`]}`}
            style={{
              animationDelay: `${i * 0.3}s`,
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
          >
            ⬡
          </div>
        ))}
      </div>
      
      {showOptions && <OptionsMenu onClose={() => setShowOptions(false)} />}
    </div>
  );
}

export default function HexiiPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const initializeShip = useGameStore((state) => state.initializeShip);
  const setConstructionMode = useGameStore((state) => state.setConstructionMode);

  const handleStart = (color: HexColor) => {
    initializeShip(color);
    setGameStarted(true);
  };

  // Add keyboard listener for testing construction mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        const state = useGameStore.getState();
        if (!state.isConstructionMode && gameStarted) {
          setConstructionMode(true, {
            type: 'MODULE',
            color: ['RED', 'GREEN', 'YELLOW', 'BLUE'][Math.floor(Math.random() * 4)] as HexColor,
            health: 100,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, setConstructionMode]);

  const handleReturnToMenu = () => {
    audioManager.crossfadeTo('title');
    useGameStore.getState().reset();
    setGameStarted(false);
  };

  return (
    <div className={styles.app}>
      {!gameStarted ? (
        <MainMenu onStart={handleStart} />
      ) : (
        <Game onReturnToMenu={handleReturnToMenu} />
      )}
    </div>
  );
}
