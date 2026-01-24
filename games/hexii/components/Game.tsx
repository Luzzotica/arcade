import { useEffect, useRef, useCallback } from 'react';
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../game/config';
import { MainScene } from '../game/scenes/MainScene';
import { ConstructionUI } from './ConstructionUI';
import { HUD } from './HUD';
import { PauseMenu } from './PauseMenu';
import { BossHealthBar } from './BossHealthBar';
import { WaveAnnouncement } from './WaveAnnouncement';
import { DeathScreen } from './DeathScreen';
import { BossDialogue } from './BossDialogue';
import { WinScreen } from './WinScreen';
import { useGameStore } from '../store/gameStore';
import styles from './Game.module.css';

interface GameProps {
  onReturnToMenu: () => void;
}

export function Game({ onReturnToMenu }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isConstructionMode = useGameStore((state) => state.isConstructionMode);
  const showPauseMenu = useGameStore((state) => state.showPauseMenu);
  const isDead = useGameStore((state) => state.isDead);
  const showBossDialogue = useGameStore((state) => state.showBossDialogue);
  const showWinScreen = useGameStore((state) => state.showWinScreen);
  const togglePauseMenu = useGameStore((state) => state.togglePauseMenu);
  
  // Get the MainScene from Phaser game
  const getMainScene = useCallback((): MainScene | null => {
    if (!gameRef.current) return null;
    return gameRef.current.scene.getScene('MainScene') as MainScene | null;
  }, []);
  
  // Pan camera to player callback
  const handlePanToPlayer = useCallback(() => {
    const scene = getMainScene();
    scene?.panCameraToPlayer();
  }, [getMainScene]);
  
  // Engage boss callback
  const handleEngage = useCallback(() => {
    const scene = getMainScene();
    scene?.engageBoss();
  }, [getMainScene]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create Phaser game instance
    gameRef.current = new Phaser.Game({
      ...GAME_CONFIG,
      parent: containerRef.current,
    });

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    // Handle return to menu event
    const handleReturnToMenu = () => {
      onReturnToMenu();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('game:returnToMenu', handleReturnToMenu);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('game:returnToMenu', handleReturnToMenu);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onReturnToMenu]);

  // Handle ESC key for pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        togglePauseMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePauseMenu]);

  return (
    <div className={styles.gameWrapper}>
      <div ref={containerRef} id="game-container" />
      {!showBossDialogue && <HUD />}
      {!showBossDialogue && <BossHealthBar />}
      <WaveAnnouncement />
      {isConstructionMode && <ConstructionUI />}
      {showPauseMenu && <PauseMenu onQuit={onReturnToMenu} />}
      {showBossDialogue && (
        <BossDialogue 
          onPanToPlayer={handlePanToPlayer}
          onEngage={handleEngage}
        />
      )}
      {showWinScreen && <WinScreen onReturnToMenu={onReturnToMenu} />}
      {isDead && <DeathScreen onReturnToMenu={onReturnToMenu} />}
    </div>
  );
}
