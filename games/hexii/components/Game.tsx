import { useEffect, useRef, useCallback } from "react";
import * as Phaser from "phaser";
import { GAME_CONFIG } from "../game/config";
import { MainScene } from "../game/scenes/MainScene";
import { ConstructionUI } from "./ConstructionUI";
import { HUD } from "./HUD";
import { PauseMenu } from "./PauseMenu";
import { BossHealthBar } from "./BossHealthBar";
import { WaveAnnouncement } from "./WaveAnnouncement";
import { DeathScreen } from "./DeathScreen";
import { BossDialogue } from "./BossDialogue";
import { WinScreen } from "./WinScreen";
import { Joystick } from "./Joystick";
import { useGameStore } from "../store/gameStore";
import { audioManager } from "../game/audio/AudioManager";
import { musicManager } from "@/lib/audio/MusicManager";
import { useGameSession } from "@/lib/supabase/hooks";
import { isMobileDevice } from "@/lib/utils/mobile-detector";

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
  const bossHp = useGameStore((state) => state.bossHp);
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);

  // Analytics tracking
  const { startSession, endSession, getPlayTimeSeconds } =
    useGameSession("hexii");
  const sessionStartedRef = useRef(false);

  // Get the MainScene from Phaser game
  const getMainScene = useCallback((): MainScene | null => {
    if (!gameRef.current) return null;
    return gameRef.current.scene.getScene("MainScene") as MainScene | null;
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

    // Start analytics session
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      startSession();
    }

    // Create Phaser game instance
    gameRef.current = new Phaser.Game({
      ...GAME_CONFIG,
      parent: containerRef.current,
    });

    // Start gameplay music
    musicManager.play("/music/gameplay.mp3");

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

    window.addEventListener("resize", handleResize);
    window.addEventListener("game:returnToMenu", handleReturnToMenu);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("game:returnToMenu", handleReturnToMenu);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onReturnToMenu, startSession]);

  // End session when player dies
  useEffect(() => {
    if (isDead && sessionStartedRef.current) {
      endSession(score, wave, level);
    }
  }, [isDead, score, wave, level, endSession]);

  // Handle ESC key for pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        togglePauseMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePauseMenu]);

  // Handle boss dialogue music transition (boss appearance)
  const prevShowBossDialogue = useRef(showBossDialogue);
  useEffect(() => {
    if (showBossDialogue && !prevShowBossDialogue.current) {
      // Boss dialogue started - play boss appear SFX and switch to boss music
      audioManager.playSFX("boss-appear");
      musicManager.play("/music/boss-theme.mp3");
    }
    prevShowBossDialogue.current = showBossDialogue;
  }, [showBossDialogue]);

  // Handle boss death (when bossHp goes from a value to null)
  const prevBossHp = useRef(bossHp);
  useEffect(() => {
    // Boss died: was positive, now null
    if (
      prevBossHp.current !== null &&
      prevBossHp.current > 0 &&
      bossHp === null &&
      !isDead
    ) {
      audioManager.playSFX("boss-death");
      musicManager.play("/music/gameplay.mp3");
    }
    prevBossHp.current = bossHp;
  }, [bossHp, isDead]);

  // Handle player death music transition
  const prevIsDead = useRef(isDead);
  useEffect(() => {
    if (isDead && !prevIsDead.current) {
      // Player just died - switch to defeat music (death SFX is played in MainScene during animation)
      musicManager.play("/music/defeat.mp3");
    }
    prevIsDead.current = isDead;
  }, [isDead]);

  const isMobile = isMobileDevice();

  return (
    <div className="relative w-screen h-screen">
      <div
        ref={containerRef}
        id="game-container"
        className="w-full h-full [&_canvas]:block [&_canvas]:cursor-crosshair"
      />
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
      {isDead && (
        <DeathScreen
          onReturnToMenu={onReturnToMenu}
          playTimeSeconds={getPlayTimeSeconds()}
        />
      )}
      {isMobile && <Joystick />}
    </div>
  );
}
