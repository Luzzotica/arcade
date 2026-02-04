"use client";

import { useEffect, useState, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { GAME_CONSTANTS } from "../game/config";
import { useHighScores } from "@/lib/supabase/hooks";
import { useAuth } from "@/lib/supabase/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { audioManager } from "../game/audio/AudioManager";
import { deathScriptures } from "../game/scriptures";

interface DeathScreenProps {
  onReturnToMenu: () => void;
  maxHeight: number;
}

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  best_wave: number;
  best_level: number;
  total_plays: number;
}

export function DeathScreen({ onReturnToMenu, maxHeight }: DeathScreenProps) {
  const reset = useGameStore((state) => state.reset);
  const playTimeSeconds = useGameStore((state) => state.playTimeSeconds);
  const showAuthModal = useGameStore((state) => state.showAuthModal);
  const setAuthModal = useGameStore((state) => state.setAuthModal);
  const deathCause = useGameStore((state) => state.deathCause);
  const killerBlockLabel = useGameStore((state) => state.killerBlockLabel);
  const hasReachedHeaven = useGameStore((state) => state.hasReachedHeaven);

  const [isMounted, setIsMounted] = useState(false); // Track if component is mounted
  const { user } = useAuth();
  const { submitScore, getLeaderboard, getPersonalBest, getUserRank } =
    useHighScores("rocket-to-heaven");

  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const hasSubmittedRef = useRef(false);
  const [selectedScripture, setSelectedScripture] = useState<{
    text: string;
    verse: string;
  } | null>(null);

  // Mark component as mounted and select random scripture
  useEffect(() => {
    setIsMounted(true);
    // Randomly select a scripture from the list
    const randomIndex = Math.floor(Math.random() * deathScriptures.length);
    setSelectedScripture(deathScriptures[randomIndex]);
  }, []);

  // Auto-submit score if logged in
  useEffect(() => {
    if (user && !hasSubmittedRef.current && maxHeight > 0) {
      hasSubmittedRef.current = true;
      handleSubmitScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, maxHeight]);

  // Fetch leaderboard
  useEffect(() => {
    const fetchData = async () => {
      const [lb, pb, rank] = await Promise.all([
        getLeaderboard(5),
        getPersonalBest(),
        getUserRank(),
      ]);
      setLeaderboard(lb);
      if (pb) {
        setPersonalBest(pb.score);
        setIsNewHighScore(maxHeight > pb.score);
      } else if (user) {
        setIsNewHighScore(true);
      }
      setUserRank(rank);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSubmitted]);

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
      // Refresh data
      const [lb, rank] = await Promise.all([getLeaderboard(5), getUserRank()]);
      setLeaderboard(lb);
      setUserRank(rank);
    } else if ((result as any).unauthorized) {
      // Session expired - show auth modal
      setAuthModal(true);
    }
  };

  const handleRetry = () => {
    audioManager.playSFX("ui-click");
    reset();
    window.location.reload();
  };

  const handleQuit = () => {
    audioManager.playSFX("ui-click");
    reset();
    onReturnToMenu();
  };

  const handleHover = () => {
    audioManager.playSFX("ui-hover");
  };

  // Calculate progress percentage
  const progress = (maxHeight / GAME_CONSTANTS.HEAVEN_HEIGHT) * 100;

  // Get death message based on cause and whether player reached heaven
  const getDeathMessage = () => {
    if (hasReachedHeaven) {
      // Heavenly death messages (positive)
      if (deathCause === "lava") {
        return "You were swallowed up with joy!";
      } else if (deathCause === "block" && killerBlockLabel) {
        // Positive message based on the heavenly block type
        const messages: Record<string, string> = {
          JOY: "You were overcome with joy!",
          ABUNDANCE: "You were overwhelmed with abundance!",
          BEAUTY: "You were captivated by beauty!",
          HAPPINESS: "You were overcome with happiness!",
          GRATITUDE: "You were filled with gratitude!",
          PEACE: "You were embraced by peace!",
          LOVE: "You were surrounded by love!",
          HOPE: "You were lifted by hope!",
          FAITH: "You were strengthened by faith!",
          GRACE: "You were bathed in grace!",
          BLESSING: "You were showered with blessings!",
          WONDER: "You were lost in wonder!",
        };
        return (
          messages[killerBlockLabel] ||
          `You were overcome with ${killerBlockLabel.toLowerCase()}!`
        );
      }
    }

    // Pre-heaven death messages (traditional)
    if (deathCause === "lava") {
      return "Consumed by the abyss of despair.";
    } else if (deathCause === "block" && killerBlockLabel) {
      const messages: Record<string, string> = {
        DEBT: "Crushed by the weight of debt.",
        GRIEF: "Overwhelmed by grief.",
        STRESS: "Broken by stress.",
        FEAR: "Paralyzed by fear.",
        LOSS: "Swallowed by loss.",
        ANXIETY: "Consumed by anxiety.",
        REGRET: "Haunted by regret.",
        DOUBT: "Defeated by doubt.",
        SHAME: "Buried in shame.",
        ANGER: "Destroyed by anger.",
        ENVY: "Poisoned by envy.",
        GUILT: "Crushed by guilt.",
      };
      return (
        messages[killerBlockLabel] ||
        `Defeated by ${killerBlockLabel.toLowerCase()}.`
      );
    }
    return "The darkness claimed you.";
  };

  // Get encouraging message based on progress
  const getMessage = () => {
    if (progress < 10)
      return "The journey of a thousand miles begins with a single step.";
    if (progress < 25) return "Keep climbing. The light awaits.";
    if (progress < 50) return "You're getting closer to the light!";
    if (progress < 75) return "Heaven is within reach. Don't give up!";
    return "So close to salvation! Try again!";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Background - 50% dark opacity overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal container */}
      <div
        className={`relative z-10 max-w-lg w-full rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl ${
          hasReachedHeaven
            ? "bg-gradient-to-br from-blue-50/95 to-blue-100/95 border-2 border-blue-300/50"
            : "bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-blue-500/50"
        }`}
      >
        {/* Content */}
        <div className="text-center">
          {/* Title */}
          <h1
            className={`text-4xl font-bold mb-2 ${
              hasReachedHeaven ? "text-blue-600" : "text-white"
            }`}
          >
            {getDeathMessage()}
          </h1>

          {/* Scripture */}
          {selectedScripture && (
            <div className="mb-8 px-4">
              <p
                className={`mb-2 italic text-lg leading-relaxed ${
                  hasReachedHeaven ? "text-blue-900" : "text-white/90"
                }`}
              >
                "{selectedScripture.text}"
              </p>
              <p
                className={`text-sm ${
                  hasReachedHeaven ? "text-blue-700/80" : "text-white/60"
                }`}
              >
                — {selectedScripture.verse}
              </p>
            </div>
          )}

          {/* Stats card */}
          <div
            className={`backdrop-blur-sm rounded-2xl p-6 mb-8 border ${
              hasReachedHeaven
                ? "bg-white/40 border-blue-200/30"
                : "bg-black/40 border-white/10"
            }`}
          >
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div
                  className={`text-xs uppercase tracking-wider mb-1 ${
                    hasReachedHeaven ? "text-blue-700/70" : "text-white/60"
                  }`}
                >
                  Highest Altitude
                </div>
                <div
                  className={`text-3xl font-bold ${
                    hasReachedHeaven ? "text-blue-600" : "text-white"
                  }`}
                >
                  {maxHeight.toLocaleString()}
                  <span
                    className={`text-lg ml-1 ${
                      hasReachedHeaven ? "text-blue-500" : "text-white/80"
                    }`}
                  >
                    ft
                  </span>
                </div>
              </div>
              <div>
                <div
                  className={`text-xs uppercase tracking-wider mb-1 ${
                    hasReachedHeaven ? "text-blue-700/70" : "text-white/60"
                  }`}
                >
                  Progress
                </div>
                <div
                  className={`text-3xl font-bold ${
                    hasReachedHeaven ? "text-blue-600" : "text-blue-300"
                  }`}
                >
                  {progress.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div
                className={`h-2 rounded-full overflow-hidden ${
                  hasReachedHeaven ? "bg-white/30" : "bg-black/40"
                }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-amber-300 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div
                className={`text-xs mt-1 flex justify-between ${
                  hasReachedHeaven ? "text-blue-700/60" : "text-white/40"
                }`}
              >
                <span>Abyss</span>
                <span>Heaven (10k ft)</span>
              </div>
            </div>
          </div>

          {isNewHighScore && user && (
            <div
              className={`text-base font-bold mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(59,130,246,0.8)] ${
                hasReachedHeaven ? "text-blue-600" : "text-blue-300"
              }`}
            >
              🏆 NEW HIGH SCORE!
            </div>
          )}

          {personalBest !== null && (
            <div
              className={`text-sm mb-5 ${
                hasReachedHeaven ? "text-blue-700/80" : "text-white/60"
              }`}
            >
              Personal Best: {personalBest.toLocaleString()} ft
              {userRank && (
                <span className="text-blue-400"> (Rank #{userRank})</span>
              )}
            </div>
          )}

          {!user && (
            <button
              className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 mb-4"
              onClick={() => setAuthModal(true)}
              onMouseEnter={handleHover}
            >
              SIGN IN TO SAVE SCORE
            </button>
          )}

          {user && !scoreSubmitted && !hasSubmittedRef.current && (
            <button
              className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg hover:from-green-400 hover:to-green-500 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSubmitScore}
              onMouseEnter={handleHover}
              disabled={submitting}
            >
              {submitting ? "SAVING..." : "SAVE SCORE"}
            </button>
          )}

          {scoreSubmitted && (
            <div
              className={`text-sm mb-5 font-medium ${
                hasReachedHeaven ? "text-green-600" : "text-green-400"
              }`}
            >
              ✓ Score saved to leaderboard!
            </div>
          )}

          {leaderboard.length > 0 && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                hasReachedHeaven
                  ? "bg-white/40 border-blue-200/30"
                  : "bg-black/40 border-white/10"
              }`}
            >
              <h3
                className={`text-sm uppercase tracking-wider mb-3 ${
                  hasReachedHeaven ? "text-blue-800/80" : "text-white/70"
                }`}
              >
                Top Scores
              </h3>
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs ${
                      hasReachedHeaven ? "bg-white/30" : "bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`w-[30px] ${
                        hasReachedHeaven ? "text-blue-700/70" : "text-white/50"
                      }`}
                    >
                      #{entry.rank}
                    </span>
                    <span
                      className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                        hasReachedHeaven ? "text-blue-900" : "text-white"
                      }`}
                    >
                      {entry.display_name}
                    </span>
                    <span
                      className={`font-bold ${
                        hasReachedHeaven ? "text-blue-600" : "text-blue-300"
                      }`}
                    >
                      {entry.best_score.toLocaleString()} ft
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xl hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
              onMouseEnter={handleHover}
            >
              Rise Again
            </button>
            <button
              onClick={handleQuit}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all border ${
                hasReachedHeaven
                  ? "bg-blue-200/80 text-blue-900 hover:bg-blue-200 border-blue-300/50"
                  : "bg-white/10 text-white/80 hover:bg-white/20 border-white/10"
              }`}
              onMouseEnter={handleHover}
            >
              Return to Arcade
            </button>
          </div>
        </div>
      </div>

      {/* Floating particles - only render on client to avoid hydration mismatch */}
      {isMounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 ${
                hasReachedHeaven ? "bg-blue-400/40" : "bg-blue-500/30"
              } rounded-full animate-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
      )}

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setAuthModal(false)} />
      )}
    </div>
  );
}
