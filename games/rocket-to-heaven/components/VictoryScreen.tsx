"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { useHighScores } from "@/lib/supabase/hooks";
import { useAuth } from "@/lib/supabase/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { audioManager } from "../game/audio/AudioManager";

interface VictoryScreenProps {
  onReturnToMenu: () => void;
  onContinue: () => void;
}

export function VictoryScreen({
  onReturnToMenu,
  onContinue,
}: VictoryScreenProps) {
  const reset = useGameStore((state) => state.reset);
  const maxHeight = useGameStore((state) => state.maxHeight);
  const playTimeSeconds = useGameStore((state) => state.playTimeSeconds);
  const showAuthModal = useGameStore((state) => state.showAuthModal);
  const setAuthModal = useGameStore((state) => state.setAuthModal);
  const hasWon = useGameStore((state) => state.hasWon);

  const { user } = useAuth();
  const { submitScore, getPersonalBest } = useHighScores("rocket-to-heaven");

  const [dialogueStep, setDialogueStep] = useState<
    "welcome" | "continue" | null
  >(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const hasSubmittedRef = useRef(false);
  const hasContinuedRef = useRef(false); // Track if player has continued

  // Typewriter effect state
  const [displayedText1, setDisplayedText1] = useState("");
  const [displayedText2, setDisplayedText2] = useState("");
  const fullText1 =
    "Well done, good and faithful servant. You have been faithful over a little; I will set you over much. Enter into the joy of your master.";
  const fullText2 =
    "It's ok to have it all and still want more, you can keep climbing.";

  useEffect(() => {
    // Show first dialogue after a brief delay
    const timer = setTimeout(() => {
      setDialogueStep("welcome");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Typewriter effect for first dialogue
  useEffect(() => {
    if (
      dialogueStep === "welcome" &&
      displayedText1.length < fullText1.length
    ) {
      const timer = setTimeout(() => {
        setDisplayedText1(fullText1.slice(0, displayedText1.length + 1));
      }, 30); // 30ms per character
      return () => clearTimeout(timer);
    }
  }, [dialogueStep, displayedText1, fullText1]);

  // Typewriter effect for second dialogue
  useEffect(() => {
    if (
      dialogueStep === "continue" &&
      displayedText2.length < fullText2.length
    ) {
      const timer = setTimeout(() => {
        setDisplayedText2(fullText2.slice(0, displayedText2.length + 1));
      }, 30); // 30ms per character
      return () => clearTimeout(timer);
    }
  }, [dialogueStep, displayedText2, fullText2]);

  // Don't auto-submit - let user choose when to save
  // Auto-submit removed so user can manually save their score

  // Fetch personal best
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const pb = await getPersonalBest();
        if (pb) {
          setPersonalBest(pb.score);
          setIsNewHighScore(maxHeight > pb.score);
        } else {
          setIsNewHighScore(true);
        }
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSubmitted, user, maxHeight]);

  const handleSubmitScore = async () => {
    if (!user || submitting || scoreSubmitted) return;

    setSubmitting(true);
    // Don't pass wave/level for rocket-to-heaven, only score
    const result = await submitScore(
      maxHeight,
      undefined,
      undefined,
      playTimeSeconds,
    );
    setSubmitting(false);

    if (result.success) {
      setScoreSubmitted(true);
    } else if ((result as any).unauthorized) {
      // Session expired - show auth modal
      setAuthModal(true);
    }
  };

  const handleContinueClick = () => {
    audioManager.playSFX("ui-click");
    setDialogueStep("continue");
    // Reset displayed text for second dialogue
    setDisplayedText2("");
  };

  const handleReturnToArcade = () => {
    audioManager.playSFX("ui-click");
    reset();
    onReturnToMenu();
  };

  const handleContinuePlaying = () => {
    audioManager.playSFX("ui-click");
    // Mark that player has continued
    hasContinuedRef.current = true;
    // Unpause the game and allow infinite climbing
    const store = useGameStore.getState();
    // Set hasWon to false to unpause and hide victory screen
    store.setWon(false);

    // Re-enable gravity for the player (it was disabled on victory)
    // We need to access the Phaser scene to do this
    // The game will handle this through the MainScene update loop
    // The victory screen will hide automatically when hasWon becomes false
  };

  const handleHover = () => {
    audioManager.playSFX("ui-hover");
  };

  // Hide victory screen if game is no longer won (player continued) or if player has continued
  if (!hasWon || !dialogueStep || hasContinuedRef.current) return null;

  return (
    <>
      {/* Dialogue box overlay - positioned at bottom center, not full screen */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end pb-8 px-4 pointer-events-none">
        <div className="bg-gradient-to-br from-blue-50/95 to-blue-100/95 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-lg w-full border-2 border-blue-300/50 shadow-2xl pointer-events-auto animate-[slideUp_0.5s_ease-out]">
          {/* Jesus dialogue */}
          <div className="mb-4">
            <div className="text-xs text-blue-700/70 uppercase tracking-wider mb-1">
              Jesus
            </div>

            {dialogueStep === "welcome" && (
              <div className="space-y-4">
                <p className="text-blue-900 text-lg leading-relaxed">
                  "{displayedText1}
                  {displayedText1.length < fullText1.length && (
                    <span className="animate-pulse">|</span>
                  )}
                  "
                </p>
                <p className="text-blue-700/80 text-sm italic">
                  - Matthew 25:21, ESV
                </p>

                <button
                  onClick={handleContinueClick}
                  onMouseEnter={handleHover}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Continue
                </button>
              </div>
            )}

            {dialogueStep === "continue" && (
              <div className="space-y-4">
                <p className="text-blue-900 text-lg leading-relaxed">
                  "{displayedText2}
                  {displayedText2.length < fullText2.length && (
                    <span className="animate-pulse">|</span>
                  )}
                  "
                </p>

                {/* Score display */}
                <div className="bg-white/60 rounded-lg p-4 border border-blue-200/50">
                  <div className="text-center">
                    <div className="text-xs text-blue-700/70 uppercase tracking-wider mb-1">
                      Final Altitude
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {maxHeight.toLocaleString()}
                      <span className="text-lg text-blue-500 ml-1">ft</span>
                    </div>
                    {isNewHighScore && user && (
                      <div className="text-sm text-blue-700 font-semibold mt-2">
                        🏆 New High Score!
                      </div>
                    )}
                  </div>
                </div>

                {/* Score saving */}
                {!user && (
                  <button
                    onClick={() => setAuthModal(true)}
                    onMouseEnter={handleHover}
                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Sign In to Save Score
                  </button>
                )}

                {user && !scoreSubmitted && (
                  <button
                    onClick={handleSubmitScore}
                    onMouseEnter={handleHover}
                    disabled={submitting}
                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-400 hover:to-green-500 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Saving..." : "Save Score"}
                  </button>
                )}

                {scoreSubmitted && (
                  <div className="text-sm text-green-600 text-center font-medium py-2">
                    ✓ Score saved to leaderboard!
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleReturnToArcade}
                    onMouseEnter={handleHover}
                    className="flex-1 py-3 px-6 rounded-xl bg-blue-200/80 text-blue-900 font-semibold hover:bg-blue-200 transition-all border border-blue-300/50"
                  >
                    Return to Arcade
                  </button>
                  <button
                    onClick={handleContinuePlaying}
                    onMouseEnter={handleHover}
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setAuthModal(false)} />
      )}
    </>
  );
}
